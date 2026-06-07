# Eng-ception — Firebase Migration (local-first, optional-login) Design

> **Status**: Design (pending spec review + user approval)
> **Date**: 2026-06-07
> **Author**: collaborative (Eisen + Claude)
> **Scope**: Add a cloud persistence + auth tier *behind the existing seams* so a user can optionally sign in (Google, v1) and have their learning data sync/back-up to Firestore across devices. The app **keeps working with no login and no Firebase config** (current `localStorage` behavior preserved). Built emulator-first; real cloud provisioning is a deferred, account-level checklist.
> **Relates to**: P2 backlog item #3 (CLAUDE.md "다음 단계" #1). `DataStore` + `AnalyticsSink` are the slot-in seams (the latter shipped in #5 event-tracking).
> **Explicitly deferred to phase 2**: Kakao login (Firebase has no native Kakao provider → needs a custom-token Cloud Function + Blaze billing), all Cloud Functions, SRS (#6), production deployment, real-time multi-device live sync.

---

## 1. Context & problem

### 1.1 Where persistence lives today

All user data is single-device `localStorage` behind two abstractions:

- **`DataStore`** (`store/dataStore.ts`) — scenarios, `LearningRecord` (schema v4), `Pattern` (dedup by `patternId + triggerVerb`). One implementation: `localStorageAdapter` (`store/localStorage.ts`).
- **`AnalyticsSink`** (`store/analyticsSink.ts`) — content-free telemetry. Implementations: `noop`, `Memory`, `localAnalyticsSink`. Swapped via the `setSink()` facade in `services/analytics.ts`.

The migration's whole premise — "Firestore adapter slots in beside `localStorage.ts`" — is **already half-true**: the interfaces exist. The job is to (a) write the Firestore implementations, (b) make the active adapter switchable at runtime by auth state, and (c) add a thin Google auth layer + a non-destructive merge on login.

### 1.2 The asymmetry to fix first

`AnalyticsSink` is a clean seam: it is swapped in exactly **one** place (`setSink()` in `main.tsx`) and consumed only through the `track()` facade. `DataStore` is **not**: `localStorageAdapter as db` is imported **directly in 6 sites** —

```
main.tsx · store/learningStore.ts · pages/Home.tsx · pages/Learn.tsx
pages/Patterns.tsx · pages/Review.tsx · components/home/RecentLearning.tsx
```

So "swap the adapter" today means editing 6 files, and there is **no place to switch the adapter at runtime** — which the chosen auth model requires (logged-out → `localStorage`, logged-in → Firestore). Fixing this asymmetry (introducing a single switchable `db` facade) is a precondition of the migration, not optional polish.

### 1.3 Why local-first + optional login (not login-gated)

There is no userbase yet (solo dev, pre-launch). A login wall would add first-run friction and a one-time-experience barrier for zero current benefit. Local-first keeps the app instantly usable; login becomes an *upgrade* ("sync & back up across devices") the user opts into. This also means the app must run with **no Firebase project at all** during most development — the cloud tier is additive.

## 2. Goals and non-goals

### Goals

- A user can **optionally** sign in with Google; their data then syncs to Firestore and is available on any device they sign into.
- **Zero regression when logged out or unconfigured.** No Firebase config → app behaves exactly as today (local-only, no login UI). Logged out → `localStorageAdapter` active.
- Firestore adapter (`FirestoreDataStore`) and analytics sink (`FirestoreAnalyticsSink`) **slot into the existing interfaces** with no change to their consumers' call shapes.
- **Single runtime-switchable `db` facade** (parallel to `setSink()`), so auth state swaps the active `DataStore` in one place.
- **Non-destructive union merge** on login: local data ∪ existing cloud data; no record or pattern is ever lost.
- Offline works while logged in (Firestore IndexedDB persistence): writes queue and sync on reconnect.
- **Per-user data isolation** enforced by Firestore Security Rules (`/users/{uid}/**`, `uid == request.auth.uid`).
- **Emulator-first**: full dev + test against the Firebase Local Emulator Suite, no cloud project required.

### Non-goals

- **Kakao login** — deferred to phase 2 (custom-token Cloud Function + Blaze). The design leaves a provider extension point; it does not build it.
- **Any Cloud Functions** — v1 is pure client SDK.
- **Production deployment / provisioning** — documented as an account-level checklist (§10); not executed here.
- **SRS (#6)** — separate later milestone; this migration just makes its data multi-device.
- **Real-time/live multi-device sync UX** (e.g. two open tabs reflecting each other instantly) — Firestore gives eventual sync; no live-listener UI is built.
- **Conflict resolution beyond union** — no last-write-wins field merging, no vector clocks. Records/patterns are append/dedup-only, so union is sufficient.
- **PWA offline-caching interaction** (#4) — out of scope; noted as a known future interaction (§9).
- **Account deletion / data export UI** — deferred (note: a real consent/deletion surface lands with a launch).

## 3. Architecture

```
                         ┌─────────────────────────────┐
   consumers (6 sites)   │  store/db.ts   (NEW facade)  │
   import { db } ───────▶│  db.*  → delegates to        │
                         │        activeAdapter         │
                         │  setDbAdapter(adapter)        │◀── store/auth.ts
                         └─────────────────────────────┘    (on auth change)
                              │                    │
                ┌─────────────┘                    └──────────────┐
                ▼                                                  ▼
   store/localStorage.ts                            store/firestoreDataStore.ts (NEW)
   localStorageAdapter  (logged out / no config)    firestoreAdapter  (logged in)

   services/analytics.ts setSink()  ── parallel swap ──▶  localAnalyticsSink | firestoreAnalyticsSink (NEW)

   services/firebase.ts (NEW)  — initializes app/auth/firestore once; emulator wiring; isConfigured()
   store/auth.ts (NEW)         — Google sign-in/out, onAuthChange; orchestrates merge + adapter/sink swap
   services/migrateToCloud.ts (NEW) — non-destructive union upload of local → Firestore
```

**Control flow on sign-in:**
1. `auth.signInWithGoogle()` → Firebase popup → `onAuthChange(user)` fires.
2. `migrateToCloud(uid)`: read everything from `localStorageAdapter`, union-write into `/users/{uid}/...` (writes queue offline via Firestore persistence), then **clear the local working store** (data now lives in cloud + Firestore's local cache — idempotent on repeat logins).
3. `setDbAdapter(firestoreAdapter)` + `setSink(firestoreAnalyticsSink)`.
4. UI reads now resolve from Firestore (served from local cache instantly, synced in background).

**On sign-out:** `setDbAdapter(localStorageAdapter)` + `setSink(localAnalyticsSink)`. Local store is empty (was cleared at login); user is back to a fresh local session. Cloud data is untouched and reappears on next sign-in.

**On boot (`main.tsx`):** if Firebase is configured, initialize it and register `onAuthChange` *before* first render so a returning signed-in user lands directly on the Firestore adapter; if not configured, wire `localStorageAdapter` + `localAnalyticsSink` exactly as today.

## 4. Components (one purpose each)

### 4.1 `services/firebase.ts` — single init point
- `isFirebaseConfigured(): boolean` — true iff the `VITE_FIREBASE_*` env vars are present. Gates all cloud UI/behavior.
- Lazily initializes `app`, `auth`, `db (Firestore)` exactly once. Enables `persistentLocalCache` (IndexedDB) for offline.
- In dev with `VITE_USE_FIREBASE_EMULATOR=true`, calls `connectAuthEmulator` / `connectFirestoreEmulator`.
- Exports typed handles (`getFirebaseAuth()`, `getFirestore()`); throws a clear error if called while unconfigured (callers guard with `isFirebaseConfigured()`).

### 4.2 `store/db.ts` — switchable DataStore facade
- Exports a stable `db: DataStore` object whose every method delegates to a module-private `activeAdapter` (default `localStorageAdapter`).
- `setDbAdapter(adapter: DataStore): void` swaps `activeAdapter`.
- The 6 import sites change `import { localStorageAdapter as db } from '.../localStorage'` → `import { db } from '.../db'`. No call-site signature changes (it *is* a `DataStore`).
- Mirrors the `analytics.ts` `setSink()` pattern precisely.

### 4.3 `store/firestoreDataStore.ts` — `FirestoreDataStore`
Implements `DataStore` against `/users/{uid}/…`. `uid` captured at construction (created per signed-in user).
- **Scenarios are NOT stored in Firestore** (they are identical bundled seed for all users). `getScenarios()` returns the bundled seed (`seed-scenarios.ts`); `getUnlearnedScenarios(limit)` filters seed by the user's records; `saveScenarios()` is a no-op. → Firestore holds *only* user-generated data; cheaper, simpler, fewer rules.
- `records`: subcollection `/users/{uid}/records/{record.id}`. `saveLearningRecord` = `setDoc`. No `MAX_RECORDS` cap (the cap was a localStorage-quota concern; cloud keeps all).
- `patterns`: subcollection `/users/{uid}/patterns/{key}` where **`key = `${patternId}__${triggerVerb}`** — the dedup composite key becomes the document id, so dedup is structural. `savePattern` runs a transaction: if the doc exists, `reviewCount += 1` + `lastReviewedAt = now`; else create. (Same semantics as `localStorage.ts` lines 75–88.)
- `delete*` map to `deleteDoc`.

### 4.4 `store/firestoreAnalyticsSink.ts` — `FirestoreAnalyticsSink`
Implements `AnalyticsSink`. `track()` fire-and-forgets a `setDoc` to `/users/{uid}/events/{event.id}` (append-only; never throws into caller — same contract as `localAnalyticsSink`). `getAll()` reads them back; `clear()` is best-effort. Thin, optional secondary deliverable — same swap point as the data adapter.

### 4.5 `store/auth.ts` — auth orchestration
- `signInWithGoogle()`, `signOutUser()`, `getCurrentUser()`, `onAuthChange(cb)`.
- The single owner of the swap reaction: on auth → run `migrateToCloud` then swap adapter+sink; on de-auth → swap back to local.
- Pure-local mode (unconfigured): these are inert / not registered.

### 4.6 `services/migrateToCloud.ts` — non-destructive merge
- `migrateToCloud(uid)`: read local records + patterns; union-write into Firestore (records by id = idempotent; patterns by composite key via the same transaction as `savePattern`); on success, clear the local working store. Idempotent across repeat logins (re-login after offline local use re-runs cleanly).

### 4.7 `components/.../AuthControl.tsx` — minimal UI
- Logged out + configured: "Google로 로그인" button (→ popup). Logged in: avatar/name + "로그아웃" + a subtle synced/offline indicator. Unconfigured: renders nothing.
- Placement: Home header (small). Keep it minimal; this is plumbing, not a profile system.

## 5. Data model (Firestore layout)

```
/users/{uid}                       { createdAt, lastSeenAt, provider, displayName? }   (profile doc)
/users/{uid}/records/{recordId}    LearningRecord (schema v4, verbatim)
/users/{uid}/patterns/{key}        Pattern, key = `${patternId}__${triggerVerb}`
/users/{uid}/events/{eventId}      AnalyticsEvent (content-free; phase-2-ready, optional in v1)
```

- **No schema change** to `LearningRecord` / `Pattern` — the v4 shapes serialize directly to Firestore docs. (No `schemaVersion` bump needed: this is a *storage backend* change, not a record-shape change.)
- Scenarios stay bundled client-side (not in Firestore).
- Timestamps remain ISO strings (as in v4) for adapter symmetry; not converted to Firestore `Timestamp` (avoids divergent read code between adapters).

## 6. Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```
Each user can touch only their own subtree. Scenarios aren't in Firestore, so need no rules. Rules are tested against the emulator (`@firebase/rules-unit-testing`): a user cannot read/write another uid's docs; an unauthenticated client is denied.

## 7. Runtime gating & config

- **`isFirebaseConfigured()`** is the master switch. Unconfigured (no `VITE_FIREBASE_*`) → no Firebase init, no auth listener, no `AuthControl`, `localStorageAdapter` active. This keeps `npm run dev` (mock mode) and the existing 80 tests / e2e working with zero Firebase setup.
- Env vars (added to `.env.local`, documented in CLAUDE.md):
  ```
  VITE_FIREBASE_API_KEY=
  VITE_FIREBASE_AUTH_DOMAIN=
  VITE_FIREBASE_PROJECT_ID=
  VITE_FIREBASE_APP_ID=
  VITE_USE_FIREBASE_EMULATOR=   # 'true' in local dev against the emulator suite
  ```
- New dependency: `firebase` (modular web SDK). Dev tooling: `firebase-tools` for the emulator (run via `npx`, or a devDependency). `firebase.json` + `firestore.rules` added at repo root.

## 8. Error handling & edge cases

- **Sign-in popup blocked/cancelled** → surface a Korean toast/message; remain logged out; no adapter swap.
- **Offline at sign-in** → Firestore writes from `migrateToCloud` queue in the IndexedDB cache and flush on reconnect; local clear is still safe (data is in the cache). Adapter swap proceeds.
- **Analytics/sink failure** → swallowed (existing contract); never breaks the flow.
- **Firestore read failure when logged in** → adapter surfaces the error to existing UI error paths; no silent fallback to stale local (local was cleared).
- **Repeat login after logged-out offline use** → `migrateToCloud` re-runs idempotently (id-keyed records, key-keyed patterns).
- **Two devices, concurrent edits** → eventual union via Firestore; no live conflict UI (non-goal).

## 9. Known interactions / forward path

- **PWA (#4)**: `vite-plugin-pwa`'s service worker must not cache Firestore/Auth network calls. When #4 lands, exclude Firebase hosts from the SW runtime caching. Noted, not handled here.
- **Kakao (phase 2)**: client gets a Kakao token → a Cloud Function verifies it with Kakao's API → mints a Firebase custom token → `signInWithCustomToken`. Needs Functions + Blaze. The `auth.ts` provider seam and `AuthControl` accommodate a second button later.
- **SRS (#6)**: now reads/writes multi-device patterns; schema v5 FSRS fields will be added to `Pattern` in that milestone (this migration doesn't touch the shape).
- **Remote analytics flush**: `FirestoreAnalyticsSink` is the first real remote sink; a PostHog/GA sink could co-exist later.

## 10. Provisioning checklist (deferred — account-level, user-run)

Not part of implementation; needed only to go live against real cloud:
1. Create a Firebase project (console).
2. Enable **Google** sign-in provider (Authentication → Sign-in method).
3. Create a **Firestore** database (production mode).
4. Deploy `firestore.rules`.
5. Copy the web app config into `.env.local` (`VITE_FIREBASE_*`).
6. (Phase 2 only) Kakao Developers app + Blaze plan + Functions deploy.

Until then, **all dev/test runs against the emulator** (`firebase emulators:start`), which needs only `firebase.json` and a demo project id — no cloud account.

## 11. Testing strategy

The repo's vitest env is **`node`** (no jsdom, no IndexedDB). Plan accordingly:
- **Pure-logic unit tests** (node, no emulator): `db.ts` facade delegation + `setDbAdapter` swap; `migrateToCloud` union/dedup logic against in-memory fake `DataStore`s (assert non-destructive: nothing dropped, `reviewCount` summed/incremented, local cleared after success); `isFirebaseConfigured()` gating.
- **Emulator integration tests** (gated behind an env flag so the default `npm test` stays emulator-free and green at 80→N): `FirestoreDataStore` CRUD + pattern dedup transaction against the Firestore emulator; **Security Rules** tests via `@firebase/rules-unit-testing` (own-uid allow, cross-uid deny, unauth deny).
- **e2e** (Playwright, against the emulator): the login → merge → cross-"device" read happy path. Optional in v1 if emulator-in-CI is heavy; at minimum a manual smoke documented.
- **Regression guard**: the existing 80 unit tests + e2e must stay green unchanged (they exercise `localStorageAdapter`, which is now reached through `db.ts` in default/logged-out mode).

## 12. Scope summary

**IN (this spec):** `services/firebase.ts`, `store/db.ts` facade + 6 import swaps, `FirestoreDataStore`, `FirestoreAnalyticsSink`, `store/auth.ts` (Google), `services/migrateToCloud.ts`, Security Rules + emulator config (`firebase.json`, `firestore.rules`), runtime gating, minimal `AuthControl`, env vars, provisioning checklist (doc only), tests per §11.

**OUT (deferred):** Kakao, any Cloud Functions, Blaze, prod deployment, SRS, live multi-device sync UI, conflict resolution beyond union, PWA SW interaction, account deletion/export UI.
