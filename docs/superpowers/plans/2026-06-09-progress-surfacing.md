# 진척 가시화 (Progress Surfacing) Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Surface SRS/habit progress (streak, daily goal, next-due, mastery summary, scenario rotation) + a11y/fake-mic cleanup, using pure derivation over existing data — no schema/db changes.

**Architecture:** New pure helpers in `services/progress.ts` + `services/srsView.nextDueDate`, all taking `now: Date` for testability. Home/Review/step components wire the helpers; components own the only `new Date()` calls. TDD: helpers (red→green) first, then UI.

**Tech Stack:** React 19 + TS strict, Zustand, Vitest (node env, no jsdom), Tailwind 4.

Spec: `docs/superpowers/specs/2026-06-09-progress-surfacing-design.md`.

---

## Chunk 1: Pure helpers (TDD)

### Task 1: `nextDueDate` in srsView

**Files:** Modify `src/services/srsView.ts`; Test `src/services/srsView.test.ts`

- [ ] **Step 1 — failing test** (append to srsView.test.ts):
```ts
describe('nextDueDate', () => {
  it('returns the nearest FUTURE due date; excludes due-now and unscheduled', () => {
    const cards = [
      card({ triggerVerb: 'make', nextDueAt: '2026-06-10T00:00:00Z' }), // future
      card({ triggerVerb: 'have', nextDueAt: '2026-06-15T00:00:00Z' }), // farther future
      card({ triggerVerb: 'let', nextDueAt: '2026-06-08T00:00:00Z' }),  // past (due now)
      card({ triggerVerb: 'get', patternId: 'causative-toV', nextDueAt: null }), // unscheduled
    ]
    expect(nextDueDate(cards, NOW)?.toISOString()).toBe('2026-06-10T00:00:00.000Z')
  })
  it('returns null when nothing is scheduled in the future', () => {
    expect(nextDueDate([card({ nextDueAt: null }), card({ nextDueAt: '2026-06-01T00:00:00Z' })], NOW)).toBeNull()
    expect(nextDueDate([], NOW)).toBeNull()
  })
})
```
Add `nextDueDate` to the import on line 2.

- [ ] **Step 2 — run, expect FAIL** (`nextDueDate is not a function`): `npx vitest run src/services/srsView.test.ts`
- [ ] **Step 3 — implement** (append to srsView.ts):
```ts
// Nearest FUTURE nextDueAt among scheduled cards. null = no future due (all due-now or unscheduled).
// Exact-`now` boundary is excluded (treated as due-now), consistent with isDue's `<=`.
export function nextDueDate(cards: Pattern[], now: Date): Date | null {
  let min: number | null = null
  for (const c of cards) {
    if (c.nextDueAt == null) continue
    const t = new Date(c.nextDueAt).getTime()
    if (t > now.getTime() && (min === null || t < min)) min = t
  }
  return min === null ? null : new Date(min)
}
```
- [ ] **Step 4 — run, expect PASS**
- [ ] **Step 5 — commit**: `feat(progress): nextDueDate helper`

### Task 2: `services/progress.ts`

**Files:** Create `src/services/progress.ts`, `src/services/progress.test.ts`

