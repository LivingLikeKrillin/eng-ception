# Eng-ception — PWA Optimization (install experience + app shell) Design

> **Status**: Design (pending spec review + user approval)
> **Date**: 2026-06-08
> **Author**: collaborative (Eisen + Claude)
> **Scope**: Make Eng-ception a **properly installable** PWA — real icon set (incl. maskable), polished manifest + iOS meta, and a custom "add to home screen" prompt shown after the user has completed a session. The app shell already loads offline (vite-plugin-pwa `generateSW` precaches the built assets); this milestone adds install quality + install-prompt UX + explicit cache-exclusion of Firebase/API calls. **Deep offline is out of scope** (a new learning session requires the one Claude API call, so it cannot work offline by design).
> **Relates to**: P2 backlog item #4 (CLAUDE.md "다음 단계" #2). `vite-plugin-pwa` is already wired in `vite.config.ts`.

---

## 1. Context & problem

### 1.1 What exists today

`vite.config.ts` already wires `VitePWA({ registerType: 'autoUpdate', manifest: {...} })`. So `generateSW` (Workbox) **already precaches the built JS/CSS/HTML** — the app shell loads offline today. But the install experience is weak:

- **Icons:** the manifest points every icon at `/logo.png` with `sizes: 'any'` (a single 512×512). No 192, no purpose-correct **maskable** (Android masks it into a circle/squircle and clips a full-bleed logo), so install prompts and home-screen icons look off.
- **No install prompt UX.** Nothing captures `beforeinstallprompt`; the stated goal ("홈 화면 설치 유도") is unmet.
- **`index.html`** lacks the iOS standalone meta (`apple-mobile-web-app-capable`, status-bar style, title) and uses `lang="en"` for a Korean app.
- **Manifest `description`** is the old v8 wording ("영어 발화 구조로 재구성").
- **Firebase just shipped.** The SW must not interfere with Firestore/Auth (`googleapis.com`) or the `/api` Claude proxy (PWA design spec §9 flagged this).

### 1.2 What this milestone is — and isn't

A new session needs the single `fetchSessionPayload` API call, so **learning offline is impossible by design**. Offline value is limited to "open the app + browse Review/Patterns," which the existing app-shell precache + `localStorage` (and Firestore offline cache when logged in) already cover. So this milestone is deliberately **install-experience + shell**, not deep offline. The external font CDNs (Pretendard, Geist via jsdelivr) are **not** cached → offline rendering falls back to system fonts; this is an accepted limitation, noted not fixed.

## 2. Goals and non-goals

### Goals

- A **real icon set** generated reproducibly from the existing 512×512 `public/logo.png`: 192 + 512 (`any`) + a padded **maskable** + apple-touch-180 + favicon.
- A **custom install prompt**: capture `beforeinstallprompt`, show our own styled "홈 화면에 추가" banner at a high-intent moment, call `prompt()` on tap; an **iOS Safari** variant with manual "공유 → 홈 화면에 추가" guidance (iOS fires no `beforeinstallprompt`).
- **Polished manifest + iOS meta** (description v9, `lang`, `categories`, `id`; `apple-mobile-web-app-*` tags; fixed `lang="ko"`).
- **Explicit cache hygiene** so the SW never caches/intercepts Firebase or the `/api` proxy.
- **Zero dev/test regression** — SW is build/preview-only (dev unaffected); existing 89 vitest + e2e stay green.

### Non-goals

- **Deep offline** — no font self-hosting/caching, no offline session creation (impossible), no caching of learned data beyond what `localStorage`/Firestore already do.
- **Push notifications / background sync** — deferred (would pair with a future engagement feature).
- **Update-prompt UX** — keep `autoUpdate` (seamless next-load update); no "new version" toast.
- **Repeated install nagging** — a dismissed banner stays dismissed (permanent).
- **Screenshots / richer install UI** in the manifest — deferred (nice-to-have, not needed for installability).

## 3. Architecture

