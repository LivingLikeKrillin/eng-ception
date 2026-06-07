import { describe, it, expect } from 'vitest'
import { noopAnalyticsSink, MemoryAnalyticsSink } from './analyticsSink'
import type { AnalyticsEvent } from '../types/events'

function ev(name: AnalyticsEvent['name'], sessionId = 's1'): AnalyticsEvent {
  return { id: `id-${name}`, name, ts: '2026-06-07T00:00:00.000Z', sessionId, props: {} }
}

describe('noopAnalyticsSink', () => {
  it('swallows tracked events and returns an empty list', async () => {
    noopAnalyticsSink.track(ev('session_start'))
    expect(await noopAnalyticsSink.getAll()).toEqual([])
  })
})

describe('MemoryAnalyticsSink', () => {
  it('records events in order and exposes them synchronously', async () => {
    const sink = new MemoryAnalyticsSink()
    sink.track(ev('session_start'))
    sink.track(ev('fetch_start'))
    expect(sink.events.map((e) => e.name)).toEqual(['session_start', 'fetch_start'])
    expect(await sink.getAll()).toHaveLength(2)
  })

  it('clear() empties the buffer', async () => {
    const sink = new MemoryAnalyticsSink()
    sink.track(ev('session_start'))
    await sink.clear()
    expect(sink.events).toEqual([])
  })
})
