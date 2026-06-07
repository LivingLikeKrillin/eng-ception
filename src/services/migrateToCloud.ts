import type { DataStore } from '../store/dataStore'

// Non-destructive union upload of the local working store into the cloud store, then
// clear local — but ONLY after every cloud write resolves (offline: durably queued in
// the Firestore cache). If any write rejects, throw and leave local intact (no partial
// loss). Idempotent across repeat logins (records by id, patterns by composite key).
export async function migrateToCloud(local: DataStore, cloud: DataStore): Promise<void> {
  const [records, patterns] = await Promise.all([
    local.getLearningRecords(),
    local.getPatterns(),
  ])

  await Promise.all([
    ...records.map((r) => cloud.saveLearningRecord(r)),
    ...patterns.map((p) => cloud.savePattern(p)),
  ])

  // reached only if all writes above resolved
  await Promise.all([
    ...records.map((r) => local.deleteLearningRecord(r.id)),
    ...patterns.map((p) => local.deletePattern(p.id)),
  ])
}
