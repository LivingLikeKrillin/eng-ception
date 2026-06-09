import { describe, it, expect, vi, afterEach } from 'vitest'
import { applyReview } from './applyReview'
import { db } from '../store/db'
import { newCardDefaults } from './srs'
import type { Pattern } from '../types'

afterEach(() => { vi.restoreAllMocks() })

function card(over: Partial<Pattern> = {}): Pattern {
  return {
    id: `id-${over.triggerVerb ?? 'x'}`, template: 'I made him ~', patternId: 'causative-bare',
    triggerVerb: 'make', category: '감정/관계', tags: [], exampleOriginal: 'x', exampleEnglish: 'y',
    savedAt: '2026-01-01T00:00:00Z', reviewCount: 0, lastReviewedAt: null,
    ...newCardDefaults(), ...over,
  }
}

describe('applyReview', () => {
  it('schedules the played card (bypassedCount reset) — new-card path', async () => {
    const update = vi.spyOn(db, 'updatePatternSchedule').mockResolvedValue(undefined)
    vi.spyOn(db, 'getPattern').mockResolvedValue(null)
    vi.spyOn(db, 'getPatterns').mockResolvedValue([])

    await applyReview('causative-bare', 'make', 4, new Date('2026-06-10T00:00:00Z'))

    expect(update).toHaveBeenCalledTimes(1)
    const [pid, verb, partial] = update.mock.calls[0]
    expect(pid).toBe('causative-bare')
    expect(verb).toBe('make')
    expect(partial.bypassedCount).toBe(0)
    expect(partial.lastGrade).toBe(4)
    expect(partial).toHaveProperty('nextDueAt')
  })

  it('bumps bypassedCount on other due cards, not the played one', async () => {
    const other = card({ id: 'o', patternId: 'perception', triggerVerb: 'see', nextDueAt: null, bypassedCount: 2 })
    const update = vi.spyOn(db, 'updatePatternSchedule').mockResolvedValue(undefined)
    vi.spyOn(db, 'getPattern').mockResolvedValue(null)
    vi.spyOn(db, 'getPatterns').mockResolvedValue([other])

    await applyReview('causative-bare', 'make', 1, new Date('2026-06-10T00:00:00Z'))

    // call 0 = played card schedule, call 1 = bump other due
    expect(update).toHaveBeenCalledTimes(2)
    expect(update.mock.calls[1][0]).toBe('perception')
    expect(update.mock.calls[1][1]).toBe('see')
    expect(update.mock.calls[1][2].bypassedCount).toBe(3)
  })

  it('does not bump the played card via the bypass loop', async () => {
    const played = card({ id: 'p', patternId: 'causative-bare', triggerVerb: 'make', nextDueAt: null, bypassedCount: 1 })
    const update = vi.spyOn(db, 'updatePatternSchedule').mockResolvedValue(undefined)
    vi.spyOn(db, 'getPattern').mockResolvedValue(null)
    vi.spyOn(db, 'getPatterns').mockResolvedValue([played])

    await applyReview('causative-bare', 'make', 3, new Date('2026-06-10T00:00:00Z'))

    expect(update).toHaveBeenCalledTimes(1)
    expect(update.mock.calls[0][2].bypassedCount).toBe(0)
  })
})
