import type { V9Step } from '../types/v9'

export interface LearnRoute {
  id: string | undefined // route param (:id), 'custom', or undefined
  isCustom: boolean
  passedInput: string // location.state.input ?? ''
}

export interface SessionSnapshot {
  currentStep: V9Step
  scenarioId: string | null // store.scenario?.id ?? null
  isCustomInput: boolean
  originalKorean: string
}

/**
 * Decide what the Learn page must (re)start for the current route, given the
 * global (and possibly stale) session in the store.
 *
 * The previous guard only checked `currentStep === 'input'`. Because the session
 * store is global and survives navigation, tapping a NEW scenario while a prior
 * session was still in flight left the old session on screen (every Home example
 * showed whatever was started first). This compares the route against the session
 * actually running: restart on a mismatch, preserve an in-progress match.
 */
export function sessionToBootstrap(
  route: LearnRoute,
  store: SessionSnapshot,
): 'scenario' | 'custom' | 'none' {
  const idle = store.currentStep === 'input'

  if (!route.isCustom && route.id) {
    const alreadyRunningThis = !idle && store.scenarioId === route.id
    return alreadyRunningThis ? 'none' : 'scenario'
  }

  const input = route.passedInput.trim()
  if (route.isCustom && input) {
    const alreadyRunningThis =
      !idle && store.isCustomInput && store.originalKorean === input
    return alreadyRunningThis ? 'none' : 'custom'
  }

  return 'none'
}
