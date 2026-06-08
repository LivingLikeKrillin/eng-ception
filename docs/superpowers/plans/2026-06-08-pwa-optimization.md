# PWA Optimization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Eng-ception a properly installable PWA — real icon set (incl. maskable), polished manifest + iOS meta, and a custom "add to home screen" prompt shown after the user has completed a session — without touching the already-working app-shell precache or regressing dev/tests.

**Architecture:** Config + generated assets (icons via `@vite-pwa/assets-generator`, manifest/workbox in `vite.config.ts`, iOS meta in `index.html`) plus one self-contained install-prompt module (`services/pwa/installPrompt.ts`, captures `beforeinstallprompt`) consumed by one presentational `InstallBanner.tsx` hosted in Home (gated on ≥1 completed session; iOS Safari gets a manual-instructions variant). No store, no Firebase/analytics coupling.

**Tech Stack:** React 19 + TS strict, Vite 6, `vite-plugin-pwa` (already wired, Workbox `generateSW`), `@vite-pwa/assets-generator` (new devDep), Vitest 4 (env=`node`).

**Spec:** `docs/superpowers/specs/2026-06-08-pwa-design.md`

**Branch:** `feat/pwa-optimization` (already created, off master @ `c70de08`).

---

## File Structure

**New files:**
- `pwa-assets.config.ts` — assets-generator config (source = `public/logo.png`, minimal-2023 preset → padded maskable + apple-touch).
- `public/pwa-64x64.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`, `public/favicon.ico` — generated, committed.
- `src/services/pwa/installPrompt.ts` — install state + actions (captures `beforeinstallprompt`).
- `src/services/pwa/installPrompt.test.ts` — unit tests (node, stubbed globals).
- `src/components/common/InstallBanner.tsx` — the prompt UI (android/desktop button + iOS hint).

**Modified files:**
- `vite.config.ts` — manifest icons + v9 description + `lang`/`categories`/`id`; `workbox.navigateFallbackDenylist`.
- `index.html` — `lang="ko"`, apple-mobile-web-app meta, apple-touch-icon + favicon.
- `src/main.tsx` — call `registerInstallPrompt()` in bootstrap.
- `src/pages/Home.tsx` — load records count + render `<InstallBanner>`.
- `package.json` — devDep + `generate-pwa-assets` script.
- `CLAUDE.md` — PWA section + file tree + test count.

**Verify recipe (this repo):** `npx tsc -b` (NOT `--noEmit`) · `npx vitest run` · `npm run lint` · `npm run test:e2e` · `npm run build` (PWA artifacts). End every commit body with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## Chunk 1: Icons, manifest, iOS meta, workbox (config + assets)

### Task 1.1: Generate the icon set

**Files:** Create `pwa-assets.config.ts`; modify `package.json`; create the generated `public/*.png` + `favicon.ico`.

- [ ] **Step 1: Install the generator**

Run: `npm i -D @vite-pwa/assets-generator`
Expected: installs cleanly on Windows.

- [ ] **Step 2: Create `pwa-assets.config.ts`** (repo root)
```ts
import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

// Source = the existing 512×512 public/logo.png. The minimal-2023 preset emits
// pwa-64/192/512, a maskable-512 WITH safe-zone padding (so Android masks don't clip
// the logo), apple-touch-180, and favicon.ico.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset,
  images: ['public/logo.png'],
})
```

- [ ] **Step 3: Add the npm script** to `package.json` "scripts":
```json
"generate-pwa-assets": "pwa-assets-generator"
```

- [ ] **Step 4: Generate the icons**

Run: `npm run generate-pwa-assets`
Expected: writes `public/pwa-64x64.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`, `public/favicon.ico`. Confirm with `ls public/`.

- [ ] **Step 5: Sanity-check the maskable has padding**

Run: `file public/maskable-icon-512x512.png` → expect `PNG image data, 512 x 512`. (Visual safe-zone check is part of the manual device test later; the preset applies padding by default.)

