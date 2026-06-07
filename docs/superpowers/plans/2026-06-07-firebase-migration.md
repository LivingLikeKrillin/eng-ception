# Firebase Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional cloud tier (Google sign-in + Firestore) behind the existing `DataStore`/`AnalyticsSink` seams so a user can sync their learning data across devices, with **zero regression** when logged out or when Firebase is unconfigured.

**Architecture:** A new switchable `db` facade (parallel to the existing `setSink()`) lets auth state swap the active `DataStore` at runtime: `localStorageAdapter` when logged out / unconfigured, a `FirestoreDataStore` when a Google user signs in. On sign-in, local data is union-merged up to Firestore non-destructively, then the local working store is cleared. Built and tested against the Firebase Local Emulator Suite; real cloud provisioning is a deferred account-level checklist. Kakao/Cloud Functions/Blaze are explicitly phase 2.

**Tech Stack:** React 19 + TS strict, Zustand 5, Vite 6, Vitest 4 (env=`node`), `firebase` (modular web SDK — resolved to v12, API-compatible), `@firebase/rules-unit-testing` + `firebase-tools` (emulator). (The emulator-test gate keys off `FIRESTORE_EMULATOR_HOST` that `firebase emulators:exec` sets — no `cross-env`/hand-set flag needed.)

**Spec:** `docs/superpowers/specs/2026-06-07-firebase-migration-design.md`

**Branch:** `feat/firebase-migration` (already created).

---

## File Structure

**New files:**
- `src/services/firebase.ts` — single Firebase init point + `isFirebaseConfigured()` gate + emulator wiring.
- `src/store/db.ts` — switchable `DataStore` facade (`db` + `setDbAdapter`).
- `src/store/firestoreDataStore.ts` — `createFirestoreDataStore(fs, uid)` factory implementing `DataStore`.
- `src/store/firestoreAnalyticsSink.ts` — `createFirestoreAnalyticsSink(fs, uid)` factory implementing `AnalyticsSink`.
- `src/services/migrateToCloud.ts` — non-destructive union upload of local → cloud + conditional local clear.
- `src/store/auth.ts` — Google sign-in/out, the single owner of the adapter/sink swap reaction, UI subscription helper.
- `src/components/common/AuthControl.tsx` — minimal login/logout UI (renders nothing when unconfigured).
- `firebase.json`, `.firebaserc`, `firestore.rules` — emulator config + security rules (repo root).
- Tests: `src/store/db.test.ts`, `src/services/migrateToCloud.test.ts`, `src/services/firebase.test.ts` (pure-logic, node, no emulator) and `src/store/firestoreDataStore.test.ts`, `src/firestore.rules.test.ts` (emulator-gated).

**Modified files:**
- 6 `db`-import sites: `src/main.tsx`, `src/store/learningStore.ts`, `src/pages/Home.tsx`, `src/pages/Learn.tsx`, `src/pages/Patterns.tsx`, `src/components/home/RecentLearning.tsx`.
- `src/main.tsx` — also registers the auth reaction when configured.
- `package.json` — deps + emulator test scripts.
- `.env.local` (gitignored; documented) + `CLAUDE.md` — env vars + a Firebase section.

**Pre-req (human/account, not code):** the emulator needs **Java** installed (`java -version`). Note this; it is the only local prerequisite.

---

## Chunk 1: Dependencies, Firebase init, config gating, emulator scaffold

### Task 1.1: Install dependencies

**Files:** Modify `package.json` (+ lockfile).

- [ ] **Step 1: Install**

Run:
```bash
npm i firebase
npm i -D @firebase/rules-unit-testing firebase-tools
```
Expected: installs cleanly on Windows (the old `@rollup/rollup-linux-x64-gnu` hard-dep wart is already gone; no `--force`).

- [ ] **Step 2: Verify build still green**

Run: `npx tsc -b`
Expected: EXIT 0.

- [ ] **Step 3: Commit**
```bash
git add package.json package-lock.json
git commit -m "build: add firebase + emulator/test deps"
```

### Task 1.2: Emulator scaffold (firebase.json, .firebaserc, rules)

**Files:** Create `firebase.json`, `.firebaserc`, `firestore.rules` (repo root).

- [ ] **Step 1: Create `firebase.json`**
```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true },
    "singleProjectMode": true
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

- [ ] **Step 2: Create `.firebaserc`** (the `demo-` prefix means the emulator needs no real cloud project)
```json
{ "projects": { "default": "demo-eng-ception" } }
```

- [ ] **Step 3: Create `firestore.rules`**
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

- [ ] **Step 4: Verify emulator boots** (requires Java)

Run: `npx firebase emulators:start --only auth,firestore --project demo-eng-ception`
Expected: "All emulators ready"; Auth on 9099, Firestore on 8080. Stop with Ctrl-C.
(If Java is missing, install Temurin JDK 21 and retry. This is the only local prereq.)

- [ ] **Step 5: Commit**
```bash
git add firebase.json .firebaserc firestore.rules
git commit -m "chore(firebase): emulator config + firestore security rules"
```

### Task 1.3: `services/firebase.ts` — init + gating (TDD on the pure-logic gate)

**Files:**
- Create: `src/services/firebase.ts`
- Test: `src/services/firebase.test.ts`

- [ ] **Step 1: Write the failing test** (`src/services/firebase.test.ts`)

Only the pure gate is unit-tested (the SDK init needs a browser/emulator; covered by emulator tests + manual smoke).
```ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { isFirebaseConfigured } from './firebase'

