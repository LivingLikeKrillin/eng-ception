import { create } from 'zustand'
import type {
  LearningStep,
  Scenario,
  DecomposeResponse,
  EasyKoreanResponse,
  EnglishResponse,
  PatternResponse,
  LearningRecord,
  Pattern,
} from '../types'
import { localStorageAdapter as db } from './localStorage'
import { callClaude } from '../services/claude'

interface LearningState {
  currentStep: LearningStep
  scenario: Scenario | null
  originalKorean: string
  isCustomInput: boolean
  isLoading: boolean
  error: string | null
  userDecomposition: string[]
  userEasyKorean: string[]
  userEnglish: string
  aiDecompose: DecomposeResponse | null
  aiEasyKorean: EasyKoreanResponse | null
  aiEnglish: EnglishResponse | null
  aiPattern: PatternResponse | null
  startScenario: (scenario: Scenario) => void
  startCustom: (korean: string) => void
  submitDecomposition: (parts: string[]) => Promise<void>
  submitEasyKorean: (parts: string[]) => Promise<void>
  submitEnglish: (text: string) => Promise<void>
  extractPatterns: () => Promise<void>
  savePattern: (index: number) => Promise<void>
  saveRecord: () => Promise<void>
  reset: () => void
  goToNextStep: () => void
}

const initialState = {
  currentStep: 'original' as LearningStep,
  scenario: null as Scenario | null,
  originalKorean: '',
  isCustomInput: false,
  isLoading: false,
  error: null as string | null,
  userDecomposition: [] as string[],
  userEasyKorean: [] as string[],
  userEnglish: '',
  aiDecompose: null as DecomposeResponse | null,
  aiEasyKorean: null as EasyKoreanResponse | null,
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
      currentStep: 'decompose',
    })
  },

  startCustom(korean) {
    set({
      ...initialState,
      isCustomInput: true,
      originalKorean: korean,
      currentStep: 'decompose',
    })
  },

  async submitDecomposition(parts) {
    set({ userDecomposition: parts, isLoading: true, error: null })
    try {
      const result = await callClaude('decompose', {
        original: get().originalKorean,
        userDecomposition: parts,
      })
      set({ aiDecompose: result, isLoading: false, currentStep: 'ai-decompose' })
    } catch {
      set({ error: '잠시 후 다시 시도해주세요.', isLoading: false })
    }
  },

  async submitEasyKorean(parts) {
    set({ userEasyKorean: parts, isLoading: true, error: null })
    try {
      const result = await callClaude('easy-korean', {
        original: get().originalKorean,
        aiDecomposition: get().aiDecompose!.decomposition,
        userEasyKorean: parts,
      })
      set({ aiEasyKorean: result, isLoading: false, currentStep: 'ai-easy-korean' })
    } catch {
      set({ error: '잠시 후 다시 시도해주세요.', isLoading: false })
    }
  },

  async submitEnglish(text) {
    set({ userEnglish: text, isLoading: true, error: null })
    try {
      const result = await callClaude('english', {
        original: get().originalKorean,
        aiEasyKorean: get().aiEasyKorean!.easyKorean,
        userEnglish: text,
      })
      set({ aiEnglish: result, isLoading: false, currentStep: 'ai-english' })
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
      userDecomposition: state.userDecomposition,
      userEasyKorean: state.userEasyKorean,
      userEnglish: state.userEnglish,
      aiDecomposition: state.aiDecompose?.decomposition ?? [],
      aiEasyKorean: state.aiEasyKorean?.easyKorean ?? [],
      aiEnglishLayers: state.aiEnglish?.english ?? { safe: '', natural: '', refined: '' },
      decompositionFeedback: state.aiDecompose?.feedback ?? '',
      easyKoreanFeedback: state.aiEasyKorean?.feedback ?? '',
      englishFeedback: state.aiEnglish?.feedback ?? '',
      whyHardToTranslate: state.aiDecompose?.whyHard ?? '',
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
      stepsCompleted: 8,
    }
    await db.saveLearningRecord(record)
  },

  reset() {
    set(initialState)
  },

  goToNextStep() {
    const stepOrder: LearningStep[] = [
      'original', 'decompose', 'ai-decompose',
      'easy-korean', 'ai-easy-korean',
      'english', 'ai-english', 'pattern',
    ]
    const current = get().currentStep
    const idx = stepOrder.indexOf(current)
    if (idx < stepOrder.length - 1) {
      set({ currentStep: stepOrder[idx + 1] })
    }
  },
}))
