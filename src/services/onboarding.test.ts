import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { hasSeenOnboarding, markOnboardingSeen } from './onboarding'

class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
  get length() { return this.m.size }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null }
}

beforeEach(() => { globalThis.localStorage = new MemStorage() as unknown as Storage })
afterEach(() => { vi.restoreAllMocks() })

describe('onboarding seen-flag', () => {
  it('defaults to not-seen, becomes seen after marking', () => {
    expect(hasSeenOnboarding()).toBe(false)
    markOnboardingSeen()
    expect(hasSeenOnboarding()).toBe(true)
  })

  it('is best-effort: a throwing localStorage never propagates', () => {
    const throwing = new MemStorage()
    throwing.getItem = () => { throw new Error('blocked') }
    throwing.setItem = () => { throw new Error('blocked') }
    globalThis.localStorage = throwing as unknown as Storage
    expect(() => markOnboardingSeen()).not.toThrow()
    expect(hasSeenOnboarding()).toBe(false)
  })
})
