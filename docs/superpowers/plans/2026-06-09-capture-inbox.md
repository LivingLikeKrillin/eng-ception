# 나중에 풀기 인박스 (Capture-later Inbox) Implementation Plan

> Use superpowers:subagent-driven-development or executing-plans. Checkbox steps.

**Goal:** Capture-later inbox — stash Korean now (manual button or OS share), drill later from Home.

**Architecture:** New `Capture` model + 3 `DataStore` methods across both adapters + facade + 3 test fakes + migrateToCloud (one tsc-green commit). Pure `parseShareText` helper. Home capture button + inbox section + StrictMode-safe share effect. PWA `share_target` (GET) manifest.

**Tech:** React 19 + TS strict, Zustand, Firestore, Vitest (node), Tailwind 4, vite-plugin-pwa.

Spec: `docs/superpowers/specs/2026-06-09-capture-inbox-design.md`.

---

## Chunk 1: Capture model + DataStore extension (one green commit)

### Task 1: Type + interface + both adapters + facade + 3 fakes + migrate

**Files:** `src/types/index.ts`, `src/store/dataStore.ts`, `src/store/localStorage.ts`, `src/store/firestoreDataStore.ts`, `src/store/db.ts`, `src/store/db.test.ts`, `src/store/learningStore.test.ts`, `src/services/migrateToCloud.ts`, `src/services/migrateToCloud.test.ts`, `src/store/localStorage.test.ts`

- [ ] **Step 1 — type** (`types/index.ts`, append):
```ts
export interface Capture {
  id: string
  korean: string
  createdAt: string          // ISO
  source: 'manual' | 'share'
}
```

- [ ] **Step 2 — interface** (`dataStore.ts`): import `Capture`; add to interface:
```ts
saveCapture(capture: Capture): Promise<void>
getCaptures(): Promise<Capture[]>
deleteCapture(id: string): Promise<void>
```

- [ ] **Step 3 — localStorage adapter** (`localStorage.ts`): add `captures: 'eng-ception:captures'` to KEYS, `const MAX_CAPTURES = 50`, import `Capture`, and methods:
```ts
async saveCapture(capture) {
  const captures = getItem<Capture>(KEYS.captures)
  captures.push(capture)
  if (captures.length > MAX_CAPTURES) captures.splice(0, captures.length - MAX_CAPTURES)
  setItem(KEYS.captures, captures)
},
async getCaptures() {
  return getItem<Capture>(KEYS.captures)
},
async deleteCapture(id) {
  setItem(KEYS.captures, getItem<Capture>(KEYS.captures).filter((c) => c.id !== id))
},
```

- [ ] **Step 4 — Firestore adapter** (`firestoreDataStore.ts`): import `Capture`; add `const capturesCol = () => collection(fs, 'users', uid, 'captures')` and:
```ts
async saveCapture(capture) {
  await setDoc(doc(capturesCol(), capture.id), capture)
},
async getCaptures() {
  const snap = await getDocs(capturesCol())
  return snap.docs.map((d) => d.data() as Capture)
},
async deleteCapture(id) {
  await deleteDoc(doc(capturesCol(), id))
},
```

- [ ] **Step 5 — facade** (`db.ts`): add three delegations:
```ts
saveCapture: (c) => activeAdapter.saveCapture(c),
getCaptures: () => activeAdapter.getCaptures(),
deleteCapture: (id) => activeAdapter.deleteCapture(id),
```

- [ ] **Step 6 — db.test fake** (`db.test.ts`): add to `fakeAdapter` return:
```ts
async saveCapture() { calls.push('saveCapture') },
async getCaptures() { calls.push('getCaptures'); return [] },
async deleteCapture() { calls.push('deleteCapture') },
```
and to the "routes every method" test add calls `await db.saveCapture({} as never); await db.getCaptures(); await db.deleteCapture('c1')` and append `'saveCapture','getCaptures','deleteCapture'` to the expected array (order matching the call sequence you add).

- [ ] **Step 7 — learningStore.test mock** (`learningStore.test.ts`): add to the `vi.mock('./localStorage')` object:
```ts
async saveCapture() {},
async getCaptures() { return [] },
async deleteCapture() {},
```

- [ ] **Step 8 — migrateToCloud** (`migrateToCloud.ts`):
```ts
const [records, patterns, captures] = await Promise.all([
  local.getLearningRecords(), local.getPatterns(), local.getCaptures(),
])
await Promise.all([
  ...records.map((r) => cloud.saveLearningRecord(r)),
  ...patterns.map((p) => cloud.savePattern(p)),
  ...captures.map((c) => cloud.saveCapture(c)),
])
await Promise.all([
  ...records.map((r) => local.deleteLearningRecord(r.id)),
  ...patterns.map((p) => local.deletePattern(p.id)),
  ...captures.map((c) => local.deleteCapture(c.id)),
])
```

- [ ] **Step 9 — migrateToCloud.test memStore** (`migrateToCloud.test.ts`): add `let captures: Capture[] = []` and the 3 methods to `memStore`; add a test asserting captures union + local clear.

- [ ] **Step 10 — localStorage.test** (`localStorage.test.ts`): add a describe for capture CRUD + MAX_CAPTURES cap.

- [ ] **Step 11 — run**: `npx tsc -b` (0) · `npx vitest run` (all pass) · `npm run lint`.
- [ ] **Step 12 — commit**: `feat(capture): Capture model + DataStore methods across adapters + migrate`

---

## Chunk 2: parseShareText helper

### Task 2: `services/shareTarget.ts`

**Files:** Create `src/services/shareTarget.ts`, `src/services/shareTarget.test.ts`

