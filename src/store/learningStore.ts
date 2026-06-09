import { create } from 'zustand'
import type { Scenario, Pattern, LearningRecord } from '../types'
import type { SessionPayload, V9Step } from '../types/v9'
import { fetchSessionPayload } from '../services/claude'
import { track } from '../services/analytics'
import { gradeFromSignals, newCardDefaults } from '../services/srs'
import { applyReview } from '../services/applyReview'
import { db } from './db'

export interface PatternQuizAnswer {
  correct: boolean   // final verb pick was the trigger verb
  unsure: boolean    // used the hint scaffold ("잘 모르겠어") before picking; not terminal — can co-occur with correct=true
}

interface V9LearningState {
  currentStep: V9Step
  scenario: Scenario | null
  originalKorean: string
  isCustomInput: boolean

  payload: SessionPayload | null
  payloadStatus: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null

  precheckChoice: string | null
  patternQuizAnswer: PatternQuizAnswer | null
  blockOrder: string[]
  connectorChoice: string | null
  afterChoice: string | null
  patternSaved: boolean

  // event-tracking session state
  sessionId: string | null
  sessionStartedAt: number | null
  stepEnteredAt: number | null
  sessionEnded: boolean

  startScenario: (scenario: Scenario) => void
  startCustom: (korean: string) => void
  retryFetch: () => void
  reset: () => void
  abandonIfActive: (reason: 'reset' | 'restart' | 'hidden') => void

  advanceFromEmpathy: () => void
  submitPrecheck: (choiceId: string) => void
  submitPatternQuiz: (answer: PatternQuizAnswer) => void
  advanceToStep1: () => void
  tapBlock: (blockId: string) => void
  resetBlockOrder: () => void
  tapConnector: (connectorId: string) => void
  advanceToStep2: () => void
  advanceToStep3: () => Promise<void>
  submitAfterChoice: (choiceId: string) => void
  advanceToStep4: () => void
  complete: () => Promise<void>
}

const initial = {
  currentStep: 'input' as V9Step,
  scenario: null as Scenario | null,
  originalKorean: '',
  isCustomInput: false,
  payload: null as SessionPayload | null,
  payloadStatus: 'idle' as const,
  error: null as string | null,
  precheckChoice: null as string | null,
  patternQuizAnswer: null as PatternQuizAnswer | null,
  blockOrder: [] as string[],
  connectorChoice: null as string | null,
  afterChoice: null as string | null,
  patternSaved: false,
  sessionId: null as string | null,
  sessionStartedAt: null as number | null,
  stepEnteredAt: null as number | null,
  sessionEnded: false,
}

export type FetchErrorKind = 'timeout' | 'parse' | 'network' | 'unknown'

export function classifyError(e: unknown): FetchErrorKind {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('timeout')) return 'timeout'
  if (msg.includes('parse')) return 'parse'
  if (msg.includes('fetch') || msg.includes('network')) return 'network'
  return 'unknown'
}

const KIND_MESSAGE: Record<FetchErrorKind, string> = {
  timeout: '응답이 너무 오래 걸려요. 다시 시도해주세요.',
  parse: 'AI 응답 형식이 이상해요. 다시 시도해주세요.',
  network: '네트워크가 불안정해요.',
  unknown: '문제가 생겼어요. 다시 시도해주세요.',
}

function errorToKoreanMessage(e: unknown): string {
  return KIND_MESSAGE[classifyError(e)]
}

