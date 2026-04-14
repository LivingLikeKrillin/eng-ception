import { create } from 'zustand'
import type {
  LearningStep,
  Scenario,
  RestructureResponse,
  EnglishResponse,
  PatternResponse,
  LearningRecord,
  Pattern,
} from '../types'
import { localStorageAdapter as db } from './localStorage'
import { callClaude } from '../services/claude'

interface LearningState {
  // 세션 상태
  currentStep: LearningStep
  scenario: Scenario | null
  originalKorean: string
  isCustomInput: boolean
  isLoading: boolean
  error: string | null

  // 사용자 입력
  userRestructure: string[]
  userEnglish: string

  // AI 응답
  aiRestructure: RestructureResponse | null
  aiEnglish: EnglishResponse | null
  aiPattern: PatternResponse | null

  // 액션
  startScenario: (scenario: Scenario) => void
  startCustom: (korean: string) => void
  submitRestructure: (parts: string[]) => Promise<void>
  submitEnglish: (text: string) => Promise<void>
  extractPatterns: () => Promise<void>
  savePattern: (index: number) => Promise<void>
  saveRecord: () => Promise<void>
  reset: () => void
}

const initialState = {
  currentStep: 'input' as LearningStep,
  scenario: null as Scenario | null,
  originalKorean: '',
  isCustomInput: false,
  isLoading: false,
  error: null as string | null,
  userRestructure: [] as string[],
  userEnglish: '',
  aiRestructure: null as RestructureResponse | null,
  aiEnglish: null as EnglishResponse | null,
  aiPattern: null as PatternResponse | null,
}

export const useLearningStore = create<LearningState>((set, get) => ({
  ...initialState,

  startScenario(scenario) {
    set({
      ...initialState,
      scenario,
      originalKorean: scenario.originalKorean,
      currentStep: 'restructure',
    })
  },

  startCustom(korean) {
    set({
      ...initialState,
      isCustomInput: true,
      originalKorean: korean,
      currentStep: 'restructure',
    })
  },

  async submitRestructure(parts) {
    set({ userRestructure: parts, isLoading: true, error: null })
    try {
      const result = await callClaude('restructure', {
        original: get().originalKorean,
        userRestructure: parts,
      })
      set({
        aiRestructure: result,
        isLoading: false,
        // 피드백을 같은 화면에서 보여준 뒤, 사용자가 "다음" 누르면 english로 전환
        // currentStep은 아직 'restructure' — UI에서 피드백 표시 후 전환 처리
      })
    } catch {
      set({ error: '잠시 후 다시 시도해주세요.', isLoading: false })
    }
  },

  async submitEnglish(text) {
    set({ userEnglish: text, isLoading: true, error: null })
    try {
      const result = await callClaude('english', {
        original: get().originalKorean,
        aiRestructured: get().aiRestructure!.restructured,
        userEnglish: text,
      })
      set({
        aiEnglish: result,
        isLoading: false,
        // 피드백을 같은 화면에서 보여준 뒤, 사용자가 "다음" 누르면 pattern으로 전환
      })
    } catch {
      set({ error: '잠시 후 다시 시도해주세요.', isLoading: false })
    }
  },

  async extractPatterns() {
    set({ isLoading: true, error: null })
    try {
      const result = await callClaude('pattern', {
        original: get().originalKorean,
        aiEnglishLayers: get().aiEnglish!.english,
      })
      set({ aiPattern: result, isLoading: false, currentStep: 'pattern' })
    } catch {
      set({ error: '잠시 후 다시 시도해주세요.', isLoading: false })
    }
  },

  async savePattern(index) {
    const state = get()
    const p = state.aiPattern!.patterns[index]
    const pattern: Pattern = {
      id: crypto.randomUUID(),
      template: p.template,
      category: p.category,
      tags: p.tags,
      exampleOriginal: p.exampleOriginal,
      exampleEnglish: p.exampleEnglish,
      savedAt: new Date().toISOString(),
      reviewCount: 0,
      lastReviewedAt: null,
    }
    await db.savePattern(pattern)
  },

  async saveRecord() {
    const state = get()
    const record: LearningRecord = {
      id: crypto.randomUUID(),
      scenarioId: state.scenario?.id ?? null,
      originalKorean: state.originalKorean,
      userRestructure: state.userRestructure,
      userEnglish: state.userEnglish,
      aiRestructure: state.aiRestructure,
      aiEnglish: state.aiEnglish,
      extractedPatterns: (state.aiPattern?.patterns ?? []).map((p) => ({
        id: crypto.randomUUID(),
        template: p.template,
        category: p.category,
        tags: p.tags,
        exampleOriginal: p.exampleOriginal,
        exampleEnglish: p.exampleEnglish,
        savedAt: new Date().toISOString(),
        reviewCount: 0,
        lastReviewedAt: null,
      })),
      completedAt: new Date().toISOString(),
      stepsCompleted: 4,
    }
    await db.saveLearningRecord(record)
  },

  reset() {
    set(initialState)
  },
}))
