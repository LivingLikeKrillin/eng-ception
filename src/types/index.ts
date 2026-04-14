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

// --- 4단계 학습 플로우 ---

export type LearningStep =
  | 'input'           // Step 1: 한국어 입력
  | 'restructure'     // Step 2: 사고 재구성 (기존 decompose + easy-korean 통합)
  | 'english'         // Step 3: 영작 시도
  | 'pattern'         // Step 4: 패턴 정리

// --- AI 응답 타입 ---

export interface RestructureResponse {
  restructured: string[]          // 영어로 말하기 쉽게 재구성된 한국어
  whyHard: string                 // 이 문장이 영어로 어려운 이유
  feedback: string                // 사용자 시도에 대한 피드백
  hints: string[]                 // 영작 시 도움이 될 힌트
}

export interface EnglishResponse {
  english: {
    safe: string                  // 가장 짧고 안전한 영어
    natural: string               // 자연스러운 일상 대화 수준
    refined: string               // 뉘앙스와 톤까지 고려한 정교한 영어
  }
  feedback: string                // 사용자 영어에 대한 피드백
}

export interface PatternResponse {
  patterns: {
    template: string              // "I'm not saying A. I just felt B."
    category: string              // "감정/관계" 등
    tags: string[]
    exampleOriginal: string       // 한국어 예시
    exampleEnglish: string        // 영어 예시
  }[]
}

// --- 학습 기록 ---

export interface LearningRecord {
  id: string
  scenarioId: string | null
  originalKorean: string
  userRestructure: string[]       // 사용자의 사고 재구성 시도
  userEnglish: string             // 사용자의 영작 시도
  aiRestructure: RestructureResponse | null
  aiEnglish: EnglishResponse | null
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

// --- API 호출 타입 ---

export type ChatStep = 'restructure' | 'english' | 'pattern'

export type StepResponseMap = {
  restructure: RestructureResponse
  english: EnglishResponse
  pattern: PatternResponse
}
