// === Step keys for the 7-step v9 learning flow ===
export type V9Step =
  | 'input'
  | 'empathy'
  | 'precheck'
  | 'step0'
  | 'step1'
  | 'step2'
  | 'step3'
  | 'step4'

// === 5형식 taxonomy (speaking-owned; listening dropped 2026-06-07) ===
export type Pattern5HId =
  | 'causative-bare'
  | 'causative-toV'
  | 'causative-result'
  | 'perception'
  | 'want-toV'
  | 'judgment'
  | 'ditransitive'

export interface Pattern5HMeta {
  id: Pattern5HId
  label: string              // "사역 (make/have/let)"
  verbs: string[]            // ["make", "have", "let"] — must be a subset of CURATED_VERBS[id]
  structure: string          // "주어 + 동사 + 목적어 + 동사원형"
  triggerVerb: string        // base form ∈ verbs (e.g. "make", NOT "made"); inflected display lives in template/options
}

// Curated verb set per spec §3 (17 verbs total). Used by validator.
export const CURATED_VERBS: Record<Pattern5HId, readonly string[]> = {
  'causative-bare':   ['make', 'have', 'let'],
  'causative-toV':    ['get'],
  'causative-result': ['get', 'have'],
  'perception':       ['see', 'hear', 'watch'],
  'want-toV':         ['want', 'ask', 'tell', 'need'],
  'judgment':         ['find', 'call'],
  'ditransitive':     ['give', 'tell', 'show', 'send', 'bring'],
} as const

export type PartRole = 'first' | 'pivot' | 'second' | 'neutral'

// Slots in a 5형식 sentence — used to label assembly blocks
export type BlockRole = 'subject' | 'verb' | 'object' | 'complement'

export interface SessionPayload {
  // Discourse-level type (kept as secondary tag)
  structureType: {
    id: string
    label: string             // "양보 + 주장"
    category: string          // "업무/논리" etc.
  }

  // Recognition verdict (v9.1) — the teaching centerpiece. Is this input a "5형식 moment"
  // (5형식 levels it up) or is a simpler form the natural/better answer? `cue` = the why.
  recognition: {
    isFiveHMoment: boolean
    cue: string
  }

  // 5형식 axis — null when !isFiveHMoment (simpler form is the answer; no 5형식 to teach).
  pattern5h: Pattern5HMeta | null

  empathy: {
    echo: string
    message: string
  }

  precheck: {
    question: string
    choices: PrecheckChoice[]   // exactly 2, ids 'first'|'second'
    correctChoiceId: string
  }

  structure: {
    parts: StructurePart[]      // korean decomposition, 2..6 tokens
    coreStructure: string[]     // discourse beats
    explanation: string

    // 5형식 ↔ 간결형 contrast (v9.1 — direction-agnostic). Shows BOTH renderings and which
    // one wins here. betterChoice is consistent with recognition.isFiveHMoment (true ↔ '5h').
    comparison: {
      show: boolean             // false only when a contrast is pointless
      label: string             // "5형식이 나은가, 간결형이 나은가"
      fiveH: { en: string; note: string }     // the 5형식 rendering + note (natural OR overkill)
      simpler: { en: string; note: string }   // the simpler rendering + note
      betterChoice: 'fiveH' | 'simpler'        // which wins for this input
    }

    // Renamed from pivotQuiz. Tests recognition of the 5형식 trigger verb.
    // Has exactly 3 options: 2 verb options (one correct) + "잘 모르겠어" (Q3).
    // UX (expert review 2026-05-18): "잘 모르겠어" does NOT reveal the answer — it
    // surfaces the correct option's `hint` as a scaffold and forces a second verb pick.
    patternQuiz: {
      question: string          // "이 문장에서 5형식 트리거 동사는?"
      options: PatternQuizOption[]
      feedback: string
    }
  }

  assembly: {
    blocks: Block[]             // exactly 3
    blockRoles: BlockRole[]     // length 3; blockRoles[i] is the role of block with order = i+1
    connectors: Connector[]     // 2..3, exactly one correct
    finalSentence: string
  }

  feedback: {
    correctTitle: string
    correctSub: string
    wrongTitle: string
    wrongSub: string
    explanation: string
    wordOrder: WordOrder
    patternNote: string         // 반말 ≤80자 자동성 노트 ("이 문장에서 핵심은 'made + O + Adj'...")
  }

  // The reusable 5형식 pattern to save — null when !isFiveHMoment (nothing to drill).
  pattern: {
    template: string            // verb-specific ("I made him ~")
    patternId: Pattern5HId      // links to taxonomy
    tags: string[]              // discourse tags ("회의 반대", "감정 표현"), 2..4
  } | null
}

export interface PrecheckChoice {
  id: string
  label: string
  preview: string
}

export interface StructurePart {
  text: string
  role: PartRole
}

// PatternQuiz: 2 verb options + 1 "잘 모르겠어" (id='unsure', isCorrect:false, neutralized styling at UI layer).
// "잘 모르겠어" triggers a hint scaffold (the correct option's `hint`), not an answer reveal — see StepStructure.
export interface PatternQuizOption {
  id: string                    // 'a' | 'b' | 'unsure'
  text: string                  // verb form as it appears in the Korean's likely English ("made", "caused", "잘 모르겠어")
  hint: string                  // verb options: meaning hint (correct option's doubles as the 'unsure' scaffold); '' only for 'unsure'
  isCorrect: boolean
}

export interface Block {
  id: 'b1' | 'b2' | 'b3'
  en: string
  order: 1 | 2 | 3              // assembly order
}

export interface Connector {
  id: string
  label: string
  meaning: string
  isCorrect: boolean
}

export interface WordOrder {
  korean: WordOrderToken[]
  english: WordOrderToken[]
  reversed: boolean
  keyInsight: string
}

export interface WordOrderToken {
  label: string
  role: PartRole
  connectorLabel?: string
}
