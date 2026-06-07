import type { AnalyticsEvent } from '../types/events'

// Persistence seam for telemetry — parallel to DataStore. A FirestoreAnalyticsSink /
// PostHogAnalyticsSink slots in here later; track() must never throw into the caller.
export interface AnalyticsSink {
  track(event: AnalyticsEvent): void
  getAll(): Promise<AnalyticsEvent[]>
  clear(): Promise<void>
}

export const noopAnalyticsSink: AnalyticsSink = {
  track() {},
  async getAll() { return [] },
  async clear() {},
}

// In-memory recorder for tests and dev. Exposes `events` for synchronous assertions.
export class MemoryAnalyticsSink implements AnalyticsSink {
  events: AnalyticsEvent[] = []
  track(event: AnalyticsEvent) { this.events.push(event) }
  async getAll() { return this.events }
  async clear() { this.events = [] }
}
