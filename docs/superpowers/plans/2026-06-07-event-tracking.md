# Event Tracking Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture the behavioral/temporal layer of a learning session (lifecycle, per-step dwell, drop-off, fetch latency/error) that the completion-only `LearningRecord` cannot see — stored locally behind a pluggable `AnalyticsSink` so a Firebase/PostHog sink slots in later.

**Architecture:** A `track(name, props, sessionId)` facade forwards content-free `AnalyticsEvent` envelopes to a swappable `AnalyticsSink`. The Zustand store (`learningStore.ts`) is the single instrumentation point: a private `transitionTo()` emits per-step dwell, `runFetch` is timed, `complete()`/`reset()` emit terminal lifecycle events, and a public `abandonIfActive(reason)` action lets a `visibilitychange` listener capture tab-close drop-off. The default sink is a no-op; `main.tsx` bootstrap wires the localStorage ring-buffer sink (and a dev-only `window.__engEvents` egress), so tests stay event-free unless they inject a `MemoryAnalyticsSink`.

**Tech Stack:** React 19 + TypeScript (strict) + Vite 6, Zustand 5, Vitest. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-06-07-event-tracking-design.md`

**Conventions (match existing code):** 2-space indent, single quotes, **no semicolons**, function components, `import.meta.env` for Vite env. Timestamps use `Date.now()` (ms numbers) and `new Date().toISOString()` (event `ts`). UUIDs use `crypto.randomUUID()` (Node 22 / browser provide it).

**Refinement vs spec (intentional):** Spec §4.4 has the facade default to `localAnalyticsSink` with the kill-switch inside the facade. This plan instead defaults the facade to `noopAnalyticsSink` and wires the local sink + `VITE_DISABLE_ANALYTICS` kill-switch in `main.tsx` bootstrap. This keeps the facade env-agnostic, so the existing 55 tests record nothing (no localStorage pollution) without any env-branching in the facade. Behavior in the browser is identical.

**Verify recipe (run from repo root):**
- `npx tsc -b` (NOT `--noEmit` — root tsconfig is `files:[]`+references, so `--noEmit` is a no-op)
- `npx vitest run` (currently 55 → grows with this plan)
- `npm run lint`
- `npm run test:e2e` (Playwright, mock mode, strict port 5219)

---

## File Structure

**New files:**
- `src/types/events.ts` — `EventName` union + `AnalyticsEvent` envelope (pure types, no deps).
- `src/store/analyticsSink.ts` — `AnalyticsSink` interface + `noopAnalyticsSink` + `MemoryAnalyticsSink` (test/dev recorder).
- `src/store/localAnalyticsSink.ts` — localStorage ring-buffer sink (`eng-ception:events`, own version key, `MAX_EVENTS`).
- `src/services/analytics.ts` — `track()` facade, `setSink()`, `getEvents()`, `installDevEgress()`, `window.__engEvents` typing.
- `src/services/analyticsLifecycle.ts` — `registerAnalyticsLifecycle()` (visibilitychange → `abandonIfActive('hidden')`).

**Modified files:**
- `src/store/learningStore.ts` — new state fields + `initial` membership; `classifyError` + `errorToKoreanMessage` refactor; private `transitionTo`; public `abandonIfActive`; instrument `startScenario`/`startCustom`/`runFetch`/`complete`/`reset` and route all step transitions through `transitionTo`.
- `src/main.tsx` — bootstrap wiring (sink + lifecycle + dev egress, gated by `VITE_DISABLE_ANALYTICS`).
- `CLAUDE.md` — file-tree + a short tracking note (docs only).

**New test files:**
- `src/store/analyticsSink.test.ts`
- `src/store/localAnalyticsSink.test.ts`
- `src/services/analytics.test.ts`
- `src/services/analyticsLifecycle.test.ts`
- `src/store/learningStore.test.ts` — extended with an event-assertions describe block.

---

## Chunk 1: Event types & sinks

Pure, dependency-light units. No store, no React. Establishes the envelope and the sink seam.

### Task 1: Event envelope types

**Files:**
- Create: `src/types/events.ts`

- [ ] **Step 1: Write the types**

```ts
// === Event tracking envelope (telemetry; content-free, PIPA-safe) ===
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
  ts: string            // ISO-8601 (new Date().toISOString())
  sessionId: string     // per-learning-session uuid — correlates all events in one session
  props: Record<string, string | number | boolean | null>
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: EXIT 0 (no new errors). A types-only file has no runtime test.

- [ ] **Step 3: Commit**

```bash
git add src/types/events.ts
git commit -m "feat(events): add AnalyticsEvent envelope + EventName union"
```

### Task 2: AnalyticsSink interface + noop + memory recorder

**Files:**
- Create: `src/store/analyticsSink.ts`
- Test: `src/store/analyticsSink.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { noopAnalyticsSink, MemoryAnalyticsSink } from './analyticsSink'
import type { AnalyticsEvent } from '../types/events'

function ev(name: AnalyticsEvent['name'], sessionId = 's1'): AnalyticsEvent {
  return { id: `id-${name}`, name, ts: '2026-06-07T00:00:00.000Z', sessionId, props: {} }
}

describe('noopAnalyticsSink', () => {
  it('swallows tracked events and returns an empty list', async () => {
    noopAnalyticsSink.track(ev('session_start'))
    expect(await noopAnalyticsSink.getAll()).toEqual([])
  })
})

describe('MemoryAnalyticsSink', () => {
  it('records events in order and exposes them synchronously', async () => {
    const sink = new MemoryAnalyticsSink()
    sink.track(ev('session_start'))
    sink.track(ev('fetch_start'))
    expect(sink.events.map((e) => e.name)).toEqual(['session_start', 'fetch_start'])
    expect(await sink.getAll()).toHaveLength(2)
  })

  it('clear() empties the buffer', async () => {
    const sink = new MemoryAnalyticsSink()
    sink.track(ev('session_start'))
    await sink.clear()
    expect(sink.events).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/analyticsSink.test.ts`
