import type { LearningRecord, Pattern, Scenario } from '../types'
import { masteryLabel } from './srsView'

// Local-calendar day key 'YYYY-MM-DD' from an ISO timestamp.
export function localDayKey(iso: string): string {
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const dayKeyOf = (d: Date): string => localDayKey(d.toISOString())
const prevDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
const midnight = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate())

// Consecutive local-days with >=1 completed session, ending today or (grace) yesterday.
// Day stepping uses local calendar dates (not ms subtraction) so DST can't drop/double a day.
export function computeStreak(records: LearningRecord[], now: Date): number {
  if (records.length === 0) return 0
  const active = new Set(records.map((r) => localDayKey(r.completedAt)))
  let cursor: Date
  if (active.has(dayKeyOf(now))) cursor = midnight(now)
  else if (active.has(dayKeyOf(prevDay(now)))) cursor = prevDay(now)
  else return 0

  let streak = 0
  while (active.has(dayKeyOf(cursor))) {
    streak++
    cursor = prevDay(cursor)
  }
  return streak
}

export function completedTodayCount(records: LearningRecord[], now: Date): number {
  const today = dayKeyOf(now)
  return records.filter((r) => localDayKey(r.completedAt) === today).length
}

export interface MasterySummary {
  circuits: number
  mastered: number
  learning: number // reserved (not surfaced in sub-project A)
  fresh: number    // reserved
}

export function masterySummary(cards: Pattern[]): MasterySummary {
  let mastered = 0, learning = 0, fresh = 0
  for (const c of cards) {
    const label = masteryLabel(c)
    if (label === '숙련') mastered++
    else if (label === '학습중') learning++
    else fresh++
  }
  return { circuits: cards.length, mastered, learning, fresh }
}

// Unlearned first; if short, backfill with learned scenarios, least-recently-practiced
// first (max completedAt per scenarioId). Deterministic (ties keep scenarios order).
export function pickScenariosForHome(
  scenarios: Scenario[], records: LearningRecord[], limit: number,
): Scenario[] {
  const learnedIds = new Set(
    records.map((r) => r.scenarioId).filter((id): id is string => id != null),
  )
  const unlearned = scenarios.filter((s) => !learnedIds.has(s.id))
  if (unlearned.length >= limit) return unlearned.slice(0, limit)

  const latest = new Map<string, string>()
  for (const r of records) {
    if (r.scenarioId == null) continue
    const prev = latest.get(r.scenarioId)
    if (prev == null || r.completedAt > prev) latest.set(r.scenarioId, r.completedAt)
  }
  const learned = scenarios
    .filter((s) => learnedIds.has(s.id))
    .sort((a, b) => (latest.get(a.id) ?? '').localeCompare(latest.get(b.id) ?? ''))

  return [...unlearned, ...learned].slice(0, limit)
}

export function formatRelativeDay(target: Date, now: Date): string {
  const diff = Math.round((midnight(target).getTime() - midnight(now).getTime()) / 86_400_000)
  if (diff <= 0) return '오늘'
  if (diff === 1) return '내일'
  return `${diff}일 후`
}