- [ ] **Step 6: Commit**
```bash
git add pwa-assets.config.ts package.json package-lock.json public/pwa-64x64.png public/pwa-192x192.png public/pwa-512x512.png public/maskable-icon-512x512.png public/apple-touch-icon-180x180.png public/favicon.ico
git commit -m "build(pwa): generate icon set (192/512/maskable/apple-touch) from logo"
```

### Task 1.2: Manifest + workbox in `vite.config.ts`

**Files:** Modify `vite.config.ts`.

- [ ] **Step 1: Replace the `VitePWA({...})` block** with:
```ts
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: '/',
        name: 'Eng-ception',
        short_name: 'Eng-ception',
        description: '한국어 사고를 자연스러운 영어 구문으로 재배치하는 5형식 훈련 앱',
        lang: 'ko',
        categories: ['education'],
        theme_color: '#111113',
        background_color: '#111113',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The Claude proxy is same-origin: keep the SPA navigate-fallback from serving
        // index.html for /api requests. (Firestore/Auth are cross-origin googleapis —
        // outside same-origin navigate-fallback and matched by no runtime rule, so they
        // pass through uncached; no rule needed.)
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: EXIT 0.

- [ ] **Step 3: Commit**
```bash
git add vite.config.ts
git commit -m "feat(pwa): polished manifest (icons, v9 description, lang) + workbox /api denylist"
```

### Task 1.3: iOS meta in `index.html`

**Files:** Modify `index.html`.

- [ ] **Step 1: Update `<html lang>` and `<head>`**

Change `<html lang="en">` → `<html lang="ko">`. Replace the existing `<link rel="icon">` / `<link rel="apple-touch-icon">` lines and add the apple meta so the head contains:
```html
    <link rel="icon" type="image/png" href="/pwa-192x192.png" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#111113" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <meta name="apple-mobile-web-app-title" content="Eng-ception" />