- [ ] **Step 1 — failing test** (`src/services/progress.test.ts`):
```ts
import { describe, it, expect } from 'vitest'
import {
  localDayKey, computeStreak, completedTodayCount, masterySummary,
  pickScenariosForHome, formatRelativeDay,
} from './progress'
import { newCardDefaults } from './srs'
import type { LearningRecord, Pattern, Scenario } from '../types'

const NOW = new Date('2026-06-09T10:00:00') // local

function rec(completedAt: string, scenarioId: string | null = null): LearningRecord {
  return {
    id: `r-${completedAt}-${scenarioId}`, schemaVersion: 5, scenarioId,
    originalKorean: 'x', structureTypeId: 's', structureTypeLabel: 'S',
    pattern5hId: 'causative-bare', triggerVerb: 'make', finalSentence: 'x',
    precheckChoice: null, afterChoice: null, patternQuizCorrect: true,
    patternQuizUnsure: false, assemblyCorrect: true, completedAt,
  }
}
function card(over: Partial<Pattern> = {}): Pattern {
  return {
    id: `id-${over.triggerVerb ?? 'x'}`, template: 'I made him ~', patternId: 'causative-bare',
    triggerVerb: 'make', category: '감정/관계', tags: [], exampleOriginal: 'x', exampleEnglish: 'y',
    savedAt: '2026-01-01T00:00:00Z', reviewCount: 0, lastReviewedAt: null,
    ...newCardDefaults(), ...over,
  }
}
function scn(id: string): Scenario {
  return { id, situation: 'x', originalKorean: 'x', purpose: 'x', emotionalTone: 'x',
    difficulty: 'intermediate', category: 'c', isDaily: true, createdAt: '2026-01-01T00:00:00Z' }
}
// local-midnight ISO for a given local date
const at = (local: string) => new Date(local).toISOString()

describe('computeStreak', () => {
  it('counts today + consecutive prior days', () => {
    const r = [rec(at('2026-06-09T09:00')), rec(at('2026-06-08T20:00')), rec(at('2026-06-07T08:00'))]
    expect(computeStreak(r, NOW)).toBe(3)
  })
  it('grace: yesterday active but not today still counts (ending yesterday)', () => {
    expect(computeStreak([rec(at('2026-06-08T20:00')), rec(at('2026-06-07T08:00'))], NOW)).toBe(2)
  })
  it('breaks when neither today nor yesterday active', () => {
    expect(computeStreak([rec(at('2026-06-07T08:00'))], NOW)).toBe(0)
  })
  it('same-day multiple sessions collapse to one day', () => {
    expect(computeStreak([rec(at('2026-06-09T08:00')), rec(at('2026-06-09T20:00'))], NOW)).toBe(1)
  })
  it('empty = 0', () => { expect(computeStreak([], NOW)).toBe(0) })
  it('steps by local calendar across a month boundary', () => {
    const now = new Date('2026-07-01T10:00:00')
    const r = [rec(at('2026-07-01T09:00')), rec(at('2026-06-30T20:00')), rec(at('2026-06-29T08:00'))]
    expect(computeStreak(r, now)).toBe(3)
  })
})

describe('completedTodayCount', () => {
  it('counts only today (local)', () => {
    expect(completedTodayCount([rec(at('2026-06-09T08:00')), rec(at('2026-06-09T23:00')), rec(at('2026-06-08T08:00'))], NOW)).toBe(2)
  })
})

describe('masterySummary', () => {
  it('aggregates by mastery label', () => {
    const s = masterySummary([
      card({ reps: 0 }),                  // 새내기 (fresh)
      card({ reps: 2, stability: 5 }),    // 학습중
      card({ reps: 5, stability: 30 }),   // 숙련
    ])
    expect(s).toEqual({ circuits: 3, mastered: 1, learning: 1, fresh: 1 })
  })
  it('empty', () => { expect(masterySummary([])).toEqual({ circuits: 0, mastered: 0, learning: 0, fresh: 0 }) })
})

describe('pickScenariosForHome', () => {
  const all = [scn('a'), scn('b'), scn('c'), scn('d')]
  it('returns unlearned first when enough exist', () => {
    expect(pickScenariosForHome(all, [rec(at('2026-06-08T08:00'), 'a')], 2).map((s) => s.id)).toEqual(['b', 'c'])
  })
  it('backfills least-recently-practiced learned when unlearned run short', () => {
    const recs = [rec(at('2026-06-01T08:00'), 'a'), rec(at('2026-06-05T08:00'), 'b'), rec(at('2026-06-03T08:00'), 'c'), rec(at('2026-06-02T08:00'), 'd')]
    // all learned → order by oldest latest-completion: a(06-01), d(06-02), c(06-03), b(06-05)
    expect(pickScenariosForHome(all, recs, 3).map((s) => s.id)).toEqual(['a', 'd', 'c'])
  })
  it('uses max(completedAt) per scenario for recency', () => {
    const recs = [rec(at('2026-06-01T08:00'), 'a'), rec(at('2026-06-10T08:00'), 'a'), rec(at('2026-06-05T08:00'), 'b'), rec(at('2026-06-06T08:00'), 'c'), rec(at('2026-06-07T08:00'), 'd')]
    // a's latest is 06-10 (most recent) → a goes last; order b,c,d,a → take 2 = b,c
    expect(pickScenariosForHome(all, recs, 2).map((s) => s.id)).toEqual(['b', 'c'])
  })
})

describe('formatRelativeDay', () => {
  it('오늘 / 내일 / N일 후 / past→오늘', () => {
    expect(formatRelativeDay(new Date('2026-06-09T23:00:00'), NOW)).toBe('오늘')
    expect(formatRelativeDay(new Date('2026-06-10T01:00:00'), NOW)).toBe('내일')
    expect(formatRelativeDay(new Date('2026-06-12T01:00:00'), NOW)).toBe('3일 후')
    expect(formatRelativeDay(new Date('2026-06-01T01:00:00'), NOW)).toBe('오늘')
  })
})

describe('localDayKey', () => {
  it('formats local YYYY-MM-DD', () => {
    expect(localDayKey(new Date('2026-06-09T10:00:00').toISOString())).toBe('2026-06-09')
  })
})
```

