import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import type { Firestore } from 'firebase/firestore'
import { createFirestoreDataStore } from '../store/firestoreDataStore'
import { migrateToCloud } from './migrateToCloud'
import type { DataStore } from '../store/dataStore'
import type { LearningRecord, Pattern } from '../types'
import { newCardDefaults } from './srs'

// Login data-flow smoke against the REAL Firestore emulator: the same path the manual
// Task 5.3 smoke checks (Firestore populated / local cleared / cross-device read / union
// merge), but exercising the actual shipped migrateToCloud + FirestoreDataStore. Gated on
// FIRESTORE_EMULATOR_HOST (set by `firebase emulators:exec`).
const RUN = Boolean(process.env.FIRESTORE_EMULATOR_HOST)

// In-memory stand-in for the local (localStorage) store, mirroring its dedup semantics.
function memStore(records: LearningRecord[] = [], patterns: Pattern[] = []): DataStore {
  let r = [...records]
  let p = [...patterns]
  return {
    async init() {},
    async getScenarios() { return [] },
    async getScenario() { return null },
    async getUnlearnedScenarios() { return [] },
    async saveScenarios() {},
    async saveLearningRecord(rec) { if (!r.find((x) => x.id === rec.id)) r.push(rec) },
    async getLearningRecords() { return r },
    async deleteLearningRecord(id) { r = r.filter((x) => x.id !== id) },
    async savePattern(pat) {
      const k = (x: Pattern) => `${x.patternId}__${x.triggerVerb}`
      const hit = p.find((x) => k(x) === k(pat))
      if (hit) hit.reviewCount += 1
      else p.push({ ...pat })
    },
    async getPatterns() { return p },
    async deletePattern(id) { p = p.filter((x) => x.id !== id) },
    async getPattern() { return null },
    async updatePatternSchedule() {},
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
  ...newCardDefaults(),
})

describe.skipIf(!RUN)('login data-flow (emulator): migrateToCloud + Firestore adapter', () => {
  let env: RulesTestEnvironment

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-eng-ception',
      firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    })
  })
  afterAll(async () => { await env.cleanup() })
  beforeEach(async () => { await env.clearFirestore() })

  const cloudFor = (uid: string) =>
    createFirestoreDataStore(env.authenticatedContext(uid).firestore() as unknown as Firestore, uid)

  it('uploads local union to Firestore, clears local, and a second device reads it back', async () => {
    const uid = 'smoke-user'
    const cloud = cloudFor(uid)
    const local = memStore([rec('r1')], [pat('p1', 'make')])

    await migrateToCloud(local, cloud)

    // (4) Firestore populated
    expect((await cloud.getLearningRecords()).map((x) => x.id)).toEqual(['r1'])
    expect((await cloud.getPatterns()).map((x) => x.triggerVerb)).toEqual(['make'])
    // (5) local cleared
    expect(await local.getLearningRecords()).toHaveLength(0)
    expect(await local.getPatterns()).toHaveLength(0)
    // (6/7) a fresh adapter for the same uid (another device / a reload) reads the synced data
    const device2 = cloudFor(uid)
    expect((await device2.getLearningRecords()).map((x) => x.id)).toEqual(['r1'])
    expect((await device2.getPatterns()).map((x) => x.triggerVerb)).toEqual(['make'])
  })

  it('merges into pre-existing cloud data non-destructively (union + dedup increment)', async () => {
    const uid = 'smoke-user2'
    const cloud = cloudFor(uid)
    // pre-existing cloud state from "another device"
    await cloud.saveLearningRecord(rec('r2'))
    await cloud.savePattern(pat('pX', 'make')) // same composite key the local pattern will have

    const local = memStore([rec('r1')], [pat('p1', 'make')])
    await migrateToCloud(local, cloud)

    expect((await cloud.getLearningRecords()).map((x) => x.id).sort()).toEqual(['r1', 'r2'])
    const patterns = await cloud.getPatterns()
    expect(patterns).toHaveLength(1) // deduped by composite key, not duplicated
    expect(patterns[0].reviewCount).toBe(1) // 0 on create + 1 from the merge
  })
})
