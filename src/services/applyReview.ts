import { db } from '../store/db'
import { schedule, type CardSchedule, type Grade } from './srs'
import { isDue } from './srsView'

// Grade a single card and advance its FSRS schedule + the N-bypass bookkeeping. Shared by
// learningStore.complete() (session-derived grade) and offline recall (self-rated grade).
// Schedule-only: it does NOT write a LearningRecord (recall is maintenance, not a session).
export async function applyReview(
  patternId: string, triggerVerb: string, grade: Grade, now: Date,
): Promise<void> {
  const card = await db.getPattern(patternId, triggerVerb)
  const prev: CardSchedule | null = card
    ? {
        stability: card.stability, difficulty: card.difficulty,
        cardState: card.cardState, reps: card.reps, lapses: card.lapses,
        nextDueAt: card.nextDueAt, lastReviewedAt: card.lastReviewedAt,
      }
    : null
  const next = schedule(prev, grade, now)
  await db.updatePatternSchedule(patternId, triggerVerb, {
    ...next, // next carries lastReviewedAt
    lastGrade: grade,
    bypassedCount: 0, // reviewing a card clears its avoidance counter
  })

  // Bump other cards that were due at `now` (single-mode soft-bias escalation).
  const all = await db.getPatterns()
  const otherDue = all.filter(
    (p) => isDue(p, now) && !(p.patternId === patternId && p.triggerVerb === triggerVerb),
  )
  await Promise.all(
    otherDue.map((p) =>
      db.updatePatternSchedule(p.patternId, p.triggerVerb, { bypassedCount: p.bypassedCount + 1 }),
    ),
  )
}
