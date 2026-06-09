import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import type { Firestore } from 'firebase/firestore'
import { createFirestoreDataStore } from './firestoreDataStore'
import type { LearningRecord, Pattern } from '../types'
import { newCardDefaults } from '../services/srs'

// Gate on the host the emulator itself provides (set by `firebase emulators:exec` via
// auto-discovery), NOT a hand-set flag — so an accidental run without a live emulator
// skips cleanly instead of throwing "host and port ... must be specified".
const RUN = Boolean(process.env.FIRESTORE_EMULATOR_HOST)

const makeRecord = (over: Partial<LearningRecord> = {}): LearningRecord => ({
  id: 'r1', schemaVersion: 4, scenarioId: 's1', originalKorean: 'x',
  structureTypeId: 't', structureTypeLabel: 'T', pattern5hId: 'causative-bare',
  triggerVerb: 'make', finalSentence: 'I made him go.', precheckChoice: 'first',
  afterChoice: null, patternQuizCorrect: true, patternQuizUnsure: false,
  assemblyCorrect: true, completedAt: '2026-01-01T00:00:00Z', ...over,
})
const makePattern = (over: Partial<Pattern> = {}): Pattern => ({
  id: 'p1', template: 'I made him ~', patternId: 'causative-bare', triggerVerb: 'make',
  category: 'c', tags: [], exampleOriginal: 'x', exampleEnglish: 'y',
  savedAt: '2026-01-01T00:00:00Z', reviewCount: 0, lastReviewedAt: null,
  ...newCardDefaults(), ...over,
})

describe.skipIf(!RUN)('FirestoreDataStore (emulator)', () => {
  let env: RulesTestEnvironment

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-eng-ception',
      firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    })
  })
  afterAll(async () => { await env.cleanup() })
  beforeEach(async () => { await env.clearFirestore() })

  function storeFor(uid: string) {
    const ctx = env.authenticatedContext(uid)
    const fs = ctx.firestore() as unknown as Firestore
    return createFirestoreDataStore(fs, uid)
  }

  it('round-trips a learning record', async () => {
    const db = storeFor('u1')
    await db.saveLearningRecord(makeRecord())
    const all = await db.getLearningRecords()
    expect(all).toHaveLength(1)
    expect(all[0].pattern5hId).toBe('causative-bare')
  })

  it('dedups patterns by patternId+triggerVerb and increments reviewCount', async () => {
    const db = storeFor('u1')
    await db.savePattern(makePattern({ id: 'p1' }))
    await db.savePattern(makePattern({ id: 'p2' })) // same key
    const all = await db.getPatterns()
    expect(all).toHaveLength(1)
    expect(all[0].reviewCount).toBe(1) // 0 on create, +1 on second save
  })

  it('keeps distinct patterns for different trigger verbs', async () => {
    const db = storeFor('u1')
    await db.savePattern(makePattern({ id: 'p1', triggerVerb: 'make' }))
    await db.savePattern(makePattern({ id: 'p2', triggerVerb: 'let' }))
    expect(await db.getPatterns()).toHaveLength(2)
  })

  it('getUnlearnedScenarios excludes scenarios with a record', async () => {
    const db = storeFor('u1')
    const before = await db.getUnlearnedScenarios(100)
    await db.saveLearningRecord(makeRecord({ id: 'r1', scenarioId: before[0].id }))
    const after = await db.getUnlearnedScenarios(100)
    expect(after.find((s) => s.id === before[0].id)).toBeUndefined()
  })
})