```
public/logo.png (512²)  ──pwa-assets-generator──▶  public/  (pwa-192/512/maskable, apple-touch-180, favicon)
                                                        │ referenced by
vite.config.ts  VitePWA{ manifest.icons, workbox.navigateFallbackDenylist:[/api] }  + index.html (iOS meta)

main.tsx ──registers──▶ services/pwa/installPrompt.ts  (captures beforeinstallprompt, state + prompt())
                                                  ▲ subscribed by
                          components/common/InstallBanner.tsx  (rendered in Home, gated)
```

The install-prompt logic is one self-contained module (no store, no Firebase/analytics coupling); the banner is one presentational component subscribing to it. The manifest/SW/icon changes are pure config + generated assets.

## 4. Components (one purpose each)

### 4.1 `services/pwa/installPrompt.ts` — install state + actions (pure-ish, testable)
- Module-level capture: an exported `registerInstallPrompt()` (called from `main.tsx`) adds the `beforeinstallprompt` listener, `preventDefault()`s it, and stashes the event. Also listens for `appinstalled` to clear state.
- `getInstallState(): { canInstall: boolean; isStandalone: boolean; isIosSafari: boolean; dismissed: boolean }` — `canInstall` = a stashed prompt event exists; `isStandalone` = `matchMedia('(display-mode: standalone)').matches || navigator.standalone`; `isIosSafari` = iOS UA + Safari + not standalone; `dismissed` = `localStorage['eng-ception:install-dismissed'] === '1'`.
- `promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'>` — calls the stashed event's `.prompt()`, awaits `userChoice`, clears the stash.
- `dismissInstall(): void` — sets the localStorage flag (permanent).
- `subscribeInstall(cb): () => void` — notifies on state change (`beforeinstallprompt` fired, `appinstalled`) so the banner re-renders. Small internal listener set; no external dep.
- **Never throws into callers** (mirrors the analytics-facade defensive style); all DOM access guarded for the `node` test env (`typeof window`/`matchMedia` checks).

