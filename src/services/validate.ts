import type { SessionPayload, Pattern5HId, BlockRole } from '../types/v9'
import { CURATED_VERBS } from '../types/v9'

const PATTERN_IDS: readonly Pattern5HId[] = [
  'causative-bare',
  'causative-toV',
  'causative-result',
  'perception',
  'want-toV',
  'judgment',
  'ditransitive',
]

const BLOCK_ROLES: readonly BlockRole[] = ['subject', 'verb', 'object', 'complement']

export function assertSessionPayload(x: unknown): asserts x is SessionPayload {
  if (!x || typeof x !== 'object') throw new Error('parse: not an object')
  const p = x as SessionPayload

  // pattern5h
  const id = p.pattern5h?.id
  if (!PATTERN_IDS.includes(id)) {
    throw new Error(`parse: pattern5h.id must be one of ${PATTERN_IDS.join('|')}`)
  }
  if (!Array.isArray(p.pattern5h?.verbs) || p.pattern5h.verbs.length === 0) {
    throw new Error('parse: pattern5h.verbs must be non-empty')
  }
  const curated = CURATED_VERBS[id]
  if (!curated.includes(p.pattern5h.triggerVerb)) {
    throw new Error(
      `parse: triggerVerb '${p.pattern5h.triggerVerb}' not in curated verbs for ${id}`,
    )
  }

  // assembly.blocks
  if (!Array.isArray(p.assembly?.blocks) || p.assembly.blocks.length !== 3) {
    throw new Error('parse: blocks must be exactly 3')
  }
  const orders = p.assembly.blocks.map((b) => b.order).sort((a, b) => a - b)
  if (orders[0] !== 1 || orders[1] !== 2 || orders[2] !== 3) {
    throw new Error('parse: block orders must be 1/2/3')
  }

  // assembly.blockRoles
  if (!Array.isArray(p.assembly?.blockRoles) || p.assembly.blockRoles.length !== 3) {
    throw new Error('parse: blockRoles must have length 3')
  }
  p.assembly.blockRoles.forEach((r, i) => {
    if (!BLOCK_ROLES.includes(r)) throw new Error(`parse: blockRoles[${i}] invalid`)
  })

  // assembly.connectors
  const conns = p.assembly?.connectors
  if (!Array.isArray(conns) || conns.length < 2 || conns.length > 3) {
    throw new Error('parse: connectors must be 2..3')
  }
  if (conns.filter((c) => c.isCorrect).length !== 1) {
    throw new Error('parse: exactly one connector must be correct')
  }

  // structure.comparison
  if (typeof p.structure?.comparison?.show !== 'boolean') {
    throw new Error('parse: comparison.show must be boolean')
  }

  // structure.patternQuiz
  const opts = p.structure?.patternQuiz?.options
  if (!Array.isArray(opts) || opts.length !== 3) {
    throw new Error('parse: patternQuiz must have 3 options')
  }
  if (!opts.some((o) => o.id === 'unsure')) {
    throw new Error("parse: patternQuiz must include an 'unsure' option")
  }
  const verbOpts = opts.filter((o) => o.id !== 'unsure')
  if (verbOpts.filter((o) => o.isCorrect).length !== 1) {
    throw new Error('parse: exactly one verb option must be correct')
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

  // feedback
  if (
    !Array.isArray(p.feedback?.wordOrder?.korean) ||
    !Array.isArray(p.feedback?.wordOrder?.english)
  ) {
    throw new Error('parse: wordOrder.korean/english required')
  }
  if (typeof p.feedback?.patternNote !== 'string' || p.feedback.patternNote.length === 0) {
    throw new Error('parse: patternNote required')
  }

  // pattern
  if (
    !p.pattern?.template ||
    typeof p.pattern.template !== 'string' ||
    !Array.isArray(p.pattern?.tags)
  ) {
    throw new Error('parse: pattern incomplete')
  }
  if (p.pattern.patternId !== id) {
    throw new Error('parse: pattern.patternId must equal pattern5h.id')
  }
}
