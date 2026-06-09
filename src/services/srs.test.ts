import { describe, it, expect } from 'vitest'
import { gradeFromSignals, newCardDefaults, schedule } from './srs'

describe('gradeFromSignals — production-weighted 4-grade table', () => {
  const cases: [boolean, boolean, boolean, 1 | 2 | 3 | 4][] = [
    // assemblyCorrect, patternQuizCorrect, patternQuizUnsure -> grade
    [false, false, false, 1], // assembly✗ + recog wrong            -> Again
    [false, true,  true,  2], // assembly✗ + recog after-hint       -> Hard
    [false, true,  false, 2], // assembly✗ + recog cold             -> Hard
    [true,  false, false, 2], // assembly✓ + recog wrong            -> Hard
    [true,  true,  true,  3], // assembly✓ + recog after-hint       -> Good
    [true,  true,  false, 4], // assembly✓ + recog cold             -> Easy
  ]
  it.each(cases)(
    'assembly=%s correct=%s unsure=%s -> %i',
    (assemblyCorrect, patternQuizCorrect, patternQuizUnsure, expected) => {
      expect(gradeFromSignals({ assemblyCorrect, patternQuizCorrect, patternQuizUnsure })).toBe(expected)
    },
  )
})

describe('newCardDefaults', () => {
  it('returns unscheduled new-card state', () => {
    expect(newCardDefaults()).toEqual({
      stability: null, difficulty: null, nextDueAt: null,
      reps: 0, lapses: 0, bypassedCount: 0, cardState: 'new', lastGrade: null,
    })
  })
})

describe('schedule — FSRS transitions', () => {
  const NOW = new Date('2026-06-09T00:00:00.000Z')

  it('new card + Good produces a positive stability and a future due date', () => {
    const next = schedule(null, 3, NOW)
    expect(next.stability).toBeGreaterThan(0)
    expect(next.cardState).not.toBe('new')
    expect(new Date(next.nextDueAt).getTime()).toBeGreaterThan(NOW.getTime())
    expect(next.reps).toBe(1)
    expect(next.lastReviewedAt).toBe(NOW.toISOString())
  })

  it('Easy schedules a longer interval than Hard for a new card', () => {
    const easy = schedule(null, 4, NOW)
    const hard = schedule(null, 2, NOW)
    expect(new Date(easy.nextDueAt).getTime()).toBeGreaterThan(new Date(hard.nextDueAt).getTime())
  })

  it('Again on a review card increments lapses', () => {
    const first = schedule(null, 3, NOW)
    const prev = {
      stability: first.stability, difficulty: first.difficulty,
      cardState: first.cardState, reps: first.reps, lapses: first.lapses,
      nextDueAt: first.nextDueAt, lastReviewedAt: first.lastReviewedAt,
    }
    const later = new Date('2026-06-15T00:00:00.000Z')
    const next = schedule(prev, 1, later)
    expect(next.lapses).toBe(first.lapses + 1)
  })
})
