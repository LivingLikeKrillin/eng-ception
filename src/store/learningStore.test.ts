import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLearningStore } from './learningStore'
import type { Scenario } from '../types'

vi.mock('../services/claude', () => ({
  fetchSessionPayload: vi.fn(async () => {
    const { mockSessionPayload } = await import('../services/mocks')
    return mockSessionPayload('seed')
  }),
}))

vi.mock('./localStorage', () => ({
  localStorageAdapter: {
    async init() {},
    async savePattern() {},
    async saveLearningRecord() {},
    async getPatterns() { return [] },
    async getLearningRecords() { return [] },
    async getScenarios() { return [] },
    async saveScenarios() {},
    async getScenario() { return null },
    async getUnlearnedScenarios() { return [] },
    async deletePattern() {},
    async deleteLearningRecord() {},
  },
}))

const sampleScenario: Scenario = {
  id: 's1',
  situation: 'x',
  originalKorean: '그가 화내게 만들었어',
  purpose: 'x',
  emotionalTone: 'x',
  difficulty: 'intermediate',
  category: '감정/관계',
  isDaily: true,
  createdAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  useLearningStore.getState().reset()
})

describe('learningStore session lifecycle', () => {
  it('startScenario transitions to empathy and kicks off loading', () => {
    useLearningStore.getState().startScenario(sampleScenario)
    const s = useLearningStore.getState()
    expect(s.currentStep).toBe('empathy')
    expect(s.originalKorean).toBe(sampleScenario.originalKorean)
    expect(s.payloadStatus).toBe('loading')
    expect(s.scenario?.id).toBe('s1')
  })

  it('startCustom marks isCustomInput and starts loading', () => {
    useLearningStore.getState().startCustom('커스텀 문장')
    const s = useLearningStore.getState()
    expect(s.isCustomInput).toBe(true)
    expect(s.originalKorean).toBe('커스텀 문장')
    expect(s.currentStep).toBe('empathy')
  })

  it('payload arrives and status becomes ready', async () => {
    useLearningStore.getState().startScenario(sampleScenario)
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })
    expect(useLearningStore.getState().payload).not.toBeNull()
  })

  it('advanceFromEmpathy moves to precheck', () => {
    useLearningStore.getState().startScenario(sampleScenario)
    useLearningStore.getState().advanceFromEmpathy()
    expect(useLearningStore.getState().currentStep).toBe('precheck')
  })

  it('submitPrecheck records choice and auto-advances to step0', async () => {
    useLearningStore.getState().startScenario(sampleScenario)
    useLearningStore.getState().advanceFromEmpathy()
    useLearningStore.getState().submitPrecheck('first')
    expect(useLearningStore.getState().precheckChoice).toBe('first')
    await new Promise((r) => setTimeout(r, 500))
    expect(useLearningStore.getState().currentStep).toBe('step0')
  })

  it('reset() restores initial state', () => {
    useLearningStore.getState().startScenario(sampleScenario)
    useLearningStore.getState().reset()
    expect(useLearningStore.getState().currentStep).toBe('input')
    expect(useLearningStore.getState().payload).toBeNull()
  })
})

describe('learningStore patternQuiz tracking', () => {
  it('submitPatternQuiz tracks correct answer', () => {
    useLearningStore.getState().startScenario(sampleScenario)
    useLearningStore.getState().submitPatternQuiz({ correct: true, unsure: false })
    expect(useLearningStore.getState().patternQuizAnswer).toEqual({ correct: true, unsure: false })
  })

  it('submitPatternQuiz tracks a wrong pick after the hint (correct=false, unsure=true)', () => {
    useLearningStore.getState().startScenario(sampleScenario)
    useLearningStore.getState().submitPatternQuiz({ correct: false, unsure: true })
    expect(useLearningStore.getState().patternQuizAnswer).toEqual({ correct: false, unsure: true })
  })

  it('submitPatternQuiz tracks a correct pick after the hint (correct=true, unsure=true)', () => {
    useLearningStore.getState().startScenario(sampleScenario)
    useLearningStore.getState().submitPatternQuiz({ correct: true, unsure: true })
    expect(useLearningStore.getState().patternQuizAnswer).toEqual({ correct: true, unsure: true })
  })
})

describe('learningStore block tapping', () => {
  beforeEach(async () => {
    useLearningStore.getState().reset()
    useLearningStore.getState().startScenario(sampleScenario)
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })
  })

  it('tapBlock appends to blockOrder', () => {
    useLearningStore.getState().tapBlock('b1')
    expect(useLearningStore.getState().blockOrder).toEqual(['b1'])
    useLearningStore.getState().tapBlock('b3')
    expect(useLearningStore.getState().blockOrder).toEqual(['b1', 'b3'])
  })

  it('tapBlock toggles off when re-tapped', () => {
    useLearningStore.getState().tapBlock('b1')
    useLearningStore.getState().tapBlock('b2')
    useLearningStore.getState().tapBlock('b1')
    expect(useLearningStore.getState().blockOrder).toEqual(['b2'])
  })

  it('tapBlock ignores taps after 3 blocks are selected', () => {
    useLearningStore.getState().tapBlock('b1')
    useLearningStore.getState().tapBlock('b2')
    useLearningStore.getState().tapBlock('b3')
    useLearningStore.getState().tapBlock('b1')
    expect(useLearningStore.getState().blockOrder).toEqual(['b1', 'b2', 'b3'])
  })

  it('tapConnector replaces previous choice', () => {
    useLearningStore.getState().tapConnector('period')
    expect(useLearningStore.getState().connectorChoice).toBe('period')
    useLearningStore.getState().tapConnector('so')
    expect(useLearningStore.getState().connectorChoice).toBe('so')
  })
})

describe('learningStore pattern save idempotency', () => {
  it('advanceToStep3 saves pattern exactly once even if called twice', async () => {
    const localStorage = await import('./localStorage')
    const saveSpy = vi.spyOn(localStorage.localStorageAdapter, 'savePattern')

    useLearningStore.getState().startScenario(sampleScenario)
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })
    useLearningStore.setState({ currentStep: 'step2' })

    await useLearningStore.getState().advanceToStep3()
    await useLearningStore.getState().advanceToStep3()

    expect(saveSpy).toHaveBeenCalledTimes(1)
    expect(useLearningStore.getState().currentStep).toBe('step3')
    expect(useLearningStore.getState().patternSaved).toBe(true)
  })
})

describe('learningStore complete()', () => {
  it('persists a v4 LearningRecord with pattern5hId and patternQuizCorrect', async () => {
    const localStorage = await import('./localStorage')
    const saveSpy = vi.spyOn(localStorage.localStorageAdapter, 'saveLearningRecord')

    useLearningStore.getState().startScenario(sampleScenario)
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })
    useLearningStore.getState().submitPatternQuiz({ correct: true, unsure: false })
    useLearningStore.setState({ currentStep: 'step4' })

    await useLearningStore.getState().complete()

    expect(saveSpy).toHaveBeenCalledTimes(1)
    const record = saveSpy.mock.calls[0][0]
    expect(record.schemaVersion).toBe(4)
    expect(record.pattern5hId).toBeDefined()
    expect(record.triggerVerb).toBeDefined()
    expect(record.patternQuizCorrect).toBe(true)
    expect(record.patternQuizUnsure).toBe(false)
  })
})
