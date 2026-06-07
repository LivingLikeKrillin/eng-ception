import { describe, it, expect } from 'vitest'
import { migrateToCloud } from './migrateToCloud'
import type { DataStore } from '../store/dataStore'
import type { LearningRecord, Pattern } from '../types'

function memStore(seedRecords: LearningRecord[] = [], seedPatterns: Pattern[] = []): DataStore {
  let records = [...seedRecords]
  let patterns = [...seedPatterns]
  return {
    async init() {},
    async getScenarios() { return [] },
    async getScenario() { return null },
    async getUnlearnedScenarios() { return [] },
    async saveScenarios() {},
    async saveLearningRecord(r) { if (!records.find((x) => x.id === r.id)) records.push(r) },
    async getLearningRecords() { return records },
    async deleteLearningRecord(id) { records = records.filter((r) => r.id !== id) },
    async savePattern(p) {
      const k = (x: Pattern) => `${x.patternId}__${x.triggerVerb}`
      const hit = patterns.find((x) => k(x) === k(p))
      if (hit) hit.reviewCount += 1
      else patterns.push({ ...p })
    },
    async getPatterns() { return patterns },
    async deletePattern(id) { patterns = patterns.filter((p) => p.id !== id) },
  }
}
const rec = (id: string): LearningRecord => ({
  id, schemaVersion: 4, scenarioId: null, originalKorean: 'x', structureTypeId: 't',
  structureTypeLabel: 'T', pattern5hId: 'causative-bare', triggerVerb: 'make',
  finalSentence: 's', precheckChoice: null, afterChoice: null, patternQuizCorrect: true,
  patternQuizUnsure: false, assemblyCorrect: true, completedAt: '2026-01-01T00:00:00Z',
})
const pat = (id: string, verb: string): Pattern => ({
  id, template: 't', patternId: 'causative-bare', triggerVerb: verb, category: 'c',
  tags: [], exampleOriginal: 'x', exampleEnglish: 'y', savedAt: '2026-01-01T00:00:00Z',
  reviewCount: 0, lastReviewedAt: null,
})

describe('migrateToCloud', () => {
  it('unions local into cloud non-destructively and clears local on success', async () => {
    const local = memStore([rec('r1')], [pat('p1', 'make')])
    const cloud = memStore([rec('r2')], [pat('p2', 'let')])
    await migrateToCloud(local, cloud)
    expect((await cloud.getLearningRecords()).map((r) => r.id).sort()).toEqual(['r1', 'r2'])
    expect((await cloud.getPatterns()).map((p) => p.triggerVerb).sort()).toEqual(['let', 'make'])
    expect(await local.getLearningRecords()).toHaveLength(0)
    expect(await local.getPatterns()).toHaveLength(0)
  })

  it('increments reviewCount when a pattern already exists in cloud', async () => {
    const local = memStore([], [pat('p1', 'make')])
    const cloud = memStore([], [pat('p2', 'make')]) // same key
    await migrateToCloud(local, cloud)
    const cp = await cloud.getPatterns()
    expect(cp).toHaveLength(1)
    expect(cp[0].reviewCount).toBe(1)
  })

  it('does NOT clear local if a cloud write rejects', async () => {
    const local = memStore([rec('r1')], [])
    const cloud = memStore()
    cloud.saveLearningRecord = async () => { throw new Error('permission-denied') }
    await expect(migrateToCloud(local, cloud)).rejects.toThrow()
    expect(await local.getLearningRecords()).toHaveLength(1) // intact
  })
})