```
(Keep the existing Pretendard + Geist font `<link>`s and `<title>` untouched.)

- [ ] **Step 2: Commit**
```bash
git add index.html
git commit -m "feat(pwa): iOS standalone meta + generated icons in index.html, lang=ko"
```

### Task 1.4: Build verification

**Files:** none (verification only).

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: EXIT 0; output mentions PWA precache + generated `dist/sw.js` and `dist/manifest.webmanifest`.

- [ ] **Step 2: Assert manifest contents + icon files exist**

Run (bash):
```bash
cat dist/manifest.webmanifest
ls dist/pwa-192x192.png dist/pwa-512x512.png dist/maskable-icon-512x512.png dist/apple-touch-icon-180x180.png
```
Expected: manifest JSON lists the 3 icons (incl. `"purpose":"maskable"`), `"description"` is the v9 wording, `"lang":"ko"`; all four icon files exist in `dist/`. If any icon is missing, re-run `npm run generate-pwa-assets` (icons must exist before build).

- [ ] **Step 3: Confirm SW does not precache an `/api` fallback**

Run: `grep -c "navigateFallbackDenylist\|/api" dist/sw.js || true`
Expected: the SW exists; manual reasoning — `navigateFallbackDenylist` is compiled into the Workbox runtime. (Full behavior is checked in the manual smoke.) No commit (verification only).

---

## Chunk 2: Install prompt logic, banner UI, wiring, docs

### Task 2.1: `services/pwa/installPrompt.ts` (TDD)

**Files:**
- Create: `src/services/pwa/installPrompt.ts`
- Test: `src/services/pwa/installPrompt.test.ts`

- [ ] **Step 1: Write the failing test** (`src/services/pwa/installPrompt.test.ts`)

The vitest env is `node` — stub `window`/`navigator`/`localStorage`. The test installs a fake `window` whose `addEventListener` records handlers so we can fire `beforeinstallprompt`.
```ts
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
  beforeEach(async () => {
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
    expect(m.getInstallState().canInstall).toBe(false) // stash cleared
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
    expect(cb).toHaveBeenCalledTimes(1) // no longer notified
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/pwa/installPrompt.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/services/pwa/installPrompt.ts`**
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/pwa/installPrompt.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc -b` → EXIT 0
```bash
git add src/services/pwa/installPrompt.ts src/services/pwa/installPrompt.test.ts
git commit -m "feat(pwa): installPrompt module (capture beforeinstallprompt, state, dismiss)"
```

### Task 2.2: `components/common/InstallBanner.tsx`

**Files:** Create `src/components/common/InstallBanner.tsx`.

- [ ] **Step 1: Write the component**
```tsx
import { useEffect, useState } from 'react'
import {
  getInstallState,
  subscribeInstall,
  promptInstall,
  dismissInstall,
} from '../../services/pwa/installPrompt'

export default function InstallBanner({ hasCompletedSession }: { hasCompletedSession: boolean }) {
  const [state, setState] = useState(getInstallState)

  useEffect(() => {
    const update = () => setState(getInstallState())
    update()
    return subscribeInstall(update)
  }, [])

  const visible =
    hasCompletedSession &&
    !state.isStandalone &&
    !state.dismissed &&
    (state.canInstall || state.isIosSafari)

  if (!visible) return null

  return (
    <div className="fu bg-c rounded-[18px] p-4 border border-line/60 flex items-start gap-3">
      <div className="w-9 h-9 rounded-[12px] bg-c2 flex items-center justify-center shrink-0">
        <img src="/pwa-192x192.png" alt="" className="w-6 h-6 rounded-md" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-t1">홈 화면에 추가</p>
        {state.isIosSafari ? (
          <p className="text-xs text-t3 mt-1 leading-relaxed inline-flex flex-wrap items-center gap-1">
            공유
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="inline -mt-0.5" aria-hidden="true">
              <path d="M12 3v12M12 3l-4 4M12 3l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            버튼 → "홈 화면에 추가"를 누르면 앱처럼 쓸 수 있어요.
          </p>
        ) : (
          <p className="text-xs text-t3 mt-1 leading-relaxed">앱처럼 한 번에 열어서 더 빠르게 연습해요.</p>
        )}
        {!state.isIosSafari && (
          <button
            onClick={() => { void promptInstall() }}
            className="pressable mt-3 h-9 px-4 rounded-[12px] bg-accent text-white text-xs font-semibold shadow-[0_4px_20px_rgba(139,139,245,0.25)]"
          >
            홈 화면에 추가
          </button>
        )}
      </div>
      <button
        onClick={() => dismissInstall()}
        aria-label="닫기"
        className="pressable shrink-0 w-7 h-7 rounded-full bg-c2 text-t3 flex items-center justify-center text-sm"
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc -b` → EXIT 0 ; `npm run lint` → clean.

- [ ] **Step 3: Commit**
```bash
git add src/components/common/InstallBanner.tsx
git commit -m "feat(pwa): InstallBanner UI (android/desktop button + iOS hint, dismissable)"
```

### Task 2.3: Wire bootstrap + Home host

**Files:** Modify `src/main.tsx`, `src/pages/Home.tsx`.

- [ ] **Step 1: `main.tsx` — register the prompt capture**

Add the import and call it in `bootstrap()` (it self-guards the env; harmless when PWA isn't active). Add near the analytics wiring:
```tsx
import { registerInstallPrompt } from './services/pwa/installPrompt'
```
and inside `bootstrap()`, after `await db.init()`:
```tsx
  registerInstallPrompt()
```

- [ ] **Step 2: `Home.tsx` — load record count + render the banner**

Add the import:
```tsx
import InstallBanner from '../components/common/InstallBanner'
```
Add a state + load (Home does NOT currently load records — only scenarios — so add a small read). In the component, add:
```tsx
  const [hasCompletedSession, setHasCompletedSession] = useState(false)
```
In the existing `useEffect`'s `load()` (which already `await db.getScenarios()` etc.), append:
```tsx
      const records = await db.getLearningRecords()
      setHasCompletedSession(records.length > 0)
```
Render the banner just above the Recent block (so it sits in the page flow). Replace the `{/* Recent */}` wrapper start so it reads:
```tsx
        {/* Install prompt — after the user has completed at least one session */}
        <div className="mt-8">
          <InstallBanner hasCompletedSession={hasCompletedSession} />
        </div>

        {/* Recent */}
        <div className="fu3 mt-8">
          <RecentLearning />
        </div>
```
(`useState` is already imported in Home.)

- [ ] **Step 3: Typecheck + lint + full suite**

Run: `npx tsc -b` → EXIT 0 ; `npm run lint` → clean ; `npx vitest run` → green (89 prior + 5 new installPrompt = 94 pass | 9 skip).

- [ ] **Step 4: e2e regression**

Run: `npm run test:e2e`
Expected: pass (PWA SW inactive in dev; banner hidden because no `beforeinstallprompt`/iOS in headless Chromium and no completed-session gate at start). Cold-run flaky per repo gotcha — re-run once before treating a failure as a regression.

- [ ] **Step 5: Commit**
```bash
git add src/main.tsx src/pages/Home.tsx
git commit -m "feat(pwa): register install capture in bootstrap + host InstallBanner in Home"
```

### Task 2.4: Docs + final verification

**Files:** Modify `CLAUDE.md`.

- [ ] **Step 1: Update `CLAUDE.md`**
  1. **Project tree:** add `services/pwa/installPrompt.ts`, `components/common/InstallBanner.tsx`, `pwa-assets.config.ts`, and the generated `public/` icons (or a `public/ # PWA 아이콘 세트 (생성물)` note).
  2. **New short "## PWA" section:** install-experience + app-shell scope; icons via `@vite-pwa/assets-generator` (`npm run generate-pwa-assets`, run before `build`); `installPrompt.ts` captures `beforeinstallprompt`, `InstallBanner` shown in Home after ≥1 completed session (iOS hint variant); SW build/preview-only; `navigateFallbackDenylist:[/api]`, Firestore/Auth passthrough; deep offline out of scope (sessions need the API), fonts fall back offline. Reference the spec.
  3. **Test count:** bump the count in the 커맨드 block and 검증 레시피 to the actual `npx vitest run` number from Task 2.3 Step 3 (expected 94 pass | 9 skip). Add `npm run build` to the recipe as the PWA-artifact check.

- [ ] **Step 2: Full verification recipe**

Run and confirm: `npx tsc -b` (0) · `npx vitest run` (record exact, expect 94 pass | 9 skip) · `npm run lint` (clean) · `npm run build` (PWA artifacts) · `npm run test:e2e` (pass; re-run once if cold-flaky).

- [ ] **Step 3: Commit**
```bash
git add CLAUDE.md
git commit -m "docs: document PWA install experience in CLAUDE.md"
```

### Task 2.5: Manual smoke (human-gated — surface, do not block)

Not automatable (needs a real browser/device + install action). Document for the PR:
- `npm run build && npm run preview` → open in Chrome → Lighthouse "Installable" passes → install → launches standalone (no browser chrome, black status bar) → offline reload loads the shell.
- After completing one session, the InstallBanner appears on Home; "홈 화면에 추가" triggers the native sheet; ✕ dismisses permanently.
- iOS Safari: banner shows the manual "공유 → 홈 화면에 추가" hint.

---

## Notes for the executor

- **Verify recipe:** `npx tsc -b` (NOT `--noEmit`) · `npx vitest run` · `npm run lint` · `npm run test:e2e` · `npm run build`.
- **vitest env is `node`** — `installPrompt.ts` guards all DOM access; tests stub `window`/`navigator`/`localStorage` via `vi.stubGlobal` (+ `vi.resetModules()` per test because the module holds `deferred`/`listeners` at module scope).
- **Icons must exist before `vite build`** — run `npm run generate-pwa-assets` first; the generated PNGs are committed.
- **SW is build/preview-only** (vite-plugin-pwa default `devOptions.enabled: false`) — dev (`npm run dev`, mock) and Playwright e2e are unaffected; do not enable devOptions.
- **No deep offline, no font caching, no push** (spec non-goals). The banner is permanent-dismiss; don't add re-nag logic.
- **Firebase/`/api` cache hygiene:** only `navigateFallbackDenylist:[/api]` is needed; Firestore/Auth are cross-origin and uncached by default — don't add runtime caching rules.