- [ ] **Step 2 — run, expect FAIL** (module not found): `npx vitest run src/services/progress.test.ts`
- [ ] **Step 3 — implement** (`src/services/progress.ts`):
```ts
import type { LearningRecord, Pattern, Scenario } from '../types'
import { masteryLabel } from './srsView'

// Local-calendar day key 'YYYY-MM-DD' from an ISO timestamp.
export function localDayKey(iso: string): string {
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const dayKeyOf = (d: Date): string => localDayKey(d.toISOString())
const prevDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
const midnight = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate())

// Consecutive local-days with >=1 completed session, ending today or (grace) yesterday.
// Day stepping uses local calendar dates (not ms subtraction) so DST can't drop/double a day.
export function computeStreak(records: LearningRecord[], now: Date): number {
  if (records.length === 0) return 0
  const active = new Set(records.map((r) => localDayKey(r.completedAt)))
  let cursor: Date
  if (active.has(dayKeyOf(now))) cursor = midnight(now)
  else if (active.has(dayKeyOf(prevDay(now)))) cursor = prevDay(now)
  else return 0

  let streak = 0
  while (active.has(dayKeyOf(cursor))) {
    streak++
    cursor = prevDay(cursor)
  }
  return streak
}

export function completedTodayCount(records: LearningRecord[], now: Date): number {
  const today = dayKeyOf(now)
  return records.filter((r) => localDayKey(r.completedAt) === today).length
}

export interface MasterySummary {
  circuits: number
  mastered: number
  learning: number  // reserved (not surfaced in sub-project A)
  fresh: number     // reserved
}

export function masterySummary(cards: Pattern[]): MasterySummary {
  let mastered = 0, learning = 0, fresh = 0
  for (const c of cards) {
    const label = masteryLabel(c)
    if (label === '숙련') mastered++
    else if (label === '학습중') learning++
    else fresh++
  }
  return { circuits: cards.length, mastered, learning, fresh }
}

// Unlearned first; if short, backfill with learned scenarios, least-recently-practiced
// first (max completedAt per scenarioId). Deterministic (ties keep scenarios order).
export function pickScenariosForHome(
  scenarios: Scenario[], records: LearningRecord[], limit: number,
): Scenario[] {
  const learnedIds = new Set(
    records.map((r) => r.scenarioId).filter((id): id is string => id != null),
  )
  const unlearned = scenarios.filter((s) => !learnedIds.has(s.id))
  if (unlearned.length >= limit) return unlearned.slice(0, limit)

  const latest = new Map<string, string>()
  for (const r of records) {
    if (r.scenarioId == null) continue
    const prev = latest.get(r.scenarioId)
    if (prev == null || r.completedAt > prev) latest.set(r.scenarioId, r.completedAt)
  }
  const learned = scenarios
    .filter((s) => learnedIds.has(s.id))
    .sort((a, b) => (latest.get(a.id) ?? '').localeCompare(latest.get(b.id) ?? ''))

  return [...unlearned, ...learned].slice(0, limit)
}

export function formatRelativeDay(target: Date, now: Date): string {
  const diff = Math.round((midnight(target).getTime() - midnight(now).getTime()) / 86_400_000)
  if (diff <= 0) return '오늘'
  if (diff === 1) return '내일'
  return `${diff}일 후`
}
```
- [ ] **Step 4 — run, expect PASS**
- [ ] **Step 5 — commit**: `feat(progress): streak/mastery/rotation/relative-day helpers`

