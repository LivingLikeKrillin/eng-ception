import { describe, it, expect } from 'vitest'
import { assertSessionPayload } from './validate'
import type { SessionPayload } from '../types/v8'

function validPayload(): SessionPayload {
  return {
    structureType: { id: 'concession-claim', label: '양보 + 주장', category: '업무/논리' },
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
      pivotQuiz: {
        question: '전환점?',
        options: [
          { id: 'a', text: '맞는데', hint: '', isCorrect: true },
          { id: 'b', text: '부족', hint: '', isCorrect: false },
        ],
        feedback: 'x',
      },
    },
    assembly: {
      blocks: [
        { id: 'b1', en: 'one', order: 1 },
        { id: 'b2', en: 'two', order: 2 },
        { id: 'b3', en: 'three', order: 3 },
      ],
      connectors: [
        { id: 'but', label: 'but', meaning: 'x', isCorrect: true },
        { id: 'although', label: 'although', meaning: 'x', isCorrect: false },
      ],
      finalSentence: 'one but two three',
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
    },
    pattern: { template: 'x ~', tags: ['t1', 't2'] },
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

  it('throws when blocks length is not 3', () => {
    const p = validPayload()
    p.assembly.blocks = p.assembly.blocks.slice(0, 2)
    expect(() => assertSessionPayload(p)).toThrow(/blocks must be exactly 3/)
  })

  it('throws when block orders are not 1/2/3', () => {
    const p = validPayload()
    p.assembly.blocks[0].order = 5
    expect(() => assertSessionPayload(p)).toThrow(/block orders must be 1\/2\/3/)
  })

  it('throws when connectors length is less than 2', () => {
    const p = validPayload()
    p.assembly.connectors = p.assembly.connectors.slice(0, 1)
    expect(() => assertSessionPayload(p)).toThrow(/connectors must be 2..3/)
  })

  it('throws when connectors length is more than 3', () => {
    const p = validPayload()
    p.assembly.connectors = [
      { id: 'a', label: 'a', meaning: 'x', isCorrect: true },
      { id: 'b', label: 'b', meaning: 'x', isCorrect: false },
      { id: 'c', label: 'c', meaning: 'x', isCorrect: false },
      { id: 'd', label: 'd', meaning: 'x', isCorrect: false },
    ]
    expect(() => assertSessionPayload(p)).toThrow(/connectors must be 2..3/)
  })

  it('throws when not exactly one connector is correct', () => {
    const p = validPayload()
    p.assembly.connectors[1].isCorrect = true
    expect(() => assertSessionPayload(p)).toThrow(/exactly one connector must be correct/)
  })

  it('throws when pivotQuiz does not have exactly 2 options', () => {
    const p = validPayload()
    p.structure.pivotQuiz.options = p.structure.pivotQuiz.options.slice(0, 1)
    expect(() => assertSessionPayload(p)).toThrow(/pivotQuiz must have 2 options/)
  })

  it('throws when not exactly one pivotQuiz option is correct', () => {
    const p = validPayload()
    p.structure.pivotQuiz.options[1].isCorrect = true
    expect(() => assertSessionPayload(p)).toThrow(/exactly one pivotQuiz option must be correct/)
  })

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

  it('throws when structure.parts has fewer than 2 entries', () => {
    const p = validPayload()
    p.structure.parts = p.structure.parts.slice(0, 1)
    expect(() => assertSessionPayload(p)).toThrow(/structure.parts must have at least 2/)
  })

  it('throws when wordOrder.korean or wordOrder.english is missing', () => {
    const p = validPayload()
    // @ts-expect-error test
    p.feedback.wordOrder.korean = undefined
    expect(() => assertSessionPayload(p)).toThrow(/wordOrder/)
  })

  it('throws when pattern.template is empty', () => {
    const p = validPayload()
    p.pattern.template = ''
    expect(() => assertSessionPayload(p)).toThrow(/pattern incomplete/)
  })
})
