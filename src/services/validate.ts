import type { SessionPayload } from '../types/v8'

export function assertSessionPayload(x: unknown): asserts x is SessionPayload {
  if (!x || typeof x !== 'object') throw new Error('parse: not an object')
  const p = x as SessionPayload

  // assembly.blocks
  if (!Array.isArray(p.assembly?.blocks) || p.assembly.blocks.length !== 3) {
    throw new Error('parse: blocks must be exactly 3')
  }
  const orders = p.assembly.blocks.map((b) => b.order).sort((a, b) => a - b)
  if (orders[0] !== 1 || orders[1] !== 2 || orders[2] !== 3) {
    throw new Error('parse: block orders must be 1/2/3')
  }

  // assembly.connectors
  const conns = p.assembly?.connectors
  if (!Array.isArray(conns) || conns.length < 2 || conns.length > 3) {
    throw new Error('parse: connectors must be 2..3')
  }
  if (conns.filter((c) => c.isCorrect).length !== 1) {
    throw new Error('parse: exactly one connector must be correct')
  }

  // pivotQuiz
  const opts = p.structure?.pivotQuiz?.options
  if (!Array.isArray(opts) || opts.length !== 2) {
    throw new Error('parse: pivotQuiz must have 2 options')
  }
  if (opts.filter((o) => o.isCorrect).length !== 1) {
    throw new Error('parse: exactly one pivotQuiz option must be correct')
  }

  // precheck
  const choices = p.precheck?.choices
  if (!Array.isArray(choices) || choices.length !== 2) {
    throw new Error('parse: precheck choices must be 2')
  }
  if (!choices.some((c) => c.id === p.precheck?.correctChoiceId)) {
    throw new Error('parse: correctChoiceId must match a choice')
  }

  // structure.parts
  if (!Array.isArray(p.structure?.parts) || p.structure.parts.length < 2) {
    throw new Error('parse: structure.parts must have at least 2')
  }

  // wordOrder
  if (
    !Array.isArray(p.feedback?.wordOrder?.korean) ||
    !Array.isArray(p.feedback?.wordOrder?.english)
  ) {
    throw new Error('parse: wordOrder.korean/english required')
  }

  // pattern
  if (
    !p.pattern?.template ||
    typeof p.pattern.template !== 'string' ||
    !Array.isArray(p.pattern?.tags)
  ) {
    throw new Error('parse: pattern incomplete')
  }
}
