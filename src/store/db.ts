import type { DataStore } from './dataStore'
import { localStorageAdapter } from './localStorage'

// Single switchable seam for persistence — parallel to services/analytics.ts setSink().
// The 7 consumers import { db } from here; auth state swaps the backing adapter in one place.
let activeAdapter: DataStore = localStorageAdapter

export function setDbAdapter(adapter: DataStore): void {
  activeAdapter = adapter
}

export function getDbAdapter(): DataStore {
  return activeAdapter
}

// Stable facade: every method re-reads activeAdapter at call-time, so a swap is seen
// immediately by all holders of `db` without re-importing.
export const db: DataStore = {
  init: () => activeAdapter.init(),
  getScenarios: () => activeAdapter.getScenarios(),
  getScenario: (id) => activeAdapter.getScenario(id),
  getUnlearnedScenarios: (limit) => activeAdapter.getUnlearnedScenarios(limit),
  saveScenarios: (s) => activeAdapter.saveScenarios(s),
  saveLearningRecord: (r) => activeAdapter.saveLearningRecord(r),
  getLearningRecords: () => activeAdapter.getLearningRecords(),
  deleteLearningRecord: (id) => activeAdapter.deleteLearningRecord(id),
  savePattern: (p) => activeAdapter.savePattern(p),
  getPatterns: () => activeAdapter.getPatterns(),
  deletePattern: (id) => activeAdapter.deletePattern(id),
  getPattern: (patternId, triggerVerb) => activeAdapter.getPattern(patternId, triggerVerb),
  updatePatternSchedule: (patternId, triggerVerb, partial) =>
    activeAdapter.updatePatternSchedule(patternId, triggerVerb, partial),
  saveCapture: (c) => activeAdapter.saveCapture(c),
  getCaptures: () => activeAdapter.getCaptures(),
  deleteCapture: (id) => activeAdapter.deleteCapture(id),
}