---

## Chunk 2: UI wiring + a11y

### Task 3: Home — real streak chip, next-due nudge, rotation, remove fake mic

**Files:** Modify `src/pages/Home.tsx`

- [ ] **Step 1 — imports**: add
```ts
import { dueQueue, nextDueDate } from '../services/srsView'
import { computeStreak, completedTodayCount, pickScenariosForHome, formatRelativeDay } from '../services/progress'
```
(replace the existing `dueQueue`-only import; `seedScenarios` import stays.)

- [ ] **Step 2 — state**: add
```ts
const [streak, setStreak] = useState(0)
const [completedToday, setCompletedToday] = useState(false)
const [nextDueLabel, setNextDueLabel] = useState<string | null>(null)
```

- [ ] **Step 3 — load()**: replace the body with
```ts
let scenarios = await db.getScenarios()
if (scenarios.length === 0) { await db.saveScenarios(seedScenarios); scenarios = seedScenarios }
const records = await db.getLearningRecords()
const patterns = await db.getPatterns()
const now = new Date()
setScenarios(pickScenariosForHome(scenarios, records, 3))
setHasCompletedSession(records.length > 0)
setDueCount(dueQueue(patterns, now).length)
setStreak(computeStreak(records, now))
setCompletedToday(completedTodayCount(records, now) > 0)
const nd = nextDueDate(patterns, now)
const rel = nd ? formatRelativeDay(nd, now) : null
setNextDueLabel(rel === '오늘' ? '곧' : rel)
```

- [ ] **Step 4 — header chip**: replace the header right `<div className="flex items-center gap-2">…</div>` with a real streak chip:
```tsx
<div className="flex items-center gap-2">
  <AuthControl />
  {streak > 0 && (
    <div
      className={`fi flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${completedToday ? 'bg-accent/[0.10] border-accent/[0.30]' : 'bg-c border-line/60'}`}
      aria-label={`연속 학습 ${streak}일째${completedToday ? ', 오늘 완료' : ', 오늘 아직'}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" stroke="var(--color-accent)" strokeWidth="2" />
        <path d="M12 6v6l4 2" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="text-[13px] font-bold font-en text-accent tabular-nums num-in">{streak}</span>
      <span className="text-xs text-t2">일째</span>
    </div>
  )}
</div>
```

- [ ] **Step 5 — nudge**: replace the `{dueCount > 0 && (…)}` block with
```tsx
{dueCount > 0 ? (
  <button
    onClick={() => navigate('/review')}
    className="fu2 mt-6 text-left text-sm text-accent font-semibold pressable active:opacity-70 transition"
  >
    복습할 회로 {dueCount}개 →
  </button>
) : nextDueLabel ? (
  <button
    onClick={() => navigate('/review')}
    className="fu2 mt-6 text-left text-sm text-t2 font-medium pressable active:opacity-70 transition"
  >
    다음 복습: {nextDueLabel} →
  </button>
) : null}
```

- [ ] **Step 6 — remove fake mic**: in the input footer, replace
```tsx
<div className="flex justify-between items-center mt-3.5">
  <div className="flex items-center gap-2"> …mic div + "또는 말해봐"… </div>
  <button onClick={handleQuickStart} …>풀어보기</button>
</div>
```
with
```tsx
<div className="flex justify-end items-center mt-3.5">
  <button onClick={handleQuickStart} disabled={!canGo} className={`pressable h-[42px] px-5 rounded-[14px] text-sm font-semibold transition-all ${canGo ? 'bg-accent text-white shadow-[0_4px_20px_rgba(139,139,245,0.25)]' : 'bg-c2 text-t3 cursor-default'}`}>풀어보기</button>
