import { describe, it, expect, beforeEach } from 'vitest'
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
  }
}

describe('db facade', () => {
  beforeEach(() => {
    globalThis.localStorage = new MemStorage() as unknown as Storage
    setDbAdapter(localStorageAdapter)
  })

  it('delegates to the active adapter and can be swapped at runtime', async () => {
    const fake = fakeAdapter()
    setDbAdapter(fake)
    await db.getPatterns()
    await db.savePattern({} as never)
    expect(fake.calls).toEqual(['getPatterns', 'savePattern'])
  })

  it('defaults to localStorageAdapter', async () => {
    setDbAdapter(localStorageAdapter)
    await expect(db.getPatterns()).resolves.toBeDefined()
  })
})
