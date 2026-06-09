# 오프라인 리콜 (Offline Recall) Implementation Plan

> Use superpowers:executing-plans. Spec: `docs/superpowers/specs/2026-06-10-offline-recall-design.md`.

**Goal:** Make due-card review an offline, no-API flashcard recall that advances the FSRS schedule.

**Architecture:** Extract complete()'s SRS block into shared `applyReview`; reuse it from an offline `RecallCard` opened from Review's due queue. Schedule-only (no LearningRecord).

---

## Task 1: `applyReview` helper (DRY extraction) + test

**Files:** Create `src/services/applyReview.ts`, `src/services/applyReview.test.ts`

- [ ] **Test first** (`applyReview.test.ts`): spy `db.getPattern`(→null), `db.getPatterns`, `db.updatePatternSchedule`; call `applyReview('causative-bare','make',4,now)`; assert played card update has `bypassedCount:0` + `lastGrade`/`nextDueAt`; with one other due card, assert its `bypassedCount` bumped (2 calls). Mirror learningStore SRS tests.
- [ ] **Run → FAIL.**
- [ ] **Implement** per spec §4.1.
- [ ] **Run → PASS.**
- [ ] **Commit:** `feat(recall): applyReview shared SRS-advance helper`

## Task 2: complete() uses applyReview (behavior-preserving)

**Files:** `src/store/learningStore.ts`

- [ ] Replace the inline SRS block (getPattern→schedule→updatePatternSchedule→getPatterns→bump) inside complete()'s try with `await applyReview(pid, verb, grade, now)`; keep `grade = gradeFromSignals(...)`. Drop now-unused imports (`schedule`, `CardSchedule`, `isDue`) if no longer referenced.
- [ ] **Run `npx vitest run src/store/learningStore.test.ts`** → existing SRS tests still PASS.
- [ ] **Commit:** `refactor(recall): complete() delegates to applyReview`

## Task 3: RecallCard component

**Files:** Create `src/components/review/RecallCard.tsx`

- [ ] Per spec §4.3: overlay `data-testid="recall-card"`, close (aria-label 닫기), Korean prompt, "영어 보기" reveal → exampleEnglish + template + 3 buttons (막힘/애매/정확) → `onGrade(1|3|4)`. Grade map inline const.
- [ ] **tsc + lint.**
- [ ] **Commit:** `feat(recall): RecallCard offline flashcard component`

## Task 4: Review wiring + due-card tap

**Files:** `src/pages/Review.tsx`

- [ ] state `recallCard: Pattern | null`; due card button "복습하기 →" → "복습 →", onClick `setRecallCard(c)`; render `<RecallCard>` overlay; `handleRecallGrade` → `applyReview` + `db.getPatterns()` refresh + close. Remove unused `rePractice` if orphaned.
- [ ] **tsc + lint + vitest.**
- [ ] **Commit:** `feat(recall): Review due-card opens offline recall overlay`

## Task 5: e2e update + verify

**Files:** `e2e/srs-flow.spec.ts`

- [ ] Replace the tail (tap → empathy) with recall flow: tap "복습 →" → `recall-card` visible → "영어 보기" → exampleEnglish visible → "정확" → overlay hidden.
- [ ] `npx tsc -b` 0 · `npx vitest run` · `npm run lint` · `npm run build` · `npm run test:e2e` 2 pass.
- [ ] Code-review branch; fold findings; PR → merge → memory.
