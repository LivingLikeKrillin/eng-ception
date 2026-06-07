import type { Pattern5HId } from './v9'

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

// --- 학습 기록 (v9 schema v4) ---

export interface LearningRecord {
  id: string
  schemaVersion: 4
  scenarioId: string | null
  originalKorean: string
  structureTypeId: string
  structureTypeLabel: string
  pattern5hId: Pattern5HId        // NEW (v9): which 5형식 pattern this session trained
  triggerVerb: string             // NEW (v9): the verb used
  finalSentence: string
  precheckChoice: string | null
  afterChoice: string | null
  patternQuizCorrect: boolean     // NEW (v9): did the user's final verb pick identify the trigger verb?
  patternQuizUnsure: boolean      // NEW (v9): did the user use the hint scaffold ("잘 모르겠어") before picking? feeds diagnostic. May be true alongside patternQuizCorrect=true (got it after the hint)
  assemblyCorrect: boolean
  completedAt: string
}

export interface Pattern {
  id: string
  template: string
  patternId: Pattern5HId          // NEW (v9)
  triggerVerb: string             // NEW (v9) — used for dedup
  category: string                // discourse category (structureType.category)
  tags: string[]
  exampleOriginal: string
  exampleEnglish: string
  savedAt: string
  reviewCount: number
  lastReviewedAt: string | null
}
