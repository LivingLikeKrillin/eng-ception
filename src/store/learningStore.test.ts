import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLearningStore, isAssemblyCorrect, classifyError } from './learningStore'
import { fetchSessionPayload } from '../services/claude'
import { setSink } from '../services/analytics'
import { MemoryAnalyticsSink } from './analyticsSink'
import type { Scenario } from '../types'
import { db } from './db'

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
    async getPattern() { return null },
    async updatePatternSchedule() {},
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
  // Reset spy/mock call histories between tests (spies are re-created per test and
  // would otherwise accumulate counts). Clears history only — keeps the factory impl.
  vi.clearAllMocks()
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
  it('persists a v5 LearningRecord with pattern5hId and patternQuizCorrect', async () => {
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
    expect(record.schemaVersion).toBe(5)
    expect(record.pattern5hId).toBeDefined()
    expect(record.triggerVerb).toBeDefined()
    expect(record.patternQuizCorrect).toBe(true)
    expect(record.patternQuizUnsure).toBe(false)
  })
})

// Production-correctness signal. Order/connector are derived from the payload so the
// assertions hold regardless of which fixture hashIndex selects.
describe('learningStore isAssemblyCorrect', () => {
  beforeEach(async () => {
    useLearningStore.getState().reset()
    useLearningStore.getState().startScenario(sampleScenario)
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })
  })

  const correctOrder = () => {
    const { payload } = useLearningStore.getState()
    return [...payload!.assembly.blocks].sort((a, b) => a.order - b.order).map((b) => b.id)
  }
  const correctConnector = () =>
    useLearningStore.getState().payload!.assembly.connectors.find((c) => c.isCorrect)!.id
  const wrongConnector = () =>
    useLearningStore.getState().payload!.assembly.connectors.find((c) => !c.isCorrect)!.id

  it('is true for the right block order + right connector', () => {
    useLearningStore.setState({ blockOrder: correctOrder(), connectorChoice: correctConnector() })
    expect(isAssemblyCorrect(useLearningStore.getState())).toBe(true)
  })

  it('is false when the block order is reversed', () => {
    useLearningStore.setState({
      blockOrder: [...correctOrder()].reverse(),
      connectorChoice: correctConnector(),
    })
    expect(isAssemblyCorrect(useLearningStore.getState())).toBe(false)
  })

  it('is false when the connector is wrong', () => {
    useLearningStore.setState({ blockOrder: correctOrder(), connectorChoice: wrongConnector() })
    expect(isAssemblyCorrect(useLearningStore.getState())).toBe(false)
  })

  it('is false when fewer than 3 blocks are placed', () => {
    useLearningStore.setState({
      blockOrder: correctOrder().slice(0, 2),
      connectorChoice: correctConnector(),
    })
    expect(isAssemblyCorrect(useLearningStore.getState())).toBe(false)
  })
})

// End-to-end: drive the natural 7-step chain and assert BOTH persisted artifacts.
describe('learningStore end-to-end walkthrough', () => {
  it('persists a deduped pattern + a v5 record with assemblyCorrect=true', async () => {
    const localStorage = await import('./localStorage')
    const patternSpy = vi.spyOn(localStorage.localStorageAdapter, 'savePattern')
    const recordSpy = vi.spyOn(localStorage.localStorageAdapter, 'saveLearningRecord')

    const store = useLearningStore.getState()
    store.startScenario(sampleScenario)
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })

    const payload = useLearningStore.getState().payload!
    const correctOrder = [...payload.assembly.blocks]
      .sort((a, b) => a.order - b.order)
      .map((b) => b.id)
    const correctConn = payload.assembly.connectors.find((c) => c.isCorrect)!.id

    useLearningStore.getState().advanceFromEmpathy()
    useLearningStore.getState().submitPrecheck('first')
    await vi.waitFor(() => {
      expect(useLearningStore.getState().currentStep).toBe('step0')
    })
    useLearningStore.getState().submitPatternQuiz({ correct: true, unsure: false })
    useLearningStore.getState().advanceToStep1()
    correctOrder.forEach((id) => useLearningStore.getState().tapBlock(id))
    useLearningStore.getState().tapConnector(correctConn)
    useLearningStore.getState().advanceToStep2()
    await useLearningStore.getState().advanceToStep3()
    useLearningStore.getState().submitAfterChoice('first')
    useLearningStore.getState().advanceToStep4()
    await useLearningStore.getState().complete()

    expect(patternSpy).toHaveBeenCalledTimes(1)
    const pattern = patternSpy.mock.calls[0][0]
    expect(pattern.patternId).toBe(payload.pattern.patternId)
    expect(pattern.triggerVerb).toBe(payload.pattern5h.triggerVerb)
    expect(pattern.exampleEnglish).toBe(payload.assembly.finalSentence)

    expect(recordSpy).toHaveBeenCalledTimes(1)
    const record = recordSpy.mock.calls[0][0]
    expect(record.schemaVersion).toBe(5)
    expect(record.pattern5hId).toBe(payload.pattern5h.id)
    expect(record.assemblyCorrect).toBe(true)
    expect(record.patternQuizCorrect).toBe(true)
  })
})

