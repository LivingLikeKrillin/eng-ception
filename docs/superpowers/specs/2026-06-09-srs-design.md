# Eng-ception — Post-v9 2-Layer SRS Design

> **Status**: Design (pending spec review + user approval)
> **Date**: 2026-06-09
> **Author**: collaborative (Eisen + Claude)
> **Scope**: Add a **spaced-repetition layer** on top of the existing v9 5형식 training loop. Every completed session already produces a rich dual signal (recognition × production) on a `(patternId, triggerVerb)` card; this milestone turns those into an **FSRS schedule**, a **due-card re-practice surface**, and a **"회로 진단" 2-layer mastery view**. The expensive precondition — the `(patternId, triggerVerb)` dedup composite key — already exists in both the localStorage and Firestore adapters.
> **Relates to**: P2 backlog item #6 (CLAUDE.md "다음 단계" #4); expert pedagogy review 2026-05-18 (2-Layer SRS, organic-first, bypassedCount, N=3). Builds on #5 event tracking (measurement substrate) + #3 Firebase (multi-device substrate).

---

## 1. Context & problem

### 1.1 What exists today

- **The card key is already in place.** `Pattern` is deduped by the composite `(patternId, triggerVerb)` in `store/localStorage.ts` (find-or-`reviewCount++`) and `store/firestoreDataStore.ts` (composite doc id `${patternId}__${triggerVerb}` + `setDoc`+`increment`). A pattern is upserted once per session at `learningStore.advanceToStep3()`.
- **The review log already exists.** Each `LearningRecord` (schema v4) is one session on one `(pattern5hId, triggerVerb)` with the dual signal — `patternQuizCorrect`, `patternQuizUnsure`, `assemblyCorrect` — plus `completedAt`. Records are saved at `learningStore.complete()`. This is, in effect, a per-card review log: enough to reconstruct grades and timing, so the scheduler choice is **not permanently locked in** (algorithm/weights can be re-derived later from the log).
- **`Pattern` carries the re-practice seed.** `exampleOriginal` holds the Korean the user originally typed for that card — a ready-made review prompt.
- **No scheduling today.** `Pattern` has only `reviewCount` + `lastReviewedAt`; there is no notion of "due," no interval, no mastery rollup. The 복습(Review) page lists saved patterns + records flat; 구조(Patterns) is a static library grouped by `Pattern5HId`.
- **Two storage adapters behind one seam.** All persistence goes through `store/db.ts` (`DataStore` interface); localStorage and Firestore both implement it. Any new card-state read/write must land on both.

### 1.2 What this milestone is — and isn't

