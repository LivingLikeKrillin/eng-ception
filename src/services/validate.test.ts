import { describe, it, expect } from 'vitest'
import { assertSessionPayload } from './validate'
import type { SessionPayload } from '../types/v9'

function validPayload(): SessionPayload {
  return {
    structureType: { id: 'concession-claim', label: '양보 + 주장', category: '업무/논리' },
    pattern5h: {
      id: 'causative-bare',
      label: '사역 (make/have/let)',
      verbs: ['make', 'have', 'let'],
      structure: '주어 + 동사 + 목적어 + 동사원형',
      triggerVerb: 'make',
    },
    recognition: { isFiveHMoment: true, cue: '결과/상태까지 말할 때 → 5형식' },
    empathy: { echo: '...', message: '아, 이거 진짜 답답하지' },
    precheck: {
      question: '뭐부터?',
      choices: [
        { id: 'first', label: '인정부터', preview: '...' },
        { id: 'second', label: '걱정부터', preview: '...' },
      ],
      correctChoiceId: 'first',
    },
    structure: {
      parts: [
        { text: 'A', role: 'first' },
        { text: 'B', role: 'second' },
      ],
      coreStructure: ['인정', '전환', '걱정'],
      explanation: 'x',
      comparison: {
        show: true,
        label: '5형식이 나은가, 간결형이 나은가',
        fiveH: { en: 'I made him angry.', note: 'x' },
        simpler: { en: 'I caused his anger.', note: 'x' },
        betterChoice: 'fiveH',
      },
      patternQuiz: {
        question: '5형식 트리거 동사는?',
        options: [
          { id: 'a', text: 'made', hint: '사역', isCorrect: true },
          { id: 'b', text: 'caused', hint: '평범 3형식', isCorrect: false },
          { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false },
        ],
        feedback: 'x',
      },
    },
    assembly: {
      blocks: [
        { id: 'b1', en: 'I', order: 1 },
        { id: 'b2', en: 'made him', order: 2 },
        { id: 'b3', en: 'angry', order: 3 },
      ],
      blockRoles: ['subject', 'verb', 'complement'],
      connectors: [
        { id: 'and', label: 'and', meaning: 'x', isCorrect: true },
        { id: 'but', label: 'but', meaning: 'x', isCorrect: false },
      ],
      finalSentence: 'I made him angry.',
    },
    feedback: {
      correctTitle: '맞았어',
      correctSub: 'x',
      wrongTitle: '아쉬워',
      wrongSub: 'x',
      explanation: 'x',
      wordOrder: {
        korean: [{ label: '인정', role: 'first' }],
        english: [{ label: '인정', role: 'first' }],
        reversed: false,
        keyInsight: 'x',
      },
      patternNote: "이 문장에서 핵심은 'made + 목적어 + 형용사'. 다음에 비슷한 의미면 이 틀을 떠올려.",
    },
    pattern: {
      template: 'I made him ~',
      patternId: 'causative-bare',
      tags: ['감정 표현', '사역'],
    },
  }
}