// 7.3 error path: a failed fetch surfaces a Korean error; retry recovers.
describe('learningStore error path', () => {
  it('sets error status on fetch failure and recovers on retryFetch', async () => {
    // Earlier tests fire startScenario without awaiting; their runFetch (600ms mock delay)
    // can resolve mid-test and clobber our 'error' with a stray 'ready'. Drain + reset so
    // only our rejecting fetch is in flight.
    await new Promise((r) => setTimeout(r, 700))
    useLearningStore.getState().reset()

    vi.mocked(fetchSessionPayload).mockRejectedValueOnce(new Error('network down'))

    useLearningStore.getState().startScenario(sampleScenario)
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('error')
    })
    expect(useLearningStore.getState().error).toBe('네트워크가 불안정해요.')

    // mockRejectedValueOnce is consumed; the default mock resolves on retry.
    useLearningStore.getState().retryFetch()
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })
    expect(useLearningStore.getState().error).toBeNull()
    expect(useLearningStore.getState().payload).not.toBeNull()
  })
})

describe('classifyError', () => {
  it('classifies by message substring', () => {
    expect(classifyError(new Error('request timeout'))).toBe('timeout')
    expect(classifyError(new Error('failed to parse JSON'))).toBe('parse')
    expect(classifyError(new Error('network down'))).toBe('network')
    expect(classifyError(new Error('fetch failed'))).toBe('network')
    expect(classifyError(new Error('something else'))).toBe('unknown')
    expect(classifyError('a raw string')).toBe('unknown')
  })
})

