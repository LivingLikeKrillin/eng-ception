import { collection, doc, getDocs, setDoc, deleteDoc, type Firestore } from 'firebase/firestore'
import type { AnalyticsSink } from './analyticsSink'
import type { AnalyticsEvent } from '../types/events'

export function createFirestoreAnalyticsSink(fs: Firestore, uid: string): AnalyticsSink {
  const col = () => collection(fs, 'users', uid, 'events')
  return {
    track(event: AnalyticsEvent) {
      // fire-and-forget; telemetry must never break the learning flow
      void setDoc(doc(col(), event.id), event).catch(() => {})
    },
    async getAll() {
      try {
        const snap = await getDocs(col())
        return snap.docs.map((d) => d.data() as AnalyticsEvent)
      } catch {
        return []
      }
    },
    async clear() {
      try {
        const snap = await getDocs(col())
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
      } catch {
        // best-effort
      }
    },
  }
}
