import type { Scenario, LearningRecord, Pattern } from '../types'

export interface DataStore {
  getScenarios(): Promise<Scenario[]>
  getScenario(id: string): Promise<Scenario | null>
  getUnlearnedScenarios(limit: number): Promise<Scenario[]>
  saveScenarios(scenarios: Scenario[]): Promise<void>
  saveLearningRecord(record: LearningRecord): Promise<void>
  getLearningRecords(): Promise<LearningRecord[]>
  deleteLearningRecord(id: string): Promise<void>
  savePattern(pattern: Pattern): Promise<void>
  getPatterns(): Promise<Pattern[]>
  deletePattern(id: string): Promise<void>
}
