import { describe, it, expect, beforeEach } from 'vitest'
import { localStorageAdapter } from './localStorage'
import type { LearningRecord, Pattern } from '../types'
import { newCardDefaults } from '../services/srs'

class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
  get length() { return this.m.size }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null }
}

beforeEach(() => {
  globalThis.localStorage = new MemStorage()
  // Node 22 provides a read-only global crypto with randomUUID — no shim needed.
})

function makePattern(overrides: Partial<Pattern> = {}): Pattern {
  return {
    id: `id-${Math.random()}`,
    template: 'I made him ~',
    patternId: 'causative-bare',
    triggerVerb: 'make',
    category: '감정/관계',
    tags: ['감정 표현'],
    exampleOriginal: '그가 화내게 만들었어',
    exampleEnglish: 'I made him angry.',
    savedAt: new Date().toISOString(),
    reviewCount: 0,
    lastReviewedAt: null,
    ...newCardDefaults(),
    ...overrides,
  }
}

describe('localStorageAdapter v6 migration (non-destructive)', () => {
  it('sets schema version to 6 when none exists', async () => {
    await localStorageAdapter.init()
    expect(localStorage.getItem('eng-ception:schema-version')).toBe('6')
  })

  it('backfills FSRS defaults + record isFiveHMoment and KEEPS records on v4->v6', async () => {
    localStorage.setItem('eng-ception:schema-version', '4')
    localStorage.setItem('eng-ception:records', '[{"id":"r1"}]')
    localStorage.setItem('eng-ception:patterns', JSON.stringify([{
      id: 'p1', template: 'I made him ~', patternId: 'causative-bare', triggerVerb: 'make',
      category: '감정/관계', tags: [], exampleOriginal: 'x', exampleEnglish: 'y',
      savedAt: '2026-01-01T00:00:00Z', reviewCount: 2, lastReviewedAt: null,
    }]))

    await localStorageAdapter.init()

    const records = await localStorageAdapter.getLearningRecords()
    expect(records[0].id).toBe('r1')                 // kept
    expect(records[0].isFiveHMoment).toBe(true)      // backfilled
    const patterns = await localStorageAdapter.getPatterns()
    expect(patterns[0].cardState).toBe('new')
    expect(patterns[0].bypassedCount).toBe(0)
    expect(patterns[0].nextDueAt).toBeNull()
    expect(patterns[0].reviewCount).toBe(2) // preserved
    expect(localStorage.getItem('eng-ception:schema-version')).toBe('6')
  })

  it('non-destructive v5 -> v6: keeps records, backfills isFiveHMoment', async () => {
    localStorage.setItem('eng-ception:schema-version', '5')
    localStorage.setItem('eng-ception:records', '[{"id":"r1"}]')
    await localStorageAdapter.init()
    const records = await localStorageAdapter.getLearningRecords()
    expect(records[0].id).toBe('r1')
    expect(records[0].isFiveHMoment).toBe(true)
    expect(localStorage.getItem('eng-ception:schema-version')).toBe('6')
  })

  it('still clears on a pre-v4 (legacy) version', async () => {
    localStorage.setItem('eng-ception:schema-version', '3')
    localStorage.setItem('eng-ception:patterns', '[{"id":"old"}]')
    await localStorageAdapter.init()
    expect(await localStorageAdapter.getPatterns()).toEqual([])
  })
})

describe('localStorageAdapter.getPattern / updatePatternSchedule', () => {
  it('getPattern finds by composite key, returns null when absent', async () => {
    await localStorageAdapter.init()
    await localStorageAdapter.savePattern(makePattern({ id: 'p1' }))
    expect((await localStorageAdapter.getPattern('causative-bare', 'make'))?.id).toBe('p1')
    expect(await localStorageAdapter.getPattern('causative-bare', 'let')).toBeNull()
  })

  it('updatePatternSchedule merges FSRS fields onto the matching card', async () => {
    await localStorageAdapter.init()
    await localStorageAdapter.savePattern(makePattern({ id: 'p1' }))
    await localStorageAdapter.updatePatternSchedule('causative-bare', 'make', {
      stability: 4.2, nextDueAt: '2026-06-20T00:00:00Z', reps: 1, cardState: 'review',
    })
    const p = await localStorageAdapter.getPattern('causative-bare', 'make')
    expect(p?.stability).toBe(4.2)
    expect(p?.cardState).toBe('review')
    expect(p?.reps).toBe(1)
  })
})

