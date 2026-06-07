# Eng-ception — Event Tracking (infra-first, local-first) Design

> **Status**: Design (pending spec review + user approval)
> **Date**: 2026-06-07
> **Author**: collaborative (Eisen + Claude)
> **Scope**: Capture the **behavioral/temporal** layer of a learning session — lifecycle, per-step dwell, drop-off step, fetch latency/error — that the completion-only `LearningRecord` cannot see. Local-first storage behind a pluggable `AnalyticsSink` interface (parallel to `DataStore`), so a Firebase/PostHog sink slots in later. Dev-debug egress only for now; no user-facing analytics UI.
> **Relates to**: P2 backlog item #5 (CLAUDE.md "다음 단계" #3). Measurement substrate for evaluating #3 (Firebase), #6 (SRS).

---

## 1. Context & problem

### 1.1 What we can measure today, and the gap

The 7-step single-session flow (input → empathy → precheck → step0..4) persists exactly one artifact: a `LearningRecord` (schema v4), written **only on `complete()`**. It captures *outcome* signals — `pattern5hId`, `triggerVerb`, `patternQuizCorrect`, `patternQuizUnsure`, `assemblyCorrect`, `finalSentence`, `precheckChoice`, `afterChoice`.

What it structurally cannot see:

- **Incomplete sessions.** A user who abandons at step1 produces *no record at all*. The most important UX signal — where people give up — is invisible.
- **Time.** How long each step takes; total session duration.
- **Perceived latency.** The real Claude API generation is ~19s (mock is 600ms). The empathy/precheck screens exist precisely to mask this wait (`payloadStatus: loading`). Whether that masking works is unmeasured.
- **Fetch failures.** Timeout/parse/network errors and how often retry recovers.

Event tracking adds this temporal/behavioral layer alongside (not replacing) the outcome record.

### 1.2 Why local-first, infra-first (not an external SDK yet)

There is **no userbase yet**: pre-Firebase, single-device `localStorage`, solo dev. Wiring an external analytics vendor (PostHog/GA4/Plausible) now means measuring nobody, while paying a vendor + consent surface + PWA-offline-buffering cost up front. So this milestone builds the **capture substrate** — instrumentation points and a storage/egress abstraction — not a vendor integration. The eventual remote sink is a one-file slot-in, exactly parallel to how `localStorage` → Firestore is staged for `DataStore`.

## 2. Goals and non-goals

### Goals

- Capture lifecycle (`session_start` / `session_complete` / `session_abandon`), per-step dwell, drop-off step, and fetch latency/error as typed events.
- Store events locally behind an `AnalyticsSink` interface so a Firestore/PostHog sink slots in later (DataStore-parallel).
- Centralize instrumentation in the Zustand store (single source of truth for step transitions), via a `track()` facade — never scatter it across components.
- Make analytics **non-fatal**: a sink failure (quota, serialization) must never break the learning flow.
- Keep events **content-free** (no raw Korean input, no generated English) — only taxonomy ids, enums, booleans, durations — so a future remote flush is PIPA-safe.
- Provide a **dev-only egress** (`window.__engEvents()` / JSON dump) to verify instrumentation works.

### Non-goals

- No external analytics vendor integration (PostHog/GA4/etc.) — deferred until there is a userbase (post-Firebase).
- No user-facing analytics/diagnostic UI. (The SRS "내 회로 진단" view in [[expert_pedagogy_review]] is a separate, later concern.)
- No consent/opt-in UI yet (a `VITE_DISABLE_ANALYTICS` kill-switch slot is provided; a real consent gate lands with Firebase auth).
- No per-interaction granularity (block taps, connector picks, quiz re-picks). Deferred; revisit if drop-off analysis needs finer detail.
- No remote flush / buffering-across-auth logic (documented as forward path, not built).

## 3. Event taxonomy

A single envelope type with an event-specific `props` bag. Discriminated by `name`.

```ts
// src/types/events.ts
export type EventName =
  | 'session_start'
  | 'session_complete'
  | 'session_abandon'
  | 'step_dwell'
  | 'fetch_start'
  | 'fetch_success'
  | 'fetch_error'

export interface AnalyticsEvent {
  id: string            // crypto.randomUUID()
  name: EventName
  ts: string            // ISO-8601, new Date().toISOString()
  sessionId: string     // per-learning-session uuid (correlates all events in one session)
  props: Record<string, string | number | boolean | null>
}
```

Per-event `props` (all content-free):

