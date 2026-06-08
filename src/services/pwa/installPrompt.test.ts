import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

type Handler = (e: unknown) => void

function installFakeEnv() {
  const handlers: Record<string, Handler[]> = {}
  const store = new Map<string, string>()
  const fakeWindow = {
    addEventListener: (type: string, cb: Handler) => {
      ;(handlers[type] ??= []).push(cb)
    },
    matchMedia: () => ({ matches: false }),
    navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120', standalone: undefined },
  }
  vi.stubGlobal('window', fakeWindow)
  vi.stubGlobal('navigator', fakeWindow.navigator)
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  })
  const fire = (type: string, e: unknown) => (handlers[type] ?? []).forEach((h) => h(e))
  return { fire }
}

describe('installPrompt', () => {
  let fire: (type: string, e: unknown) => void
  beforeEach(() => {
    vi.resetModules()
    ;({ fire } = installFakeEnv())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('captures beforeinstallprompt → canInstall true; promptInstall returns the outcome and clears it', async () => {
    const m = await import('./installPrompt')
    m.registerInstallPrompt()
    expect(m.getInstallState().canInstall).toBe(false)

    let prevented = false
    const evt = {
      preventDefault: () => { prevented = true },
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    }
    fire('beforeinstallprompt', evt)
    expect(prevented).toBe(true)
    expect(m.getInstallState().canInstall).toBe(true)

    const outcome = await m.promptInstall()
    expect(outcome).toBe('accepted')
    expect(m.getInstallState().canInstall).toBe(false)
  })

  it('promptInstall returns "unavailable" with no captured event', async () => {
    const m = await import('./installPrompt')
    expect(await m.promptInstall()).toBe('unavailable')
  })

  it('dismissInstall persists and flips dismissed', async () => {
    const m = await import('./installPrompt')
    expect(m.getInstallState().dismissed).toBe(false)
    m.dismissInstall()
    expect(m.getInstallState().dismissed).toBe(true)
  })

  it('subscribeInstall fires on capture and unsubscribes', async () => {
    const m = await import('./installPrompt')
    m.registerInstallPrompt()
    const cb = vi.fn()
    const off = m.subscribeInstall(cb)
    fire('beforeinstallprompt', { preventDefault() {}, prompt: async () => {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) })
    expect(cb).toHaveBeenCalledTimes(1)
    off()
    fire('appinstalled', {})
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('appinstalled clears canInstall and persists dismissal (never resurfaces)', async () => {
    const m = await import('./installPrompt')
    m.registerInstallPrompt()
    fire('beforeinstallprompt', { preventDefault() {}, prompt: async () => {}, userChoice: Promise.resolve({ outcome: 'accepted' }) })
    expect(m.getInstallState().canInstall).toBe(true)
    fire('appinstalled', {})
    const s = m.getInstallState()
    expect(s.canInstall).toBe(false)
    expect(s.dismissed).toBe(true)
  })

  it('detects iOS Safari (no beforeinstallprompt path)', async () => {
    vi.unstubAllGlobals()
    const store = new Map<string, string>()
    const nav = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Version/17.0 Mobile Safari/604', standalone: false }
    vi.stubGlobal('window', { addEventListener() {}, matchMedia: () => ({ matches: false }), navigator: nav })
    vi.stubGlobal('navigator', nav)
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: () => {} })
    const m = await import('./installPrompt')
    const s = m.getInstallState()
    expect(s.isIosSafari).toBe(true)
    expect(s.isStandalone).toBe(false)
  })
})