describe('localStorageAdapter captures', () => {
  it('save / get / delete round-trip', async () => {
    await localStorageAdapter.saveCapture({ id: 'c1', korean: '안녕', createdAt: '2026-01-01T00:00:00Z', source: 'manual' })
    await localStorageAdapter.saveCapture({ id: 'c2', korean: '잘가', createdAt: '2026-01-02T00:00:00Z', source: 'share' })
    expect((await localStorageAdapter.getCaptures()).map((c) => c.id)).toEqual(['c1', 'c2'])
    await localStorageAdapter.deleteCapture('c1')
    expect((await localStorageAdapter.getCaptures()).map((c) => c.id)).toEqual(['c2'])
  })

  it('caps at MAX_CAPTURES (50), dropping oldest', async () => {
    for (let i = 0; i < 55; i++) {
      await localStorageAdapter.saveCapture({ id: `c${i}`, korean: 'x', createdAt: '2026-01-01T00:00:00Z', source: 'manual' })
    }
    const all = await localStorageAdapter.getCaptures()
    expect(all).toHaveLength(50)
    expect(all[0].id).toBe('c5')   // oldest 5 dropped
    expect(all[49].id).toBe('c54')
  })
})

describe('localStorageAdapter resilience', () => {
  it('returns [] and drops the key on corrupt JSON (no boot crash)', async () => {
    localStorage.setItem('eng-ception:patterns', '{not valid json')
    expect(await localStorageAdapter.getPatterns()).toEqual([])
    expect(localStorage.getItem('eng-ception:patterns')).toBeNull() // dropped
  })

  it('saveLearningRecord degrades (does not throw) when storage is full', async () => {
    const throwing = new MemStorage()
    throwing.setItem = () => { throw new DOMException('quota', 'QuotaExceededError') }
    globalThis.localStorage = throwing
    const rec = { id: 'r1', schemaVersion: 5, originalKorean: 'x' } as unknown as LearningRecord
    await expect(localStorageAdapter.saveLearningRecord(rec)).resolves.toBeUndefined()
  })

  it('getPatterns backfills FSRS defaults on read even without an init() migration', async () => {
    // a pre-v5 pattern written straight to storage (no FSRS fields)
    localStorage.setItem('eng-ception:patterns', JSON.stringify([{
      id: 'p1', template: 'I made him ~', patternId: 'causative-bare', triggerVerb: 'make',
      category: '감정/관계', tags: [], exampleOriginal: 'x', exampleEnglish: 'y',
      savedAt: '2026-01-01T00:00:00Z', reviewCount: 0, lastReviewedAt: null,
    }]))
    const [p] = await localStorageAdapter.getPatterns()
    expect(p.bypassedCount).toBe(0)
    expect(p.cardState).toBe('new')
    expect(p.reps).toBe(0)
    expect(p.nextDueAt).toBeNull()
    const single = await localStorageAdapter.getPattern('causative-bare', 'make')
    expect(single?.bypassedCount).toBe(0)
  })
})

describe('localStorageAdapter.savePattern dedup', () => {
  it('adds a new pattern when no match exists', async () => {
    await localStorageAdapter.init()
    await localStorageAdapter.savePattern(makePattern())
    const all = await localStorageAdapter.getPatterns()
    expect(all).toHaveLength(1)
  })

  it('increments reviewCount instead of duplicating when patternId+triggerVerb match', async () => {
    await localStorageAdapter.init()
    await localStorageAdapter.savePattern(makePattern({ id: 'p1' }))
    await localStorageAdapter.savePattern(makePattern({ id: 'p2', template: 'I made her ~' }))
    const all = await localStorageAdapter.getPatterns()
    expect(all).toHaveLength(1)
    expect(all[0].reviewCount).toBe(1)
    expect(all[0].id).toBe('p1')  // keeps first id
  })

  it('treats different triggerVerb as a distinct pattern', async () => {
    await localStorageAdapter.init()
    await localStorageAdapter.savePattern(makePattern({ id: 'p1', triggerVerb: 'make' }))
    await localStorageAdapter.savePattern(makePattern({ id: 'p2', triggerVerb: 'let' }))
    const all = await localStorageAdapter.getPatterns()
    expect(all).toHaveLength(2)
  })

  it('treats different patternId as a distinct pattern', async () => {
    await localStorageAdapter.init()
    await localStorageAdapter.savePattern(makePattern({ id: 'p1', patternId: 'causative-bare', triggerVerb: 'tell' }))
    await localStorageAdapter.savePattern(makePattern({ id: 'p2', patternId: 'ditransitive', triggerVerb: 'tell' }))
    const all = await localStorageAdapter.getPatterns()
    expect(all).toHaveLength(2)
  })
})