Expected: FAIL — cannot import `noopAnalyticsSink` / `MemoryAnalyticsSink` (module not found).

- [ ] **Step 3: Write the implementation**

```ts
import type { AnalyticsEvent } from '../types/events'

// Persistence seam for telemetry — parallel to DataStore. A FirestoreAnalyticsSink /
// PostHogAnalyticsSink slots in here later; track() must never throw into the caller.
export interface AnalyticsSink {
  track(event: AnalyticsEvent): void
  getAll(): Promise<AnalyticsEvent[]>
  clear(): Promise<void>
}

export const noopAnalyticsSink: AnalyticsSink = {
  track() {},
  async getAll() { return [] },
  async clear() {},
}

// In-memory recorder for tests and dev. Exposes `events` for synchronous assertions.
export class MemoryAnalyticsSink implements AnalyticsSink {
  events: AnalyticsEvent[] = []
  track(event: AnalyticsEvent) { this.events.push(event) }
  async getAll() { return this.events }
  async clear() { this.events = [] }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/analyticsSink.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/analyticsSink.ts src/store/analyticsSink.test.ts
git commit -m "feat(events): AnalyticsSink interface + noop + memory recorder"
```

### Task 3: LocalAnalyticsSink (localStorage ring buffer)

**Files:**
- Create: `src/store/localAnalyticsSink.ts`
- Test: `src/store/localAnalyticsSink.test.ts`

**Notes:** Mirrors `localStorage.ts` conventions — own version key (`eng-ception:events-version` = `1`), `MAX_EVENTS = 1000` rotation (drop oldest), every body wrapped in `try/catch` so quota/serialization errors are swallowed. The test reuses the `MemStorage` shim pattern from `localStorage.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { localAnalyticsSink } from './localAnalyticsSink'
import type { AnalyticsEvent } from '../types/events'

class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
  get length() { return this.m.size }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null }
}

function ev(i: number): AnalyticsEvent {
  return { id: `id-${i}`, name: 'step_dwell', ts: '2026-06-07T00:00:00.000Z', sessionId: 's1', props: { i } }
}

beforeEach(() => {
  globalThis.localStorage = new MemStorage() as unknown as Storage
})

describe('localAnalyticsSink', () => {
  it('appends events and returns them via getAll', async () => {
    localAnalyticsSink.track(ev(1))
    localAnalyticsSink.track(ev(2))
    const all = await localAnalyticsSink.getAll()
    expect(all.map((e) => e.props.i)).toEqual([1, 2])
  })

  it('sets the events-version key on first write', async () => {
    localAnalyticsSink.track(ev(1))
    expect(localStorage.getItem('eng-ception:events-version')).toBe('1')
  })

  it('rotates oldest out when exceeding MAX_EVENTS (1000)', async () => {
    for (let i = 0; i < 1005; i++) localAnalyticsSink.track(ev(i))
    const all = await localAnalyticsSink.getAll()
    expect(all).toHaveLength(1000)
    expect(all[0].props.i).toBe(5)        // oldest 5 dropped
    expect(all[999].props.i).toBe(1004)
  })

  it('clear() empties the stored buffer', async () => {
    localAnalyticsSink.track(ev(1))
    await localAnalyticsSink.clear()
    expect(await localAnalyticsSink.getAll()).toEqual([])
  })

  it('never throws when setItem fails (quota) — event is dropped', async () => {
    localAnalyticsSink.track(ev(1))
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => localAnalyticsSink.track(ev(2))).not.toThrow()
    spy.mockRestore()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/localAnalyticsSink.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
import type { AnalyticsSink } from './analyticsSink'
import type { AnalyticsEvent } from '../types/events'

const EVENTS_KEY = 'eng-ception:events'
const EVENTS_VERSION_KEY = 'eng-ception:events-version'
const CURRENT_EVENTS_VERSION = 1
const MAX_EVENTS = 1000

function read(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : []
  } catch {
    return []
  }
}

// localStorage ring buffer. Telemetry is disposable: a future version bump clears the
// buffer (no migration), mirroring DataStore.init()'s discard-on-mismatch.
export const localAnalyticsSink: AnalyticsSink = {
  track(event) {
    try {
      if (localStorage.getItem(EVENTS_VERSION_KEY) !== String(CURRENT_EVENTS_VERSION)) {
        localStorage.removeItem(EVENTS_KEY)
        localStorage.setItem(EVENTS_VERSION_KEY, String(CURRENT_EVENTS_VERSION))
      }
      const events = read()
      events.push(event)
      if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
      localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
    } catch {
      // telemetry must never break the app (quota exceeded, serialization)
    }
  },

  async getAll() {
    return read()
  },

  async clear() {
    try {
      localStorage.removeItem(EVENTS_KEY)
    } catch {
      // ignore
    }
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/localAnalyticsSink.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/localAnalyticsSink.ts src/store/localAnalyticsSink.test.ts
git commit -m "feat(events): localStorage ring-buffer AnalyticsSink"
```

---

## Chunk 2: track() facade

The single call surface the store uses. Builds the envelope, forwards to the active sink, never throws.

### Task 4: track() facade + setSink + getEvents + dev egress

