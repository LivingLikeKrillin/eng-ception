import type { Pattern } from '../types'
import type { Pattern5HId } from '../types/v9'
import { N_BYPASS } from './srs'

const MATURE_STABILITY_DAYS = 21 // 숙련 cutoff (provisional; data-gated tuning, spec §9)

export function isDue(card: Pattern, now: Date): boolean {
  return card.nextDueAt == null || new Date(card.nextDueAt).getTime() <= now.getTime()
}

// overdue magnitude in ms; unscheduled (null) = maximally overdue. Use a finite
// sentinel (NOT Infinity) so two unscheduled cards subtract to 0, not NaN — a NaN
// comparator gives undefined/unstable sort order.
const MAX_OVERDUE = Number.MAX_SAFE_INTEGER
function overdueMs(card: Pattern, now: Date): number {
  if (card.nextDueAt == null) return MAX_OVERDUE
  return now.getTime() - new Date(card.nextDueAt).getTime()
}

export function dueQueue(cards: Pattern[], now: Date): Pattern[] {
  return cards
    .filter((c) => isDue(c, now))
    .sort((a, b) => {
      const aEsc = a.bypassedCount >= N_BYPASS ? 1 : 0
      const bEsc = b.bypassedCount >= N_BYPASS ? 1 : 0
      if (aEsc !== bEsc) return bEsc - aEsc                  // escalated first
      const od = overdueMs(b, now) - overdueMs(a, now)        // most overdue first
      if (od !== 0) return od
      // null-safe: withSrsDefaults backfills FSRS fields but NOT savedAt, so a card
      // missing it must not throw and kill the whole Review render.
      return (a.savedAt ?? '').localeCompare(b.savedAt ?? '') // stable tiebreak: older first
    })
}

// Nearest FUTURE nextDueAt among scheduled cards. null = no future due (all due-now or
// unscheduled). Exact-`now` boundary is excluded (treated as due-now), consistent with isDue's `<=`.
export function nextDueDate(cards: Pattern[], now: Date): Date | null {
  let min: number | null = null
  for (const c of cards) {
    if (c.nextDueAt == null) continue
    const t = new Date(c.nextDueAt).getTime()
    if (t > now.getTime() && (min === null || t < min)) min = t
  }
  return min === null ? null : new Date(min)
}

export type MasteryLabel = '새내기' | '학습중' | '숙련'

export function masteryLabel(card: Pattern): MasteryLabel {
  if (card.reps === 0) return '새내기'
  if (card.stability != null && card.stability >= MATURE_STABILITY_DAYS) return '숙련'
  return '학습중'
}

export interface PatternRollup {
  id: Pattern5HId
  cards: Pattern[]
  dueCount: number
  escalatedCount: number
}

export function rollupByPattern(cards: Pattern[], now: Date): PatternRollup[] {
  const byId = new Map<Pattern5HId, Pattern[]>()
  for (const c of cards) {
    const arr = byId.get(c.patternId) ?? []
    arr.push(c)
    byId.set(c.patternId, arr)
  }
  return Array.from(byId.entries()).map(([id, group]) => ({
    id,
    cards: group,
    dueCount: group.filter((c) => isDue(c, now)).length,
    escalatedCount: group.filter((c) => c.bypassedCount >= N_BYPASS).length,
  }))
}