afterEach(() => vi.unstubAllEnvs())

describe('isFirebaseConfigured', () => {
  it('is false when env vars are absent', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '')
    vi.stubEnv('VITE_FIREBASE_APP_ID', '')
    expect(isFirebaseConfigured()).toBe(false)
  })

  it('is true when api key, project id, and app id are all present', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'k')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'p')
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'a')
    expect(isFirebaseConfigured()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/firebase.test.ts`
Expected: FAIL ("isFirebaseConfigured is not a function" / module not found).

- [ ] **Step 3: Write `src/services/firebase.ts`**

`isFirebaseConfigured()` reads env at call-time (so `vi.stubEnv` is honored). Firestore offline cache only where `indexedDB` exists (browser) — the vitest `node` env has none.
```ts
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore'

function readConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }
}

export function isFirebaseConfigured(): boolean {
  const c = readConfig()
  return Boolean(c.apiKey && c.projectId && c.appId)
}

let app: FirebaseApp | undefined
let authInstance: Auth | undefined
let firestoreInstance: Firestore | undefined

function ensureInit(): void {
  if (app) return
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured (VITE_FIREBASE_* missing)')
  }
  const config = readConfig()
  app = initializeApp(config)
  firestoreInstance =
    typeof indexedDB !== 'undefined'
      ? initializeFirestore(app, { localCache: persistentLocalCache() })
      : initializeFirestore(app, {})
  authInstance = getAuth(app)

  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(firestoreInstance, '127.0.0.1', 8080)
  }
}

export function getFirebaseAuth(): Auth {
  ensureInit()
  return authInstance!
}

