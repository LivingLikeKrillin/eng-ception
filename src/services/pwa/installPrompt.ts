// beforeinstallprompt isn't in every TS lib.dom — declare the shape we use.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'eng-ception:install-dismissed'

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

// Called once from main.tsx bootstrap. Self-guards the node/test env.
export function registerInstallPrompt(): void {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // suppress the mini-infobar; we drive our own UI
    deferred = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    // Persist dismissal too: once installed, never resurface the banner (even if a
    // future change re-derives canInstall). Belt-and-suspenders with the canInstall gate.
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* best-effort */ }
    notify()
  })
}

export function subscribeInstall(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

function readDismissed(): boolean {
  try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mm = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean })?.standalone === true
  return Boolean(mm || iosStandalone)
}

function detectIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIos = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
  return isIos && isSafari
}

export interface InstallState {
  canInstall: boolean
  isStandalone: boolean
  isIosSafari: boolean
  dismissed: boolean
}

export function getInstallState(): InstallState {
  const isStandalone = detectStandalone()
  return {
    canInstall: deferred !== null,
    isStandalone,
    isIosSafari: !isStandalone && detectIosSafari(),
    dismissed: readDismissed(),
  }
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable'
  const evt = deferred
  deferred = null
  notify()
  try {
    await evt.prompt()
    const { outcome } = await evt.userChoice
    return outcome
  } catch {
    return 'unavailable'
  }
}

export function dismissInstall(): void {
  try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* best-effort */ }
  notify()
}