- [ ] **Step 1 — failing test** (`shareTarget.test.ts`):
```ts
import { describe, it, expect } from 'vitest'
import { parseShareText } from './shareTarget'

describe('parseShareText', () => {
  it('reads text param', () => { expect(parseShareText('?text=hello')).toBe('hello') })
  it('falls back to title when text absent', () => { expect(parseShareText('?title=hi')).toBe('hi') })
  it('prefers text over title', () => { expect(parseShareText('?title=t&text=x')).toBe('x') })
  it('trims and returns null for empty/whitespace/missing', () => {
    expect(parseShareText('?text=%20%20')).toBeNull()
    expect(parseShareText('')).toBeNull()
    expect(parseShareText('?foo=bar')).toBeNull()
  })
})
```
- [ ] **Step 2 — run, FAIL.**
- [ ] **Step 3 — implement** (`shareTarget.ts`):
```ts
// Web Share Target (GET) lands at /?title=&text=&url=. Extract the shared body.
export function parseShareText(search: string): string | null {
  const params = new URLSearchParams(search)
  const raw = params.get('text') ?? params.get('title') ?? ''
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}
```
- [ ] **Step 4 — run, PASS.**
- [ ] **Step 5 — commit**: `feat(capture): parseShareText helper`

---

## Chunk 3: Home UI + manifest

### Task 3: Home — capture button, inbox, StrictMode-safe share effect

**Files:** `src/pages/Home.tsx`

- [ ] **Step 1 — imports**: add `import { useRef } from 'react'` (merge with existing react import), `import { parseShareText } from '../services/shareTarget'`, and `import type { Capture } from '../types'`.

- [ ] **Step 2 — state**: `const [captures, setCaptures] = useState<Capture[]>([])`; `const shareConsumed = useRef(false)`.

- [ ] **Step 3 — load captures**: in `load()` add `setCaptures(await db.getCaptures())`.

- [ ] **Step 4 — refresh helper** (inside component):
```ts
const refreshCaptures = async () => setCaptures(await db.getCaptures())
const saveCapture = async (korean: string, source: 'manual' | 'share') => {
  await db.saveCapture({ id: crypto.randomUUID(), korean, createdAt: new Date().toISOString(), source })
  await refreshCaptures()
}
const handleSaveLater = async () => {
  if (!quickInput.trim()) return
  await saveCapture(quickInput.trim(), 'manual')
  setQuickInput('')
}
const drillCapture = async (c: Capture) => {
  await db.deleteCapture(c.id)
  navigate('/learn/custom', { state: { input: c.korean } })
}
const discardCapture = async (id: string) => { await db.deleteCapture(id); await refreshCaptures() }
```

- [ ] **Step 5 — share effect** (StrictMode-safe, separate from load):
```ts
useEffect(() => {
  const text = parseShareText(window.location.search)
  if (!text || shareConsumed.current) return
  shareConsumed.current = true
  window.history.replaceState({}, '', '/')   // synchronous strip — before await
  void saveCapture(text, 'share')
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

- [ ] **Step 6 — "나중에" button**: in the input footer (now `flex justify-end`), put a left-aligned secondary button + keep 풀어보기. Change wrapper to `flex justify-between items-center mt-3.5` and add before 풀어보기:
```tsx
<button
  onClick={() => void handleSaveLater()}
  disabled={!canGo}
  className={`pressable h-[42px] px-4 rounded-[14px] text-sm font-medium transition-all ${canGo ? 'bg-c2 text-t2 active:opacity-70' : 'bg-c2 text-t3 cursor-default'}`}
>
  나중에
</button>
```

- [ ] **Step 7 — inbox section** (place after the SRS nudge, before "Try these"):
```tsx
{captures.length > 0 && (
  <div className="fu2 mt-8">
    <p className="text-xs font-semibold text-t3 mb-3.5 tracking-wider uppercase font-en">나중에 풀 거 {captures.length}</p>
    <div className="flex flex-col gap-1.5">
      {[...captures].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((c) => (
        <div key={c.id} className="flex items-center gap-2 px-4 py-3 bg-c rounded-[14px] border border-line">
          <p className="flex-1 text-sm text-t2 truncate">{c.korean}</p>
          <button onClick={() => void drillCapture(c)} className="text-[12px] text-accent font-semibold pressable active:opacity-70 shrink-0">풀기</button>
          <button onClick={() => void discardCapture(c.id)} aria-label="삭제" className="text-t3 hover:text-t2 transition shrink-0 px-1">×</button>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 8 — run**: `npx tsc -b` 0, lint clean.
- [ ] **Step 9 — commit**: `feat(capture): Home capture button + inbox + share-target effect`

### Task 4: PWA share_target manifest

**Files:** `src/../vite.config.ts`

- [ ] **Step 1 — add to manifest** (after `icons` array):
```ts
share_target: {
  action: '/',
  method: 'GET',
  params: { title: 'title', text: 'text', url: 'url' },
},
```
- [ ] **Step 2 — build**: `npm run build`; confirm `dist/manifest.webmanifest` contains `share_target`.
- [ ] **Step 3 — commit**: `feat(capture): PWA share_target (GET) manifest`

---

## Chunk 4: Verify + review + ship

### Task 5
- [ ] `npx tsc -b` 0 · `npx vitest run` all pass · `npm run lint` · `npm run build` (share_target in manifest) · `npm run test:e2e` 2 pass.
- [ ] Code-review on `git diff master...HEAD -- src/ vite.config.ts`; fold correct findings (esp. verify the StrictMode share guard).
- [ ] PR → merge → sync master → update memory. Then sub-project C.
