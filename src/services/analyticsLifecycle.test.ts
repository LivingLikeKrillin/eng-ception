import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerAnalyticsLifecycle } from './analyticsLifecycle'
import { useLearningStore } from '../store/learningStore'

// vitest env is 'node' (no real `document`). Stub a minimal document with an event registry
// so each test starts with a clean listener set — sidesteps jsdom AND listener accumulation.
// (No session is started here, so the real claude/localStorage deps are never exercised.)
let handlers: Record<string, EventListener[]>

beforeEach(() => {
  handlers = {}
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    addEventListener: (type: string, fn: EventListener) => {
      ;(handlers[type] ??= []).push(fn)
    },
    removeEventListener: () => {},
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function fireVisibility(state: 'hidden' | 'visible') {
  ;(document as unknown as { visibilityState: string }).visibilityState = state
  for (const fn of handlers['visibilitychange'] ?? []) fn(new Event('visibilitychange'))
}

describe('registerAnalyticsLifecycle', () => {
  it('calls abandonIfActive("hidden") when the document becomes hidden', () => {
    const spy = vi.spyOn(useLearningStore.getState(), 'abandonIfActive')
    registerAnalyticsLifecycle()
    fireVisibility('hidden')
    expect(spy).toHaveBeenCalledWith('hidden')
    spy.mockRestore()
  })

  it('does not call abandonIfActive while the document is visible', () => {
    const spy = vi.spyOn(useLearningStore.getState(), 'abandonIfActive')
    registerAnalyticsLifecycle()
    fireVisibility('visible')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