**Files:**
- Create: `src/services/analytics.ts`
- Test: `src/services/analytics.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { track, setSink, getEvents, installDevEgress } from './analytics'
import { MemoryAnalyticsSink, noopAnalyticsSink } from '../store/analyticsSink'

beforeEach(() => {
  setSink(new MemoryAnalyticsSink())
})

afterEach(() => {
  // dev egress writes globalThis.__engEvents — clear it so it doesn't leak into the full-suite run
  delete (globalThis as { __engEvents?: unknown }).__engEvents
})

describe('track() facade', () => {
  it('builds a well-formed envelope and forwards it to the active sink', async () => {
    track('session_start', { source: 'custom', scenarioId: null }, 'sess-1')
    const all = await getEvents()
    expect(all).toHaveLength(1)
    const e = all[0]
    expect(e.name).toBe('session_start')
    expect(e.sessionId).toBe('sess-1')
    expect(e.props).toEqual({ source: 'custom', scenarioId: null })
    expect(typeof e.id).toBe('string')
    expect(e.id.length).toBeGreaterThan(0)
    expect(e.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/)   // ISO-8601
  })

  it('routes to whichever sink is active (setSink swap)', async () => {
    const a = new MemoryAnalyticsSink()
    const b = new MemoryAnalyticsSink()
    setSink(a)
    track('fetch_start', {}, 's')
    setSink(b)
    track('fetch_success', { latencyMs: 10 }, 's')
    expect(a.events.map((e) => e.name)).toEqual(['fetch_start'])
    expect(b.events.map((e) => e.name)).toEqual(['fetch_success'])
  })

  it('never throws even if the sink throws', () => {
    setSink({
      track() { throw new Error('boom') },
      async getAll() { return [] },
      async clear() {},
    })
    expect(() => track('fetch_start', {}, 's')).not.toThrow()
  })

  it('noop sink records nothing', async () => {
    setSink(noopAnalyticsSink)
    track('session_start', {}, 's')
    expect(await getEvents()).toEqual([])
  })

  it('installDevEgress exposes globalThis.__engEvents returning current events', async () => {
    const mem = new MemoryAnalyticsSink()
    setSink(mem)
    installDevEgress()
    track('session_start', {}, 's')
    const fn = (globalThis as unknown as { __engEvents?: () => Promise<unknown[]> }).__engEvents
    expect(fn).toBeTypeOf('function')
    expect(await fn!()).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/analytics.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
import type { AnalyticsEvent, EventName } from '../types/events'
import { noopAnalyticsSink, type AnalyticsSink } from '../store/analyticsSink'

declare global {
  // Dev egress handle. `var` is required for a global augmentation (let/const don't work
  // here); eslint's no-var rule is NOT enabled in this repo's config, so no disable needed.
  var __engEvents: (() => Promise<AnalyticsEvent[]>) | undefined
}

// Default to noop; main.tsx bootstrap swaps in the local sink (so tests stay event-free).
let activeSink: AnalyticsSink = noopAnalyticsSink

export function setSink(sink: AnalyticsSink): void {
  activeSink = sink
}

// Caller passes sessionId (the store reads get().sessionId) — keeps this facade
// store-agnostic, avoiding a learningStore <-> analytics import cycle.
export function track(name: EventName, props: AnalyticsEvent['props'], sessionId: string): void {
  try {
    activeSink.track({
      id: crypto.randomUUID(),
      name,
      ts: new Date().toISOString(),
      sessionId,
      props,
    })
  } catch {
    // analytics must never throw into the learning flow
  }
}

export function getEvents(): Promise<AnalyticsEvent[]> {
  return activeSink.getAll()
}

// DEV-only debug egress; called from bootstrap under import.meta.env.DEV.
// Targets globalThis (NOT window): the vitest env is 'node' (no `window`), and in the
// browser globalThis === window, so devs still call `window.__engEvents()` in the console.
export function installDevEgress(): void {
  globalThis.__engEvents = () => activeSink.getAll()
}
```

> **Test environment is `node`, not jsdom** (`vitest.config.ts`: `environment: 'node'`, `globals: false`; no jsdom/happy-dom installed — existing store tests shim `globalThis.localStorage` by hand). That is why the egress targets `globalThis` and never references `window`/`document`: those are `undefined` under node. The dev-egress test reads and cleans up `globalThis.__engEvents`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/analytics.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Verify typecheck + lint**

Run: `npx tsc -b && npm run lint`
Expected: EXIT 0, clean. The `declare global { var __engEvents... }` augmentation compiles cleanly. **No `eslint-disable` comment** — this repo's `eslint.config.js` extends only `js.configs.recommended` + `tseslint.configs.recommended`, and `no-var` is in neither (it's a stylistic rule), so the `var` needs no disable. Adding one would be an *unused* disable directive that could itself fail lint under `--report-unused-disable-directives`.

- [ ] **Step 6: Commit**

```bash
git add src/services/analytics.ts src/services/analytics.test.ts
git commit -m "feat(events): track() facade with swappable sink + dev egress"
```

---

## Chunk 3: Store instrumentation

The heart of the plan. All changes are in `src/store/learningStore.ts` (+ its test). Each task is test-first with an injected `MemoryAnalyticsSink`.

**Test harness addition (applies to all Task 6–9 tests):** a new describe block in `learningStore.test.ts` that injects a fresh `MemoryAnalyticsSink` before each test and isolates assertions by the current session's id.

```ts
// add imports at top of learningStore.test.ts
import { setSink } from '../services/analytics'
import { MemoryAnalyticsSink } from './analyticsSink'

// ... inside the file, a dedicated describe:
describe('learningStore event tracking', () => {
  let mem: MemoryAnalyticsSink

  beforeEach(() => {
    mem = new MemoryAnalyticsSink()
    setSink(mem)
    useLearningStore.getState().reset()
  })

  // helper: events for the CURRENT session only (isolates against stray fire-and-forget
  // runFetch events bleeding in from earlier tests under a different sessionId)
  const sessionEvents = () => {
    const sid = useLearningStore.getState().sessionId
    return mem.events.filter((e) => e.sessionId === sid)
  }

  // ... per-task tests below
})
```