describe('assertSessionPayload', () => {
  it('accepts a valid payload', () => {
    expect(() => assertSessionPayload(validPayload())).not.toThrow()
  })

  it('throws on non-object', () => {
    expect(() => assertSessionPayload(null)).toThrow(/parse/)
    expect(() => assertSessionPayload('string')).toThrow(/parse/)
    expect(() => assertSessionPayload(42)).toThrow(/parse/)
  })

  // === pattern5h ===
  it('throws when pattern5h.id is not in the 7-pattern taxonomy', () => {
    const p = validPayload()
    // @ts-expect-error test
    p.pattern5h!.id = 'not-a-pattern'
    expect(() => assertSessionPayload(p)).toThrow(/pattern5h\.id must be one of/)
  })

  it('throws when pattern5h.triggerVerb is not in the curated verb set for that id', () => {
    const p = validPayload()
    p.pattern5h!.triggerVerb = 'deem'  // not in CURATED_VERBS['causative-bare']
    expect(() => assertSessionPayload(p)).toThrow(/triggerVerb 'deem' not in curated verbs/)
  })

  it('throws when pattern5h.verbs is empty', () => {
    const p = validPayload()
    p.pattern5h!.verbs = []
    expect(() => assertSessionPayload(p)).toThrow(/pattern5h\.verbs must be non-empty/)
  })

  // === structure.comparison ===
  it('throws when comparison.show is not a boolean', () => {
    const p = validPayload()
    // @ts-expect-error test
    p.structure.comparison.show = 'yes'
    expect(() => assertSessionPayload(p)).toThrow(/comparison\.show must be boolean/)
  })

  it('accepts comparison.show=false with otherwise present fields', () => {
    const p = validPayload()
    p.structure.comparison.show = false
    expect(() => assertSessionPayload(p)).not.toThrow()
  })

  // === structure.patternQuiz ===
  it('throws when patternQuiz does not have exactly 3 options', () => {
    const p = validPayload()
    p.structure.patternQuiz.options = p.structure.patternQuiz.options.slice(0, 2)
    expect(() => assertSessionPayload(p)).toThrow(/patternQuiz must have 3 options/)
  })

  it("throws when patternQuiz does not include an 'unsure' option", () => {
    const p = validPayload()
    p.structure.patternQuiz.options[2].id = 'c'
    expect(() => assertSessionPayload(p)).toThrow(/patternQuiz must include an 'unsure' option/)
  })

  it('throws when not exactly one verb option is correct', () => {
    const p = validPayload()
    p.structure.patternQuiz.options[1].isCorrect = true
    expect(() => assertSessionPayload(p)).toThrow(/exactly one verb option must be correct/)
  })

  // === assembly ===
  it('throws when blocks length is outside 2..3', () => {
    const p = validPayload()
    p.assembly.blocks = p.assembly.blocks.slice(0, 1)
    expect(() => assertSessionPayload(p)).toThrow(/blocks must be 2..3/)
  })

  it('throws when block orders are not 1..N sequential', () => {
    const p = validPayload()
    p.assembly.blocks[0].order = 5 as 1
    expect(() => assertSessionPayload(p)).toThrow(/block orders must be 1..N sequential/)
  })

  it('throws when block ids are not unique', () => {
    const p = validPayload()
    p.assembly.blocks[1].id = p.assembly.blocks[0].id // duplicate id
    expect(() => assertSessionPayload(p)).toThrow(/block ids must be unique/)
  })

  it('throws when blockRoles length != blocks length', () => {
    const p = validPayload()
    p.assembly.blockRoles = ['subject', 'verb']
    expect(() => assertSessionPayload(p)).toThrow(/blockRoles length must equal blocks length/)
  })

  it('throws when blockRoles contains an unknown role', () => {
    const p = validPayload()
    // @ts-expect-error test
    p.assembly.blockRoles[0] = 'adverb'
    expect(() => assertSessionPayload(p)).toThrow(/blockRoles\[\d+\] invalid/)
  })

  it('throws when connectors length is less than 2', () => {
    const p = validPayload()
    p.assembly.connectors = p.assembly.connectors.slice(0, 1)
    expect(() => assertSessionPayload(p)).toThrow(/connectors must be 2..3/)
  })

  it('throws when not exactly one connector is correct', () => {
    const p = validPayload()
    p.assembly.connectors[1].isCorrect = true
    expect(() => assertSessionPayload(p)).toThrow(/exactly one connector must be correct/)
  })

  // === precheck ===
  it('throws when precheck choices length is not 2', () => {
    const p = validPayload()
    p.precheck.choices = p.precheck.choices.slice(0, 1)
    expect(() => assertSessionPayload(p)).toThrow(/precheck choices must be 2/)
  })

  it('throws when correctChoiceId does not match any choice', () => {
    const p = validPayload()
    p.precheck.correctChoiceId = 'unknown'
    expect(() => assertSessionPayload(p)).toThrow(/correctChoiceId must match a choice/)
  })

  // === structure.parts ===
  it('throws when structure.parts has fewer than 2 entries', () => {
    const p = validPayload()
    p.structure.parts = p.structure.parts.slice(0, 1)
    expect(() => assertSessionPayload(p)).toThrow(/structure\.parts must have at least 2/)
  })

  // === feedback ===
  it('throws when wordOrder.korean or wordOrder.english is missing', () => {
    const p = validPayload()
    // @ts-expect-error test
    p.feedback.wordOrder.korean = undefined
    expect(() => assertSessionPayload(p)).toThrow(/wordOrder/)
  })

  it('throws when patternNote is empty', () => {
    const p = validPayload()
    p.feedback.patternNote = ''
    expect(() => assertSessionPayload(p)).toThrow(/patternNote required/)
  })

  // === pattern ===
  it('throws when pattern.template is empty', () => {
    const p = validPayload()
    p.pattern!.template = ''
    expect(() => assertSessionPayload(p)).toThrow(/pattern incomplete/)
  })

  it("throws when pattern.patternId doesn't match pattern5h.id", () => {
    const p = validPayload()
    p.pattern!.patternId = 'judgment'
    expect(() => assertSessionPayload(p)).toThrow(/pattern\.patternId must equal pattern5h\.id/)
  })

  // === v9.1 recognition discriminant ===
  it('throws when recognition.isFiveHMoment is not boolean', () => {
    const p = validPayload()
    // @ts-expect-error test
    p.recognition.isFiveHMoment = 'yes'
    expect(() => assertSessionPayload(p)).toThrow(/recognition\.isFiveHMoment must be boolean/)
  })

  it('throws when recognition.cue is empty', () => {
    const p = validPayload()
    p.recognition.cue = ''
    expect(() => assertSessionPayload(p)).toThrow(/recognition\.cue required/)
  })

  it('throws when a moment has null pattern5h', () => {
    const p = validPayload()
    p.pattern5h = null
    expect(() => assertSessionPayload(p)).toThrow(/pattern5h\.id must be one of/)
  })

  it('throws when betterChoice disagrees with isFiveHMoment', () => {
    const p = validPayload()
    p.structure.comparison.betterChoice = 'simpler' // but isFiveHMoment is true
    expect(() => assertSessionPayload(p)).toThrow(/betterChoice must agree/)
  })

  it('accepts a 2-block payload', () => {
    const p = validPayload()
    p.assembly.blocks = [
      { id: 'b1', en: 'It', order: 1 },
      { id: 'b2', en: 'lingered', order: 2 },
    ]
    p.assembly.blockRoles = ['subject', 'verb']
    p.assembly.finalSentence = 'It lingered.'
    expect(() => assertSessionPayload(p)).not.toThrow()
  })
})