| Event | When | props |
|---|---|---|
| `session_start` | `startScenario` / `startCustom` | `source: 'scenario'\|'custom'`, `scenarioId: string\|null`, `pattern5hId: string\|null` (null until payload ready) |
| `fetch_start` | top of `runFetch` | — |
| `fetch_success` | payload resolved + validated | `latencyMs: number` |
| `fetch_error` | `runFetch` catch | `latencyMs: number`, `kind: 'timeout'\|'parse'\|'network'\|'unknown'` |
| `step_dwell` | leaving any step (fired by `transitionTo`) | `step: V9Step`, `dwellMs: number` |
| `session_complete` | `complete()`, before `set(initial)` | `pattern5hId`, `triggerVerb`, `assemblyCorrect`, `patternQuizCorrect`, `patternQuizUnsure`, `durationMs` |
| `session_abandon` | in-progress session torn down without completing | `lastStep: V9Step`, `reason: 'reset'\|'restart'\|'hidden'`, `durationMs` |

Notes:
- `pattern5hId`/`scenarioId`/`triggerVerb` are taxonomy identifiers, **not** PII.
- `fetch_error.kind` reuses the existing `errorToKoreanMessage` classification (timeout/parse/network/unknown).
- `step_dwell` for `input` is not meaningful (session starts at empathy); the first dwell measured is `empathy`.

## 4. Architecture & components

Five small, single-purpose units. New files marked **(NEW)**.

### 4.1 `src/types/events.ts` (NEW)
The `EventName` union + `AnalyticsEvent` envelope (above). Platform-agnostic, no deps.

### 4.2 `src/store/analyticsSink.ts` (NEW) — the interface
```ts
export interface AnalyticsSink {
  track(event: AnalyticsEvent): void   // fire-and-forget; MUST NOT throw into the caller
  getAll(): Promise<AnalyticsEvent[]>  // dev egress + future remote flush
  clear(): Promise<void>
}
```
Mirrors the `DataStore` abstraction. This is the slot-in seam for `FirestoreAnalyticsSink` / `PostHogAnalyticsSink` later.

### 4.3 `src/store/localAnalyticsSink.ts` (NEW) — localStorage ring buffer
- Key `eng-ception:events`; own version key `eng-ception:events-version` = `1` (telemetry is independent of the v4 record schema — a record-schema bump must not nuke events, and vice-versa).
- `MAX_EVENTS = 1000`; on overflow drop oldest (ring buffer), same shape as `MAX_RECORDS` rotation in `localStorage.ts`.
- `track()` body wrapped in `try/catch` — quota-exceeded or JSON errors are swallowed (telemetry must never break the app).

### 4.4 `src/services/analytics.ts` (NEW) — the `track()` facade
- Holds the active sink (default `localAnalyticsSink`; injectable for tests).
- `track(name, props, sessionId)` builds the envelope (`crypto.randomUUID()`, `toISOString()`) and forwards to the sink.
- `NoopAnalyticsSink` for tests / when disabled.
- **Kill-switch:** `VITE_DISABLE_ANALYTICS === 'true'` → noop sink (consent gate slots here later).
- **Dev egress (DEV only):** assigns `window.__engEvents = () => sink.getAll()` and exposes `exportEventsJson()`. Stripped in prod by `import.meta.env.DEV` guard.

### 4.5 `src/store/learningStore.ts` (instrumentation — edits, not new)
New state fields: `sessionId: string | null`, `sessionStartedAt: number | null`, `stepEnteredAt: number | null`, `sessionEnded: boolean` (guards double-abandon).

- **Private `transitionTo(step)`** helper: fires `step_dwell` for the step being left (`now − stepEnteredAt`), sets `stepEnteredAt = now`, sets `currentStep = step`. **All** existing step changes route through it (`advanceFromEmpathy`, the `submitPrecheck` timeout, `advanceToStep1/2/3/4`). This is the single dwell source.
- **`startScenario` / `startCustom`**: first call `maybeTrackAbandon('restart')` (an in-progress prior session being overwritten), then generate `sessionId`, set `sessionStartedAt = stepEnteredAt = now`, `sessionEnded = false`, `track('session_start', …)`, then `runFetch`.
- **`runFetch`**: capture `t0 = now`; `track('fetch_start')`; on success `track('fetch_success', { latencyMs })` and patch the pending `session_start` pattern via a separate event is unnecessary — `session_complete` carries the final pattern, so `fetch_success` need not. on error `track('fetch_error', { latencyMs, kind })`.
- **`complete()`**: `track('session_complete', …)` (duration + outcome signals) and set `sessionEnded = true` **before** `set(initial)`.
- **`reset()`**: `maybeTrackAbandon('reset')` then `set(initial)`.
- **`maybeTrackAbandon(reason)`** helper: if `sessionId && !sessionEnded && currentStep !== 'step4'`, fire `session_abandon`, set `sessionEnded = true`.