</div>
```

- [ ] **Step 7 — verify**: `npx tsc -b` 0, `npm run lint` clean.
- [ ] **Step 8 — commit**: `feat(progress): Home streak chip + next-due nudge + rotation, remove fake mic`

### Task 4: Review — all-caught-up + mastery summary

**Files:** Modify `src/pages/Review.tsx`

- [ ] **Step 1 — imports**: change srsView import to `import { dueQueue, nextDueDate } from '../services/srsView'` and add `import { masterySummary, formatRelativeDay } from '../services/progress'`.

- [ ] **Step 2 — derive** (after the `due` useMemo):
```ts
const nextDue = useMemo(() => nextDueDate(patterns, now), [patterns, now])
const summary = useMemo(() => masterySummary(patterns), [patterns])
```

- [ ] **Step 3 — mastery summary line** under the `<h1>복습</h1>` in the header div:
```tsx
{patterns.length > 0 && (
  <p className="text-[13px] text-t2 mt-1.5">
    회로 <span className="font-en font-semibold text-t1">{summary.circuits}</span>
    {' · '}숙련 <span className="font-en font-semibold text-accent">{summary.mastered}</span>
  </p>
)}
```

- [ ] **Step 4 — all-caught-up**: replace `{due.length > 0 && (<section>…</section>)}` with
```tsx
{patterns.length > 0 && (
  <section>
    <p className="text-[11px] font-semibold text-t3 mb-3 tracking-wider uppercase font-en">
      오늘 복습{due.length > 0 ? ` ${due.length}` : ''}
    </p>
    {due.length > 0 ? (
      <div className="space-y-2">
        {/* …existing due.map(...) cards unchanged… */}
      </div>
    ) : (
      <div className="bg-c border border-line rounded-[14px] px-4 py-5 text-center">
        <p className="text-sm text-t2">오늘 복습 다 끝났어요 ✓</p>
        {nextDue && (
          <p className="text-[11px] text-t3 mt-1">다음 복습: {formatRelativeDay(nextDue, now)}</p>
        )}
      </div>
    )}
  </section>
)}
```
(Keep the existing due card JSX inside the `due.length > 0` branch.)

- [ ] **Step 5 — verify**: `npx tsc -b` 0, lint clean.
- [ ] **Step 6 — commit**: `feat(progress): Review all-caught-up state + mastery summary`

### Task 5: a11y — CircuitDiagnostic + step feedback live regions

**Files:** Modify `src/components/review/CircuitDiagnostic.tsx`, `src/components/learning/StepStructure.tsx`, `src/components/learning/StepFeedback.tsx`

- [ ] **Step 1 — CircuitDiagnostic** toggle button: add to the `<button onClick={() => toggle(r.id)} …>` props
```tsx
aria-expanded={expanded.has(r.id)}
aria-label={`${PATTERN_LABEL[r.id]} ${expanded.has(r.id) ? '접기' : '펼치기'}`}
```

- [ ] **Step 2 — StepStructure**: add `aria-live="polite"` to the hint block div (`{hinted && !answered && correctOption && (<div …>`) and the answer-feedback div (`{answered && (<div …bg-ok/[0.04]…>`).

- [ ] **Step 3 — StepFeedback**: add `aria-live="polite"` to the result container `<div className="bg-c rounded-[16px] p-5 border border-line">` (lines ~16).

- [ ] **Step 4 — verify**: `npx tsc -b` 0, lint clean.
- [ ] **Step 5 — commit**: `feat(progress): a11y — aria-expanded/labels + live regions`

---

## Chunk 3: Final verification

### Task 6: Full green + branch review

- [ ] `npx tsc -b` → EXIT 0
- [ ] `npx vitest run` → all pass (125 prior + new progress/srsView tests)
- [ ] `npm run lint` → clean
- [ ] `npm run build` → PWA artifacts OK
- [ ] `npm run test:e2e` → 2 pass (re-run if cold-flaky)
- [ ] Dispatch code-reviewer on `git diff master...HEAD`; fold in correct findings.
- [ ] PR → merge (user-gated) → sync master → update memory.
