import {
  fsrs, generatorParameters, createEmptyCard,
  State, type Card, type Grade as TsGrade,
} from 'ts-fsrs'
import type { Pattern, LearningRecord } from '../types'

// Our public grade is the same 1|2|3|4, but ts-fsrs's next() wants its own `Grade`
// type (= Exclude<Rating, Manual>). `grade as Rating` does NOT satisfy it — we cast to
// the imported TsGrade instead (see schedule()). Local name kept for our call sites.
export type Grade = 1 | 2 | 3 | 4
export type CardStateName = 'new' | 'learning' | 'review' | 'relearning'

export const REQUEST_RETENTION = 0.9
export const N_BYPASS = 3
// Expert E: 0.25-day first-interval seed for brand-new cards. Default OFF —
// enabling it is a future A/B arm (spec §4.2, §9). Kept as a flag for that.
export const INTRO_PHASE = false

const params = generatorParameters({
  request_retention: REQUEST_RETENTION,
  enable_fuzz: false,
  // Sessions are infrequent (not cramming) → schedule in days, skip minute-scale
  // learning steps. New → Review directly.
  enable_short_term: false,
})
const scheduler = fsrs(params)

// The persisted subset of a card's schedule (lives on Pattern). Input to schedule().
export interface CardSchedule {
  stability: number | null
  difficulty: number | null
  cardState: CardStateName
  reps: number
  lapses: number
  nextDueAt: string | null
  lastReviewedAt: string | null
}

// What schedule() returns — adds the computed nextDueAt + bumped counters/state.
// lastGrade is NOT owned here (the store sets it).
export interface NextSchedule {
  stability: number
  difficulty: number
  cardState: CardStateName
  reps: number
  lapses: number
  nextDueAt: string
  lastReviewedAt: string
}

export interface SrsFields {
  stability: number | null
  difficulty: number | null
  nextDueAt: string | null
  reps: number
  lapses: number
  bypassedCount: number
  cardState: CardStateName
  lastGrade: Grade | null
}

export function newCardDefaults(): SrsFields {
  return {
    stability: null, difficulty: null, nextDueAt: null,
    reps: 0, lapses: 0, bypassedCount: 0, cardState: 'new', lastGrade: null,
  }
}

// Backfill FSRS fields onto a Pattern that may predate schema v5 (or a desynced
// migration). Defaults spread FIRST so the card's own values win — only missing
// FSRS fields are filled. Shared by both adapters (localStorage + Firestore) so
// every read is self-defending, not reliant on a one-time init() migration.
export const withSrsDefaults = (p: Pattern): Pattern => ({ ...newCardDefaults(), ...p })

// v6 (v9.1): records gained isFiveHMoment. Pre-v6 records were all 5형식 → default true.
// Defaults spread FIRST so the record's own value wins when present. Shared by both adapters.
const RECORD_DEFAULTS = { isFiveHMoment: true } as const
export const withRecordDefaults = (r: LearningRecord): LearningRecord => ({ ...RECORD_DEFAULTS, ...r })

const STATE_TO_TS: Record<CardStateName, State> = {
  new: State.New, learning: State.Learning, review: State.Review, relearning: State.Relearning,
}
const TS_TO_STATE: Record<State, CardStateName> = {
  [State.New]: 'new', [State.Learning]: 'learning',
  [State.Review]: 'review', [State.Relearning]: 'relearning',
}

function toTsCard(prev: CardSchedule | null, now: Date): Card {
  // New-card path: ignore elapsed; ts-fsrs derives initial S/D from the grade.
  if (!prev || prev.cardState === 'new' || prev.stability == null || prev.difficulty == null) {
    return createEmptyCard(now)
  }
  const last = prev.lastReviewedAt ? new Date(prev.lastReviewedAt) : now
  const elapsedDays = Math.max(0, (now.getTime() - last.getTime()) / 86_400_000)
  return {
    due: prev.nextDueAt ? new Date(prev.nextDueAt) : now,
    stability: prev.stability,
    difficulty: prev.difficulty,
    elapsed_days: elapsedDays,
    scheduled_days: 0,
    reps: prev.reps,
    lapses: prev.lapses,
    learning_steps: 0,
    state: STATE_TO_TS[prev.cardState],
    last_review: last,
  }
}

export function schedule(prev: CardSchedule | null, grade: Grade, now: Date): NextSchedule {
  const card = toTsCard(prev, now)
  const { card: next } = scheduler.next(card, now, grade as TsGrade)
  let nextDueAt = next.due
  const wasNew = !prev || prev.cardState === 'new'
  if (INTRO_PHASE && wasNew && grade !== 1) {
    nextDueAt = new Date(now.getTime() + 6 * 3_600_000) // 0.25 day
  }
  return {
    stability: next.stability,
    difficulty: next.difficulty,
    cardState: TS_TO_STATE[next.state],
    reps: next.reps,
    lapses: next.lapses,
    nextDueAt: nextDueAt.toISOString(),
    lastReviewedAt: now.toISOString(),
  }
}

export function gradeFromSignals(s: {
  assemblyCorrect: boolean
  patternQuizCorrect: boolean
  patternQuizUnsure: boolean
}): Grade {
  const recog: 'wrong' | 'hint' | 'cold' =
    !s.patternQuizCorrect ? 'wrong' : s.patternQuizUnsure ? 'hint' : 'cold'
  if (s.assemblyCorrect) {
    if (recog === 'cold') return 4
    if (recog === 'hint') return 3
    return 2 // recog wrong but produced it — shaky
  }
  if (recog === 'wrong') return 1 // total miss
  return 2 // knew the verb, fumbled production
}