export function getFirestoreDb(): Firestore {
  ensureInit()
  return firestoreInstance!
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/firebase.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc -b` → EXIT 0
```bash
git add src/services/firebase.ts src/services/firebase.test.ts
git commit -m "feat(firebase): init module + isFirebaseConfigured gate"
```

---

## Chunk 2: Switchable `db` facade + migrate the 6 import sites

### Task 2.1: `store/db.ts` facade (TDD)

**Files:**
- Create: `src/store/db.ts`
- Test: `src/store/db.test.ts`

- [ ] **Step 1: Write the failing test** (`src/store/db.test.ts`)
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db, setDbAdapter } from './db'
import { localStorageAdapter } from './localStorage'
import type { DataStore } from './dataStore'

function fakeAdapter(): DataStore & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    async init() { calls.push('init') },
    async getScenarios() { calls.push('getScenarios'); return [] },
    async getScenario() { calls.push('getScenario'); return null },
    async getUnlearnedScenarios() { calls.push('getUnlearnedScenarios'); return [] },
    async saveScenarios() { calls.push('saveScenarios') },
    async saveLearningRecord() { calls.push('saveLearningRecord') },
    async getLearningRecords() { calls.push('getLearningRecords'); return [] },
    async deleteLearningRecord() { calls.push('deleteLearningRecord') },
    async savePattern() { calls.push('savePattern') },
    async getPatterns() { calls.push('getPatterns'); return [] },
    async deletePattern() { calls.push('deletePattern') },
  }
}

describe('db facade', () => {
  beforeEach(() => setDbAdapter(localStorageAdapter))

  it('delegates to the active adapter and can be swapped at runtime', async () => {
    const fake = fakeAdapter()
    setDbAdapter(fake)
    await db.getPatterns()
    await db.savePattern({} as never)
    expect(fake.calls).toEqual(['getPatterns', 'savePattern'])
  })

  it('defaults to localStorageAdapter', async () => {
    // swapping back to default must not throw and must route there
    setDbAdapter(localStorageAdapter)
    await expect(db.getPatterns()).resolves.toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/db.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/store/db.ts`**
```ts
import type { DataStore } from './dataStore'
import { localStorageAdapter } from './localStorage'

// Single switchable seam for persistence — parallel to services/analytics.ts setSink().
// The 6 consumers import { db } from here; auth state swaps the backing adapter in one place.
let activeAdapter: DataStore = localStorageAdapter

export function setDbAdapter(adapter: DataStore): void {
  activeAdapter = adapter
}

export function getDbAdapter(): DataStore {
  return activeAdapter
}

// Stable facade: every method re-reads activeAdapter at call-time, so a swap is seen
// immediately by all holders of `db` without re-importing.
export const db: DataStore = {
  init: () => activeAdapter.init(),
  getScenarios: () => activeAdapter.getScenarios(),
  getScenario: (id) => activeAdapter.getScenario(id),
  getUnlearnedScenarios: (limit) => activeAdapter.getUnlearnedScenarios(limit),
  saveScenarios: (s) => activeAdapter.saveScenarios(s),
  saveLearningRecord: (r) => activeAdapter.saveLearningRecord(r),
  getLearningRecords: () => activeAdapter.getLearningRecords(),
  deleteLearningRecord: (id) => activeAdapter.deleteLearningRecord(id),
  savePattern: (p) => activeAdapter.savePattern(p),
  getPatterns: () => activeAdapter.getPatterns(),
  deletePattern: (id) => activeAdapter.deletePattern(id),
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/db.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**
```bash
git add src/store/db.ts src/store/db.test.ts
git commit -m "feat(store): switchable db facade (setDbAdapter)"
```

### Task 2.2: Migrate the 6 import sites to the facade

**Files:** Modify `src/store/learningStore.ts:6`, `src/pages/Home.tsx:3`, `src/pages/Learn.tsx:4`, `src/pages/Patterns.tsx:2`, `src/pages/Review.tsx:3`, `src/components/home/RecentLearning.tsx:2`, `src/main.tsx:5`.

- [ ] **Step 1: Replace each import line**

In each file change:
```ts
import { localStorageAdapter as db } from '<relative>/store/localStorage'
```
to the facade (adjust the relative depth per file):
```ts
import { db } from '<relative>/store/db'
```
Exact per file:
- `src/store/learningStore.ts`: `import { db } from './db'`
- `src/store/` is sibling, so in `src/pages/*.tsx`: `import { db } from '../store/db'`
- `src/components/home/RecentLearning.tsx`: `import { db } from '../../store/db'`
- `src/main.tsx`: `import { db } from './store/db'`

No call-site changes — `db` is a `DataStore` with identical methods.

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: EXIT 0.

- [ ] **Step 3: Run the FULL suite — confirm no regression**

Run: `npx vitest run`
Expected: all existing tests still pass (80) + the new `db`/`firebase` tests. Total green.

> **Why this should pass untouched:** `learningStore.test.ts` does `vi.mock('./localStorage', ...)` and `vi.spyOn(localStorage.localStorageAdapter, 'savePattern')`. `db.ts` imports `localStorageAdapter` from `./localStorage` (so it receives the mock) and delegates via call-time property access, so the spies on the mock object still observe the calls. **If a test unexpectedly fails**, apply the fallback in Step 4; otherwise skip it.

- [ ] **Step 4: (Fallback only if Step 3 failed) Point learningStore.test.ts at the facade**

In `src/store/learningStore.test.ts`:
- Replace `vi.mock('./localStorage', () => ({ localStorageAdapter: { ...fakes } }))` with `vi.mock('./db', () => ({ db: { ...same fakes }, setDbAdapter: () => {} }))`.
- Replace the 3 spy blocks `const localStorage = await import('./localStorage'); vi.spyOn(localStorage.localStorageAdapter, 'X')` with `const dbmod = await import('./db'); vi.spyOn(dbmod.db, 'X')`.
Re-run `npx vitest run` → green.

- [ ] **Step 5: Commit**
```bash
git add -A
git commit -m "refactor(store): route the 6 db consumers through the switchable facade"
```

---

## Chunk 3: FirestoreDataStore + FirestoreAnalyticsSink (emulator-tested)

### Task 3.1: `store/firestoreDataStore.ts`

**Files:**
- Create: `src/store/firestoreDataStore.ts`
- Test: `src/store/firestoreDataStore.test.ts` (emulator-gated)

- [ ] **Step 1: Write `src/store/firestoreDataStore.ts`**

Factory takes an injected `Firestore` + `uid` (so tests pass an emulator instance; prod passes `getFirestoreDb()`). Scenarios are bundled seed, never stored. Pattern dedup uses the composite key as doc id + `increment(1)` (queues offline; no `runTransaction`).
```ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  increment,
  type Firestore,
} from 'firebase/firestore'
import type { DataStore } from './dataStore'
import type { LearningRecord, Pattern } from '../types'
import { seedScenarios } from '../data/seed-scenarios'

const patternKey = (patternId: string, triggerVerb: string) => `${patternId}__${triggerVerb}`

export function createFirestoreDataStore(fs: Firestore, uid: string): DataStore {
  const recordsCol = () => collection(fs, 'users', uid, 'records')
  const patternsCol = () => collection(fs, 'users', uid, 'patterns')

  const store: DataStore = {
    async init() {
      // No migration step for Firestore (cloud has no local schema-version concept).
    },

    // Scenarios: identical bundled seed for everyone — never persisted per user.
    async getScenarios() {
      return seedScenarios
    },
    async getScenario(id) {
      return seedScenarios.find((s) => s.id === id) ?? null
    },
    async getUnlearnedScenarios(limit) {
      const records = await store.getLearningRecords()
      const learned = new Set(records.map((r) => r.scenarioId))
      return seedScenarios.filter((s) => !learned.has(s.id)).slice(0, limit)
    },
    async saveScenarios() {
      // no-op: bundled, not persisted
    },

    async saveLearningRecord(record) {
      await setDoc(doc(recordsCol(), record.id), record)
    },
    async getLearningRecords() {
      const snap = await getDocs(recordsCol())
      return snap.docs.map((d) => d.data() as LearningRecord)
    },
    async deleteLearningRecord(id) {
      await deleteDoc(doc(recordsCol(), id))
    },

    async savePattern(pattern) {
      const ref = doc(patternsCol(), patternKey(pattern.patternId, pattern.triggerVerb))
      const existing = await getDoc(ref) // served from cache when offline
      if (existing.exists()) {
        await setDoc(
          ref,
          { reviewCount: increment(1), lastReviewedAt: new Date().toISOString() },
          { merge: true },
        )
      } else {
        await setDoc(ref, pattern)
      }
    },
    async getPatterns() {
      const snap = await getDocs(patternsCol())
      return snap.docs.map((d) => d.data() as Pattern)
    },
    async deletePattern(id) {
      // interface deletes by Pattern.id (a uuid), not the composite doc key
      const snap = await getDocs(patternsCol())
      const match = snap.docs.find((d) => (d.data() as Pattern).id === id)
      if (match) await deleteDoc(match.ref)
    },
  }

  return store
}
```

- [ ] **Step 2: Write the emulator-gated test** (`src/store/firestoreDataStore.test.ts`)

Gated by `FIRESTORE_EMULATOR_HOST` (set by `firebase emulators:exec`) so the default `npm test` skips it — and an accidental run with no live emulator skips cleanly instead of throwing.
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import type { Firestore } from 'firebase/firestore'
import { createFirestoreDataStore } from './firestoreDataStore'
import type { LearningRecord, Pattern } from '../types'

const RUN = Boolean(process.env.FIRESTORE_EMULATOR_HOST) // set by `firebase emulators:exec`

const makeRecord = (over: Partial<LearningRecord> = {}): LearningRecord => ({
  id: 'r1', schemaVersion: 4, scenarioId: 's1', originalKorean: 'x',
  structureTypeId: 't', structureTypeLabel: 'T', pattern5hId: 'causative-bare',
  triggerVerb: 'make', finalSentence: 'I made him go.', precheckChoice: 'first',
  afterChoice: null, patternQuizCorrect: true, patternQuizUnsure: false,
  assemblyCorrect: true, completedAt: '2026-01-01T00:00:00Z', ...over,
})
const makePattern = (over: Partial<Pattern> = {}): Pattern => ({
  id: 'p1', template: 'I made him ~', patternId: 'causative-bare', triggerVerb: 'make',
  category: 'c', tags: [], exampleOriginal: 'x', exampleEnglish: 'y',
  savedAt: '2026-01-01T00:00:00Z', reviewCount: 0, lastReviewedAt: null, ...over,
})

describe.skipIf(!RUN)('FirestoreDataStore (emulator)', () => {
  let env: RulesTestEnvironment
  let fs: Firestore

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-eng-ception',
      firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    })
  })
  afterAll(async () => { await env.cleanup() })
  beforeEach(async () => { await env.clearFirestore() })

  function storeFor(uid: string) {
    const ctx = env.authenticatedContext(uid)
    fs = ctx.firestore() as unknown as Firestore
    return createFirestoreDataStore(fs, uid)
  }

  it('round-trips a learning record', async () => {
    const db = storeFor('u1')
    await db.saveLearningRecord(makeRecord())
    const all = await db.getLearningRecords()
    expect(all).toHaveLength(1)
    expect(all[0].pattern5hId).toBe('causative-bare')
  })

  it('dedups patterns by patternId+triggerVerb and increments reviewCount', async () => {
    const db = storeFor('u1')
    await db.savePattern(makePattern({ id: 'p1' }))
    await db.savePattern(makePattern({ id: 'p2' })) // same key
    const all = await db.getPatterns()
    expect(all).toHaveLength(1)
    expect(all[0].reviewCount).toBe(1) // 0 on create, +1 on second save
  })

  it('keeps distinct patterns for different trigger verbs', async () => {
    const db = storeFor('u1')
    await db.savePattern(makePattern({ id: 'p1', triggerVerb: 'make' }))
    await db.savePattern(makePattern({ id: 'p2', triggerVerb: 'let' }))
    expect(await db.getPatterns()).toHaveLength(2)
  })

  it('getUnlearnedScenarios excludes scenarios with a record', async () => {
    const db = storeFor('u1')
    const before = await db.getUnlearnedScenarios(100)
    await db.saveLearningRecord(makeRecord({ id: 'r1', scenarioId: before[0].id }))
    const after = await db.getUnlearnedScenarios(100)
    expect(after.find((s) => s.id === before[0].id)).toBeUndefined()
  })
})
```

- [ ] **Step 3: Add emulator test script to `package.json`**
```json
"test:emulator": "firebase emulators:exec --only auth,firestore --project demo-eng-ception \"vitest run --no-file-parallelism src/store/firestoreDataStore.test.ts src/firestore.rules.test.ts\""
```

- [ ] **Step 4: Run default suite (emulator test must SKIP)**

Run: `npx vitest run`
Expected: green; the FirestoreDataStore describe is skipped (no `FIRESTORE_EMULATOR_HOST`). Count unchanged from Chunk 2.

- [ ] **Step 5: Run the FirestoreDataStore emulator tests (requires Java)**

The `test:emulator` script's glob also lists `src/firestore.rules.test.ts`, which doesn't exist until Task 3.2 — so run just this file now to avoid a missing-file error:
```bash
npx firebase emulators:exec --only auth,firestore --project demo-eng-ception "vitest run src/store/firestoreDataStore.test.ts"
```
Expected: emulator boots, the 4 FirestoreDataStore tests PASS, emulator shuts down. (The full `npm run test:emulator` — both files — is exercised in Task 3.2 Step 2.)

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc -b` → EXIT 0
```bash
git add src/store/firestoreDataStore.ts src/store/firestoreDataStore.test.ts package.json
git commit -m "feat(store): FirestoreDataStore adapter (emulator-tested, offline-safe dedup)"
```

### Task 3.2: Security Rules test

**Files:** Create `src/firestore.rules.test.ts` (emulator-gated).

- [ ] **Step 1: Write the rules test**
```ts
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const RUN = Boolean(process.env.FIRESTORE_EMULATOR_HOST) // set by `firebase emulators:exec`

describe.skipIf(!RUN)('firestore security rules', () => {
  let env: RulesTestEnvironment
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-eng-ception',
      firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    })
  })
  afterAll(async () => { await env.cleanup() })
  beforeEach(async () => { await env.clearFirestore() })

  it('lets a user write their own records', async () => {
    const fs = env.authenticatedContext('u1').firestore()
    await assertSucceeds(setDoc(doc(fs, 'users/u1/records/r1'), { ok: true }))
  })

  it('denies reading another user\'s data', async () => {
    const fs = env.authenticatedContext('u1').firestore()
    await assertFails(getDoc(doc(fs, 'users/u2/records/r1')))
  })

  it('denies unauthenticated access', async () => {
    const fs = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(fs, 'users/u1/records/r1')))
  })
})
```

- [ ] **Step 2: Run the emulator suite**

Run: `npm run test:emulator`
Expected: FirestoreDataStore + rules tests all PASS.

- [ ] **Step 3: Commit**
```bash
git add src/firestore.rules.test.ts
git commit -m "test(firebase): security rules — own-uid allow, cross-uid + unauth deny"
```

### Task 3.3: `store/firestoreAnalyticsSink.ts`

**Files:** Create `src/store/firestoreAnalyticsSink.ts`.

- [ ] **Step 1: Write the sink** (mirrors `localAnalyticsSink` contract: `track` never throws into caller)
```ts
import { collection, doc, getDocs, setDoc, deleteDoc, type Firestore } from 'firebase/firestore'
import type { AnalyticsSink } from './analyticsSink'
import type { AnalyticsEvent } from '../types/events'

export function createFirestoreAnalyticsSink(fs: Firestore, uid: string): AnalyticsSink {
  const col = () => collection(fs, 'users', uid, 'events')
  return {
    track(event: AnalyticsEvent) {
      // fire-and-forget; telemetry must never break the learning flow
      void setDoc(doc(col(), event.id), event).catch(() => {})
    },
    async getAll() {
      try {
        const snap = await getDocs(col())
        return snap.docs.map((d) => d.data() as AnalyticsEvent)
      } catch {
        return []
      }
    },
    async clear() {
      try {
        const snap = await getDocs(col())
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
      } catch {
        // best-effort
      }
    },
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b` → EXIT 0. (No dedicated unit test: thin pass-through; exercised via the manual smoke + the same emulator infra. Add to the emulator describe later only if regressions appear — YAGNI.)

- [ ] **Step 3: Commit**
```bash
git add src/store/firestoreAnalyticsSink.ts
git commit -m "feat(store): FirestoreAnalyticsSink (parallel telemetry seam)"
```

---

## Chunk 4: migrateToCloud + auth orchestration + bootstrap wiring + UI

### Task 4.1: `services/migrateToCloud.ts` (TDD, pure logic)

**Files:**
- Create: `src/services/migrateToCloud.ts`
- Test: `src/services/migrateToCloud.test.ts`

- [ ] **Step 1: Write the failing test** (uses in-memory fake DataStores; no emulator)
```ts
import { describe, it, expect } from 'vitest'
import { migrateToCloud } from './migrateToCloud'
import type { DataStore } from '../store/dataStore'
import type { LearningRecord, Pattern } from '../types'

function memStore(seedRecords: LearningRecord[] = [], seedPatterns: Pattern[] = []): DataStore {
  let records = [...seedRecords]
  let patterns = [...seedPatterns]
  return {
    async init() {},
    async getScenarios() { return [] },
    async getScenario() { return null },
    async getUnlearnedScenarios() { return [] },
    async saveScenarios() {},
    async saveLearningRecord(r) { if (!records.find((x) => x.id === r.id)) records.push(r) },
    async getLearningRecords() { return records },
    async deleteLearningRecord(id) { records = records.filter((r) => r.id !== id) },
    async savePattern(p) {
      const k = (x: Pattern) => `${x.patternId}__${x.triggerVerb}`
      const hit = patterns.find((x) => k(x) === k(p))
      if (hit) hit.reviewCount += 1
      else patterns.push({ ...p })
    },
    async getPatterns() { return patterns },
    async deletePattern(id) { patterns = patterns.filter((p) => p.id !== id) },
  }
}
const rec = (id: string): LearningRecord => ({
  id, schemaVersion: 4, scenarioId: null, originalKorean: 'x', structureTypeId: 't',
  structureTypeLabel: 'T', pattern5hId: 'causative-bare', triggerVerb: 'make',
  finalSentence: 's', precheckChoice: null, afterChoice: null, patternQuizCorrect: true,
  patternQuizUnsure: false, assemblyCorrect: true, completedAt: '2026-01-01T00:00:00Z',
})
const pat = (id: string, verb: string): Pattern => ({
  id, template: 't', patternId: 'causative-bare', triggerVerb: verb, category: 'c',
  tags: [], exampleOriginal: 'x', exampleEnglish: 'y', savedAt: '2026-01-01T00:00:00Z',
  reviewCount: 0, lastReviewedAt: null,
})

describe('migrateToCloud', () => {
  it('unions local into cloud non-destructively and clears local on success', async () => {
    const local = memStore([rec('r1')], [pat('p1', 'make')])
    const cloud = memStore([rec('r2')], [pat('p2', 'let')])
    await migrateToCloud(local, cloud)
    expect((await cloud.getLearningRecords()).map((r) => r.id).sort()).toEqual(['r1', 'r2'])
    expect((await cloud.getPatterns()).map((p) => p.triggerVerb).sort()).toEqual(['let', 'make'])
    expect(await local.getLearningRecords()).toHaveLength(0)
    expect(await local.getPatterns()).toHaveLength(0)
  })

  it('increments reviewCount when a pattern already exists in cloud', async () => {
    const local = memStore([], [pat('p1', 'make')])
    const cloud = memStore([], [pat('p2', 'make')]) // same key
    await migrateToCloud(local, cloud)
    const cp = await cloud.getPatterns()
    expect(cp).toHaveLength(1)
    expect(cp[0].reviewCount).toBe(1)
  })

  it('does NOT clear local if a cloud write rejects', async () => {
    const local = memStore([rec('r1')], [])
    const cloud = memStore()
    cloud.saveLearningRecord = async () => { throw new Error('permission-denied') }
    await expect(migrateToCloud(local, cloud)).rejects.toThrow()
    expect(await local.getLearningRecords()).toHaveLength(1) // intact
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/migrateToCloud.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/services/migrateToCloud.ts`**
```ts
import type { DataStore } from '../store/dataStore'

// Non-destructive union upload of the local working store into the cloud store, then
// clear local — but ONLY after every cloud write resolves (offline: durably queued in
// the Firestore cache). If any write rejects, throw and leave local intact (no partial
// loss). Idempotent across repeat logins (records by id, patterns by composite key).
export async function migrateToCloud(local: DataStore, cloud: DataStore): Promise<void> {
  const [records, patterns] = await Promise.all([
    local.getLearningRecords(),
    local.getPatterns(),
  ])

  await Promise.all([
    ...records.map((r) => cloud.saveLearningRecord(r)),
    ...patterns.map((p) => cloud.savePattern(p)),
  ])

  // reached only if all writes above resolved
  await Promise.all([
    ...records.map((r) => local.deleteLearningRecord(r.id)),
    ...patterns.map((p) => local.deletePattern(p.id)),
  ])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/migrateToCloud.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add src/services/migrateToCloud.ts src/services/migrateToCloud.test.ts
git commit -m "feat(firebase): non-destructive union merge on login (migrateToCloud)"
```

### Task 4.2: `store/auth.ts` — Google auth + swap reaction

**Files:** Create `src/store/auth.ts`.

- [ ] **Step 1: Write `src/store/auth.ts`**

The single owner of the adapter/sink swap. `registerAuthReaction()` is called once at bootstrap (only when configured). `onUserChanged()` is the UI subscription. `migratedUid` guards against re-migrating on every token refresh.
```ts
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { getFirebaseAuth, getFirestoreDb, isFirebaseConfigured } from '../services/firebase'
import { setDbAdapter } from './db'
import { localStorageAdapter } from './localStorage'
import { createFirestoreDataStore } from './firestoreDataStore'
import { createFirestoreAnalyticsSink } from './firestoreAnalyticsSink'
import { setSink } from '../services/analytics'
import { localAnalyticsSink } from './localAnalyticsSink'
import { migrateToCloud } from '../services/migrateToCloud'

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider())
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth())
}

export function getCurrentUser(): User | null {
  if (!isFirebaseConfigured()) return null
  return getFirebaseAuth().currentUser
}

// UI subscription. Inert (calls back null once) when unconfigured.
export function onUserChanged(cb: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured()) {
    cb(null)
    return () => {}
  }
  return onAuthStateChanged(getFirebaseAuth(), cb)
}

let migratedUid: string | null = null

// Telemetry kill-switch must outrank the swap: when analytics is disabled we still swap
// the *data* adapter (records/patterns must go to Firestore for a signed-in user) but we
// must NOT (re)install any analytics sink — otherwise sign-in would silently re-enable
// telemetry that VITE_DISABLE_ANALYTICS turned off. Only the setSink calls are gated.
const analyticsOn = import.meta.env.VITE_DISABLE_ANALYTICS !== 'true'

// Call once at bootstrap (configured only). Owns the local<->Firestore swap.
export function registerAuthReaction(): () => void {
  return onAuthStateChanged(getFirebaseAuth(), async (user) => {
    if (user) {
      const cloud = createFirestoreDataStore(getFirestoreDb(), user.uid)
      if (migratedUid !== user.uid) {
        try {
          // Only records + patterns are migrated. Analytics events are content-free,
          // append-only, disposable telemetry (spec §4.4/§5) — deliberately NOT migrated.
          await migrateToCloud(localStorageAdapter, cloud)
          migratedUid = user.uid
        } catch {
          // merge failed — stay on local; do not swap (no data loss)
          return
        }
      }
      setDbAdapter(cloud)
      if (analyticsOn) setSink(createFirestoreAnalyticsSink(getFirestoreDb(), user.uid))
    } else {
      migratedUid = null
      setDbAdapter(localStorageAdapter)
      if (analyticsOn) setSink(localAnalyticsSink)
    }
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b` → EXIT 0. (Auth is integration-tested via the manual smoke in Chunk 5; the emulator's Auth + a real Google popup are out of unit-test reach. The pure pieces it composes — `db` facade, `migrateToCloud` — are already unit-tested.)

- [ ] **Step 3: Run full suite (no regression)**

Run: `npx vitest run`
Expected: green, count unchanged.

- [ ] **Step 4: Commit**
```bash
git add src/store/auth.ts
git commit -m "feat(firebase): Google auth + adapter/sink swap reaction"
```

### Task 4.3: Wire bootstrap in `main.tsx`

**Files:** Modify `src/main.tsx`.

- [ ] **Step 1: Update `main.tsx`**

`db` import already changed in Task 2.2. Add the auth reaction when configured. Set the local sink first; the auth reaction (which resolves asynchronously after this block) overrides to the Firestore sink for a signed-in user — no race.
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { db } from './store/db'
import { setSink, installDevEgress } from './services/analytics'
import { localAnalyticsSink } from './store/localAnalyticsSink'
import { registerAnalyticsLifecycle } from './services/analyticsLifecycle'
import { isFirebaseConfigured } from './services/firebase'
import { registerAuthReaction } from './store/auth'

async function bootstrap() {
  await db.init()

  // Telemetry: default facade sink is noop; wire the local ring buffer unless disabled.
  if (import.meta.env.VITE_DISABLE_ANALYTICS !== 'true') {
    setSink(localAnalyticsSink)
    registerAnalyticsLifecycle()
    if (import.meta.env.DEV) installDevEgress()
  }

  // Cloud tier is additive: only when Firebase is configured. The reaction swaps the
  // db adapter (and analytics sink) to Firestore once a Google user is present.
  if (isFirebaseConfigured()) {
    registerAuthReaction()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc -b` → EXIT 0 ; `npm run lint` → clean.

- [ ] **Step 3: Commit**
```bash
git add src/main.tsx
git commit -m "feat(firebase): register auth reaction in bootstrap when configured"
```

### Task 4.4: `components/common/AuthControl.tsx` — minimal UI

**Files:** Create `src/components/common/AuthControl.tsx`; modify `src/pages/Home.tsx` header.

- [ ] **Step 1: Write `AuthControl.tsx`** (renders nothing when unconfigured; matches the rounded-pill header aesthetic)
```tsx
import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { isFirebaseConfigured } from '../../services/firebase'
import { onUserChanged, signInWithGoogle, signOutUser } from '../../store/auth'

export default function AuthControl() {
  const [user, setUser] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)

  // block body (not implicit return) so the unsubscribe is the cleanup unambiguously —
  // avoids any no-confusing-void-expression lint edge.
  useEffect(() => {
    return onUserChanged(setUser)
  }, [])

  if (!isFirebaseConfigured()) return null

  const handle = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } catch {
      // popup closed / blocked — stay as-is
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return (
      <button
        onClick={() => handle(signOutUser)}
        disabled={busy}
        className="pressable flex items-center gap-1.5 bg-c rounded-full pl-1 pr-3 py-1 border border-line/60 text-xs text-t2"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <span className="w-6 h-6 rounded-full bg-c2" />
        )}
        로그아웃
      </button>
    )
  }

  return (
    <button
      onClick={() => handle(signInWithGoogle)}
      disabled={busy}
      className="pressable flex items-center gap-1.5 bg-c rounded-full px-3 py-1.5 border border-line/60 text-xs font-semibold text-t2"
    >
      Google로 로그인
    </button>
  )
}
```

- [ ] **Step 2: Mount in `Home.tsx` header**

In `src/pages/Home.tsx`, import and place `AuthControl` next to the existing "일째" chip. Add `import AuthControl from '../components/common/AuthControl'`. Change the header's right side so the day-streak chip and the auth control sit together:
```tsx
{/* Header */}
<div className="px-6 pt-5 flex justify-between items-center">
  <img src="/logo.png" alt="Eng-ception" className="w-28 h-28 object-contain -ml-3 -my-6" />
  <div className="flex items-center gap-2">
    <AuthControl />
    <div className="fi flex items-center gap-1.5 bg-c rounded-full px-3 py-1.5 border border-line/60">
      {/* ...existing svg + "4" + "일째"... unchanged... */}
    </div>
  </div>
