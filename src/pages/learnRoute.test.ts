import { describe, it, expect } from 'vitest'
import { sessionToBootstrap } from './learnRoute'
import type { V9Step } from '../types/v9'

// A store snapshot helper — defaults to a fresh (idle) session.
function snap(over: Partial<{
  currentStep: V9Step
  scenarioId: string | null
  isCustomInput: boolean
  originalKorean: string
}> = {}) {
  return {
    currentStep: 'input' as V9Step,
    scenarioId: null,
    isCustomInput: false,
    originalKorean: '',
    ...over,
  }
}

describe('sessionToBootstrap', () => {
  it('fresh store + seed route → start that scenario', () => {
    expect(sessionToBootstrap({ id: 's1', isCustom: false, passedInput: '' }, snap())).toBe('scenario')
  })

  it('already running THIS seed scenario → preserve (none)', () => {
    expect(
      sessionToBootstrap(
        { id: 's1', isCustom: false, passedInput: '' },
        snap({ currentStep: 'empathy', scenarioId: 's1' }),
      ),
    ).toBe('none')
  })

  // The bug: navigating to a DIFFERENT seed while a session is in flight used to be
  // swallowed by the `currentStep !== 'input'` guard, leaving the stale session on screen.
  it('running s1 but route asks for s5 → restart with s5 (the reported bug)', () => {
    expect(
      sessionToBootstrap(
        { id: 's5', isCustom: false, passedInput: '' },
        snap({ currentStep: 'empathy', scenarioId: 's1' }),
      ),
    ).toBe('scenario')
  })

  it('running a seed but route is custom-with-input → start custom', () => {
    expect(
      sessionToBootstrap(
        { id: 'custom', isCustom: true, passedInput: '안녕' },
        snap({ currentStep: 'step2', scenarioId: 's1' }),
      ),
    ).toBe('custom')
  })

  it('fresh store + custom route with NO input → none (show input screen)', () => {
    expect(sessionToBootstrap({ id: 'custom', isCustom: true, passedInput: '' }, snap())).toBe('none')
  })

  it('already running THIS custom input → preserve (none)', () => {
    expect(
      sessionToBootstrap(
        { id: 'custom', isCustom: true, passedInput: '같은 입력' },
        snap({ currentStep: 'step1', isCustomInput: true, originalKorean: '같은 입력' }),
      ),
    ).toBe('none')
  })

  it('running custom "A" but route asks for custom "B" → restart with B', () => {
    expect(
      sessionToBootstrap(
        { id: 'custom', isCustom: true, passedInput: 'B' },
        snap({ currentStep: 'step1', isCustomInput: true, originalKorean: 'A' }),
      ),
    ).toBe('custom')
  })

  it('trims whitespace when comparing custom input', () => {
    expect(
      sessionToBootstrap(
        { id: 'custom', isCustom: true, passedInput: '  같은 입력  ' },
        snap({ currentStep: 'step1', isCustomInput: true, originalKorean: '같은 입력' }),
      ),
    ).toBe('none')
  })
})
