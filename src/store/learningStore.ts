import { create } from 'zustand'
import type { Scenario, Pattern, LearningRecord } from '../types'
import type { SessionPayload, V8Step } from '../types/v8'
import { fetchSessionPayload } from '../services/claude'
import { localStorageAdapter as db } from './localStorage'

interface V8LearningState {
  currentStep: V8Step
  scenario: Scenario | null
  originalKorean: string
  isCustomInput: boolean

  payload: SessionPayload | null
  payloadStatus: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null

  precheckChoice: string | null
  pivotQuizAnswer: 'correct' | 'wrong' | null
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
  submitPivotQuiz: (answer: 'correct' | 'wrong') => void
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
  currentStep: 'input' as V8Step,
  scenario: null as Scenario | null,
  originalKorean: '',
  isCustomInput: false,
  payload: null as SessionPayload | null,
  payloadStatus: 'idle' as const,
  error: null as string | null,
  precheckChoice: null as string | null,
  pivotQuizAnswer: null as 'correct' | 'wrong' | null,
  blockOrder: [] as string[],
  connectorChoice: null as string | null,
  afterChoice: null as string | null,
  patternSaved: false,
}

function errorToKoreanMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('timeout')) return '응답이 너무 오래 걸려요. 다시 시도해주세요.'
  if (msg.includes('parse')) return 'AI 응답 형식이 이상해요. 다시 시도해주세요.'
  if (msg.includes('fetch') || msg.includes('network')) return '네트워크가 불안정해요.'
  return '문제가 생겼어요. 다시 시도해주세요.'
}

export const useLearningStore = create<V8LearningState>((set, get) => {
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

    submitPivotQuiz(answer) {
      set({ pivotQuizAnswer: answer })
    },

    advanceToStep1() {
      set({ currentStep: 'step1' })
    },

    tapBlock(blockId) {
      const { blockOrder } = get()
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
        schemaVersion: 3,
        scenarioId: s.scenario?.id ?? null,
        originalKorean: s.originalKorean,
        structureTypeId: s.payload.structureType.id,
        structureTypeLabel: s.payload.structureType.label,
        finalSentence: s.payload.assembly.finalSentence,
        precheckChoice: s.precheckChoice,
        afterChoice: s.afterChoice,
        pivotQuizCorrect: s.pivotQuizAnswer === 'correct',
        assemblyCorrect: isAssemblyCorrect(s),
        completedAt: new Date().toISOString(),
      }
      await db.saveLearningRecord(record)
      set(initial)
    },
  }
})

export function isAssemblyCorrect(s: V8LearningState): boolean {
  const { payload, blockOrder, connectorChoice } = s
  if (!payload || blockOrder.length !== 3) return false
  const correctOrder = [...payload.assembly.blocks]
    .sort((a, b) => a.order - b.order)
    .map((b) => b.id)
  const blocksOk = blockOrder.every((id, i) => id === correctOrder[i])
  const conn = payload.assembly.connectors.find((c) => c.id === connectorChoice)
  return blocksOk && conn?.isCorrect === true
}