</div>
```
(Keep the existing chip markup verbatim inside the new wrapper.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc -b` → EXIT 0 ; `npm run lint` → clean.

- [ ] **Step 4: Verify default dev (unconfigured) renders no auth UI**

Run: `npm run dev` (mock mode, no `VITE_FIREBASE_*`). Open the app: Home header shows only the day-streak chip; no login button. The existing e2e flow is unaffected.

- [ ] **Step 5: Commit**
```bash
git add src/components/common/AuthControl.tsx src/pages/Home.tsx
git commit -m "feat(ui): minimal AuthControl in Home header (hidden when unconfigured)"
```

---

## Chunk 5: Verification, env docs, manual cloud smoke

### Task 5.1: Env vars + `.env.local` + CLAUDE.md

**Files:** Modify `.env.local` (gitignored — document only), `CLAUDE.md`.

- [ ] **Step 1: Document env vars in `.env.local`** (do not commit secrets; this file is gitignored)
```
# Firebase (optional — app runs local-only if unset)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_USE_FIREBASE_EMULATOR=true   # local dev against the emulator suite
```

- [ ] **Step 2: Update `CLAUDE.md`**

Add to the "환경 변수" block the 5 `VITE_FIREBASE_*` / `VITE_USE_FIREBASE_EMULATOR` vars. Add a new "## Firebase (cloud tier)" section summarizing: local-first + optional Google login; `db` facade swap parallel to `setSink`; `FirestoreDataStore`/`FirestoreAnalyticsSink` factories; emulator-first dev (`npm run test:emulator`, `firebase emulators:start`); Kakao/Functions/Blaze deferred to phase 2; provisioning checklist lives in the spec. Update the project structure tree with the new files. **Update every inline test count** — CLAUDE.md currently embeds `(80)` in the commands block (`npm run test ... 80 tests`) AND in the 검증 레시피 line (`npx vitest run` (80)); change both to the actual final count recorded in Task 5.2 Step 2 (expected 87). Add `npm run test:emulator` to the recipe as the emulator-gated extra (Java + emulator required; not part of the default count).

