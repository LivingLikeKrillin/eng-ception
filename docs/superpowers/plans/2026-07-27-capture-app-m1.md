# engception-capture M1 (Local Core) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a login-free, offline React Native (Expo/Android) app that captures English sentences from a photo (on-device OCR → region select → sentence multi-select), stores them locally, and drives a lightweight FSRS-scheduled read/shadow review + collection.

**Architecture:** New Expo repo `engception-capture`. Pure-logic layer (FSRS scheduler, review-queue view, sentence segmentation, dedup) is ported/adapted from the engception web repo and TDD'd with jest-expo. Persistence hides behind a `DataStore` interface (in-memory adapter for tests, MMKV adapter for the app), exactly mirroring the web repo's swap seam. Camera/OCR native modules are thin wrappers behind an `ocr.ts` contract; their UI is verified by integration/manual steps (native modules can't be unit-tested off-device).

**Tech Stack:** Expo (managed) + EAS Build, TypeScript (strict), React Native, Zustand, `expo-camera`, `@react-native-ml-kit/text-recognition`, `react-native-mmkv`, `expo-file-system`, React Navigation (bottom tabs), Jest (`jest-expo`).

**Spec:** `docs/superpowers/specs/2026-07-27-capture-app-design.md`

**Out of scope for M1 (later plans):** Claude translation/analysis (M2), Firebase auth + cloud sync (M3), live vision-camera overlay, analytics.

---

## File Structure (M1)

New repo `engception-capture/` (sibling to the web repo). Files created in M1:

```
engception-capture/
├── app.config.ts                 # Expo config + plugins (camera, ml-kit)
├── eas.json                      # EAS Build profiles (development, preview)
├── package.json / tsconfig.json / jest.config.js
├── App.tsx                       # Nav host (3 tabs)
├── src/
│   ├── types/
│   │   ├── card.ts               # SentenceCard, SrsCardFields
│   │   └── ocr.ts                # OcrResult, OcrBlock, OcrLine
│   ├── services/
│   │   ├── srs.ts                # ported+trimmed FSRS scheduler + gradeFromSelfRating
│   │   ├── srsView.ts            # slim due-queue view over SentenceCard
│   │   ├── segment.ts            # local sentence splitter
│   │   ├── ocr.ts                # ML Kit wrapper (recognize(imageUri)→OcrResult)
│   │   └── normalize.ts          # dedup key (normalized text)
│   ├── store/
│   │   ├── dataStore.ts          # DataStore interface + in-memory adapter
│   │   ├── mmkvStore.ts          # MMKV adapter (thin)
│   │   ├── db.ts                 # swappable db facade (mirrors web repo)
│   │   └── cardStore.ts          # Zustand: capture/review/collection state + actions
│   ├── screens/
│   │   ├── CaptureScreen.tsx
│   │   ├── ReviewScreen.tsx
│   │   ├── CollectionScreen.tsx
│   │   └── CardDetailScreen.tsx
│   └── components/
│       ├── BlockOverlay.tsx      # tappable OCR block boxes over the photo
│       ├── SentencePicker.tsx    # multi-select sentence list
│       └── ReviewCard.tsx        # English-first card + 3-button self-rate
└── __mocks__/                    # native module mocks for jest
```

---

## Chunk 1: Scaffold + pure-logic core

### Task 1: Scaffold the Expo repo + test harness

**Files:**
- Create: `engception-capture/` (new repo, run outside the web repo dir)

- [ ] **Step 1: Create the Expo app**

Run (in the parent folder that holds the web repo, NOT inside it):
```bash
npx create-expo-app@latest engception-capture --template blank-typescript
cd engception-capture
git init && git add -A && git commit -m "chore: scaffold Expo blank-typescript app"
```

- [ ] **Step 2: Add dev/test dependencies**

Run:
```bash
npx expo install expo-camera expo-file-system react-native-mmkv
npm i zustand @react-navigation/native @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context @react-native-ml-kit/text-recognition ts-fsrs@5.4.1
npm i -D jest jest-expo @types/jest
```
(`ts-fsrs` is a **runtime** dependency — `srs.ts` imports it in shipped code — so it goes in `dependencies`, not `-D`.)

- [ ] **Step 3: Configure jest**

Create `jest.config.js`:
```js
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|react-native-mmkv|@react-native-ml-kit/.*))',
  ],
}
```
Add to `package.json` scripts: `"test": "jest", "test:watch": "jest --watch", "tsc": "tsc --noEmit"`.

Also create `__mocks__/react-native-mmkv.js` (jest auto-uses it for that module — an in-memory stand-in so `new MMKV()` never touches native JSI in tests):
```js
class MMKV {
  #m = new Map()
  getString(k) { return this.#m.has(k) ? this.#m.get(k) : undefined }
  set(k, v) { this.#m.set(k, v) }
  delete(k) { this.#m.delete(k) }
}
module.exports = { MMKV }
```

- [ ] **Step 4: Sanity test**

Create `src/services/__smoke__.test.ts`:
```ts
test('jest runs', () => { expect(1 + 1).toBe(2) })
```
Run: `npx jest __smoke__`
Expected: PASS. Then delete the smoke file.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "chore: jest-expo harness + deps"
```

---

### Task 2: Card + OCR types

**Files:**
- Create: `src/types/card.ts`, `src/types/ocr.ts`

- [ ] **Step 1: Write the types** (no test — pure type decls)

`src/types/card.ts`:
```ts
export type CardStateName = 'new' | 'learning' | 'review' | 'relearning'

// The persisted FSRS subset. Superset of srs.ts CardSchedule (adds lastGrade, which
// the store owns — schedule() does not return it). Structurally satisfies CardSchedule.
export interface SrsCardFields {
  stability: number | null
  difficulty: number | null
  nextDueAt: string | null
  lastReviewedAt: string | null   // REQUIRED: schedule() computes elapsed_days from it
  reps: number
  lapses: number
  cardState: CardStateName
  lastGrade: 1 | 2 | 3 | 4 | null
}

export interface SentenceCard extends SrsCardFields {
  id: string
  text: string                    // canonical English sentence
  meaning: string | null          // Korean, lazy (M2)
  analysis: null                  // M2 fills; typed loosely in M1
  thumbnailUri: string | null     // local file uri
  createdAt: string               // ISO; doubles as SRS recency key
}
```

`src/types/ocr.ts`:
```ts
export interface OcrBBox { x: number; y: number; w: number; h: number }
export interface OcrLine { text: string; bbox: OcrBBox }
export interface OcrBlock { text: string; bbox: OcrBBox; lines: OcrLine[] }
export interface OcrResult { blocks: OcrBlock[] }
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add src/types && git commit -m "feat(types): SentenceCard + OCR result types"
```

---

### Task 3: Port the FSRS scheduler (trimmed) + gradeFromSelfRating

Port from web `src/services/srs.ts`, **dropping all 5형식-coupled exports** (`withSrsDefaults`, `withRecordDefaults`, `gradeFromSignals`, `Pattern`/`LearningRecord` imports, `bypassedCount`). Keep the scheduler core verbatim. Add `gradeFromSelfRating`.

**Files:**
- Create: `src/services/srs.ts`
- Test: `src/services/srs.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/services/srs.test.ts`:
```ts
import { schedule, newCardDefaults, gradeFromSelfRating, type CardSchedule } from './srs'

const T0 = new Date('2026-07-27T00:00:00.000Z')

test('new card defaults are unscheduled', () => {
  const d = newCardDefaults()
  expect(d).toEqual({
    stability: null, difficulty: null, nextDueAt: null, lastReviewedAt: null,
    reps: 0, lapses: 0, cardState: 'new', lastGrade: null,
  })
})

test('scheduling a new card advances reps and sets a future due date', () => {
  const next = schedule(null, 3, T0)
  expect(next.reps).toBe(1)
  expect(next.cardState).not.toBe('new')
  expect(new Date(next.nextDueAt).getTime()).toBeGreaterThan(T0.getTime())
  expect(next.lastReviewedAt).toBe(T0.toISOString())
})

test('elapsed_days uses lastReviewedAt (a card reviewed later gets a longer stability path)', () => {
  const first = schedule(null, 3, T0)
  const prev: CardSchedule = { ...first }
  const later = new Date('2026-08-10T00:00:00.000Z')
  const next = schedule(prev, 3, later)
  expect(next.reps).toBe(2)
  expect(next.lastReviewedAt).toBe(later.toISOString())
})

test('gradeFromSelfRating maps again/good/easy to 1/3/4', () => {
  expect(gradeFromSelfRating('again')).toBe(1)
  expect(gradeFromSelfRating('good')).toBe(3)
  expect(gradeFromSelfRating('easy')).toBe(4)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/services/srs.test.ts`
Expected: FAIL (module `./srs` not found).

- [ ] **Step 3: Write the implementation**

`src/services/srs.ts` — port the scheduler core from the web repo verbatim (the `params`/`scheduler`, `CardSchedule`, `NextSchedule`, `toTsCard`, `schedule`, State maps, `INTRO_PHASE`, `REQUEST_RETENTION`), with these changes:
- Remove `import type { Pattern, LearningRecord }` and everything using them (also drop `withSrsDefaults`, `withRecordDefaults`, `gradeFromSignals`).
- `SrsFields`/`newCardDefaults`: **drop `bypassedCount` AND add `lastReviewedAt: null`** (the web version has neither the right shape — it lacks `lastReviewedAt`). The returned object must exactly equal the 8-field object asserted in Step 1. Update the `SrsFields` interface to match (no `bypassedCount`, has `lastReviewedAt: string | null`) — or return `SrsCardFields` from `types/card.ts` directly to keep one source of truth.
- Add:
```ts
export type SelfRating = 'again' | 'good' | 'easy'
export function gradeFromSelfRating(r: SelfRating): Grade {
  return r === 'again' ? 1 : r === 'good' ? 3 : 4
}
```
(Keep `newCardDefaults()` returning the 8-field object asserted in Step 1.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/services/srs.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add src/services/srs.ts src/services/srs.test.ts
git commit -m "feat(srs): port FSRS scheduler + gradeFromSelfRating"
```

---

### Task 4: Slim review-queue view

Port `srsView.ts` slimmed per spec: **no escalation, no `bypassedCount`, no `rollupByPattern`**; sort by overdue → `createdAt`. Operates on `SentenceCard`.

**Files:**
- Create: `src/services/srsView.ts`
- Test: `src/services/srsView.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/services/srsView.test.ts`:
```ts
import { isDue, dueQueue, masteryLabel } from './srsView'
import type { SentenceCard } from '../types/card'

const base = (over: Partial<SentenceCard>): SentenceCard => ({
  id: 'x', text: 't', meaning: null, analysis: null, thumbnailUri: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  stability: null, difficulty: null, nextDueAt: null, lastReviewedAt: null,
  reps: 0, lapses: 0, cardState: 'new', lastGrade: null, ...over,
})
const NOW = new Date('2026-07-27T00:00:00.000Z')

test('unscheduled (nextDueAt null) card is due', () => {
  expect(isDue(base({ nextDueAt: null }), NOW)).toBe(true)
})
test('future due date is not due', () => {
  expect(isDue(base({ nextDueAt: '2026-08-01T00:00:00.000Z' }), NOW)).toBe(false)
})
test('dueQueue keeps only due cards, most overdue first, then older createdAt', () => {
  const a = base({ id: 'a', nextDueAt: '2026-07-20T00:00:00.000Z' }) // overdue 7d
  const b = base({ id: 'b', nextDueAt: '2026-07-26T00:00:00.000Z' }) // overdue 1d
  const c = base({ id: 'c', nextDueAt: '2026-08-01T00:00:00.000Z' }) // not due
  const d1 = base({ id: 'd1', nextDueAt: null, createdAt: '2026-07-05T00:00:00.000Z' })
  const d2 = base({ id: 'd2', nextDueAt: null, createdAt: '2026-07-02T00:00:00.000Z' })
  const q = dueQueue([a, b, c, d1, d2], NOW).map((x) => x.id)
  expect(q).not.toContain('c')
  // unscheduled = maximally overdue; tie broken by older createdAt (d2 before d1)
  expect(q.slice(0, 2)).toEqual(['d2', 'd1'])
  expect(q).toEqual(['d2', 'd1', 'a', 'b'])
})
test('masteryLabel: 0 reps=새내기, high stability=숙련, else 학습중', () => {
  expect(masteryLabel(base({ reps: 0 }))).toBe('새내기')
  expect(masteryLabel(base({ reps: 3, stability: 30 }))).toBe('숙련')
  expect(masteryLabel(base({ reps: 3, stability: 5 }))).toBe('학습중')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/services/srsView.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

`src/services/srsView.ts`:
```ts
import type { SentenceCard } from '../types/card'

const MATURE_STABILITY_DAYS = 21

export function isDue(card: SentenceCard, now: Date): boolean {
  return card.nextDueAt == null || new Date(card.nextDueAt).getTime() <= now.getTime()
}

const MAX_OVERDUE = Number.MAX_SAFE_INTEGER
function overdueMs(card: SentenceCard, now: Date): number {
  if (card.nextDueAt == null) return MAX_OVERDUE
  return now.getTime() - new Date(card.nextDueAt).getTime()
}

export function dueQueue(cards: SentenceCard[], now: Date): SentenceCard[] {
  return cards
    .filter((c) => isDue(c, now))
    .sort((a, b) => {
      const od = overdueMs(b, now) - overdueMs(a, now) // most overdue first
      if (od !== 0) return od
      return a.createdAt.localeCompare(b.createdAt)     // older first
    })
}

export function nextDueDate(cards: SentenceCard[], now: Date): Date | null {
  let min: number | null = null
  for (const c of cards) {
    if (c.nextDueAt == null) continue
    const t = new Date(c.nextDueAt).getTime()
    if (t > now.getTime() && (min === null || t < min)) min = t
  }
  return min === null ? null : new Date(min)
}

export type MasteryLabel = '새내기' | '학습중' | '숙련'
export function masteryLabel(card: SentenceCard): MasteryLabel {
  if (card.reps === 0) return '새내기'
  if (card.stability != null && card.stability >= MATURE_STABILITY_DAYS) return '숙련'
  return '학습중'
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/services/srsView.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add src/services/srsView.ts src/services/srsView.test.ts
git commit -m "feat(srsView): slim due-queue view over SentenceCard"
```

---

### Task 5: Local sentence segmentation

**Files:**
- Create: `src/services/segment.ts`
- Test: `src/services/segment.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/services/segment.test.ts`:
```ts
import { splitSentences } from './segment'

test('splits on terminal punctuation', () => {
  expect(splitSentences('I made him angry. She left.')).toEqual(['I made him angry.', 'She left.'])
})
test('collapses OCR line breaks inside a sentence', () => {
  expect(splitSentences('The paper argues\nthat X holds.')).toEqual(['The paper argues that X holds.'])
})
test('does not split common abbreviations', () => {
  expect(splitSentences('Mr. Smith arrived. He sat.')).toEqual(['Mr. Smith arrived.', 'He sat.'])
})
test('trims and drops empties', () => {
  expect(splitSentences('   ')).toEqual([])
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/services/segment.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

`src/services/segment.ts` -- normalize whitespace/newlines, protect a small abbreviation set by masking their trailing dot with a placeholder, split on `.?!` + space + capital, then restore:
```ts
const ABBR = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'St', 'vs', 'e.g', 'i.e', 'etc', 'Fig', 'No', 'Vol']
const DOT = String.fromCharCode(0) // NUL placeholder; never appears in OCR text

export function splitSentences(raw: string): string[] {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (!text) return []
  let guarded = text
  for (const a of ABBR) {
    const esc = a.replace(/\./g, '\\.')          // escape dots inside the abbr (e.g. "e.g")
    const masked = a.replace(/\./g, DOT) + DOT    // mask inner + trailing dot
    guarded = guarded.replace(new RegExp('\\b' + esc + '\\.', 'g'), masked)
  }
  return guarded
    .split(/(?<=[.?!])\s+(?=["']?[A-Z])/)      // terminal punct, then optional quote + capital
    .map((s) => s.split(DOT).join('.').trim())    // restore masked dots
    .filter(Boolean)
}
```
The `DOT` placeholder hides abbreviation dots from the splitter, then is restored to a period in each part.

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/services/segment.test.ts`
Expected: PASS (4 tests). If the lookbehind regex is unsupported by the Hermes/Jest target, fall back to an index scan — but jest-expo (Node) supports lookbehind, so verify here first.

- [ ] **Step 5: Commit**
```bash
git add src/services/segment.ts src/services/segment.test.ts
git commit -m "feat(segment): local sentence splitter with abbreviation guard"
```

---

### Task 6: Dedup normalization key

**Files:**
- Create: `src/services/normalize.ts`
- Test: `src/services/normalize.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
import { dedupKey } from './normalize'
test('dedupKey is case- and whitespace-insensitive', () => {
  expect(dedupKey('  I Made Him  Angry. ')).toBe(dedupKey('i made him angry.'))
})
test('different sentences differ', () => {
  expect(dedupKey('She left.')).not.toBe(dedupKey('He left.'))
})
```

- [ ] **Step 2: Run to verify it fails** — `npx jest src/services/normalize.test.ts` → FAIL

- [ ] **Step 3: Implement**
```ts
export function dedupKey(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
}
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/services/normalize.* && git commit -m "feat(normalize): dedup key"
```

---

### Chunk 1 verification
- [ ] Run full suite: `npx jest` → all green
- [ ] `npx tsc --noEmit` → no errors

---

## Chunk 2: Storage + state

The persistence seam mirrors the web repo: a `DataStore` interface with a swappable adapter. Tests use an **in-memory adapter** (no native), the app uses the **MMKV adapter**. Dedup + FSRS scheduling live in `cardStore` (Zustand) so they're testable against the in-memory store.

### Task 7: DataStore interface + in-memory adapter

**Files:**
- Create: `src/store/dataStore.ts`
- Test: `src/store/dataStore.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/store/dataStore.test.ts`:
```ts
import { createMemoryStore } from './dataStore'
import type { SentenceCard } from '../types/card'
import { newCardDefaults } from '../services/srs'

const card = (over: Partial<SentenceCard>): SentenceCard => ({
  id: over.id ?? 'id1', text: over.text ?? 'She left.', meaning: null, analysis: null,
  thumbnailUri: null, createdAt: '2026-07-27T00:00:00.000Z', ...newCardDefaults(), ...over,
})

test('add then getAll returns the card', async () => {
  const s = createMemoryStore()
  await s.addCard(card({ id: 'a' }))
  expect((await s.getAllCards()).map((c) => c.id)).toEqual(['a'])
})

test('updateSchedule patches only SRS fields of the matching id', async () => {
  const s = createMemoryStore()
  await s.addCard(card({ id: 'a', reps: 0 }))
  await s.updateSchedule('a', { reps: 2, nextDueAt: '2026-08-01T00:00:00.000Z' })
  const got = (await s.getAllCards())[0]
  expect(got.reps).toBe(2)
  expect(got.nextDueAt).toBe('2026-08-01T00:00:00.000Z')
  expect(got.text).toBe('She left.')
})

test('deleteCard removes it', async () => {
  const s = createMemoryStore()
  await s.addCard(card({ id: 'a' }))
  await s.deleteCard('a')
  expect(await s.getAllCards()).toEqual([])
})
```

- [ ] **Step 2: Run to verify it fails** — `npx jest src/store/dataStore.test.ts` → FAIL

- [ ] **Step 3: Implement**

`src/store/dataStore.ts`:
```ts
import type { SentenceCard, SrsCardFields } from '../types/card'

export interface DataStore {
  getAllCards(): Promise<SentenceCard[]>
  addCard(card: SentenceCard): Promise<void>
  updateSchedule(id: string, patch: Partial<SrsCardFields>): Promise<void>
  deleteCard(id: string): Promise<void>
}

export function createMemoryStore(seed: SentenceCard[] = []): DataStore {
  let cards = [...seed]
  return {
    async getAllCards() { return [...cards] },
    async addCard(card) { cards.push(card) },
    async updateSchedule(id, patch) {
      cards = cards.map((c) => (c.id === id ? { ...c, ...patch } : c))
    },
    async deleteCard(id) { cards = cards.filter((c) => c.id !== id) },
  }
}
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (3 tests)

- [ ] **Step 5: Commit**
```bash
git add src/store/dataStore.* && git commit -m "feat(store): DataStore interface + in-memory adapter"
```

---

### Task 8: MMKV adapter + db facade

The MMKV adapter is a thin JSON-blob implementation of `DataStore` (mirrors the web `localStorage.ts` array approach). Not unit-tested (native); verified via app smoke in Chunk 4. The `db` facade holds the active adapter and is swappable (mirrors web `db.ts`).

**Files:**
- Create: `src/store/mmkvStore.ts`, `src/store/db.ts`

- [ ] **Step 1: Implement the MMKV adapter**

`src/store/mmkvStore.ts`:
```ts
import { MMKV } from 'react-native-mmkv'
import type { DataStore } from './dataStore'
import type { SentenceCard, SrsCardFields } from '../types/card'

const KEY = 'engception:cards'

export function createMmkvStore(storage = new MMKV()): DataStore {
  const read = (): SentenceCard[] => {
    const raw = storage.getString(KEY)
    return raw ? (JSON.parse(raw) as SentenceCard[]) : []
  }
  const write = (cards: SentenceCard[]) => storage.set(KEY, JSON.stringify(cards))
  return {
    async getAllCards() { return read() },
    async addCard(card) { write([...read(), card]) },
    async updateSchedule(id: string, patch: Partial<SrsCardFields>) {
      write(read().map((c) => (c.id === id ? { ...c, ...patch } : c)))
    },
    async deleteCard(id) { write(read().filter((c) => c.id !== id)) },
  }
}
```

- [ ] **Step 2: Implement the db facade**

`src/store/db.ts` — **lazy adapter** so `new MMKV()` runs on first use, not at import (otherwise importing `cardStore` in a jest/Node env with no JSI throws):
```ts
import type { DataStore } from './dataStore'
import { createMmkvStore } from './mmkvStore'

let adapter: DataStore | null = null
function active(): DataStore {
  if (!adapter) adapter = createMmkvStore()
  return adapter
}
export const db: DataStore = {
  getAllCards: () => active().getAllCards(),
  addCard: (c) => active().addCard(c),
  updateSchedule: (id, p) => active().updateSchedule(id, p),
  deleteCard: (id) => active().deleteCard(id),
}
export function setDbAdapter(next: DataStore) { adapter = next }
```
Combined with the `__mocks__/react-native-mmkv.js` mock (Task 1), the store tests never hit native — they import `cardStore` safely and drive it through the injected in-memory store.

- [ ] **Step 3: Verify compile** — `npx tsc --noEmit` → no errors

- [ ] **Step 4: Commit**
```bash
git add src/store/mmkvStore.ts src/store/db.ts
git commit -m "feat(store): MMKV adapter + swappable db facade"
```

---

### Task 9: cardStore (Zustand) — capture save (dedup) + review scheduling

**Files:**
- Create: `src/store/cardStore.ts`
- Test: `src/store/cardStore.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/store/cardStore.test.ts`:
```ts
import { createCardActions } from './cardStore'
import { createMemoryStore } from './dataStore'

const NOW = new Date('2026-07-27T00:00:00.000Z')
const genId = (() => { let n = 0; return () => `id${++n}` })()

test('saveSentences adds new cards and skips dedup-equal ones', async () => {
  const store = createMemoryStore()
  const a = createCardActions({ store, now: () => NOW, genId })
  await a.saveSentences(['She left.', 'He stayed.'], null)
  await a.saveSentences(['  she LEFT. '], null) // dedup-equal to "She left."
  const all = await store.getAllCards()
  expect(all.map((c) => c.text)).toEqual(['She left.', 'He stayed.'])
  expect(all.every((c) => c.cardState === 'new' && c.nextDueAt === null)).toBe(true)
})

test('gradeCard schedules the card via FSRS and persists SRS fields + lastGrade', async () => {
  const store = createMemoryStore()
  const a = createCardActions({ store, now: () => NOW, genId })
  await a.saveSentences(['She left.'], null)
  const id = (await store.getAllCards())[0].id
  await a.gradeCard(id, 'good', NOW)
  const c = (await store.getAllCards()).find((x) => x.id === id)!
  expect(c.reps).toBe(1)
  expect(c.lastGrade).toBe(3)
  expect(new Date(c.nextDueAt!).getTime()).toBeGreaterThan(NOW.getTime())
})
```

- [ ] **Step 2: Run to verify it fails** — `npx jest src/store/cardStore.test.ts` → FAIL

- [ ] **Step 3: Implement the pure action factory**

`src/store/cardStore.ts` — a testable factory (injected store/now/genId); the Zustand hook wraps it with `db` + real id/now.
```ts
import type { DataStore } from './dataStore'
import type { SentenceCard } from '../types/card'
import { newCardDefaults, schedule, gradeFromSelfRating, type SelfRating } from '../services/srs'
import { dedupKey } from '../services/normalize'

interface Deps { store: DataStore; now: () => Date; genId: () => string }

export function createCardActions({ store, now, genId }: Deps) {
  return {
    async saveSentences(texts: string[], thumbnailUri: string | null) {
      const existing = new Set((await store.getAllCards()).map((c) => dedupKey(c.text)))
      for (const text of texts) {
        const key = dedupKey(text)
        if (existing.has(key)) continue
        existing.add(key)
        const card: SentenceCard = {
          id: genId(), text: text.trim(), meaning: null, analysis: null,
          thumbnailUri, createdAt: now().toISOString(), ...newCardDefaults(),
        }
        await store.addCard(card)
      }
    },
    async gradeCard(id: string, rating: SelfRating, at: Date = now()) {
      const cards = await store.getAllCards()
      const card = cards.find((c) => c.id === id)
      if (!card) return
      const grade = gradeFromSelfRating(rating)
      const next = schedule(card, grade, at)
      await store.updateSchedule(id, { ...next, lastGrade: grade })
    },
  }
}
```
(`schedule(card, ...)` works because `SentenceCard` structurally satisfies `CardSchedule`.)

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (2 tests)

- [ ] **Step 5: Add the Zustand hook** (no new test — glue)

Append to `cardStore.ts`:
```ts
import { create } from 'zustand'
import { db } from './db'

const realDeps: Deps = {
  store: db,
  now: () => new Date(),
  genId: () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
}
const actions = createCardActions(realDeps)

interface CardState {
  cards: SentenceCard[]
  refresh: () => Promise<void>
  saveSentences: (texts: string[], thumb: string | null) => Promise<void>
  gradeCard: (id: string, rating: SelfRating) => Promise<void>
  deleteCard: (id: string) => Promise<void>
}
export const useCardStore = create<CardState>((set) => ({
  cards: [],
  refresh: async () => set({ cards: await db.getAllCards() }),
  saveSentences: async (texts, thumb) => { await actions.saveSentences(texts, thumb); set({ cards: await db.getAllCards() }) },
  gradeCard: async (id, rating) => { await actions.gradeCard(id, rating); set({ cards: await db.getAllCards() }) },
  deleteCard: async (id) => { await db.deleteCard(id); set({ cards: await db.getAllCards() }) },
}))
```

- [ ] **Step 6: Verify compile + full suite** — `npx tsc --noEmit` and `npx jest` → green

- [ ] **Step 7: Commit**
```bash
git add src/store/cardStore.* && git commit -m "feat(store): cardStore actions — dedup save + FSRS grading"
```

---

### Chunk 2 verification
- [ ] `npx jest` → all green (logic + store)
- [ ] `npx tsc --noEmit` → clean

---

## Chunk 3: OCR service + Capture UI

> **Native reality:** `expo-camera` and `@react-native-ml-kit/text-recognition` require a **dev build** (not Expo Go) and a device/emulator. Their behavior is verified by **integration/manual steps**, not unit tests — do not fabricate unit tests that "mock the camera" into passing. The testable seam is `ocr.ts`'s normalization and the sentence-picker glue.

### Task 10: `ocr.ts` — ML Kit wrapper + result normalization

**Files:**
- Create: `src/services/ocr.ts`
- Test: `src/services/ocr.test.ts` (tests only the pure normalizer)

- [ ] **Step 1: Write the failing test** (normalizer only)

`src/services/ocr.test.ts`:
```ts
import { normalizeMlkit } from './ocr'

test('normalizeMlkit maps ML Kit blocks/lines to OcrResult with bbox', () => {
  const mlkit = {
    blocks: [{
      text: 'Hello world.',
      frame: { left: 1, top: 2, width: 3, height: 4 },
      lines: [{ text: 'Hello world.', frame: { left: 1, top: 2, width: 3, height: 4 } }],
    }],
  }
  expect(normalizeMlkit(mlkit as any)).toEqual({
    blocks: [{
      text: 'Hello world.',
      bbox: { x: 1, y: 2, w: 3, h: 4 },
      lines: [{ text: 'Hello world.', bbox: { x: 1, y: 2, w: 3, h: 4 } }],
    }],
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npx jest src/services/ocr.test.ts` → FAIL

- [ ] **Step 3: Implement**

`src/services/ocr.ts`:
```ts
import TextRecognition from '@react-native-ml-kit/text-recognition'
import type { OcrResult, OcrBBox } from '../types/ocr'

const bbox = (f: { left: number; top: number; width: number; height: number }): OcrBBox =>
  ({ x: f.left, y: f.top, w: f.width, h: f.height })

export function normalizeMlkit(res: { blocks: any[] }): OcrResult {
  return {
    blocks: res.blocks.map((b) => ({
      text: b.text,
      bbox: bbox(b.frame),
      lines: (b.lines ?? []).map((l: any) => ({ text: l.text, bbox: bbox(l.frame) })),
    })),
  }
}

export async function recognize(imageUri: string): Promise<OcrResult> {
  const res = await TextRecognition.recognize(imageUri)
  return normalizeMlkit(res as any)
}
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/services/ocr.* && git commit -m "feat(ocr): ML Kit wrapper + result normalizer"
```

---

### Task 11: BlockOverlay + SentencePicker components

**Files:**
- Create: `src/components/BlockOverlay.tsx`, `src/components/SentencePicker.tsx`

- [ ] **Step 1: Implement `BlockOverlay`** — renders tappable rectangles from `OcrBlock[]` scaled to the displayed image size; `onSelect(block)` on tap. (Props: `blocks`, `imageLayout {w,h}`, `sourceSize {w,h}`, `onSelect`.) Scale each `bbox` by `imageLayout.w / sourceSize.w` etc.

- [ ] **Step 2: Implement `SentencePicker`** — takes `sentences: string[]`, renders a multi-select list (tap toggles), `selected` state, `onConfirm(selected: string[])`. Reuses no native APIs → could be RTL-tested, but keep it simple; verified in the capture flow smoke.

- [ ] **Step 3: Verify compile** — `npx tsc --noEmit`

- [ ] **Step 4: Commit**
```bash
git add src/components/BlockOverlay.tsx src/components/SentencePicker.tsx
git commit -m "feat(capture): block overlay + sentence picker components"
```

---

### Task 12: CaptureScreen — wire camera → OCR → select → segment → save

**Files:**
- Create: `src/screens/CaptureScreen.tsx`

- [ ] **Step 1: Implement the flow**
  1. `expo-camera` preview; shutter → `takePictureAsync()` → `photo.uri`.
  2. `recognize(photo.uri)` → `OcrResult`; render photo + `BlockOverlay`. **Pass the captured photo's pixel size** (`photo.width`/`photo.height` from `takePictureAsync()`) into `BlockOverlay` as `sourceSize` so bboxes (image-pixel coords, spec §7) scale to the on-screen image.
  3. On block tap → `splitSentences(block.text)` → `SentencePicker`.
  4. Manual-crop fallback: if no block tapped, run `splitSentences` over the whole `OcrResult` joined block text (full-image fallback). The drag-rect crop is deferred — mark it `// TODO(after-M1): drag-crop`.
  5. Save the thumbnail. **M1 = full-photo copy** (no per-block crop): copy `photo.uri` into `expo-file-system` `documentDirectory` and keep that uri. (Per-block image cropping needs `expo-image-manipulator` and lands with the drag-crop feature after M1 — do NOT add that dep in M1.) This keeps §4's `thumbnailUri` populated and the flow unambiguous.
  6. `useCardStore().saveSentences(selected, thumbUri)` → toast "N개 저장" → reset to camera.

- [ ] **Step 2: Integration/manual verification** (dev build required)

Run: `npx expo run:android` (dev build) on a device/emulator.
Verify: photograph a paragraph → blocks overlay appears → tap a block → sentences listed → select 1 → save → card count increases (check Collection tab after Chunk 4). Capture works with **airplane mode on** (fully offline, zero network).

- [ ] **Step 3: Commit**
```bash
git add src/screens/CaptureScreen.tsx && git commit -m "feat(capture): camera→OCR→select→save flow"
```

---

### Chunk 3 verification
- [ ] `npx jest` green (ocr normalizer + all prior)
- [ ] `npx tsc --noEmit` clean
- [ ] Manual: offline capture produces a saved card

---

## Chunk 4: Review + Collection UI + navigation

### Task 13: ReviewCard component + ReviewScreen

**Files:**
- Create: `src/components/ReviewCard.tsx`, `src/screens/ReviewScreen.tsx`

- [ ] **Step 1: Implement `ReviewCard`** — English-first: large `text`; row of `[뜻 보기] [성분 분석] [🖼 출처]` (disabled/placeholder in M1 — meaning/analysis are M2; 출처 opens thumbnail peek); self-rate row `[다시][됐어][쉬움]` calling `onRate('again'|'good'|'easy')`.

- [ ] **Step 2: Implement `ReviewScreen`**
  1. On focus: `useCardStore().refresh()`.
  2. **Snapshot the queue ONCE per session** — seed it on focus into local state, independent of later `cards` refreshes:
     ```ts
     const [queue, setQueue] = useState<SentenceCard[]>([])
     const [i, setI] = useState(0)
     useFocusEffect(useCallback(() => {
       (async () => {
         await useCardStore.getState().refresh()
         const cards = useCardStore.getState().cards
         setQueue(dueQueue(cards, new Date()).slice(0, 20)) // session cap = 20 in-queue
         setI(0)
       })()
     }, []))
     ```
     **Do NOT re-derive `queue` from live `cards` on each render** — `gradeCard` updates the store, which would drop the just-graded card out of the queue and shift every later index down, making `i++` skip a card.
  3. Show `queue[i]`; on rate → `await gradeCard(queue[i].id, rating)` → `setI(i + 1)`. Iterate the frozen snapshot by index.
  4. Empty state when `i >= queue.length` ("오늘 복습 끝 🎉").

- [ ] **Step 3: Verify compile** — `npx tsc --noEmit`

- [ ] **Step 4: Manual verification** (dev build)
Capture 2 cards → Review tab shows them (new = due now) → rate each → queue empties → empty state.

- [ ] **Step 5: Commit**
```bash
git add src/components/ReviewCard.tsx src/screens/ReviewScreen.tsx
git commit -m "feat(review): English-first read/shadow card + due-queue session"
```

---

### Task 14: CollectionScreen + CardDetailScreen

**Files:**
- Create: `src/screens/CollectionScreen.tsx`, `src/screens/CardDetailScreen.tsx`

- [ ] **Step 1: `CollectionScreen`** — `FlatList` of all cards (thumbnail + text + `masteryLabel`), search box filtering by `text` (case-insensitive `dedupKey`-style match). Tap → `CardDetailScreen`.

- [ ] **Step 2: `CardDetailScreen`** — full text, thumbnail (if any), SRS state (`masteryLabel`, next due via `nextDueDate([card])`), delete button → `deleteCard(id)` → back.

- [ ] **Step 3: Verify compile** — `npx tsc --noEmit`

- [ ] **Step 4: Commit**
```bash
git add src/screens/CollectionScreen.tsx src/screens/CardDetailScreen.tsx
git commit -m "feat(collection): list + search + card detail + delete"
```

---

### Task 15: Navigation + due nudge + App wiring

**Files:**
- Modify: `App.tsx`
- Create: `src/components/DueNudge.tsx` (optional header nudge)

- [ ] **Step 1: 3-tab bottom navigation** — `캡처 / 복습 / 컬렉션` via `@react-navigation/bottom-tabs`; `CardDetail` as a stack pushed from Collection. Show a due-count badge on the 복습 tab (`dueQueue(cards, now).length`). **Note:** the nav has no Home screen, so this 복습-tab badge is M1's substitute for spec §5's "홈 넛지" — an intentional adaptation.

- [ ] **Step 2: On app start** — `useCardStore().refresh()` once (e.g. in `App.tsx` effect).

- [ ] **Step 3: Manual end-to-end** (dev build)
Fresh install → capture 3 sentences offline → 복습 tab badge = 3 → review all → badge clears → Collection shows 3 with mastery labels → open one → delete → Collection shows 2.

- [ ] **Step 4: Commit**
```bash
git add App.tsx src/components/DueNudge.tsx
git commit -m "feat(nav): 3-tab navigation + due-count badge + startup refresh"
```

---

### Task 16: EAS build config (ship target)

**Files:**
- Create/Modify: `eas.json`, `app.config.ts`

- [ ] **Step 1: Configure `app.config.ts`** — app name `engception`, android package id, camera permission (`expo-camera` plugin with `cameraPermission` copy in Korean), ML Kit plugin if required.

- [ ] **Step 2: Configure `eas.json`** — `development` (dev client) + `preview` (internal apk) profiles.

- [ ] **Step 3: Cloud build** (Windows-friendly)
Run: `eas build -p android --profile preview`
Expected: an installable APK artifact. Install on device, repeat the Task 15 end-to-end.

- [ ] **Step 4: Commit**
```bash
git add eas.json app.config.ts && git commit -m "chore(build): EAS dev + preview profiles"
```

---

### Chunk 4 verification
- [ ] `npx tsc --noEmit` clean; `npx jest` still green (no logic regressions)
- [ ] Manual (dev build): 3-tab nav works, 복습 badge reflects due count, review empties the frozen queue without skipping, collection search + delete work

---

### M1 done — definition of done
- [ ] `npx jest` all green; `npx tsc --noEmit` clean
- [ ] Offline (airplane mode): capture → save → review → collection all work with zero network calls
- [ ] `eas build --profile preview` produces an installable APK
- [ ] No login, no Claude calls anywhere in the app (those are M2/M3)
