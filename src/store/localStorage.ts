import type { DataStore } from './dataStore'
import type { Scenario, LearningRecord, Pattern } from '../types'
import { withSrsDefaults } from '../services/srs'

const SCHEMA_VERSION_KEY = 'eng-ception:schema-version'
const CURRENT_SCHEMA_VERSION = 5

const KEYS = {
  scenarios: 'eng-ception:scenarios',
  records: 'eng-ception:records',
  patterns: 'eng-ception:patterns',
} as const

const MAX_RECORDS = 100

// Corrupt JSON (a truncated write after a prior quota failure, tampering) must not
// throw — init() runs in the boot path before React renders, so an unguarded
// JSON.parse here would blank the whole app. Treat a malformed key as empty and
// drop it so the next write starts clean.
function getItem<T>(key: string): T[] {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
    return []
  }
}

// localStorage.setItem throws (QuotaExceededError) when full. Swallow it at the
// adapter boundary: persistence degrades to in-memory for the session rather than
// crashing the write path (and any caller awaiting it). Returns whether it stuck.
function setItem<T>(key: string, data: T[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export const localStorageAdapter: DataStore = {
  async init() {
    const stored = localStorage.getItem(SCHEMA_VERSION_KEY)
    if (stored === String(CURRENT_SCHEMA_VERSION)) return

    if (stored === '4') {
      // Non-destructive v4 -> v5: backfill FSRS defaults onto existing patterns, keep records.
      setItem(KEYS.patterns, getItem<Pattern>(KEYS.patterns).map(withSrsDefaults))
      localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION))
      return
    }

    // Legacy (<=3) or unknown: clear records + patterns, set current version.
    localStorage.removeItem('eng-ception:records')
    localStorage.removeItem('eng-ception:patterns')
    localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION))
  },

  async getScenarios() {
    return getItem<Scenario>(KEYS.scenarios)
  },

  async getScenario(id) {
    const all = getItem<Scenario>(KEYS.scenarios)
    return all.find((s) => s.id === id) ?? null
  },

  async getUnlearnedScenarios(limit) {
    const scenarios = getItem<Scenario>(KEYS.scenarios)
    const records = getItem<LearningRecord>(KEYS.records)
    const learnedIds = new Set(records.map((r) => r.scenarioId))
    return scenarios.filter((s) => !learnedIds.has(s.id)).slice(0, limit)
  },

  async saveScenarios(scenarios) {
    const existing = getItem<Scenario>(KEYS.scenarios)
    const existingIds = new Set(existing.map((s) => s.id))
    const newOnes = scenarios.filter((s) => !existingIds.has(s.id))
    setItem(KEYS.scenarios, [...existing, ...newOnes])
  },

  async saveLearningRecord(record) {
    const records = getItem<LearningRecord>(KEYS.records)
    records.push(record)
    if (records.length > MAX_RECORDS) {
      records.splice(0, records.length - MAX_RECORDS)
    }
    setItem(KEYS.records, records)
  },

  async getLearningRecords() {
    return getItem<LearningRecord>(KEYS.records)
  },

  async deleteLearningRecord(id) {
    const records = getItem<LearningRecord>(KEYS.records)
    setItem(KEYS.records, records.filter((r) => r.id !== id))
  },

  async savePattern(pattern) {
    const patterns = getItem<Pattern>(KEYS.patterns)
    const existing = patterns.find(
      (p) => p.patternId === pattern.patternId && p.triggerVerb === pattern.triggerVerb,
    )
    if (existing) {
      existing.reviewCount += 1
      existing.lastReviewedAt = new Date().toISOString()
      setItem(KEYS.patterns, patterns)
      return
    }
    patterns.push(pattern)
    setItem(KEYS.patterns, patterns)
  },

  async getPatterns() {
    // Self-defend with FSRS defaults (parity with the Firestore adapter) so a card
    // that slipped past the init() migration never yields undefined counters → NaN
    // in complete()'s bypass loop / dueQueue.
    return getItem<Pattern>(KEYS.patterns).map(withSrsDefaults)
  },

  async deletePattern(id) {
    const patterns = getItem<Pattern>(KEYS.patterns)
    setItem(KEYS.patterns, patterns.filter((p) => p.id !== id))
  },

  async getPattern(patternId, triggerVerb) {
    const patterns = getItem<Pattern>(KEYS.patterns)
    const card = patterns.find((p) => p.patternId === patternId && p.triggerVerb === triggerVerb)
    return card ? withSrsDefaults(card) : null
  },

  async updatePatternSchedule(patternId, triggerVerb, partial) {
    const patterns = getItem<Pattern>(KEYS.patterns)
    const card = patterns.find((p) => p.patternId === patternId && p.triggerVerb === triggerVerb)
    if (!card) return
    Object.assign(card, partial)
    setItem(KEYS.patterns, patterns)
  },
}
