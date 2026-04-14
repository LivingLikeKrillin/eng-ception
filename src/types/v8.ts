export type V8Step =
  | 'input'
  | 'empathy'
  | 'precheck'
  | 'step0'
  | 'step1'
  | 'step2'
  | 'step3'
  | 'step4'

export type PartRole = 'first' | 'pivot' | 'second' | 'neutral'

export interface SessionPayload {
  structureType: {
    id: string
    label: string
    category: string
  }
  empathy: {
    echo: string
    message: string
  }
  precheck: {
    question: string
    choices: PrecheckChoice[]
    correctChoiceId: string
  }
  structure: {
    parts: StructurePart[]
    coreStructure: string[]
    explanation: string
    pivotQuiz: PivotQuiz
  }
  assembly: {
    blocks: Block[]
    connectors: Connector[]
    finalSentence: string
  }
  feedback: {
    correctTitle: string
    correctSub: string
    wrongTitle: string
    wrongSub: string
    explanation: string
    wordOrder: WordOrder
  }
  pattern: {
    template: string
    tags: string[]
  }
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

export interface PivotQuiz {
  question: string
  options: PivotOption[]
  feedback: string
}

export interface PivotOption {
  id: string
  text: string
  hint: string
  isCorrect: boolean
}

export interface Block {
  id: string
  en: string
  order: number
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
