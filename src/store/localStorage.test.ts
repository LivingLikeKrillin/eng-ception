import { describe, it, expect, beforeEach } from 'vitest'
import { localStorageAdapter } from './localStorage'
import type { Pattern } from '../types'
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

describe('localStorageAdapter.init', () => {
  it('sets schema version to 4 when none exists', async () => {
    await localStorageAdapter.init()
    expect(localStorage.getItem('eng-ception:schema-version')).toBe('4')
  })

  it('clears records and patterns when schema version is old', async () => {
    localStorage.setItem('eng-ception:schema-version', '3')
    localStorage.setItem('eng-ception:records', '[{"id":"old"}]')
    localStorage.setItem('eng-ception:patterns', '[{"id":"old-pat"}]')
    localStorage.setItem('eng-ception:scenarios', '[{"id":"s1"}]')

    await localStorageAdapter.init()

    expect(localStorage.getItem('eng-ception:records')).toBeNull()
    expect(localStorage.getItem('eng-ception:patterns')).toBeNull()
    expect(localStorage.getItem('eng-ception:scenarios')).toBe('[{"id":"s1"}]')
    expect(localStorage.getItem('eng-ception:schema-version')).toBe('4')
  })

  it('is a no-op when schema version is already 4', async () => {
    localStorage.setItem('eng-ception:schema-version', '4')
    localStorage.setItem('eng-ception:records', '[{"id":"keep"}]')

    await localStorageAdapter.init()

    expect(localStorage.getItem('eng-ception:records')).toBe('[{"id":"keep"}]')
  })
})

describe('localStorageAdapter.savePattern dedup', () => {
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
