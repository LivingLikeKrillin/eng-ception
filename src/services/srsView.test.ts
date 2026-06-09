import { describe, it, expect } from 'vitest'
import { isDue, dueQueue, masteryLabel, rollupByPattern } from './srsView'
import { newCardDefaults } from './srs'
import type { Pattern } from '../types'

const NOW = new Date('2026-06-09T00:00:00.000Z')

function card(over: Partial<Pattern> = {}): Pattern {
  return {
    id: `id-${over.triggerVerb ?? 'x'}-${over.patternId ?? 'p'}`,
    template: 'I made him ~', patternId: 'causative-bare', triggerVerb: 'make',
    category: '감정/관계', tags: [], exampleOriginal: 'x', exampleEnglish: 'y',
    savedAt: '2026-01-01T00:00:00Z', reviewCount: 0, lastReviewedAt: null,
    ...newCardDefaults(), ...over,
  }
}

describe('isDue', () => {
  it('unscheduled (nextDueAt null) is due', () => {
    expect(isDue(card({ nextDueAt: null }), NOW)).toBe(true)
  })
  it('past due date is due, future is not', () => {
    expect(isDue(card({ nextDueAt: '2026-06-08T00:00:00Z' }), NOW)).toBe(true)
    expect(isDue(card({ nextDueAt: '2026-06-10T00:00:00Z' }), NOW)).toBe(false)
  })
})

describe('dueQueue ordering', () => {
  it('escalated (bypassedCount>=N) first, then most-overdue, unscheduled treated as max overdue', () => {
    const escalated = card({ triggerVerb: 'have', nextDueAt: '2026-06-08T00:00:00Z', bypassedCount: 3 })
    const veryOverdue = card({ triggerVerb: 'let', nextDueAt: '2026-05-01T00:00:00Z', bypassedCount: 0 })
    const unscheduled = card({ triggerVerb: 'make', nextDueAt: null, bypassedCount: 0 })
    const notDue = card({ triggerVerb: 'get', patternId: 'causative-toV', nextDueAt: '2026-07-01T00:00:00Z' })
    const q = dueQueue([notDue, veryOverdue, escalated, unscheduled], NOW)
    expect(q.map((c) => c.triggerVerb)).toEqual(['have', 'make', 'let'])
    expect(q).not.toContain(notDue)
  })
})

describe('dueQueue null-safety', () => {
  it('does not throw when a due card is missing savedAt (backfill omits it)', () => {
    const a = card({ triggerVerb: 'make', nextDueAt: null, savedAt: undefined as unknown as string })
    const b = card({ triggerVerb: 'have', nextDueAt: null })
    expect(() => dueQueue([a, b], NOW)).not.toThrow()
    expect(dueQueue([a, b], NOW)).toHaveLength(2)
  })
})

describe('masteryLabel', () => {
  it('새내기 when reps 0', () => {
    expect(masteryLabel(card({ reps: 0 }))).toBe('새내기')
  })
  it('학습중 below 21d stability', () => {
    expect(masteryLabel(card({ reps: 2, stability: 5 }))).toBe('학습중')
  })
  it('숙련 at/above 21d stability', () => {
    expect(masteryLabel(card({ reps: 5, stability: 30 }))).toBe('숙련')
  })
})

describe('rollupByPattern', () => {
  it('groups cards under their Pattern5HId with dueCount', () => {
    const cards = [
      card({ patternId: 'causative-bare', triggerVerb: 'make', nextDueAt: null }),
      card({ patternId: 'causative-bare', triggerVerb: 'have', nextDueAt: '2026-07-01T00:00:00Z' }),
      card({ patternId: 'perception', triggerVerb: 'see', nextDueAt: '2026-06-01T00:00:00Z' }),
    ]
    const roll = rollupByPattern(cards, NOW)
    const bare = roll.find((r) => r.id === 'causative-bare')!
    expect(bare.cards).toHaveLength(2)
    expect(bare.dueCount).toBe(1) // only the unscheduled 'make'
    expect(roll.find((r) => r.id === 'perception')!.dueCount).toBe(1)
  })

  it('counts escalated (bypassedCount>=N) cards per pattern', () => {
    const cards = [
      card({ patternId: 'causative-bare', triggerVerb: 'make', bypassedCount: 3 }),
      card({ patternId: 'causative-bare', triggerVerb: 'have', bypassedCount: 0 }),
      card({ patternId: 'causative-bare', triggerVerb: 'let', bypassedCount: 5 }),
    ]
    const bare = rollupByPattern(cards, NOW).find((r) => r.id === 'causative-bare')!
    expect(bare.escalatedCount).toBe(2) // make + let
  })
})
