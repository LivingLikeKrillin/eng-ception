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

// --- 학습 기록 (v9 schema v4/v5) ---

export interface LearningRecord {
  id: string
  schemaVersion: 4 | 5
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

// 나중에 풀기 인박스 — stash a stuck Korean moment now, drill later (F4).
export interface Capture {
  id: string
  korean: string
  createdAt: string          // ISO
  source: 'manual' | 'share'
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
  // --- FSRS schedule state (schema v5) ---
  stability: number | null        // FSRS S (days); null = never scheduled
  difficulty: number | null       // FSRS D (1..10); null = never scheduled
  nextDueAt: string | null        // ISO; null = unscheduled ⇒ due now
  reps: number                    // reviews applied
  lapses: number                  // Again(1) count
  bypassedCount: number           // avoidance counter (N=3 escalation)
  cardState: 'new' | 'learning' | 'review' | 'relearning'
  lastGrade: 1 | 2 | 3 | 4 | null
}
