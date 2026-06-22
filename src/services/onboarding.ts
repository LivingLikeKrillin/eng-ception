// First-run onboarding seen-flag. Device-local UI state (not synced to cloud) — best-effort
// localStorage, mirroring services/pwa/installPrompt.ts's dismiss persistence.
const ONBOARDED_KEY = 'engception:onboarded'

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1'
  } catch {
    return false
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDED_KEY, '1')
  } catch {
    /* best-effort */
  }
}
