import { create } from 'zustand'
import type { Scenario, Pattern, LearningRecord } from '../types'
import type { SessionPayload, V9Step } from '../types/v9'
import { fetchSessionPayload } from '../services/claude'
import { localStorageAdapter as db } from './localStorage'

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

  startScenario: (scenario: Scenario) => void
  startCustom: (korean: string) => void
  retryFetch: () => void
  reset: () => void

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
    try {
      const payload = await fetchSessionPayload(get().originalKorean)
      set({ payload, payloadStatus: 'ready', error: null })
    } catch (e) {
      set({ payloadStatus: 'error', error: errorToKoreanMessage(e) })
    }
  }

  return {
    ...initial,

    startScenario(scenario) {
      set({
        ...initial,
        scenario,
        originalKorean: scenario.originalKorean,
        currentStep: 'empathy',
        payloadStatus: 'loading',
      })
      void runFetch()
    },

    startCustom(korean) {
      set({
        ...initial,
        isCustomInput: true,
        originalKorean: korean,
        currentStep: 'empathy',
        payloadStatus: 'loading',
      })
      void runFetch()
    },

    retryFetch() {
      set({ payloadStatus: 'loading', error: null })
      void runFetch()
    },

    reset() {
      set(initial)
    },

    advanceFromEmpathy() {
      set({ currentStep: 'precheck' })
    },

    submitPrecheck(choiceId) {
      set({ precheckChoice: choiceId })
      setTimeout(() => {
        if (get().currentStep === 'precheck') set({ currentStep: 'step0' })
      }, 400)
    },

    submitPatternQuiz(answer) {
      set({ patternQuizAnswer: answer })
    },

    advanceToStep1() {
      set({ currentStep: 'step1' })
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
      set({ currentStep: 'step2' })
    },

    async advanceToStep3() {
      const s = get()
      if (!s.payload) return
      if (s.patternSaved) {
        set({ currentStep: 'step3' })
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
      }
      await db.savePattern(pattern)
      set({ patternSaved: true, currentStep: 'step3' })
    },

    submitAfterChoice(id) {
      set({ afterChoice: id })
    },

    advanceToStep4() {
      set({ currentStep: 'step4' })
    },

    async complete() {
      const s = get()
      if (!s.payload) return
      const record: LearningRecord = {
        id: crypto.randomUUID(),
        schemaVersion: 4,
        scenarioId: s.scenario?.id ?? null,
        originalKorean: s.originalKorean,
        structureTypeId: s.payload.structureType.id,
        structureTypeLabel: s.payload.structureType.label,
        pattern5hId: s.payload.pattern5h.id,
        triggerVerb: s.payload.pattern5h.triggerVerb,
        finalSentence: s.payload.assembly.finalSentence,
        precheckChoice: s.precheckChoice,
        afterChoice: s.afterChoice,
        patternQuizCorrect: s.patternQuizAnswer?.correct === true,
        patternQuizUnsure: s.patternQuizAnswer?.unsure === true,
        assemblyCorrect: isAssemblyCorrect(s),
        completedAt: new Date().toISOString(),
      }
      await db.saveLearningRecord(record)
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