- [ ] **Step 3: Commit**
```bash
git add CLAUDE.md
git commit -m "docs: document Firebase cloud tier + env vars in CLAUDE.md"
```

### Task 5.2: Full verification recipe

- [ ] **Step 1: Typecheck** — `npx tsc -b` → EXIT 0
- [ ] **Step 2: Unit/integration (no emulator)** — `npx vitest run` → all green (80 prior + new: firebase gate 2, db 2, migrateToCloud 3 = 87; emulator describes skipped). Record the exact final count.
- [ ] **Step 3: Lint** — `npm run lint` → clean
- [ ] **Step 4: Emulator suite** — `npm run test:emulator` → FirestoreDataStore (4) + rules (3) PASS
- [ ] **Step 5: e2e regression** — `npm run test:e2e` → green (cold-run flaky per repo gotcha; re-run before treating a failure as a regression). Confirms the local-only path is untouched.

### Task 5.3: Manual cloud smoke (emulator, real auth flow)

This exercises the one path no automated test covers: a real sign-in → merge → adapter swap, against the Auth + Firestore emulators.

- [ ] **Step 1: Start emulators** — `npx firebase emulators:start --only auth,firestore --project demo-eng-ception`
- [ ] **Step 2: Configure dev for the emulator** — in `.env.local` set `VITE_USE_FIREBASE_EMULATOR=true` and dummy but present `VITE_FIREBASE_API_KEY=demo`, `VITE_FIREBASE_PROJECT_ID=demo-eng-ception`, `VITE_FIREBASE_APP_ID=demo` (so `isFirebaseConfigured()` is true and the SDK points at the emulator).
- [ ] **Step 3: Run app** — `npm run dev`. Before login: complete one learning session so a record+pattern exist in localStorage.
- [ ] **Step 4: Sign in** — click "Google로 로그인"; the Auth emulator shows an account picker (add a test user). After sign-in: confirm the header shows 로그아웃.
- [ ] **Step 5: Verify merge** — in the Firestore emulator UI (http://127.0.0.1:4000), confirm `/users/{uid}/records/*` and `/users/{uid}/patterns/*` contain the pre-login data; confirm localStorage `eng-ception:records`/`:patterns` are now empty (cleared after merge).
- [ ] **Step 6: Verify cross-session read** — reload the app while signed in: Review/Patterns pages show the data (now served from Firestore). Sign out → local-only empty state returns; sign back in → data reappears.
- [ ] **Step 7: Record the smoke result** in the PR description (no code change). Reset `.env.local` to mock-only defaults afterward.

### Task 5.4: Finish the branch

- [ ] **Step 1:** Use superpowers:finishing-a-development-branch to choose merge/PR. Push `feat/firebase-migration`; open a PR summarizing scope (IN/OUT from the spec), the verification recipe results, and the manual smoke outcome. Note the deferred provisioning checklist + phase-2 Kakao.

---

## Notes for the executor

- **Verify recipe** (this repo): `npx tsc -b` (NOT `--noEmit` — root tsconfig is `files:[]`+references) · `npx vitest run` · `npm run lint` · `npm run test:e2e` · `npm run test:emulator` (needs Java).
- **vitest env is `node`** — no `window`/`document`/`indexedDB`. Pure-logic tests only by default; Firestore tests are emulator-gated via `FIRESTORE_EMULATOR_HOST` (set by `firebase emulators:exec`) so `npm test` stays fast and green, and a stray run with no live emulator skips cleanly rather than erroring.
- **Offline-safety** is why pattern dedup uses `setDoc`+`increment` not `runTransaction` (transactions need a server round-trip; they are not queued offline). See spec §4.3.
- **Non-destructive merge** is the highest-risk piece: `migrateToCloud` clears local only after all cloud writes resolve. Its union/dedup/abort behavior is unit-tested (Task 4.1).
- **No schema bump** — `LearningRecord`/`Pattern` v4 shapes serialize directly to Firestore docs (ISO-string timestamps kept for adapter symmetry).
- **Kakao, Cloud Functions, Blaze, prod deployment, SRS** are out of scope (spec §12). Leave the `auth.ts` provider/`AuthControl` button seam open for a phase-2 Kakao button.
