import type { Scenario, LearningRecord, Pattern, Capture } from '../types'

export interface DataStore {
  init(): Promise<void>
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
  getPattern(patternId: string, triggerVerb: string): Promise<Pattern | null>
  updatePatternSchedule(patternId: string, triggerVerb: string, partial: Partial<Pattern>): Promise<void>
  saveCapture(capture: Capture): Promise<void>
  getCaptures(): Promise<Capture[]>
  deleteCapture(id: string): Promise<void>
}