> Why filter by `sessionId`: earlier tests fire `startScenario`/`startCustom` without awaiting; their 600ms mock `runFetch` can resolve mid-test and push a `fetch_success` into our fresh `mem` — but under a *different* `sessionId`. Filtering on the live session id makes assertions deterministic. (Same flakiness class the existing error-path test handles with a 700ms drain.)

### Task 5: Extract `classifyError` (refactor `errorToKoreanMessage`)

**Files:**
- Modify: `src/store/learningStore.ts:64-70` (the `errorToKoreanMessage` function)
- Test: `src/store/learningStore.test.ts` (new unit test; export `classifyError`)

**Why:** `fetch_error.kind` needs an enum (`'timeout'|'parse'|'network'|'unknown'`), but `errorToKoreanMessage` returns a Korean string. Extract the classification so the message and the event kind never diverge.

- [ ] **Step 1: Write the failing test**

```ts
// add to learningStore.test.ts imports:
import { isAssemblyCorrect, classifyError } from './learningStore'

describe('classifyError', () => {
  it('classifies by message substring', () => {
    expect(classifyError(new Error('request timeout'))).toBe('timeout')
    expect(classifyError(new Error('failed to parse JSON'))).toBe('parse')
    expect(classifyError(new Error('network down'))).toBe('network')
    expect(classifyError(new Error('fetch failed'))).toBe('network')
    expect(classifyError(new Error('something else'))).toBe('unknown')
    expect(classifyError('a raw string')).toBe('unknown')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/learningStore.test.ts -t classifyError`
Expected: FAIL — `classifyError` is not exported.

- [ ] **Step 3: Refactor the implementation**

Replace the existing `errorToKoreanMessage` (lines 64–70) with:

```ts
export type FetchErrorKind = 'timeout' | 'parse' | 'network' | 'unknown'

export function classifyError(e: unknown): FetchErrorKind {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('timeout')) return 'timeout'
  if (msg.includes('parse')) return 'parse'
  if (msg.includes('fetch') || msg.includes('network')) return 'network'
  return 'unknown'
}

const KIND_MESSAGE: Record<FetchErrorKind, string> = {
  timeout: '응답이 너무 오래 걸려요. 다시 시도해주세요.',
  parse: 'AI 응답 형식이 이상해요. 다시 시도해주세요.',
  network: '네트워크가 불안정해요.',
  unknown: '문제가 생겼어요. 다시 시도해주세요.',
}

function errorToKoreanMessage(e: unknown): string {
  return KIND_MESSAGE[classifyError(e)]
}
```

- [ ] **Step 4: Run tests to verify pass (and existing error-path test still green)**

Run: `npx vitest run src/store/learningStore.test.ts`
Expected: PASS — the new `classifyError` test passes AND the existing "error path" test still asserts `'네트워크가 불안정해요.'` for `new Error('network down')`.

- [ ] **Step 5: Commit**

```bash
git add src/store/learningStore.ts src/store/learningStore.test.ts
git commit -m "refactor(store): extract classifyError from errorToKoreanMessage"
```

### Task 6: `session_start` + fetch timing (adds session state fields)

**Files:**
- Modify: `src/store/learningStore.ts` (state interface, `initial`, `runFetch`, `startScenario`, `startCustom`)
- Test: `src/store/learningStore.test.ts` (event-tracking describe)

**This task introduces the four new state fields** (`sessionId`, `sessionStartedAt`, `stepEnteredAt`, `sessionEnded`) and instruments session entry + the fetch path.

- [ ] **Step 1: Write the failing test**

```ts
// inside describe('learningStore event tracking')
it('emits session_start then fetch_start + fetch_success on a successful start', async () => {
  useLearningStore.getState().startCustom('커스텀 문장')
  const sid = useLearningStore.getState().sessionId
  expect(sid).toBeTruthy()

  await vi.waitFor(() => {
    expect(useLearningStore.getState().payloadStatus).toBe('ready')
  })

  const names = sessionEvents().map((e) => e.name)
  expect(names).toEqual(['session_start', 'fetch_start', 'fetch_success'])

  const start = sessionEvents().find((e) => e.name === 'session_start')!
  expect(start.props).toEqual({ source: 'custom', scenarioId: null })

  const success = sessionEvents().find((e) => e.name === 'fetch_success')!
  expect(typeof success.props.latencyMs).toBe('number')
  expect(success.props.latencyMs as number).toBeGreaterThanOrEqual(0)
})

it('emits fetch_error with a kind when the fetch rejects', async () => {
  await new Promise((r) => setTimeout(r, 700))   // drain stray in-flight runFetch
  useLearningStore.getState().reset()
  mem.clear()
  vi.mocked(fetchSessionPayload).mockRejectedValueOnce(new Error('network down'))

  useLearningStore.getState().startCustom('x')
  await vi.waitFor(() => {
    expect(useLearningStore.getState().payloadStatus).toBe('error')
  })

  const err = sessionEvents().find((e) => e.name === 'fetch_error')!
  expect(err).toBeDefined()
  expect(err.props.kind).toBe('network')
  expect(typeof err.props.latencyMs).toBe('number')
})

it('session_start records scenario source + id for a scenario start', async () => {
  useLearningStore.getState().startScenario(sampleScenario)
  const start = sessionEvents().find((e) => e.name === 'session_start')!
  expect(start.props).toEqual({ source: 'scenario', scenarioId: 's1' })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/learningStore.test.ts -t "event tracking"`
Expected: FAIL — `sessionId` is undefined on state / no events recorded.

- [ ] **Step 3: Implement**

(a) Add the import at the top of `learningStore.ts`:

```ts
import { track } from '../services/analytics'
```

(b) Add fields to the `V9LearningState` interface (after `patternSaved: boolean`):

