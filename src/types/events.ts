// === Event tracking envelope (telemetry; content-free, PIPA-safe) ===
export type EventName =
  | 'session_start'
  | 'session_complete'
  | 'session_abandon'
  | 'step_dwell'
  | 'fetch_start'
  | 'fetch_success'
  | 'fetch_error'

export interface AnalyticsEvent {
  id: string            // crypto.randomUUID()
  name: EventName
  ts: string            // ISO-8601 (new Date().toISOString())
  sessionId: string     // per-learning-session uuid — correlates all events in one session
  props: Record<string, string | number | boolean | null>
}
