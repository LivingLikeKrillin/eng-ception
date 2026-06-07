import type { AnalyticsEvent, EventName } from '../types/events'
import { noopAnalyticsSink, type AnalyticsSink } from '../store/analyticsSink'

declare global {
  // Dev egress handle. `var` is required for a global augmentation (let/const don't work
  // here); eslint's no-var rule is NOT enabled in this repo's config, so no disable needed.
  var __engEvents: (() => Promise<AnalyticsEvent[]>) | undefined
}

// Default to noop; main.tsx bootstrap swaps in the local sink (so tests stay event-free).
let activeSink: AnalyticsSink = noopAnalyticsSink

export function setSink(sink: AnalyticsSink): void {
  activeSink = sink
}

// Caller passes sessionId (the store reads get().sessionId) — keeps this facade
// store-agnostic, avoiding a learningStore <-> analytics import cycle.
export function track(name: EventName, props: AnalyticsEvent['props'], sessionId: string): void {
  try {
    activeSink.track({
      id: crypto.randomUUID(),
      name,
      ts: new Date().toISOString(),
      sessionId,
      props,
    })
  } catch {
    // analytics must never throw into the learning flow
  }
}

export function getEvents(): Promise<AnalyticsEvent[]> {
  return activeSink.getAll()
}

// DEV-only debug egress; called from bootstrap under import.meta.env.DEV.
// Targets globalThis (NOT window): the vitest env is 'node' (no `window`), and in the
// browser globalThis === window, so devs still call `window.__engEvents()` in the console.
export function installDevEgress(): void {
  globalThis.__engEvents = () => activeSink.getAll()
}
