import { useLearningStore } from '../store/learningStore'

// Tab-close / app-background drop-off. visibilitychange→hidden is the reliable signal on
// mobile PWAs (beforeunload is not). abandonIfActive's internal guard makes this a no-op
// when no session is active or one already ended.
export function registerAnalyticsLifecycle(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      useLearningStore.getState().abandonIfActive('hidden')
    }
  })
}