describe('learningStore event tracking', () => {
  let mem: MemoryAnalyticsSink

  beforeEach(() => {
    mem = new MemoryAnalyticsSink()
    setSink(mem)
    useLearningStore.getState().reset()
  })

  // events for the CURRENT session only (isolates against stray fire-and-forget runFetch
  // events bleeding in from earlier tests under a different sessionId)
  const sessionEvents = () => {
    const sid = useLearningStore.getState().sessionId
    return mem.events.filter((e) => e.sessionId === sid)
  }

  it('emits session_start then fetch_start + fetch_success on a successful start', async () => {
    useLearningStore.getState().startCustom('커스텀 문장')
    const sid = useLearningStore.getState().sessionId
    expect(sid).toBeTruthy()

    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })

    const names = sessionEvents().map((e) => e.name)
    expect(names).toEqual(['session_start', 'fetch_start', 'fetch_success'])

    const start = sessionEvents().find((e) => e.name === 'session_start')!
    expect(start.props).toEqual({ source: 'custom', scenarioId: null })

    const success = sessionEvents().find((e) => e.name === 'fetch_success')!
    expect(typeof success.props.latencyMs).toBe('number')
    expect(success.props.latencyMs as number).toBeGreaterThanOrEqual(0)
  })

  it('emits fetch_error with a kind when the fetch rejects', async () => {
    await new Promise((r) => setTimeout(r, 700))   // drain stray in-flight runFetch
    useLearningStore.getState().reset()
    mem.clear()
    vi.mocked(fetchSessionPayload).mockRejectedValueOnce(new Error('network down'))

    useLearningStore.getState().startCustom('x')
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('error')
    })

    const err = sessionEvents().find((e) => e.name === 'fetch_error')!
    expect(err).toBeDefined()
    expect(err.props.kind).toBe('network')
    expect(typeof err.props.latencyMs).toBe('number')
  })

  it('session_start records scenario source + id for a scenario start', async () => {
    useLearningStore.getState().startScenario(sampleScenario)
    const start = sessionEvents().find((e) => e.name === 'session_start')!
    expect(start.props).toEqual({ source: 'scenario', scenarioId: 's1' })
  })

  it('emits step_dwell for each step left, in order, never for input or step4', async () => {
    const store = useLearningStore.getState()
    store.startScenario(sampleScenario)
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })
    const payload = useLearningStore.getState().payload!
    const order = [...payload.assembly.blocks].sort((a, b) => a.order - b.order).map((b) => b.id)
    const conn = payload.assembly.connectors.find((c) => c.isCorrect)!.id

    useLearningStore.getState().advanceFromEmpathy()
    useLearningStore.getState().submitPrecheck('first')
    await vi.waitFor(() => {
      expect(useLearningStore.getState().currentStep).toBe('step0')
    })
    useLearningStore.getState().advanceToStep1()
    order.forEach((id) => useLearningStore.getState().tapBlock(id))
    useLearningStore.getState().tapConnector(conn)
    useLearningStore.getState().advanceToStep2()
    await useLearningStore.getState().advanceToStep3()
    useLearningStore.getState().advanceToStep4()

    const dwellSteps = sessionEvents()
      .filter((e) => e.name === 'step_dwell')
      .map((e) => e.props.step)
    expect(dwellSteps).toEqual(['empathy', 'precheck', 'step0', 'step1', 'step2', 'step3'])

    for (const e of sessionEvents().filter((e) => e.name === 'step_dwell')) {
      expect(typeof e.props.dwellMs).toBe('number')
      expect(e.props.dwellMs as number).toBeGreaterThanOrEqual(0)
    }
  })

  it('emits session_complete with outcome signals + duration before reset', async () => {
    useLearningStore.getState().startScenario(sampleScenario)
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })
    const sid = useLearningStore.getState().sessionId
    const payload = useLearningStore.getState().payload!
    useLearningStore.getState().submitPatternQuiz({ correct: true, unsure: false })
    useLearningStore.setState({ currentStep: 'step4' })

    await useLearningStore.getState().complete()

    // capture by the captured sid (state is reset by now)
    const complete = mem.events.find((e) => e.sessionId === sid && e.name === 'session_complete')!
    expect(complete).toBeDefined()
    expect(complete.props.pattern5hId).toBe(payload.pattern5h.id)
    expect(complete.props.triggerVerb).toBe(payload.pattern5h.triggerVerb)
    expect(complete.props.patternQuizCorrect).toBe(true)
    expect(complete.props.patternQuizUnsure).toBe(false)
    expect(typeof complete.props.durationMs).toBe('number')

    // session fully reset
    expect(useLearningStore.getState().sessionId).toBeNull()
  })

  it('emits session_abandon with lastStep when reset() interrupts a session', async () => {
    useLearningStore.getState().startScenario(sampleScenario)
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })
    useLearningStore.getState().advanceFromEmpathy()   // now at precheck
    const sid = useLearningStore.getState().sessionId
    useLearningStore.getState().reset()

    const abandon = mem.events.find((e) => e.sessionId === sid && e.name === 'session_abandon')!
    expect(abandon).toBeDefined()
    expect(abandon.props.lastStep).toBe('precheck')
    expect(abandon.props.reason).toBe('reset')
    expect(typeof abandon.props.durationMs).toBe('number')
  })

  it('does NOT emit session_abandon after a completed session (no double terminal event)', async () => {
    useLearningStore.getState().startScenario(sampleScenario)
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })
    const sid = useLearningStore.getState().sessionId
    useLearningStore.setState({ currentStep: 'step4' })
    await useLearningStore.getState().complete()
    useLearningStore.getState().reset()   // reset after complete

    const abandons = mem.events.filter((e) => e.sessionId === sid && e.name === 'session_abandon')
    expect(abandons).toHaveLength(0)
  })

  it('emits session_abandon(restart) when a new session starts over a live one', async () => {
    useLearningStore.getState().startScenario(sampleScenario)
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })
    useLearningStore.getState().advanceFromEmpathy()
    const firstSid = useLearningStore.getState().sessionId
    useLearningStore.getState().startCustom('새 세션')   // restart over live

    const abandon = mem.events.find((e) => e.sessionId === firstSid && e.name === 'session_abandon')!
    expect(abandon).toBeDefined()
    expect(abandon.props.reason).toBe('restart')
    expect(abandon.props.lastStep).toBe('precheck')
  })

  it('abandonIfActive is a no-op when no session is active', () => {
    useLearningStore.getState().reset()        // no live session
    const before = mem.events.length
    useLearningStore.getState().abandonIfActive('hidden')
    expect(mem.events.length).toBe(before)
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Drives the store from startScenario through complete() via the correct-answer
 * path, using the mock payload (FIX_CAUSATIVE_BARE for 'seed').
 * Must be called AFTER store.startScenario() is called.
 */
async function flushToComplete(store: ReturnType<typeof useLearningStore.getState>) {
  await vi.waitFor(() => expect(useLearningStore.getState().payloadStatus).toBe('ready'))

  const payload = useLearningStore.getState().payload!
  const correctOrder = [...payload.assembly.blocks]
    .sort((a, b) => a.order - b.order)
    .map((b) => b.id)
  const correctConn = payload.assembly.connectors.find((c) => c.isCorrect)!.id

  store.advanceFromEmpathy()
  store.submitPrecheck('first')
  await vi.waitFor(() => expect(useLearningStore.getState().currentStep).toBe('step0'))
  store.submitPatternQuiz({ correct: true, unsure: false })
  store.advanceToStep1()
  correctOrder.forEach((id) => store.tapBlock(id))
  store.tapConnector(correctConn)
  store.advanceToStep2()
  await store.advanceToStep3()
  store.submitAfterChoice('first')
  store.advanceToStep4()
  await store.complete()
}

// ---------------------------------------------------------------------------
// SRS schedule-on-complete tests
// ---------------------------------------------------------------------------

describe('complete() applies FSRS schedule', () => {
  it('grades the session and calls updatePatternSchedule on the played card', async () => {
    const spy = vi.spyOn(db, 'updatePatternSchedule').mockResolvedValue(undefined)
    vi.spyOn(db, 'getPattern').mockResolvedValue(null) // new card path
    vi.spyOn(db, 'getPatterns').mockResolvedValue([])  // no other due cards -> skip bypass

    const store = useLearningStore.getState()
    store.startScenario(sampleScenario)
    await flushToComplete(store)

    expect(spy).toHaveBeenCalledTimes(1)
    const [pid, verb, partial] = spy.mock.calls[0]
    expect(typeof pid).toBe('string')
    expect(typeof verb).toBe('string')
    expect(partial).toHaveProperty('nextDueAt')
    expect(partial).toHaveProperty('lastGrade')
    expect(partial.bypassedCount).toBe(0)
  })

  it('bumps bypassedCount on other due cards and not on the played card', async () => {
    const { mockSessionPayload } = await import('../services/mocks')
    const payload = await mockSessionPayload('seed')
    const pid = payload.pattern5h.id
    const verb = payload.pattern5h.triggerVerb

    // One other due card (different key) + the played card itself (should be RESET not bumped)
    const otherCard = {
      id: 'other-card',
      template: 'I saw ~ cry',
      patternId: 'perception' as const,
      triggerVerb: 'see',
      category: '경험/서사' as const,
      tags: [],
      exampleOriginal: 'x',
      exampleEnglish: 'y',
      savedAt: '2026-01-01T00:00:00Z',
      reviewCount: 1,
      lastReviewedAt: null,
      stability: null,
      difficulty: null,
      nextDueAt: null, // due (unscheduled)
      reps: 0,
      lapses: 0,
      bypassedCount: 2,
      cardState: 'new' as const,
      lastGrade: null,
    }

    const updateSpy = vi.spyOn(db, 'updatePatternSchedule').mockResolvedValue(undefined)
    vi.spyOn(db, 'getPattern').mockResolvedValue(null)
    vi.spyOn(db, 'getPatterns').mockResolvedValue([otherCard])

    const store = useLearningStore.getState()
    store.startScenario(sampleScenario)
    await flushToComplete(store)

    // First call: played card schedule (bypassedCount reset to 0)
    expect(updateSpy.mock.calls[0][0]).toBe(pid)
    expect(updateSpy.mock.calls[0][1]).toBe(verb)
    expect(updateSpy.mock.calls[0][2].bypassedCount).toBe(0)

    // Second call: other due card — bypassedCount bumped from 2 to 3
    expect(updateSpy.mock.calls[1][0]).toBe('perception')
    expect(updateSpy.mock.calls[1][1]).toBe('see')
    expect(updateSpy.mock.calls[1][2].bypassedCount).toBe(3)

    expect(updateSpy).toHaveBeenCalledTimes(2)
  })

  it('does NOT bump the played card via bypass loop even if getPatterns includes it', async () => {
    const { mockSessionPayload } = await import('../services/mocks')
    const payload = await mockSessionPayload('seed')
    const pid = payload.pattern5h.id
    const verb = payload.pattern5h.triggerVerb

    const playedCard = {
      id: 'played',
      template: 'I made him ~',
      patternId: pid,
      triggerVerb: verb,
      category: '감정/관계' as const,
      tags: [],
      exampleOriginal: '그가 화내게 만들었어',
      exampleEnglish: 'I made him angry.',
      savedAt: '2026-01-01T00:00:00Z',
      reviewCount: 1,
      lastReviewedAt: null,
      stability: null,
      difficulty: null,
      nextDueAt: null,
      reps: 0,
      lapses: 0,
      bypassedCount: 1,
      cardState: 'new' as const,
      lastGrade: null,
    }

    const updateSpy = vi.spyOn(db, 'updatePatternSchedule').mockResolvedValue(undefined)
    vi.spyOn(db, 'getPattern').mockResolvedValue(null)
    vi.spyOn(db, 'getPatterns').mockResolvedValue([playedCard]) // only the played card

    const store = useLearningStore.getState()
    store.startScenario(sampleScenario)
    await flushToComplete(store)

    // Only 1 call: the played card's schedule. No bypass bump for the played card.
    expect(updateSpy).toHaveBeenCalledTimes(1)
    expect(updateSpy.mock.calls[0][2].bypassedCount).toBe(0)
  })
})
