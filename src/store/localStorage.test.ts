import { describe, it, expect, beforeEach } from 'vitest'
import { localStorageAdapter } from './localStorage'

// Minimal localStorage polyfill for node test env
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
  globalThis.localStorage = new MemStorage() as unknown as Storage
})

describe('localStorageAdapter.init', () => {
  it('sets schema version to 3 when none exists', async () => {
    await localStorageAdapter.init()
    expect(localStorage.getItem('eng-ception:schema-version')).toBe('3')
  })

  it('clears records and patterns when schema version is old', async () => {
    localStorage.setItem('eng-ception:schema-version', '2')
    localStorage.setItem('eng-ception:records', '[{"id":"old"}]')
    localStorage.setItem('eng-ception:patterns', '[{"id":"old-pat"}]')
    localStorage.setItem('eng-ception:scenarios', '[{"id":"s1"}]')

    await localStorageAdapter.init()

    expect(localStorage.getItem('eng-ception:records')).toBeNull()
    expect(localStorage.getItem('eng-ception:patterns')).toBeNull()
    expect(localStorage.getItem('eng-ception:scenarios')).toBe('[{"id":"s1"}]')
    expect(localStorage.getItem('eng-ception:schema-version')).toBe('3')
  })

  it('is a no-op when schema version is already 3', async () => {
    localStorage.setItem('eng-ception:schema-version', '3')
    localStorage.setItem('eng-ception:records', '[{"id":"keep"}]')

    await localStorageAdapter.init()

    expect(localStorage.getItem('eng-ception:records')).toBe('[{"id":"keep"}]')
  })
})