```ts
  // event-tracking session state
  sessionId: string | null
  sessionStartedAt: number | null
  stepEnteredAt: number | null
  sessionEnded: boolean
```

(c) Add them to `initial`:

```ts
  sessionId: null as string | null,
  sessionStartedAt: null as number | null,
  stepEnteredAt: null as number | null,
  sessionEnded: false,
```

(d) Instrument `runFetch` (reads the live sessionId, times the call):

```ts
  const runFetch = async () => {
    const sessionId = get().sessionId
    const t0 = Date.now()
    if (sessionId) track('fetch_start', {}, sessionId)
    try {
      const payload = await fetchSessionPayload(get().originalKorean)
      set({ payload, payloadStatus: 'ready', error: null })
      if (sessionId) track('fetch_success', { latencyMs: Date.now() - t0 }, sessionId)
    } catch (e) {
      set({ payloadStatus: 'error', error: errorToKoreanMessage(e) })
      if (sessionId) track('fetch_error', { latencyMs: Date.now() - t0, kind: classifyError(e) }, sessionId)
    }
  }
```

(e) Instrument `startScenario` and `startCustom` (generate session id + timestamps + emit `session_start`). Note `abandonIfActive('restart')` is added in Task 9 — for now just the start instrumentation:

```ts
    startScenario(scenario) {
      const sessionId = crypto.randomUUID()
      const now = Date.now()
      set({
        ...initial,
        scenario,
        originalKorean: scenario.originalKorean,
        currentStep: 'empathy',
        payloadStatus: 'loading',
        sessionId,
        sessionStartedAt: now,
        stepEnteredAt: now,
      })
      track('session_start', { source: 'scenario', scenarioId: scenario.id }, sessionId)
      void runFetch()
    },

    startCustom(korean) {
      const sessionId = crypto.randomUUID()
      const now = Date.now()
      set({
        ...initial,
        isCustomInput: true,
        originalKorean: korean,
        currentStep: 'empathy',
        payloadStatus: 'loading',
        sessionId,
        sessionStartedAt: now,
        stepEnteredAt: now,
      })
      track('session_start', { source: 'custom', scenarioId: null }, sessionId)
      void runFetch()
    },
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/store/learningStore.test.ts`
Expected: PASS — new event tests pass; all existing store tests still green (the new fields are in `initial`, so `reset()`/`set(initial)` behavior is unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/store/learningStore.ts src/store/learningStore.test.ts
git commit -m "feat(store): emit session_start + timed fetch events"
```

### Task 7: Per-step dwell via `transitionTo`

**Files:**
- Modify: `src/store/learningStore.ts` (add `transitionTo`; route every step change through it)
- Test: `src/store/learningStore.test.ts` (event-tracking describe)

- [ ] **Step 1: Write the failing test**

```ts
// inside describe('learningStore event tracking')
it('emits step_dwell for each step left, in order, never for input or step4', async () => {
  const store = useLearningStore.getState()
  store.startScenario(sampleScenario)
  await vi.waitFor(() => {
    expect(useLearningStore.getState().payloadStatus).toBe('ready')
  })
  const payload = useLearningStore.getState().payload!
  const order = [...payload.assembly.blocks].sort((a, b) => a.order - b.order).map((b) => b.id)
  const conn = payload.assembly.connectors.find((c) => c.isCorrect)!.id

  useLearningStore.getState().advanceFromEmpathy()
  useLearningStore.getState().submitPrecheck('first')
  await vi.waitFor(() => {
    expect(useLearningStore.getState().currentStep).toBe('step0')
  })
  useLearningStore.getState().advanceToStep1()
  order.forEach((id) => useLearningStore.getState().tapBlock(id))
  useLearningStore.getState().tapConnector(conn)
  useLearningStore.getState().advanceToStep2()
  await useLearningStore.getState().advanceToStep3()
  useLearningStore.getState().advanceToStep4()

  const dwellSteps = sessionEvents()
    .filter((e) => e.name === 'step_dwell')
    .map((e) => e.props.step)
  expect(dwellSteps).toEqual(['empathy', 'precheck', 'step0', 'step1', 'step2', 'step3'])

  for (const e of sessionEvents().filter((e) => e.name === 'step_dwell')) {
    expect(typeof e.props.dwellMs).toBe('number')
    expect(e.props.dwellMs as number).toBeGreaterThanOrEqual(0)
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/learningStore.test.ts -t "step_dwell"`
Expected: FAIL — no `step_dwell` events yet.

- [ ] **Step 3: Implement**

(a) Add the private `transitionTo` helper inside the `create()` factory, next to `runFetch`:

```ts
  // Single dwell source: emit step_dwell for the step being LEFT, then move.
  const transitionTo = (step: V9Step) => {
    const s = get()
    if (s.sessionId && s.stepEnteredAt != null) {
      track('step_dwell', { step: s.currentStep, dwellMs: Date.now() - s.stepEnteredAt }, s.sessionId)
    }
    set({ currentStep: step, stepEnteredAt: Date.now() })
  }
```

(b) Route every existing `set({ currentStep: ... })` step change through `transitionTo` (session entry in `startScenario`/`startCustom` stays as-is — it initializes `stepEnteredAt` directly, so no dwell fires for `input`):

```ts
    advanceFromEmpathy() {
      transitionTo('precheck')
    },

    submitPrecheck(choiceId) {
      set({ precheckChoice: choiceId })
      setTimeout(() => {
        if (get().currentStep === 'precheck') transitionTo('step0')   // inside the guard
      }, 400)
    },

    advanceToStep1() {
      transitionTo('step1')
    },

    advanceToStep2() {
      transitionTo('step2')
    },

    async advanceToStep3() {
      const s = get()
      if (!s.payload) return
      if (s.patternSaved) {
        transitionTo('step3')          // early-return path
        return
      }
      const pattern: Pattern = { /* ...unchanged... */ }
      await db.savePattern(pattern)
      set({ patternSaved: true })
      transitionTo('step3')            // post-save path
    },

    advanceToStep4() {
      transitionTo('step4')
    },
```

> ⚠️ `advanceToStep3` has **two** exits — both must use `transitionTo('step3')`. In the post-save path, split the original `set({ patternSaved: true, currentStep: 'step3' })` into `set({ patternSaved: true })` then `transitionTo('step3')` (so the dwell fires and `stepEnteredAt` updates). Keep the `pattern` object construction and `await db.savePattern(pattern)` exactly as they are today.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/store/learningStore.test.ts`
Expected: PASS — dwell sequence test passes; existing tests (incl. `submitPrecheck` auto-advance, pattern-save idempotency, end-to-end walkthrough) still green.

- [ ] **Step 5: Commit**

```bash
git add src/store/learningStore.ts src/store/learningStore.test.ts
git commit -m "feat(store): emit per-step dwell via transitionTo"
```

### Task 8: `session_complete`

**Files:**
- Modify: `src/store/learningStore.ts` (`complete`)
- Test: `src/store/learningStore.test.ts` (event-tracking describe)

- [ ] **Step 1: Write the failing test**

```ts
// inside describe('learningStore event tracking')
it('emits session_complete with outcome signals + duration before reset', async () => {
  useLearningStore.getState().startScenario(sampleScenario)
  await vi.waitFor(() => {
    expect(useLearningStore.getState().payloadStatus).toBe('ready')
  })
  const sid = useLearningStore.getState().sessionId
  const payload = useLearningStore.getState().payload!
  useLearningStore.getState().submitPatternQuiz({ correct: true, unsure: false })
  useLearningStore.setState({ currentStep: 'step4' })

  await useLearningStore.getState().complete()

  // capture by the captured sid (state is reset by now)
  const complete = mem.events.find((e) => e.sessionId === sid && e.name === 'session_complete')!
  expect(complete).toBeDefined()
  expect(complete.props.pattern5hId).toBe(payload.pattern5h.id)
  expect(complete.props.triggerVerb).toBe(payload.pattern5h.triggerVerb)
  expect(complete.props.patternQuizCorrect).toBe(true)
  expect(complete.props.patternQuizUnsure).toBe(false)
  expect(typeof complete.props.durationMs).toBe('number')

  // session fully reset
  expect(useLearningStore.getState().sessionId).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/learningStore.test.ts -t "session_complete"`
Expected: FAIL — no `session_complete` event.

- [ ] **Step 3: Implement**

In `complete()`, emit the event and mark `sessionEnded` **before** the existing `set(initial)`. Keep the `record` construction and `await db.saveLearningRecord(record)` exactly as they are:

```ts
    async complete() {
      const s = get()
      if (!s.payload) return
      if (s.sessionId) {
        track('session_complete', {
          pattern5hId: s.payload.pattern5h.id,
          triggerVerb: s.payload.pattern5h.triggerVerb,
          assemblyCorrect: isAssemblyCorrect(s),
          patternQuizCorrect: s.patternQuizAnswer?.correct === true,
          patternQuizUnsure: s.patternQuizAnswer?.unsure === true,
          durationMs: Date.now() - (s.sessionStartedAt ?? Date.now()),
        }, s.sessionId)
        set({ sessionEnded: true })
      }
      const record: LearningRecord = { /* ...unchanged... */ }
      await db.saveLearningRecord(record)
      set(initial)
    },
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/store/learningStore.test.ts`
Expected: PASS — complete-event test passes; existing `complete()` persistence test still green.

- [ ] **Step 5: Commit**

```bash
git add src/store/learningStore.ts src/store/learningStore.test.ts
git commit -m "feat(store): emit session_complete with outcome signals"
```

### Task 9: `abandonIfActive` (drop-off) + double-fire guard

**Files:**
- Modify: `src/store/learningStore.ts` (add public `abandonIfActive`; wire `reset`, `startScenario`, `startCustom`)
- Test: `src/store/learningStore.test.ts` (event-tracking describe)

- [ ] **Step 1: Write the failing test**

```ts
// inside describe('learningStore event tracking')
it('emits session_abandon with lastStep when reset() interrupts a session', async () => {
  useLearningStore.getState().startScenario(sampleScenario)
  await vi.waitFor(() => {
    expect(useLearningStore.getState().payloadStatus).toBe('ready')
  })
  useLearningStore.getState().advanceFromEmpathy()   // now at precheck
  const sid = useLearningStore.getState().sessionId
  useLearningStore.getState().reset()

  const abandon = mem.events.find((e) => e.sessionId === sid && e.name === 'session_abandon')!
  expect(abandon).toBeDefined()
  expect(abandon.props.lastStep).toBe('precheck')
  expect(abandon.props.reason).toBe('reset')
  expect(typeof abandon.props.durationMs).toBe('number')
})

it('does NOT emit session_abandon after a completed session (no double terminal event)', async () => {
  useLearningStore.getState().startScenario(sampleScenario)
  await vi.waitFor(() => {
    expect(useLearningStore.getState().payloadStatus).toBe('ready')
  })
  const sid = useLearningStore.getState().sessionId
  useLearningStore.setState({ currentStep: 'step4' })
  await useLearningStore.getState().complete()
  useLearningStore.getState().reset()   // reset after complete

  const abandons = mem.events.filter((e) => e.sessionId === sid && e.name === 'session_abandon')
  expect(abandons).toHaveLength(0)
})

it('emits session_abandon(restart) when a new session starts over a live one', async () => {
  useLearningStore.getState().startScenario(sampleScenario)
  await vi.waitFor(() => {
    expect(useLearningStore.getState().payloadStatus).toBe('ready')
  })
  useLearningStore.getState().advanceFromEmpathy()
  const firstSid = useLearningStore.getState().sessionId
  useLearningStore.getState().startCustom('새 세션')   // restart over live

  const abandon = mem.events.find((e) => e.sessionId === firstSid && e.name === 'session_abandon')!
  expect(abandon).toBeDefined()
  expect(abandon.props.reason).toBe('restart')
  expect(abandon.props.lastStep).toBe('precheck')
})

it('abandonIfActive is a no-op when no session is active', () => {
  useLearningStore.getState().reset()        // no live session
  const before = mem.events.length
  useLearningStore.getState().abandonIfActive('hidden')
  expect(mem.events.length).toBe(before)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/learningStore.test.ts -t "abandon"`
Expected: FAIL — `abandonIfActive` is not a function / no `session_abandon` events.

- [ ] **Step 3: Implement**

(a) Add `abandonIfActive` to the `V9LearningState` interface:

```ts
  abandonIfActive: (reason: 'reset' | 'restart' | 'hidden') => void
```

(b) Add the action to the returned store object (it reads/writes via the closure `get`/`set`):

```ts
    abandonIfActive(reason) {
      const s = get()
      if (s.sessionId && !s.sessionEnded && s.currentStep !== 'step4') {
        track('session_abandon', {
          lastStep: s.currentStep,
          reason,
          durationMs: Date.now() - (s.sessionStartedAt ?? Date.now()),
        }, s.sessionId)
        set({ sessionEnded: true })
      }
    },
```

(c) Wire `reset()` to abandon first:

```ts
    reset() {
      get().abandonIfActive('reset')
      set(initial)
    },
```

(d) Wire `startScenario` and `startCustom` to abandon any live prior session **before** overwriting state (add as the first line of each, before generating the new `sessionId`):

```ts
    startScenario(scenario) {
      get().abandonIfActive('restart')
      const sessionId = crypto.randomUUID()
      // ...rest unchanged...
    },

    startCustom(korean) {
      get().abandonIfActive('restart')
      const sessionId = crypto.randomUUID()
      // ...rest unchanged...
    },
```

> The `!sessionEnded` guard makes `abandonIfActive` idempotent: `complete()` sets `sessionEnded = true`, so a later `reset()` (which calls `abandonIfActive('reset')`) finds the session already ended and emits nothing. `set(initial)` then restores `sessionEnded = false` for the next session.

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run src/store/learningStore.test.ts`
Expected: PASS — all four abandon tests pass; existing tests still green (the top-level `beforeEach`'s `reset()` now also calls `abandonIfActive('reset')`, harmless: emits to whatever sink, usually nothing because no live session).

- [ ] **Step 5: Full store-suite + typecheck**

Run: `npx vitest run src/store/learningStore.test.ts && npx tsc -b`
Expected: PASS + EXIT 0.

- [ ] **Step 6: Commit**

```bash
git add src/store/learningStore.ts src/store/learningStore.test.ts
git commit -m "feat(store): abandonIfActive drop-off events + double-fire guard"
```

---

## Chunk 4: Bootstrap wiring, lifecycle, verification

### Task 10: visibilitychange lifecycle listener

**Files:**
- Create: `src/services/analyticsLifecycle.ts`
- Test: `src/services/analyticsLifecycle.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerAnalyticsLifecycle } from './analyticsLifecycle'
import { useLearningStore } from '../store/learningStore'

// vitest env is 'node' (no real `document`). Stub a minimal document with an event registry
// so each test starts with a clean listener set — sidesteps jsdom AND listener accumulation.
let handlers: Record<string, EventListener[]>

beforeEach(() => {
  handlers = {}
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    addEventListener: (type: string, fn: EventListener) => {
      ;(handlers[type] ??= []).push(fn)
    },
    removeEventListener: () => {},
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function fireVisibility(state: 'hidden' | 'visible') {
  ;(document as unknown as { visibilityState: string }).visibilityState = state
  for (const fn of handlers['visibilitychange'] ?? []) fn(new Event('visibilitychange'))
}

describe('registerAnalyticsLifecycle', () => {
  it('calls abandonIfActive("hidden") when the document becomes hidden', () => {
    const spy = vi.spyOn(useLearningStore.getState(), 'abandonIfActive')
    registerAnalyticsLifecycle()
    fireVisibility('hidden')
    expect(spy).toHaveBeenCalledWith('hidden')
    spy.mockRestore()
  })

  it('does not call abandonIfActive while the document is visible', () => {
    const spy = vi.spyOn(useLearningStore.getState(), 'abandonIfActive')
    registerAnalyticsLifecycle()
    fireVisibility('visible')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
```

> **Why this shape:** The vitest env is `node`, so there is no real `document` — `vi.stubGlobal('document', fake)` supplies one at runtime (`vi.unstubAllGlobals()` restores after each test). `new Event(...)` is a Node 22 global. `handlers` resets each `beforeEach`, so listeners never accumulate across tests. `vi.spyOn(useLearningStore.getState(), 'abandonIfActive')` works because Zustand returns the same state object from every `getState()`, so the spy replaces the method the listener resolves at call time. **Typecheck note:** the *source* (`analyticsLifecycle.ts`) referencing `document` compiles fine — `tsconfig` includes the DOM lib (`main.tsx` already uses `document.getElementById`). Only the *test runtime* needs the stub.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/analyticsLifecycle.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
import { useLearningStore } from '../store/learningStore'

// Tab-close / app-background drop-off. visibilitychange→hidden is the reliable signal on
// mobile PWAs (beforeunload is not). abandonIfActive's internal guard makes this a no-op
// when no session is active or one already ended.
export function registerAnalyticsLifecycle(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      useLearningStore.getState().abandonIfActive('hidden')
    }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/analyticsLifecycle.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/analyticsLifecycle.ts src/services/analyticsLifecycle.test.ts
git commit -m "feat(events): visibilitychange drop-off lifecycle listener"
```

### Task 11: Bootstrap wiring in main.tsx

**Files:**
- Modify: `src/main.tsx`

**No unit test** (entry point). Verified by typecheck + the dev egress smoke in Task 12.

- [ ] **Step 1: Edit `main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { localStorageAdapter as db } from './store/localStorage'
import { setSink, installDevEgress } from './services/analytics'
import { localAnalyticsSink } from './store/localAnalyticsSink'
import { registerAnalyticsLifecycle } from './services/analyticsLifecycle'

async function bootstrap() {
  await db.init()

  // Telemetry: default facade sink is noop; wire the local ring buffer unless disabled.
  if (import.meta.env.VITE_DISABLE_ANALYTICS !== 'true') {
    setSink(localAnalyticsSink)
    registerAnalyticsLifecycle()
    if (import.meta.env.DEV) installDevEgress()
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

Run: `npx tsc -b && npm run lint`
Expected: EXIT 0. (`import.meta.env.VITE_DISABLE_ANALYTICS` is a string-or-undefined; the `!== 'true'` comparison is valid. If TS complains about the env key, add it to `src/vite-env.d.ts` / an `ImportMetaEnv` interface — check whether the repo already declares env types; if not, the loose `import.meta.env` index access compiles by default with Vite's client types.)

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat(events): wire local sink + lifecycle + dev egress in bootstrap"
```

### Task 12: Full verification sweep

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `npx tsc -b`
Expected: EXIT 0.

- [ ] **Step 2: Unit/integration suite**

Run: `npx vitest run`
Expected: PASS. Count = 55 (baseline) + new tests: analyticsSink (3) + localAnalyticsSink (5) + analytics facade (6) + classifyError (1) + event-tracking describe (session_start/fetch ×3, dwell ×1, complete ×1, abandon ×4 = 9) + lifecycle (2) = **+26 → 81 tests** (exact count may differ by ±a few; the gate is GREEN, not a magic number).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: EXIT 0 (clean).

- [ ] **Step 4: e2e (unchanged behavior — no regressions)**

Run: `npm run test:e2e`
Expected: PASS. The 7-step walkthrough is unaffected; event tracking is additive and (in mock dev mode) writes to the local sink without altering any UI.

- [ ] **Step 5: Manual dev-egress smoke (optional but recommended)**

Run: `npm run dev` (mock mode), open the app, complete one session, then in the browser console:
```js
await window.__engEvents()
```
Expected: an array containing `session_start`, `fetch_start`, `fetch_success`, a run of `step_dwell`, and `session_complete` — all sharing one `sessionId`, all content-free (no Korean text).

Kill-switch check: restart `npm run dev` with `VITE_DISABLE_ANALYTICS=true` and confirm `window.__engEvents` is `undefined` (sink stays noop, listener not registered, egress not installed).

- [ ] **Step 6: Commit (if any verification-driven fixups were needed)**

```bash
git add -A
git commit -m "test(events): verification sweep — tsc/vitest/lint/e2e green"
```

### Task 13: Docs — CLAUDE.md file tree + tracking note

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the project structure tree**

Add under `src/services/` in the file-tree block:
```
│   │   ├── analytics.ts          # track() facade — swappable AnalyticsSink + dev egress
│   │   └── analyticsLifecycle.ts # visibilitychange → session_abandon(hidden)
```
Add under `src/store/`:
```
│   │   ├── analyticsSink.ts      # AnalyticsSink interface + noop + MemoryAnalyticsSink
│   │   └── localAnalyticsSink.ts # localStorage ring-buffer sink (eng-ception:events)
```
Add under `src/types/`:
```
│   │   └── events.ts             # AnalyticsEvent envelope + EventName union
```

- [ ] **Step 2: Add a short subsection** (after the "저장소" section)

```markdown
## 이벤트 트래킹 (event tracking)

세션의 **행동·시간 레이어**를 포착 — `LearningRecord`(완료 시에만 저장)가 못 보는 이탈 세션/단계별 시간/fetch 지연. `services/analytics.ts`의 `track(name, props, sessionId)` 파사드가 content-free `AnalyticsEvent`를 swappable `AnalyticsSink`로 보냄. 기본 sink는 noop; `main.tsx`가 `localAnalyticsSink`(localStorage 링버퍼, `eng-ception:events`)를 주입 (`VITE_DISABLE_ANALYTICS=true`면 비활성). 계측은 `learningStore`에 집중 — `transitionTo`(dwell), 타임드 `runFetch`, `complete`/`reset`, 공개 `abandonIfActive(reason)`(+ `visibilitychange` 리스너로 탭 종료 이탈). dev에서 `window.__engEvents()`로 확인. Firebase/PostHog sink는 동일 인터페이스로 나중 슬롯인.
```

- [ ] **Step 3: Add `VITE_DISABLE_ANALYTICS` to the 환경 변수 block**

```
VITE_DISABLE_ANALYTICS=  # 'true' 면 이벤트 트래킹 비활성 (기본 noop sink 유지)
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document event tracking in CLAUDE.md"
```

---

## Done criteria

- `npx tsc -b` EXIT 0 · `npx vitest run` GREEN (≈81) · `npm run lint` clean · `npm run test:e2e` PASS.
- A completed session in dev (`window.__engEvents()`) shows `session_start → fetch_start → fetch_success → step_dwell×6 → session_complete`, one shared `sessionId`, zero raw user text.
- Abandoning mid-session (navigate away / tab close) yields a `session_abandon{lastStep, reason}`.
- No external analytics dependency added; `AnalyticsSink` interface is the documented slot-in seam for the post-Firebase remote sink.