export const useLearningStore = create<V9LearningState>((set, get) => {
  const runFetch = async () => {
    const sessionId = get().sessionId
    const t0 = Date.now()
    if (sessionId) track('fetch_start', {}, sessionId)
    try {
      const payload = await fetchSessionPayload(get().originalKorean)
      set({ payload, payloadStatus: 'ready', error: null })
      if (sessionId) track('fetch_success', { latencyMs: Date.now() - t0 }, sessionId)
    } catch (e) {
      set({ payloadStatus: 'error', error: errorToKoreanMessage(e) })
      if (sessionId) track('fetch_error', { latencyMs: Date.now() - t0, kind: classifyError(e) }, sessionId)
    }
  }

  // Single dwell source: emit step_dwell for the step being LEFT, then move.
  const transitionTo = (step: V9Step) => {
    const s = get()
    if (s.sessionId && s.stepEnteredAt != null) {
      track('step_dwell', { step: s.currentStep, dwellMs: Date.now() - s.stepEnteredAt }, s.sessionId)
    }
    set({ currentStep: step, stepEnteredAt: Date.now() })
  }

  return {
    ...initial,

    startScenario(scenario) {
      get().abandonIfActive('restart')
      const sessionId = crypto.randomUUID()
      const now = Date.now()
      set({
        ...initial,
        scenario,
        originalKorean: scenario.originalKorean,
        currentStep: 'empathy',
        payloadStatus: 'loading',
        sessionId,
        sessionStartedAt: now,
        stepEnteredAt: now,
      })
      track('session_start', { source: 'scenario', scenarioId: scenario.id }, sessionId)
      void runFetch()
    },

    startCustom(korean) {
      get().abandonIfActive('restart')
      const sessionId = crypto.randomUUID()
      const now = Date.now()
      set({
        ...initial,
        isCustomInput: true,
        originalKorean: korean,
        currentStep: 'empathy',
        payloadStatus: 'loading',
        sessionId,
        sessionStartedAt: now,
        stepEnteredAt: now,
      })
      track('session_start', { source: 'custom', scenarioId: null }, sessionId)
      void runFetch()
    },

    retryFetch() {
      set({ payloadStatus: 'loading', error: null })
      void runFetch()
    },

    reset() {
      get().abandonIfActive('reset')
      set(initial)
    },

    abandonIfActive(reason) {
      const s = get()
      if (s.sessionId && !s.sessionEnded && s.currentStep !== 'step4') {
        track('session_abandon', {
          lastStep: s.currentStep,
          reason,
          durationMs: Date.now() - (s.sessionStartedAt ?? Date.now()),
        }, s.sessionId)
        set({ sessionEnded: true })
      }
    },

    advanceFromEmpathy() {
      transitionTo('precheck')
    },

    submitPrecheck(choiceId) {
      set({ precheckChoice: choiceId })
      // Capture the session so an abandon→restart within 400ms can't let this stale
      // timer force-advance the freshly started session.
      const sid = get().sessionId
      setTimeout(() => {
        const s = get()
        if (s.sessionId === sid && s.currentStep === 'precheck') transitionTo('step0')
      }, 400)
    },

    submitPatternQuiz(answer) {
      set({ patternQuizAnswer: answer })
    },

    advanceToStep1() {
      transitionTo('step1')
    },

    tapBlock(blockId) {
      const { blockOrder } = get()
      // Once all 3 slots are filled the arrangement is locked — use 다시 (resetBlockOrder) to redo.
      if (blockOrder.length >= 3) return
      if (blockOrder.includes(blockId)) {
        set({ blockOrder: blockOrder.filter((id) => id !== blockId) })
      } else {
        set({ blockOrder: [...blockOrder, blockId] })
      }
    },

    resetBlockOrder() {
      set({ blockOrder: [] })
    },

    tapConnector(id) {
      set({ connectorChoice: id })
    },

    advanceToStep2() {
      transitionTo('step2')
    },

    async advanceToStep3() {
      const s = get()
      if (!s.payload) return
      if (s.patternSaved) {
        transitionTo('step3')
        return
      }
      const pattern: Pattern = {
        id: crypto.randomUUID(),
        template: s.payload.pattern.template,
        patternId: s.payload.pattern.patternId,
        triggerVerb: s.payload.pattern5h.triggerVerb,
        category: s.payload.structureType.category,
        tags: s.payload.pattern.tags,
        exampleOriginal: s.originalKorean,
        exampleEnglish: s.payload.assembly.finalSentence,
        savedAt: new Date().toISOString(),
        reviewCount: 0,
        lastReviewedAt: null,
        ...newCardDefaults(),
      }
      await db.savePattern(pattern)
      set({ patternSaved: true })
      transitionTo('step3')
    },

    submitAfterChoice(id) {
      set({ afterChoice: id })
    },

    advanceToStep4() {
      transitionTo('step4')
    },

    async complete() {
      const s = get()

      // No payload to persist — still terminate the session so a later
      // visibilitychange can't fire a spurious session_abandon, and the store resets.
      if (!s.payload) {
        if (s.sessionId && !s.sessionEnded) set({ sessionEnded: true })
        set(initial)
        return
      }

      // Idempotency: a session completes exactly once. Guards a re-tap of the
      // completion button (StepComplete stays mounted until navigate) from saving a
      // duplicate record and double-advancing the FSRS card. Claimed synchronously
      // before any await so a fast double-tap can't slip through.
      if (s.sessionEnded) return
      set({ sessionEnded: true })

      // Compute the dual signals once and reuse (R1) — record, telemetry, and grade
      // must agree, and isAssemblyCorrect/the quiz reads were duplicated 3× before.
      const assemblyCorrect = isAssemblyCorrect(s)
      const patternQuizCorrect = s.patternQuizAnswer?.correct === true
      const patternQuizUnsure = s.patternQuizAnswer?.unsure === true

      if (s.sessionId) {
        track('session_complete', {
          pattern5hId: s.payload.pattern5h.id,
          triggerVerb: s.payload.pattern5h.triggerVerb,
          assemblyCorrect,
          patternQuizCorrect,
          patternQuizUnsure,
          durationMs: Date.now() - (s.sessionStartedAt ?? Date.now()),
        }, s.sessionId)
      }

      const record: LearningRecord = {
        id: crypto.randomUUID(),
        schemaVersion: 5,
        scenarioId: s.scenario?.id ?? null,
        originalKorean: s.originalKorean,
        structureTypeId: s.payload.structureType.id,
        structureTypeLabel: s.payload.structureType.label,
        pattern5hId: s.payload.pattern5h.id,
        triggerVerb: s.payload.pattern5h.triggerVerb,
        finalSentence: s.payload.assembly.finalSentence,
        precheckChoice: s.precheckChoice,
        afterChoice: s.afterChoice,
        patternQuizCorrect,
        patternQuizUnsure,
        assemblyCorrect,
        completedAt: new Date().toISOString(),
      }

      // Persistence is wrapped: localStorage doesn't reject and Firestore queues
      // offline, but a hard failure (quota, expired token) must not strand the user
      // on the completion screen. The session is logically done + telemetry recorded;
      // the idempotency guard above prevents a re-run from duplicating anything.
      try {
        await db.saveLearningRecord(record)

        // --- SRS: grade this session and advance the card's schedule (+ N-bypass bookkeeping).
        // Shared with offline recall via applyReview. ---
        const grade = gradeFromSignals({ assemblyCorrect, patternQuizCorrect, patternQuizUnsure })
        await applyReview(s.payload.pattern5h.id, s.payload.pattern5h.triggerVerb, grade, new Date())
      } catch (e) {
        console.error('complete() persist failed', e)
      }

      set(initial)
    },
  }
})

export function isAssemblyCorrect(s: V9LearningState): boolean {
  const { payload, blockOrder, connectorChoice } = s
  if (!payload || blockOrder.length !== 3) return false
  const correctOrder = [...payload.assembly.blocks]
    .sort((a, b) => a.order - b.order)
    .map((b) => b.id)
  const blocksOk = blockOrder.every((id, i) => id === correctOrder[i])
  const conn = payload.assembly.connectors.find((c) => c.id === connectorChoice)
  return blocksOk && conn?.isCorrect === true
}
