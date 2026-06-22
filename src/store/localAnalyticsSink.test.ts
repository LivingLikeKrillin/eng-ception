import { describe, it, expect, beforeEach, vi } from 'vitest'
import { localAnalyticsSink } from './localAnalyticsSink'
import type { AnalyticsEvent } from '../types/events'

class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
  get length() { return this.m.size }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null }
}

function ev(i: number): AnalyticsEvent {
  return { id: `id-${i}`, name: 'step_dwell', ts: '2026-06-07T00:00:00.000Z', sessionId: 's1', props: { i } }
}

beforeEach(() => {
  globalThis.localStorage = new MemStorage() as unknown as Storage
})

describe('localAnalyticsSink', () => {
  it('appends events and returns them via getAll', async () => {
    localAnalyticsSink.track(ev(1))
    localAnalyticsSink.track(ev(2))
    const all = await localAnalyticsSink.getAll()
    expect(all.map((e) => e.props.i)).toEqual([1, 2])
  })

  it('sets the events-version key on first write', async () => {
    localAnalyticsSink.track(ev(1))
    expect(localStorage.getItem('engception:events-version')).toBe('1')
  })

  it('rotates oldest out when exceeding MAX_EVENTS (1000)', async () => {
    for (let i = 0; i < 1005; i++) localAnalyticsSink.track(ev(i))
    const all = await localAnalyticsSink.getAll()
    expect(all).toHaveLength(1000)
    expect(all[0].props.i).toBe(5)        // oldest 5 dropped
    expect(all[999].props.i).toBe(1004)
  })

  it('clear() empties the stored buffer', async () => {
    localAnalyticsSink.track(ev(1))
    await localAnalyticsSink.clear()
    expect(await localAnalyticsSink.getAll()).toEqual([])
  })

  it('never throws when setItem fails (quota) — event is dropped', async () => {
    localAnalyticsSink.track(ev(1))
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => localAnalyticsSink.track(ev(2))).not.toThrow()
    spy.mockRestore()
  })
})
