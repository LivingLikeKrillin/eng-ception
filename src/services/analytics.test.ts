import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { track, setSink, getEvents, installDevEgress } from './analytics'
import { MemoryAnalyticsSink, noopAnalyticsSink } from '../store/analyticsSink'

beforeEach(() => {
  setSink(new MemoryAnalyticsSink())
})

afterEach(() => {
  // dev egress writes globalThis.__engEvents — clear it so it doesn't leak into the full-suite run
  delete (globalThis as { __engEvents?: unknown }).__engEvents
})

describe('track() facade', () => {
  it('builds a well-formed envelope and forwards it to the active sink', async () => {
    track('session_start', { source: 'custom', scenarioId: null }, 'sess-1')
    const all = await getEvents()
    expect(all).toHaveLength(1)
    const e = all[0]
    expect(e.name).toBe('session_start')
    expect(e.sessionId).toBe('sess-1')
    expect(e.props).toEqual({ source: 'custom', scenarioId: null })
    expect(typeof e.id).toBe('string')
    expect(e.id.length).toBeGreaterThan(0)
    expect(e.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/)   // ISO-8601
  })

  it('routes to whichever sink is active (setSink swap)', async () => {
    const a = new MemoryAnalyticsSink()
    const b = new MemoryAnalyticsSink()
    setSink(a)
    track('fetch_start', {}, 's')
    setSink(b)
    track('fetch_success', { latencyMs: 10 }, 's')
    expect(a.events.map((e) => e.name)).toEqual(['fetch_start'])
    expect(b.events.map((e) => e.name)).toEqual(['fetch_success'])
  })

  it('never throws even if the sink throws', () => {
    setSink({
      track() { throw new Error('boom') },
      async getAll() { return [] },
      async clear() {},
    })
    expect(() => track('fetch_start', {}, 's')).not.toThrow()
  })

  it('noop sink records nothing', async () => {
    setSink(noopAnalyticsSink)
    track('session_start', {}, 's')
    expect(await getEvents()).toEqual([])
  })

  it('installDevEgress exposes globalThis.__engEvents returning current events', async () => {
    const mem = new MemoryAnalyticsSink()
    setSink(mem)
    installDevEgress()
    track('session_start', {}, 's')
    const fn = (globalThis as unknown as { __engEvents?: () => Promise<unknown[]> }).__engEvents
    expect(fn).toBeTypeOf('function')
    expect(await fn!()).toHaveLength(1)
  })
})
