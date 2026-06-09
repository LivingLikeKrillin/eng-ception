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

  // recognition (v9.1) — the discriminant
  const rec = p.recognition
  if (!rec || typeof rec.isFiveHMoment !== 'boolean') {
    throw new Error('parse: recognition.isFiveHMoment must be boolean')
  }
  if (typeof rec.cue !== 'string' || rec.cue.length === 0) {
    throw new Error('parse: recognition.cue required')
  }
  const moment = rec.isFiveHMoment

  // pattern5h — required (+ curated checks) iff moment; must be null otherwise
  if (moment) {
    const p5h = p.pattern5h
    if (!p5h || !PATTERN_IDS.includes(p5h.id)) {
      throw new Error(`parse: pattern5h.id must be one of ${PATTERN_IDS.join('|')}`)
    }
    if (!Array.isArray(p5h.verbs) || p5h.verbs.length === 0) {
      throw new Error('parse: pattern5h.verbs must be non-empty')
    }
    if (!CURATED_VERBS[p5h.id].includes(p5h.triggerVerb)) {
      throw new Error(`parse: triggerVerb '${p5h.triggerVerb}' not in curated verbs for ${p5h.id}`)
    }
  } else if (p.pattern5h !== null) {
    throw new Error('parse: pattern5h must be null when not a 5형식 moment')
  }

  // assembly.blocks — 2..3 (간결형 may be 2)
  const blocks = p.assembly?.blocks
  if (!Array.isArray(blocks) || blocks.length < 2 || blocks.length > 3) {
    throw new Error('parse: blocks must be 2..3')
  }
  const n = blocks.length
  const orders = blocks.map((b) => b.order).sort((a, b) => a - b)
  for (let i = 0; i < n; i++) {
    if (orders[i] !== i + 1) throw new Error('parse: block orders must be 1..N sequential')
  }
  if (new Set(blocks.map((b) => b.id)).size !== n) {
    throw new Error('parse: block ids must be unique')
  }

  // assembly.blockRoles
  if (!Array.isArray(p.assembly?.blockRoles) || p.assembly.blockRoles.length !== n) {
    throw new Error('parse: blockRoles length must equal blocks length')
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

  // structure.comparison (v9.1 reshape)
  const cmp = p.structure?.comparison
  if (typeof cmp?.show !== 'boolean') throw new Error('parse: comparison.show must be boolean')
  if (!cmp.fiveH?.en || !cmp.simpler?.en) {
    throw new Error('parse: comparison.fiveH.en and simpler.en required')
  }
  if (cmp.betterChoice !== 'fiveH' && cmp.betterChoice !== 'simpler') {
    throw new Error('parse: comparison.betterChoice must be fiveH|simpler')
  }
  if ((cmp.betterChoice === 'fiveH') !== moment) {
    throw new Error('parse: comparison.betterChoice must agree with recognition.isFiveHMoment')
  }

  // structure.patternQuiz (schema unchanged; dual semantics)
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

  // pattern — required iff moment; must be null otherwise
  if (moment) {
    if (
      !p.pattern?.template ||
      typeof p.pattern.template !== 'string' ||
      !Array.isArray(p.pattern?.tags)
    ) {
      throw new Error('parse: pattern incomplete')
    }
    if (p.pattern.patternId !== p.pattern5h!.id) {
      throw new Error('parse: pattern.patternId must equal pattern5h.id')
    }
  } else if (p.pattern !== null) {
    throw new Error('parse: pattern must be null when not a 5형식 moment')
  }
}
