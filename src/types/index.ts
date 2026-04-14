export interface Scenario {
  id: string
  situation: string
  originalKorean: string
  purpose: string
  emotionalTone: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string
  tags?: string[]
  isDaily: boolean
  createdAt: string
}

// --- 학습 기록 (v8 schema) ---

export interface LearningRecord {
  id: string
  schemaVersion: 3
  scenarioId: string | null
  originalKorean: string
  structureTypeId: string
  structureTypeLabel: string
  finalSentence: string
  precheckChoice: string | null
  afterChoice: string | null
  pivotQuizCorrect: boolean
  assemblyCorrect: boolean
  completedAt: string
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
