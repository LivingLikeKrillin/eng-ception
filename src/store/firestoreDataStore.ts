import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  increment,
  type Firestore,
} from 'firebase/firestore'
import type { DataStore } from './dataStore'
import type { LearningRecord, Pattern } from '../types'
import { seedScenarios } from '../data/seed-scenarios'
import { withSrsDefaults } from '../services/srs'

const patternKey = (patternId: string, triggerVerb: string) => `${patternId}__${triggerVerb}`

export function createFirestoreDataStore(fs: Firestore, uid: string): DataStore {
  const recordsCol = () => collection(fs, 'users', uid, 'records')
  const patternsCol = () => collection(fs, 'users', uid, 'patterns')

  const store: DataStore = {
    async init() {
      // No migration step for Firestore (cloud has no local schema-version concept).
    },

    // Scenarios: identical bundled seed for everyone — never persisted per user.
    async getScenarios() {
      return seedScenarios
    },
    async getScenario(id) {
      return seedScenarios.find((s) => s.id === id) ?? null
    },
    async getUnlearnedScenarios(limit) {
      const records = await store.getLearningRecords()
      const learned = new Set(records.map((r) => r.scenarioId))
      return seedScenarios.filter((s) => !learned.has(s.id)).slice(0, limit)
    },
    async saveScenarios() {
      // no-op: bundled, not persisted
    },

    async saveLearningRecord(record) {
      await setDoc(doc(recordsCol(), record.id), record)
    },
    async getLearningRecords() {
      const snap = await getDocs(recordsCol())
      return snap.docs.map((d) => d.data() as LearningRecord)
    },
    async deleteLearningRecord(id) {
      await deleteDoc(doc(recordsCol(), id))
    },

    async savePattern(pattern) {
      // read-then-write is non-atomic, but savePattern fires once per session at step3
      // (serialized behind the user flow), so concurrent same-key writes don't occur.
      // We avoid runTransaction deliberately: it needs a server round-trip and rejects
      // offline, whereas getDoc(cache) + setDoc(increment) queues offline.
      const ref = doc(patternsCol(), patternKey(pattern.patternId, pattern.triggerVerb))
      const existing = await getDoc(ref) // served from cache when offline
      if (existing.exists()) {
        await setDoc(
          ref,
          { reviewCount: increment(1), lastReviewedAt: new Date().toISOString() },
          { merge: true },
        )
      } else {
        await setDoc(ref, pattern)
      }
    },
    async getPatterns() {
      const snap = await getDocs(patternsCol())
      return snap.docs.map((d) => withSrsDefaults(d.data() as Pattern))
    },
    async deletePattern(id) {
      // interface deletes by Pattern.id (a uuid), not the composite doc key, so scan +
      // match. Bounded by the curated taxonomy (~7 patterns × 17 verbs) and a rare action.
      const snap = await getDocs(patternsCol())
      const match = snap.docs.find((d) => (d.data() as Pattern).id === id)
      if (match) await deleteDoc(match.ref)
    },

    async getPattern(patternId, triggerVerb) {
      const ref = doc(patternsCol(), patternKey(patternId, triggerVerb))
      const snap = await getDoc(ref) // served from cache when offline
      return snap.exists() ? withSrsDefaults(snap.data() as Pattern) : null
    },

    async updatePatternSchedule(patternId, triggerVerb, partial) {
      const ref = doc(patternsCol(), patternKey(patternId, triggerVerb))
      await setDoc(ref, partial, { merge: true }) // queues offline like the increment path
    },
  }

  return store
}