### 4.6 `src/services/analyticsLifecycle.ts` (NEW) — tab-close abandon
- Registers one `document.addEventListener('visibilitychange', …)` (reliable on mobile PWA, unlike `beforeunload`).
- On `hidden`: read `useLearningStore.getState()`; if a session is in-progress and not ended, call the store's abandon path with `reason: 'hidden'`.
- Called once from `bootstrap()` in `main.tsx`, after `db.init()`.

## 5. Data flow

```
startCustom(korean)
  → maybeTrackAbandon('restart')      // if a prior session was live
  → sessionId = uuid; track(session_start{source:'custom', scenarioId:null})
  → runFetch: track(fetch_start) … track(fetch_success{latencyMs}) | track(fetch_error{latencyMs,kind})
advanceFromEmpathy → transitionTo(precheck)  → step_dwell{step:'empathy', dwellMs}
submitPrecheck     → (400ms) transitionTo(step0) → step_dwell{step:'precheck', …}
advanceToStep1/2/3/4 → transitionTo(…)        → step_dwell{step:'stepN', …}
complete()         → track(session_complete{durationMs, …outcome}) ; sessionEnded=true ; set(initial)
— OR mid-flow —
reset() / restart  → maybeTrackAbandon → session_abandon{lastStep, reason, durationMs}
tab hidden mid-flow→ visibilitychange → session_abandon{reason:'hidden'}
```

Every event shares the session's `sessionId`, so a funnel (start → dwell sequence → complete/abandon) reconstructs from a flat event list.

## 6. Error handling & edge cases

- **Analytics never throws into the app.** `localAnalyticsSink.track` and the facade both `try/catch`. Worst case: an event is dropped.
- **localStorage quota.** Ring buffer caps at `MAX_EVENTS`; serialization errors caught and skipped.
- **Double-abandon guard.** `sessionEnded` flag prevents `reset()`-after-`complete()` or `visibilitychange`-then-`reset()` from firing two terminal events. `complete()` sets it before `set(initial)`; `set(initial)` resets it to `false` for the next session.
- **Restart over live session.** `startScenario`/`startCustom` run `maybeTrackAbandon('restart')` first so abandon-by-restart is captured (these actions `set({...initial})` inline, they do *not* call `reset()`).
- **StrictMode double-invoke (dev).** `bootstrap()` runs outside React render, so the `visibilitychange` listener registers once; the store actions are idempotent w.r.t. event identity is not guaranteed, but dev double-mount does not call store actions twice. Acceptable for dev-only noise.
- **Test isolation.** Default sink in test env is `NoopAnalyticsSink` (or an injected memory sink); existing 55 tests must not write real events.

## 7. Testing strategy

- **Unit — `localAnalyticsSink`**: append, `getAll`, `clear`, ring-buffer cap (drop oldest at `MAX_EVENTS`), quota/serialization error is swallowed (no throw).
- **Unit — `analytics` facade**: builds a well-formed envelope (uuid/ts/sessionId/name/props); forwards to injected sink; `NoopAnalyticsSink` swallows; `VITE_DISABLE_ANALYTICS` → noop.
- **Integration — store with injected memory sink**: reuse the existing 7-step walkthrough harness (the one that asserts a v4 record). Assert the event sequence for a full run: `session_start`, `fetch_start`, `fetch_success`, `step_dwell` ×(empathy,precheck,step0,step1,step2,step3), `session_complete` — with sane props (durations ≥ 0, correct `pattern5hId`/booleans). Assert the abandon path: `reset()` mid-flow → exactly one `session_abandon{lastStep}`; no double-fire after `complete()`.
- Existing suite stays green (55 → ~55+N); analytics defaults to noop/injected so it doesn't pollute other tests.
- **e2e**: unchanged. (Optionally a dev-only smoke that `window.__engEvents()` returns a non-empty array — low value, likely skipped.)

## 8. Forward path (post-Firebase)

- Implement `FirestoreAnalyticsSink` (or `PostHogAnalyticsSink`) against the same `AnalyticsSink` interface; or a `FanoutSink` that writes local + remote.
- Facade swap is one line. Flushing the buffered local backlog on first auth is a later, separate concern (documented, not built).
- The content-free event shape means the remote sink needs no PII scrubbing.

## 9. Open questions (resolved during brainstorming)

- Q1 Destination → **local-first, infra-first** (sink interface; remote deferred).
- Q2 Scope → **richer set** (lifecycle + dwell + drop-off + fetch latency/error). Per-interaction granularity deferred.
- Q3 Consumption → **dev-debug egress only** (`window.__engEvents` / JSON dump); no UI.
- Q4 PII → **content-free events** (ids/enums/bools/durations only); raw text never logged.
