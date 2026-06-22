import type { AnalyticsSink } from './analyticsSink'
import type { AnalyticsEvent } from '../types/events'

const EVENTS_KEY = 'engception:events'
const EVENTS_VERSION_KEY = 'engception:events-version'
const CURRENT_EVENTS_VERSION = 1
const MAX_EVENTS = 1000

function read(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : []
  } catch {
    return []
  }
}

// localStorage ring buffer. Telemetry is disposable: a future version bump clears the
// buffer (no migration), mirroring DataStore.init()'s discard-on-mismatch.
export const localAnalyticsSink: AnalyticsSink = {
  track(event) {
    try {
      if (localStorage.getItem(EVENTS_VERSION_KEY) !== String(CURRENT_EVENTS_VERSION)) {
        localStorage.removeItem(EVENTS_KEY)
        localStorage.setItem(EVENTS_VERSION_KEY, String(CURRENT_EVENTS_VERSION))
      }
      const events = read()
      events.push(event)
      if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
      localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
    } catch {
      // telemetry must never break the app (quota exceeded, serialization)
    }
  },

  async getAll() {
    return read()
  },

  async clear() {
    try {
      localStorage.removeItem(EVENTS_KEY)
    } catch {
      // ignore
    }
  },
}