// === v9.1 간결형 (non-moment) payloads ===
function simplerPayload(): SessionPayload {
  const p = validPayload()
  p.recognition = { isFiveHMoment: false, cue: '단순 인상은 간결형이 정답' }
  p.pattern5h = null
  p.pattern = null
  p.structure.comparison.betterChoice = 'simpler'
  p.structure.patternQuiz = {
    question: '여기 5형식 필요?',
    options: [
      { id: 'a', text: '5형식으로', hint: '과함', isCorrect: false },
      { id: 'b', text: '간결하게', hint: '정답', isCorrect: true },
      { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false },
    ],
    feedback: '간결형이 정답',
  }
  return p
}

describe('assertSessionPayload — 간결형 (non-moment)', () => {
  it('accepts a valid simpler payload (pattern5h/pattern null)', () => {
    expect(() => assertSessionPayload(simplerPayload())).not.toThrow()
  })

  it('throws when a non-moment still carries a pattern5h', () => {
    const p = simplerPayload()
    p.pattern5h = validPayload().pattern5h
    expect(() => assertSessionPayload(p)).toThrow(/pattern5h must be null/)
  })

  it('throws when a non-moment still carries a pattern', () => {
    const p = simplerPayload()
    p.pattern = validPayload().pattern
    expect(() => assertSessionPayload(p)).toThrow(/pattern must be null/)
  })
})