### 4.2 `components/common/InstallBanner.tsx` — the prompt UI
- Subscribes via `subscribeInstall`; reads `getInstallState()` + records count.
- **Render gate:** `!isStandalone && !dismissed && hasCompletedSession && (canInstall || isIosSafari)`. `hasCompletedSession` = the host passes whether ≥1 `LearningRecord` exists (interprets "after a session" without transient cross-component state).
- **Android/desktop** (`canInstall`): styled banner with a "홈 화면에 추가" button → `promptInstall()`; on `accepted`/`dismissed` from the native sheet, hide.
- **iOS Safari**: instructional variant — "공유 버튼 → '홈 화면에 추가'" with the share-icon glyph. No button (can't trigger programmatically).
- Close (✕) → `dismissInstall()` + hide. Tailwind, matches the rounded-pill/`bg-c`/`pressable` house style.

### 4.3 `pages/Home.tsx` — host
- Renders `<InstallBanner hasCompletedSession={...} />`. **Note:** Home does *not* currently load learning records — only scenarios; the record fetch lives inside the child `RecentLearning`. So the plan must add a small `db.getLearningRecords()` (or a count) read in Home's existing `useEffect` and pass `records.length > 0`. (Don't lift `RecentLearning`'s fetch — a second lightweight read is simpler and keeps that component self-contained.)

### 4.4 `vite.config.ts` — manifest + workbox
- `manifest`: replace icons with the generated set (192, 512 `any`, 512 `maskable`), v9 `description` ("한국어 사고를 자연스러운 영어 구문으로 재배치하는 5형식 훈련 앱"), add `lang: 'ko'`, `categories: ['education']`, `id: '/'`. Keep `theme_color`/`background_color`/`display: 'standalone'`/`start_url`.
- `workbox.navigateFallbackDenylist: [/^\/api/]` so the SPA navigate-fallback never serves `index.html` for the Claude proxy. (Firestore/Auth are cross-origin `googleapis.com` — outside same-origin navigate-fallback and matched by no runtime-caching rule, so they pass through uncached; documented, no rule needed.)

### 4.5 `index.html` — iOS meta
- `lang="ko"`; add `apple-mobile-web-app-capable="yes"`, `apple-mobile-web-app-status-bar-style="black"` (opaque black bar — matches the `#111113` theme without rendering content *under* the status bar, which `black-translucent` would and which we'd otherwise have to absorb with safe-area padding), `apple-mobile-web-app-title="Eng-ception"`; point `apple-touch-icon` at the generated 180 asset.

### 4.6 `pwa-assets.config.ts` + generated `public/` icons
- `@vite-pwa/assets-generator` config using `public/logo.png` as source, a preset producing 64/192/512 + **maskable with safe-zone padding** (so Android masks don't clip the logo) + apple-touch-180. Run via an `npm run` script; commit the generated PNGs.

## 5. Data flow & state

Install capture is a one-time global concern: `registerInstallPrompt()` runs once in `main.tsx` bootstrap (outside React) and stashes the event. `InstallBanner` holds local `useState` mirroring `getInstallState()`, refreshed via `subscribeInstall`. Dismissal + "has completed session" are read from `localStorage`/`db` — no Zustand store, no coupling to Firebase or analytics. This keeps the unit independently testable.

## 6. Error handling & edge cases

- **No `beforeinstallprompt`** (iOS, already-installed, unsupported) → no "add" button; iOS shows the manual hint, others show nothing.
- **Already running standalone** → banner never shows (`display-mode: standalone`).
- **`prompt()` rejects / no stashed event** → `promptInstall()` returns `'unavailable'`; banner hides gracefully.
- **`localStorage` unavailable** (private mode quota) → dismissal best-effort; never throws (try/catch like `localAnalyticsSink`).
- **Dev/test env** (`node`, no `window`) → all DOM access guarded; SW inactive in dev so `npm run dev` (mock) and Playwright e2e are unaffected.

## 7. Testing strategy

- **Unit (vitest `node`):** `installPrompt.ts` — `beforeinstallprompt` capture sets `canInstall`; `dismissInstall` persists and flips `dismissed`; `isIosSafari`/`isStandalone` detection via `vi.stubGlobal` for `navigator`/`matchMedia`; `promptInstall` returns the right outcome and clears the stash. (Same stub-the-DOM pattern the event-tracking work established for the node env.)
- **Build verification:** `vite build` produces `dist/sw.js`, `dist/manifest.webmanifest`, and the generated icon files; assert the manifest lists 192/512/maskable + correct `description`/`lang`.
- **Regression:** existing `vitest run` (89) + `test:e2e` (1) stay green — PWA SW is build/preview-only, so dev/e2e are untouched.
- **Manual (human-gated):** `npm run preview` → Lighthouse "Installable" passes; install on Android/desktop, launch standalone (no browser chrome); offline-reload loads the shell; iOS banner shows the manual hint. (Like the Firebase smoke, the parts needing a real device/click are surfaced, not automated.)

## 8. Dependencies & build

- New devDependency: `@vite-pwa/assets-generator`. New script: `"generate-pwa-assets": "pwa-assets-generator"` (the CLI auto-discovers `pwa-assets.config.ts`, no `-c` flag needed).
- No runtime dependency added (`vite-plugin-pwa` already present).
- Generated icon PNGs are committed to `public/`.
- **Ordering:** `generate-pwa-assets` must run (and the PNGs be committed) **before** `vite build` — the manifest references the generated files by path, so a build without them would emit a manifest pointing at missing icons. The build-verification test (§7) therefore also asserts the referenced icon files physically exist in `dist/`.

## 9. Scope summary

**IN:** generated icon set (192/512/maskable/apple-touch) via `pwa-assets.config.ts`, manifest polish + workbox `navigateFallbackDenylist`, `index.html` iOS meta + `lang`, `services/pwa/installPrompt.ts`, `components/common/InstallBanner.tsx` (Home-hosted, gated on ≥1 completed session), unit tests + build verification.

**OUT (deferred):** deep offline (font self-hosting, offline data caching), push/background-sync, update-prompt UX, repeated install nagging, manifest screenshots, offline session creation (impossible by design).
