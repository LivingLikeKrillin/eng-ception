import type { DataStore } from './dataStore'
import type { Scenario, LearningRecord, Pattern } from '../types'

const KEYS = {
  scenarios: 'eng-ception:scenarios',
  records: 'eng-ception:records',
  patterns: 'eng-ception:patterns',
} as const

const SCHEMA_VERSION_KEY = 'eng-ception:schema-version'
const CURRENT_SCHEMA_VERSION = 3

const MAX_RECORDS = 100

function getItem<T>(key: string): T[] {
  const raw = localStorage.getItem(key)
  return raw ? JSON.parse(raw) : []
}

function setItem<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data))
}

export const localStorageAdapter: DataStore = {
  async init() {
    const stored = localStorage.getItem(SCHEMA_VERSION_KEY)
    if (stored !== String(CURRENT_SCHEMA_VERSION)) {
      localStorage.removeItem(KEYS.records)
      localStorage.removeItem(KEYS.patterns)
      localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION))
    }
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
    patterns.push(pattern)
    setItem(KEYS.patterns, patterns)
  },

  async getPatterns() {
    return getItem<Pattern>(KEYS.patterns)
  },

  async deletePattern(id) {
    const patterns = getItem<Pattern>(KEYS.patterns)
    setItem(KEYS.patterns, patterns.filter((p) => p.id !== id))
  },
}