This milestone builds the **SRS core that runs from day 1** so schedule state (which cannot be reconstructed retroactively — review *timing* is path-dependent) starts accumulating immediately. It does **not** build the A/B experiment, dynamic-N, or per-user weight optimization — those are genuinely data-gated (expert: ~100+ active users × 30+ sessions before a Time-to-Stabilization A/B is meaningful), and this milestone deliberately ships them as flagged constants / deferred work, with the measurement substrate (events #5 + records log) already in place to enable them later.

## 2. Goals and non-goals

### Goals

- **schema v5**: add FSRS card state to `Pattern`, via a **non-destructive** v4→v5 migration (no data loss; backfill new-card defaults).
- **Pure scheduler seam** (`services/srs.ts`): `schedule(prevState, grade, now) → nextState` — FSRS DSR model with published default weights, no storage/FSRS coupling.
- **Dual-signal → FSRS grade** mapping (production-weighted, all 4 grades), applied at `complete()`.
- **Due surface**: a due queue on the 복습 page; tapping a due card re-practices it from its own `exampleOriginal`. A one-line Home nudge.
- **bypassedCount / N=3 escalation** (single-mode → speaking soft-bias): an avoided due card surfaces more prominently.
- **"회로 진단" 2-layer view**: `Pattern5HId` rollup → per-`(patternId, triggerVerb)` card state.
- **Zero regression**: existing vitest (95 pass | 9 skip) + e2e + emulator (9/9) stay green; localStorage and Firestore behavior preserved for un-migrated/unconfigured cases.

### Non-goals

- **A/B experiment** (Time-to-Stabilization), **dynamic N** (Pattern Difficulty Weight × Session Density Index), **per-user FSRS weight optimization** — all data-gated, deferred.
- **intro-phase first-interval override** (0.25-day seed) — shipped as a flagged constant defaulting OFF (standard FSRS new-card handling); enabling it is a future A/B arm.
- **Listening / cross-mode queue** — listening is out of product scope ([[scope_speaking_only]]); escalation feeds a speaking soft-bias only.
- **Hard queue / forcing the next card** — rejected (corrupts the "발화 실패 복기" motif); surfacing is soft.
- **Prompt-injected verb bias** on custom input — rejected (risks distorting the pedagogically-correct pattern classification).
- **MAX_RECORDS / card pruning changes** — unchanged (localStorage cap 100; cloud unbounded).

## 3. Architecture

```
complete()  ──(signals)──▶  gradeFromSignals()  ──grade──┐
   │                                                       ▼
   │  saveLearningRecord (review log, unchanged)     services/srs.ts: schedule(prev, grade, now)
   │                                                       │ nextState {stability,difficulty,nextDueAt,state,reps,lapses}
   └──────────────▶  db.getPattern(pid,verb) ─▶ store applies ─▶ db.updatePatternSchedule(pid, verb, partial)
                                                                      │ (dumb merge; localStorage + Firestore)
Review page ──reads db.getPatterns()──▶ dueQueue() + rollup()  ──▶  "오늘 복습" + "회로 진단"
                       │ tap due card
                       └──▶ startCustom(card.exampleOriginal)  (re-practice)
Home ──reads db.getPatterns()──▶ "복습할 회로 N개 →" nudge
```

Two clean seams keep FSRS math out of storage: the **pure scheduler** (`services/srs.ts`) and **dumb merge** storage methods (`getPattern` / `updatePatternSchedule`). The store orchestrates (read card → compute → write). All SRS-derived views are pure functions over `Pattern[]` (`services/srsView.ts`): the storage layer never computes "due" or "mastery."

## 4. Components (one purpose each)

### 4.1 `types` — schema v5 card state

`Pattern` gains FSRS state. **`easeFactor` is intentionally NOT added** — that is an SM-2 term; FSRS uses stability + difficulty.

```ts
// added to Pattern (types/index.ts)
stability: number | null        // FSRS S (days); null = never scheduled
difficulty: number | null       // FSRS D (1..10); null = never scheduled
nextDueAt: string | null        // ISO; null = unscheduled ⇒ treated as due now
reps: number                    // count of reviews applied (default 0)
lapses: number                  // count of Again(1) grades (default 0)
bypassedCount: number           // avoidance counter for N=3 escalation (default 0)
state: 'new' | 'learning' | 'review' | 'relearning'   // FSRS card state (default 'new')
lastGrade: 1 | 2 | 3 | 4 | null // last applied grade (default null)
// kept: reviewCount, lastReviewedAt (total touches / last touch time)
```

`LearningRecord` needs **no new fields** — the grade derives from existing `patternQuizCorrect` / `patternQuizUnsure` / `assemblyCorrect`. Only the literal bumps: `schemaVersion: 4` → `schemaVersion: 5`.

`Grade = 1 | 2 | 3 | 4` and `CardState` are added to `types/v9.ts` (or a new `types/srs.ts`).

### 4.2 `services/srs.ts` — pure FSRS scheduler (testable, no I/O)

- `schedule(prev: CardSchedule | null, grade: Grade, now: Date): CardSchedule` — implements FSRS-5 DSR update with **published default weights** (`DEFAULT_W: number[]`, a module constant). `prev = null` (or `state:'new'`) → **initial** stability/difficulty derived from grade only; the elapsed-since-last term is **not read** on the new-card path (a `state:'new'` card's `lastReviewedAt` may be the step3-upsert time or null and must be ignored). For `state ∈ {review, relearning}`, update stability via the FSRS recall/forget formulas using `elapsedDays = (now − lastReviewedAt) / 1day`, and compute `nextDueAt = now + interval(stability, requestRetention)`. `CardSchedule` therefore carries `{ stability, difficulty, state, reps, lapses, lastReviewedAt }` — enough to run the update without any storage access.
- `requestRetention` = a module constant (default 0.9, FSRS standard).
- `gradeFromSignals({ assemblyCorrect, patternQuizCorrect, patternQuizUnsure }): Grade` — the §5 table.
- `INTRO_PHASE` flag (default `false`): when true, a brand-new card's first non-Again interval is clamped to 0.25 day (expert E). Off by default; documented as a future A/B arm.
- Pure: no `Date.now()` inside (caller passes `now`), no storage. Fully unit-testable; the FSRS formula gets boundary tests per grade and per state.

### 4.3 `services/srsView.ts` — pure derivations over `Pattern[]`

- `isDue(card, now): boolean` — `nextDueAt == null || nextDueAt <= now`.
- `dueQueue(cards, now): Pattern[]` — due cards sorted by escalation desc (`bypassedCount >= N` first), then overdue-ness desc, then `nextDueAt` asc.
- `masteryLabel(card): '새내기' | '학습중' | '숙련'` — by FSRS stability bands: `reps === 0 → 새내기`; `stability < 21 days → 학습중`; `>= 21 days → 숙련`. (Expert's "~30 varied-rep for automation" recorded as a future refinement, not the v1 label source.)
- **Sort value for unscheduled cards**: in the overdue-ness ordering, a card with `nextDueAt == null` (never scheduled / backfilled / new) is treated as **maximally overdue** (sorts before scheduled overdue cards), so freshly-seen-but-never-reviewed circuits surface first.
- `rollupByPattern(cards): { id: Pattern5HId; cards: Pattern[]; dueCount: number; mastery: ... }[]` — the upper layer; aggregate over child cards.
- `N_BYPASS = 3` (static cold-start config).
- No I/O, no DOM. Unit-testable in `node` env.

### 4.4 `store/dataStore.ts` + adapters — two dumb card methods

Add to the `DataStore` interface:
- `getPattern(patternId: string, triggerVerb: string): Promise<Pattern | null>`
- `updatePatternSchedule(patternId: string, triggerVerb: string, partial: Partial<Pattern>): Promise<void>` — merge the given FSRS fields onto the matching card (no FSRS logic).

**localStorage adapter**: `getPattern` = find by composite key; `updatePatternSchedule` = find + `Object.assign` + persist. `init()` migration v4→v5 becomes **non-destructive**: on version bump, read existing patterns, backfill missing FSRS fields with new-card defaults (`stability:null, difficulty:null, nextDueAt:null, reps:0, lapses:0, bypassedCount:0, state:'new', lastGrade:null`), write back; keep records (bump their literal `schemaVersion` is unnecessary at read since type widens — see §7). Set stored version to 5.

**Firestore adapter**: `getPattern` = `getDoc(composite key)`; `updatePatternSchedule` = `setDoc(ref, partial, {merge:true})` (queues offline like the existing increment). No schema-version concept → reads apply **defensive defaults** for missing FSRS fields (a `withDefaults(pattern)` helper) so cloud docs written pre-v5 read cleanly. **`withDefaults` must be applied in BOTH `getPatterns` AND the new single-doc `getPattern`** — `complete()` reads a possibly-pre-v5 card via `getPattern` and feeds it to `schedule(toSchedule(prev), …)`, which would break on `undefined` fields otherwise.

### 4.5 `store/learningStore.ts` — apply the review at completion + bypass bookkeeping

In `complete()`, after `saveLearningRecord`:
1. `grade = gradeFromSignals({ assemblyCorrect: isAssemblyCorrect(s), patternQuizCorrect, patternQuizUnsure })`.
2. `prev = await db.getPattern(pid, verb)` (the card was upserted at step3).
3. `next = schedule(toSchedule(prev), grade, new Date())`.
4. `await db.updatePatternSchedule(pid, verb, { ...next fields, reps, lapses, lastGrade: grade, lastReviewedAt, bypassedCount: 0 })` (reviewing a card resets its avoidance counter).
5. **Bypass bookkeeping**: load all patterns, compute the due set at `now`; for each due card that is **not** this card, `updatePatternSchedule(..., { bypassedCount: card.bypassedCount + 1 })`. **Skip the whole step when no other card is due** (the common path: a single `getPatterns` read, zero extra writes). Otherwise bounded by the curated taxonomy (≤ 7 patterns × ~5 verbs; ~17 distinct curated verbs total), and a session is infrequent → write volume is small; Firestore writes queue offline.
- `advanceToStep3()` (pattern upsert) is unchanged — new cards still start with new-card defaults via the upsert path; FSRS fields are set on the first `complete()`.
- **`complete()` currently hardcodes `schemaVersion: 4` when building the `LearningRecord`** — bump that literal to `5` for newly written records.

### 4.6 `pages/Review.tsx` — SRS surface (the diagnostic home)

Consolidate SRS into 복습 (it is literally "review"; already loads records + patterns). Add above the existing "Sentences" list:
- **"오늘 복습 N"** — `dueQueue(patterns, now)`. Each row: Korean (`exampleOriginal`) + pattern·verb chip + "회피 중" badge when `bypassedCount >= N` + a "복습하기 →" tap → re-practice (§4.7). Empty state when nothing due.
- **"회로 진단"** — `rollupByPattern`: 7 `Pattern5HId` rows (label + mastery summary + due count); expanding a row reveals its verb cards with `masteryLabel`, due/회피 badges, `reps`, and next-due date.
- Existing "Saved Patterns" preview + "Sentences" list stay. **구조(Patterns) page is untouched** (static library).

### 4.7 Re-practice wiring (reuse the existing seed path — do NOT invent a new key)

Tapping a due card starts a fresh session seeded with `card.exampleOriginal`. **The seeding seam already works today** via the router-state key **`input`**: `Home.tsx`'s quick-start does `navigate('/learn/custom', { state: { input: quickInput } })`, and `Learn.tsx` reads `(location.state as { input?: string })?.input` and calls `startCustom(passedInput)` on bootstrap. So the due-card tap must use the **same** key:

```ts
navigate('/learn/custom', { state: { input: card.exampleOriginal } })
```

**Do not** use `{ state: { korean } }` and do **not** add a new `Learn.tsx` branch — that path is already wired. Note: today's Review "다시 풀기" button (`Review.tsx`) routes to `/learn/custom` with **no `state`** (lands on the blank custom-input screen); this milestone's due-card tap is the first Review-side caller to pass the `input` seed. (Optionally the existing "다시 풀기" can be upgraded to seed `r.originalKorean` the same way, but that is not required for SRS.)

### 4.8 `pages/Home.tsx` — nudge

A one-line "복습할 회로 N개 →" linking to /review, where `N = dueQueue(patterns, now).length`, shown only when `N > 0`. PIPA-safe (count only).

## 5. Dual-signal → FSRS grade (the mapping)

Applied in `gradeFromSignals`. Recognition has 3 states (cold = correct & !unsure; after-hint = correct & unsure; wrong = !correct); production = `assemblyCorrect`.

| | assembly ✗ | assembly ✓ |
|---|---|---|
| recognition **wrong** | Again (1) | Hard (2) |
| recognition **after-hint** | Hard (2) | Good (3) |
| recognition **cold** | Hard (2) | Easy (4) |

Rationale: production (assembly) is the actual target skill, so any `assembly ✓` is at least Hard; Easy is reserved for the strongest dual evidence (cold recognition + correct assembly) to avoid interval inflation; all 6 collected cells are used.

## 6. Data flow (one completed session)

1. User finishes a session on `(pid, verb)`.
2. `complete()`: save record (log) → derive grade → load card → `schedule()` → persist FSRS fields, reset `bypassedCount=0` → increment `bypassedCount` on other due cards.
3. Later, 복습 page reads `db.getPatterns()`, derives `dueQueue` + `rollupByPattern` purely, renders 오늘 복습 + 회로 진단.
4. User taps a due card → `startCustom(exampleOriginal)` → new session → back to step 1 (now the card is reviewed, its schedule advances, its `bypassedCount` resets).

## 7. Migration & back-compat

- **localStorage v4 → v5**: non-destructive. `init()` detects stored version ≠ 5, backfills FSRS defaults onto existing patterns, preserves records, sets version 5. (Contrast with the current destructive nuke-on-mismatch.) Records keep working; `schemaVersion` type widens to `4 | 5` during transition, new records written as `5`. ⚖️ Decision point for review: whether to also rewrite old records' literal to 5 or just widen the type and leave historical records at 4 (proposed: **widen type, leave history**, since records carry no FSRS state).
- **Firestore**: no version step; `withDefaults()` applied on every pattern read so pre-v5 cloud docs (and the offline cache) read with FSRS defaults; `updatePatternSchedule` merge-writes fill them in over time.
- **Login merge (`services/migrateToCloud.ts`) — FSRS state handling.** Migration uploads local patterns via `cloud.savePattern(p)`. The Firestore `savePattern` has two branches: a **new** composite key writes the **whole** pattern object (FSRS fields included — preserved ✓); an **existing** key merges only `{ reviewCount: increment(1), lastReviewedAt }`, which would **drop** the local card's `stability/difficulty/nextDueAt/reps/lapses/state`. Resolution for v1: **on composite-key collision, the cloud schedule is authoritative** (cloud is the multi-device source of truth); local-only cards (the realistic first-login case — cloud is empty, so *no* collisions and *all* local FSRS state uploads intact) are fully preserved. The only loss is cross-device offline-schedule divergence on the *same* card during a re-login — **accepted and deferred**, parallel to the existing pattern-id-divergence-on-merge note (firebase spec §8). Full multi-device schedule reconciliation is out of scope. **This is a documented decision, not a code change** — `migrateToCloud` and `savePattern` stay as-is.
- **Unconfigured Firebase / pure-local**: unchanged behavior; SRS runs entirely on localStorage.
- **Mock mode / e2e**: `complete()` still runs the scheduler against whatever adapter is wired; mock payloads already produce a `(pid, verb)` card, so SRS state accrues in tests too.

## 8. Testing

- `services/srs.ts`: unit tests — initial scheduling per grade; recall vs forget transitions; interval monotonicity; `gradeFromSignals` all 6 cells; `INTRO_PHASE` on/off boundary.
- `services/srsView.ts`: `isDue` (incl. `nextDueAt:null`), `dueQueue` ordering (escalation → overdue → due asc), `masteryLabel` bands, `rollupByPattern` aggregation.
- Adapters: `getPattern` / `updatePatternSchedule` round-trip (localStorage); non-destructive v4→v5 migration backfill (existing patterns gain defaults, records survive); Firestore `withDefaults` on both reads + merge-write under the emulator (`test:emulator`).
- Login merge (emulator): a local-only card uploads full FSRS state; a collision keeps cloud's schedule (cloud-authoritative, §7) — extend the existing `migrateToCloud.emulator.test`.
- `learningStore.complete()`: grade applied, card scheduled, `bypassedCount` reset on review + incremented on other due cards.
- e2e (mock): complete a session → due card appears in 복습 → tap re-practice seeds the Korean.

## 9. Deferred / future (data-gated)

- A/B: Time-to-Stabilization (sessions until a card reaches a 3-day+ stable interval), intro-phase arm.
- Dynamic N: `Pattern Difficulty Weight × Session Density Index` replacing static N=3.
- Per-user FSRS weight optimization from the records review log.
- Mastery label refinement toward the expert's varied-rep (~30) automation threshold.
- SM-2 ↔ FSRS swap is kept cheap by the pure scheduler seam + the records log, if ever needed.

## 10. Resolved decisions (post spec-review)

1. **Records literal on migration** (§7): **LOCKED** — widen `schemaVersion` type to `4 | 5`, leave historical records at 4, write new records as 5. Records carry no FSRS state, so there is no read-time risk.
2. **Bypass bookkeeping cost** (§4.5): **LOCKED** — per-completion increment on other due cards, **skipped entirely when nothing else is due** (common path = one read, zero writes). Bounded by the curated taxonomy; keep the stored counter (a lazy/derived counter would need historical `nextDueAt`, which is not retained).
3. **Login-merge FSRS conflict** (§7): **LOCKED** — cloud-authoritative on composite-key collision; local-only cards preserved; cross-device offline divergence deferred. No code change to `migrateToCloud`/`savePattern`.
4. **Mastery bands** (§4.3): stability cutoffs (`<21d` 학습중, `≥21d` 숙련) — provisional; tune once real card histories exist (data-gated, §9).
