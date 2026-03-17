export interface Scenario {
  id: string
  situation: string
  originalKorean: string
  purpose: string
  emotionalTone: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string
  isDaily: boolean
  createdAt: string
}

export interface LearningRecord {
  id: string
  scenarioId: string | null
  originalKorean: string
  userDecomposition: string[]
  userEasyKorean: string[]
  userEnglish: string
  aiDecomposition: string[]
  aiEasyKorean: string[]
  aiEnglishLayers: {
    safe: string
    natural: string
    refined: string
  }
  decompositionFeedback: string
  easyKoreanFeedback: string
  englishFeedback: string
  whyHardToTranslate: string
  extractedPatterns: Pattern[]
  completedAt: string
  stepsCompleted: number
}

export interface Pattern {
  id: string
  template: string
  category: string
  tags: string[]
  exampleOriginal: string
  exampleEnglish: string
  savedAt: string
  reviewCount: number
  lastReviewedAt: string | null
}

export type LearningStep =
  | 'original'
  | 'decompose'
  | 'ai-decompose'
  | 'easy-korean'
  | 'ai-easy-korean'
  | 'english'
  | 'ai-english'
  | 'pattern'

export interface DecomposeResponse {
  decomposition: string[]
  feedback: string
  whyHard: string
}

export interface EasyKoreanResponse {
  easyKorean: string[]
  feedback: string
}

export interface EnglishResponse {
  english: {
    safe: string
    natural: string
    refined: string
  }
  feedback: string
}

export interface PatternResponse {
  patterns: {
    template: string
    category: string
    tags: string[]
    exampleOriginal: string
    exampleEnglish: string
  }[]
}

export type ChatStep = 'decompose' | 'easy-korean' | 'english' | 'pattern'
