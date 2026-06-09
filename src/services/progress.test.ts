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
  return {
    id, situation: 'x', originalKorean: 'x', purpose: 'x', emotionalTone: 'x',
    difficulty: 'intermediate', category: 'c', isDaily: true, createdAt: '2026-01-01T00:00:00Z',
  }
}
// local-time → ISO (stored shape)
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
    expect(completedTodayCount(
      [rec(at('2026-06-09T08:00')), rec(at('2026-06-09T23:00')), rec(at('2026-06-08T08:00'))], NOW,
    )).toBe(2)
  })
})

describe('masterySummary', () => {
  it('aggregates by mastery label', () => {
    const s = masterySummary([
      card({ reps: 0 }),                // 새내기 (fresh)
      card({ reps: 2, stability: 5 }),  // 학습중
      card({ reps: 5, stability: 30 }), // 숙련
    ])
    expect(s).toEqual({ circuits: 3, mastered: 1, learning: 1, fresh: 1 })
  })
  it('empty', () => {
    expect(masterySummary([])).toEqual({ circuits: 0, mastered: 0, learning: 0, fresh: 0 })
  })
})

describe('pickScenariosForHome', () => {
  const all = [scn('a'), scn('b'), scn('c'), scn('d')]
  it('returns unlearned first when enough exist', () => {
    expect(pickScenariosForHome(all, [rec(at('2026-06-08T08:00'), 'a')], 2).map((s) => s.id)).toEqual(['b', 'c'])
  })
  it('backfills least-recently-practiced learned when unlearned run short', () => {
    const recs = [
      rec(at('2026-06-01T08:00'), 'a'), rec(at('2026-06-05T08:00'), 'b'),
      rec(at('2026-06-03T08:00'), 'c'), rec(at('2026-06-02T08:00'), 'd'),
    ]
    // all learned → order by oldest latest-completion: a(06-01), d(06-02), c(06-03), b(06-05)
    expect(pickScenariosForHome(all, recs, 3).map((s) => s.id)).toEqual(['a', 'd', 'c'])
  })
  it('uses max(completedAt) per scenario for recency', () => {
    const recs = [
      rec(at('2026-06-01T08:00'), 'a'), rec(at('2026-06-10T08:00'), 'a'),
      rec(at('2026-06-05T08:00'), 'b'), rec(at('2026-06-06T08:00'), 'c'), rec(at('2026-06-07T08:00'), 'd'),
    ]
    // a's latest is 06-10 → a goes last; order b,c,d,a → take 2 = b,c
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
