import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db, setDbAdapter } from './db'
import { localStorageAdapter } from './localStorage'
import type { DataStore } from './dataStore'

class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
  get length() { return this.m.size }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null }
}

function fakeAdapter(): DataStore & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    async init() { calls.push('init') },
    async getScenarios() { calls.push('getScenarios'); return [] },
    async getScenario() { calls.push('getScenario'); return null },
    async getUnlearnedScenarios() { calls.push('getUnlearnedScenarios'); return [] },
    async saveScenarios() { calls.push('saveScenarios') },
    async saveLearningRecord() { calls.push('saveLearningRecord') },
    async getLearningRecords() { calls.push('getLearningRecords'); return [] },
    async deleteLearningRecord() { calls.push('deleteLearningRecord') },
    async savePattern() { calls.push('savePattern') },
    async getPatterns() { calls.push('getPatterns'); return [] },
    async deletePattern() { calls.push('deletePattern') },
    async getPattern() { calls.push('getPattern'); return null },
    async updatePatternSchedule() { calls.push('updatePatternSchedule') },
  }
}

describe('db facade', () => {
  const hadLocalStorage = 'localStorage' in globalThis
  const priorLocalStorage = (globalThis as { localStorage?: Storage }).localStorage

  beforeEach(() => {
    globalThis.localStorage = new MemStorage() as unknown as Storage
    setDbAdapter(localStorageAdapter)
  })

  afterEach(() => {
    // Don't leak the shim onto the worker-global; restore prior state.
    if (hadLocalStorage) globalThis.localStorage = priorLocalStorage as Storage
    else delete (globalThis as { localStorage?: Storage }).localStorage
  })

  it('delegates to the active adapter and can be swapped at runtime', async () => {
    const fake = fakeAdapter()
    setDbAdapter(fake)
    await db.getPatterns()
    await db.savePattern({} as never)
    expect(fake.calls).toEqual(['getPatterns', 'savePattern'])
  })

  // Pure-delegation module: the only failure mode is a mis-wired arrow
  // (e.g. getScenario -> activeAdapter.getScenarios). Exercise every method so a
  // copy-paste slip can't pass silently.
  it('routes every DataStore method to the active adapter', async () => {
    const fake = fakeAdapter()
    setDbAdapter(fake)
    await db.init()
    await db.getScenarios()
    await db.getScenario('s1')
    await db.getUnlearnedScenarios(3)
    await db.saveScenarios([])
    await db.saveLearningRecord({} as never)
    await db.getLearningRecords()
    await db.deleteLearningRecord('r1')
    await db.savePattern({} as never)
    await db.getPatterns()
    await db.deletePattern('p1')
    await db.getPattern('p', 'v')
    await db.updatePatternSchedule('p', 'v', {})
    expect(fake.calls).toEqual([
      'init', 'getScenarios', 'getScenario', 'getUnlearnedScenarios', 'saveScenarios',
      'saveLearningRecord', 'getLearningRecords', 'deleteLearningRecord', 'savePattern',
      'getPatterns', 'deletePattern', 'getPattern', 'updatePatternSchedule',
    ])
  })

  it('defaults to localStorageAdapter', async () => {
    setDbAdapter(localStorageAdapter)
    await expect(db.getPatterns()).resolves.toBeDefined()
  })
})
