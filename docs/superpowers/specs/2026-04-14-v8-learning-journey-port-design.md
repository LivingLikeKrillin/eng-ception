# Eng-ception v8 Learning Journey Port — Design

> **Status**: Design (pending spec review + user approval)
> **Date**: 2026-04-14
> **Author**: collaborative (Eisen + Claude)
> **Scope**: Replace the current 3-step web learning flow with the 7-step v8 journey to validate the pedagogical model before bootstrapping the React Native app.

---

## 1. Context & problem

The eng-ception web app currently ships a 3-step learning flow (`restructure` → `english` → `pattern`). A product-level review concluded:

- The current flow is a "try-then-compare" loop (user types English, AI grades). This is **functionally replaceable by ChatGPT** and fails the differentiation bar.
- The `v8.html` prototype in the project root encodes a fundamentally different pedagogy: **scaffolded discovery** — the user never generates English prose, they only *assemble* pre-generated blocks in the correct order, with emotional priming and metacognitive reflection bookending the learning loop.
- The v8 journey is pedagogically stronger (Vygotsky scaffolding, emotional engagement, explicit schema building) and strategically stronger (cannot be replicated by ChatGPT).

The `roadmap/` docs originally framed v8 as the target for a future React Native app, with the web frozen at its current state. That assumption is now overturned: the user's #0 priority is the mobile app market release, and the web's role is redefined as a **living spec / beta testbed** for the v8 journey. This means:

- The web is no longer a production target. It is a cheap, high-iteration environment to validate the v8 flow (prompt quality, block sizing, transition timing, emotional arc) before burning native build cycles.
- All logic (prompts, types, state machine, validation, mocks) must be **platform-agnostic pure TypeScript** so it ports to the RN app as-is.
- Per decision from the brainstorming session, this rebuild is a **big-bang replacement** — the legacy 3-step code is deleted, old localStorage data is cleared via schema version bump.

## 2. Goals and non-goals

### Goals

- Replace `/learn/:id` and `/learn/custom` with the full v8 seven-step journey: Empathy → Pre-check → Step 0 → Step 1 → Step 2 → Step 3 → Step 4.
- Keep the web **fully mock-capable** via `VITE_USE_MOCK=true` so design review proceeds without a live Claude API key.
- Make every non-UI layer (types, store, services, prompts, mocks, validators) a **pure TypeScript asset** that a future RN app can import without modification.
- Auto-label structure types at runtime (Level 1 — AI provides the type chip). No hardcoded 10-type taxonomy in this pass.
- Auto-save the extracted pattern at Step 2 → Step 3 transition and persist a `LearningRecord` on Step 4 completion.

### Non-goals (deliberately deferred)

- **Level 2 / Level 3**: Multi-session features like "user chooses their own type" (Level 2) and voice input (Level 3). These require data that a single-session testbed cannot produce.
- **Hardcoded 10-types taxonomy**: AI labels each session on the fly. A fixed taxonomy will be introduced in the RN MVP once types have stabilized.
- **Home additions**: v8's "오늘의 문장 locked card" and "review nudge card with lock overlay" are not in scope for this pass. The current Home layout is kept as-is.
- **Data migration**: Old `LearningRecord` / `Pattern` entries in localStorage are **discarded** on schema version mismatch. The `Scenario` seed is kept as-is (schema compatible).
- **Spaced repetition**: Review scheduling / Review page enhancements are out of scope.
- **RN app bootstrap**: This spec is web-only. RN is the next spec after this lands.

## 3. Key decisions from brainstorming

| # | Decision | Rationale |
|---|---|---|
| Q1 | **Web priority**: testbed for RN (option B). | Mobile is #0 priority; web serves as fast-iteration UX validation before native builds. |
| Q2 | **MVP scope**: all 7 steps + Level 1 only. | Full arc is required to validate the emotional+cognitive hypothesis. Empathy and Step 3 are cheap to build. Level 2/3 require multi-session context the testbed doesn't have. |
| Q3 | **API shape**: single upfront Claude call returning a complete `SessionPayload`. | Every user interaction in v8 is validated against pre-fetchable content. Single call enables zero-loading transitions, matches v8's "game-like" feel, simplifies retry logic, ports cleanly to RN. |
| Q4 | **Refactor strategy**: big-bang replacement. | The current flow was judged "ChatGPT-replaceable, differentiation failed" — no A/B value in keeping it. Data schemas are incompatible. Git history is the safety net. |

## 4. User journey

```
Home (input)
  └── "풀어보기" 클릭
      ↓ navigate('/learn/...')
      ↓ fetchSessionPayload() fires in background
Empathy         (no progress bar)
  ↓  Promise.all([ timer(2500ms), payloadReady ]) — whichever later
  ↓  10s max timeout → error overlay with retry
Pre-check       (no progress bar; "not a learning step, a primer")
  ↓  user picks 1 of 2 direction options (no validation, just recorded)
  ↓  auto-advance 400ms after selection
Step 0 (1/5)    Structure recognition + pivot quiz
  ↓  user answers pivot quiz (2-choice, has correct answer)
  ↓  correct answer revealed either way → "다음" button
Step 1 (2/5)    Block assembly + connector selection
  ↓  user taps 3 blocks in order (toggle on re-tap) + picks connector
  ↓  "문장 검토하기" enabled when all 4 slots filled
Step 2 (3/5)    Feedback + word-order comparison
  ↓  shows correct/wrong banner based on assembly match
  ↓  "이 패턴 내 걸로 만들기" → auto-saves pattern → Step 3
Step 3 (4/5)    Reflection ("PATTERN SAVED" + Before/After)
  ↓  user picks After direction; verdict reveals against Pre-check choice
  ↓  "다음" → Step 4
Step 4 (5/5)    Completion ("하나 풀었다")
  ↓  saves LearningRecord → reset store → navigate('/')
```

### Key timing: Empathy as network cover

Empathy serves a dual role: emotional validation AND hiding the upfront Claude fetch. Regulated by:

```ts
const MIN_EMPATHY_MS = 2500
const MAX_WAIT_MS = 10_000

// StepEmpathy useEffect:
//   1. start 2.5s timer
//   2. subscribe to payloadStatus
//   3. when both (timer done && status==='ready') → advanceFromEmpathy()
//   4. if 10s passes without status==='ready' → store sets error
```

This keeps the emotional arc intact (user always sees at least 2.5s of empathy), hides ~1-3s of Claude latency behind the animation, and surfaces genuine failures clearly.

## 5. State machine

```ts
type V8Step =
  | 'input'      // Home-only; Learn enters 'empathy' immediately
  | 'empathy'
  | 'precheck'
  | 'step0'
  | 'step1'
  | 'step2'
  | 'step3'
  | 'step4'
```

Transitions:

| From | To | Trigger | Side effects |
|---|---|---|---|
| `input` | `empathy` | `startScenario()` / `startCustom()` | Fires `fetchSessionPayload()`, sets `payloadStatus='loading'` |
| `empathy` | `precheck` | `advanceFromEmpathy()` after min timer + payload ready | — |
| `precheck` | `step0` | 400ms after `submitPrecheck(id)` | `precheckChoice` recorded |
| `step0` | `step1` | `advanceToStep1()` | `pivotQuizAnswer` recorded |
| `step1` | `step2` | `advanceToStep2()` (when `blockOrder.length===3` && `connectorChoice !== null`) | — |
| `step2` | `step3` | `advanceToStep3()` | **Pattern auto-saved to localStorage** |
| `step3` | `step4` | `advanceToStep4()` (after `afterChoice` set) | — |
| `step4` | (terminal) | `complete()` | `LearningRecord` saved, store reset, navigate('/') |
| any | `input` | `reset()` or back button | Store cleared |

**Mount-time behavior** (hard refresh on `/learn/:id` or `/learn/custom`): when `LearningFlow` mounts, it reads `currentStep` from the store. If `currentStep === 'input'`, `Learn.tsx`'s existing `useEffect` guard fires `startScenario(scenario)` (seed route) or redirects to `/` (custom route with no passed input). If `currentStep` is anything else, the store had leftover state from a previous session in the same tab — we treat this as invalid (the in-memory `payload` is gone) and call `reset()` then navigate to `/`. Step 0 does **not** automatically advance on `submitPivotQuiz` — user controls transition via the "다음" button (explicit, mirrors Step 1).

## 6. Route structure

Routes unchanged from current:

- `/` → Home
- `/learn/:id` → Learn (seed scenario)
- `/learn/custom` → Learn (custom input, passedInput via location state)
- `/patterns` → Patterns (read-only, typeref updates only)
- `/review` → Review (read-only, typeref updates only)

The 7 step components live **inside** `<LearningFlow />` as a state-machine switch; steps do not have their own URLs. Rationale:

- Browser back from an interior step to a prior step would break the immersive single-session feel and risks replaying payload-dependent UI without its payload.
- Page refresh inside a step would lose the in-memory payload anyway, so URL-per-step offers no real benefit.
- The same state-machine pattern transfers verbatim to RN with Expo Router or React Navigation's stack.

Browser-level back button on an interior step behaves as the default (navigates to Home), reseting the store on unmount.

## 7. SessionPayload schema

The single source of truth for an entire learning session. Delivered by Claude in one API call.

```ts
// src/types/v8.ts

export type PartRole = 'first' | 'pivot' | 'second' | 'neutral'

export interface SessionPayload {
  structureType: {
    id: string              // stable kebab-case id, e.g. 'concession-claim'
    label: string           // Korean display, e.g. '양보 + 주장'
    category: string        // '업무/논리' | '감정/관계' | '묘사/인상' | '경험/서사' | '상황 대응'
  }

  empathy: {
    echo: string            // short echo of the user's Korean input
    message: string         // warm Korean contextual reaction, 1-2 sentences, no exclamation marks
  }

  precheck: {
    question: string
    choices: PrecheckChoice[]       // exactly 2
    correctChoiceId: string         // used for Step 3 Before/After verdict
  }

  structure: {
    parts: StructurePart[]          // Korean sentence tokenized, with roles for highlight
    coreStructure: string[]         // e.g. ['인정', '전환', '걱정']
    explanation: string
    pivotQuiz: PivotQuiz
  }

  assembly: {
    blocks: Block[]                 // exactly 3, sorted by correct order (UI shuffles)
    connectors: Connector[]         // 2-3 items, exactly one isCorrect: true
    finalSentence: string           // fully assembled English sentence
  }

  feedback: {
    correctTitle: string            // e.g. '맞았어'
    correctSub: string
    wrongTitle: string              // e.g. '아쉬워'
    wrongSub: string
    explanation: string
    wordOrder: WordOrder
  }

  pattern: {
    template: string                // e.g. "That's a great idea, but I'm a bit concerned ~"
    tags: string[]                  // 2-4 Korean tags
  }
}

export interface PrecheckChoice {
  id: string                // 'first' | 'second'
  label: string             // '인정부터'
  preview: string           // '좋은 아이디어인 건 맞는데…'
}

export interface StructurePart {
  text: string              // Korean substring
  role: PartRole
}

export interface PivotQuiz {
  question: string
  options: PivotOption[]    // exactly 2
  feedback: string          // revealed after user answers
}

export interface PivotOption {
  id: string
  text: string              // Korean phrase from the original sentence
  hint: string
  isCorrect: boolean
}

export interface Block {
  id: string                // 'b1' | 'b2' | 'b3'
  en: string
  order: number             // 1..3, correct position
}

export interface Connector {
  id: string                // 'but' etc.
  label: string
  meaning: string           // Korean meaning label
  isCorrect: boolean
}

export interface WordOrder {
  korean: WordOrderToken[]
  english: WordOrderToken[]
  reversed: boolean
  keyInsight: string
}

export interface WordOrderToken {
  label: string             // e.g. '인정' | '걱정'
  role: PartRole
  connectorLabel?: string   // present on English tokens inserted as connector markers
}
```

### Role-to-color mapping

Client uses roles for visual coloring and nothing else. No role maps to functional behavior.

| Role | Color token | Use |
|---|---|---|
| `first` | `text-ok` / `bg-ok/[0.06]` | Opening half of the sentence |
| `pivot` | `text-accent` | Transition word/phrase |
| `second` | `text-warn` / `bg-warn/[0.06]` | Concluding half |
| `neutral` | `text-t2` | Glue text not part of the structural skeleton |

### Client-side validation (`assertSessionPayload`)

The payload is validated on arrival before the store accepts it. Failure triggers one retry in `claude.ts`, then surfaces as a parse error.

- `assembly.blocks.length === 3`
- `assembly.blocks.map(b => b.order).sort()` equals `[1, 2, 3]`
- `assembly.connectors.length >= 2 && assembly.connectors.length <= 3` and exactly one `isCorrect: true`
- `structure.pivotQuiz.options.length === 2` and exactly one `isCorrect: true`
- `precheck.choices.length === 2` and `correctChoiceId` matches one of them
- `structure.parts.length >= 2`
- `feedback.wordOrder.korean.length >= 1` and `.english.length >= 1`
- `pattern.template` is non-empty and `pattern.tags` is an array

## 8. Component tree

```
src/
├── types/
│   ├── index.ts                      ✏️  Keep Scenario, redefine LearningRecord, delete ChatStep/StepResponseMap/*Response
│   └── v8.ts                         🆕  SessionPayload and friends
│
├── services/
│   ├── claude.ts                     ✏️  fetchSessionPayload(korean) — single call, timeout, retry once
│   ├── prompts.ts                    ✏️  SYSTEM_PROMPT + buildUserMessage(korean)
│   ├── mocks.ts                      ✏️  mockSessionPayload(_korean) — single fixture
│   └── validate.ts                   🆕  assertSessionPayload(json)
│
├── store/
│   ├── learningStore.ts              ✏️  Rewritten — 7-step state machine
│   └── localStorage.ts               ✏️  schemaVersion = 3, init() clears incompatible data
│
├── components/
│   ├── common/
│   │   ├── Navigation.tsx            (unchanged)
│   │   ├── ProgressBar.tsx           🆕  New file; 5-step (step0..step4) progress indicator
│   │   ├── StepIndicator.tsx        ❌  Delete (replaced by ProgressBar.tsx)
│   │   └── FeedbackCard.tsx          ❌  Delete (Step 2 has its own bespoke layout)
│   │
│   └── learning/
│       ├── LearningFlow.tsx          ✏️  Switch-based 7-step router with progress bar gate
│       ├── StepEmpathy.tsx           🆕
│       ├── StepPrecheck.tsx          🆕
│       ├── StepStructure.tsx         🆕  (Step 0)
│       ├── StepAssemble.tsx          🆕  (Step 1)
│       ├── StepFeedback.tsx          🆕  (Step 2)
│       ├── StepReflect.tsx           🆕  (Step 3)
│       ├── StepComplete.tsx          🆕  (Step 4)
│       ├── StepRestructure.tsx       ❌  Delete
│       ├── StepEnglish.tsx           ❌  Delete
│       ├── StepPattern.tsx           ❌  Delete
│       └── primitives/
│           ├── OriginalCard.tsx      🆕  shared Korean source card (left accent border)
│           ├── StructureTypeChip.tsx 🆕  '유형' label + category tag
│           ├── KoreanDecompose.tsx   🆕  renders parts[] with role-colored spans
│           └── WordOrderCompare.tsx  🆕  Step 2 Korean vs English token chips
│
├── pages/
│   ├── Home.tsx                      (unchanged)
│   ├── Learn.tsx                     ✏️  typeref updates only; useEffect guard preserved
│   ├── Patterns.tsx                  ✏️  typeref updates only
│   └── Review.tsx                    ✏️  typeref updates only
│
├── data/
│   └── seed-scenarios.ts             (unchanged)
│
└── main.tsx                          ✏️  Call db.init() before ReactDOM.render
```

Summary: **16 new files, 9 modified files, 5 deleted files** (old 3 step components + `FeedbackCard` + `StepIndicator`).

## 9. Store contract

```ts
interface V8LearningState {
  // session meta
  currentStep: V8Step
  scenario: Scenario | null
  originalKorean: string
  isCustomInput: boolean

  // upfront payload
  payload: SessionPayload | null
  payloadStatus: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null

  // step-scoped interaction state
  precheckChoice: string | null
  pivotQuizAnswer: 'correct' | 'wrong' | null
  blockOrder: string[]              // user-tapped block ids, in order
  connectorChoice: string | null
  afterChoice: string | null
  patternSaved: boolean             // idempotency guard for advanceToStep3

  // session lifecycle
  startScenario: (scenario: Scenario) => void
  startCustom: (korean: string) => void
  retryFetch: () => void
  reset: () => void

  // empathy → precheck
  advanceFromEmpathy: () => void

  // precheck (auto-advance with 400ms delay)
  submitPrecheck: (choiceId: string) => void

  // step 0
  submitPivotQuiz: (answer: 'correct' | 'wrong') => void
  advanceToStep1: () => void

  // step 1
  tapBlock: (blockId: string) => void
  resetBlockOrder: () => void
  tapConnector: (connectorId: string) => void
  advanceToStep2: () => void

  // step 2 — pattern auto-save embedded in the transition
  advanceToStep3: () => Promise<void>

  // step 3
  submitAfterChoice: (choiceId: string) => void
  advanceToStep4: () => void

  // step 4 — learning record save embedded
  complete: () => Promise<void>
}
```

### Invariants

- `startScenario`/`startCustom` always set `currentStep='empathy'` and fire `fetchSessionPayload` — Empathy is the single entry to the learning flow.
- `tapBlock` is a toggle: tapping an already-selected block removes it from `blockOrder`. Tapping when `blockOrder.length === 3` is a no-op.
- `advanceToStep3` must be idempotent at the Pattern save layer (same run must not double-save). Implementation: a boolean `patternSaved` flag on the store, set to `true` after the first successful save; subsequent calls short-circuit. Chosen over UUID-duplication because it avoids polluting `Patterns` with orphans on double-click.
- `reset()` is the only legitimate way to return to `currentStep='input'` outside of component unmount.

### Assembly correctness calculation

```ts
function isAssemblyCorrect(s: V8LearningState): boolean {
  const { payload, blockOrder, connectorChoice } = s
  if (!payload || blockOrder.length !== 3) return false
  const correctOrder = [...payload.assembly.blocks]
    .sort((a, b) => a.order - b.order)
    .map(b => b.id)
  const blocksOk = blockOrder.every((id, i) => id === correctOrder[i])
  const conn = payload.assembly.connectors.find(c => c.id === connectorChoice)
  return blocksOk && conn?.isCorrect === true
}
```

This result drives which `feedback.correctTitle`/`wrongTitle` the Step 2 banner uses.

## 10. Prompt design

Single system prompt, single user message.

### System prompt (outline)

```
너는 한국인이 영어로 말하려다 막힌 한국어 문장을 받아서,
그 사람이 "조립해서 배울 수 있는" 완결된 학습 세션 JSON을 반환하는 코치다.

반환 규칙:
- 오직 유효한 JSON 객체 하나만 반환. 설명/머리말/코드펜스 금지.
- 모든 한국어 필드는 반말 + 따뜻한 톤.
- JSON은 아래 TypeScript 타입과 정확히 일치해야 한다.

[SessionPayload TypeScript definition — literal copy of the types from src/types/v8.ts]

세부 요건:
1. structureType.label 은 한국어 (예: '양보 + 주장', '경험 + 반전')
2. structureType.id 는 영문 kebab-case stable id
3. structureType.category 는 다섯 카테고리 중 하나
4. structure.parts 는 원문을 3~6개 토큰으로 분해, role 은 네 값 중 하나
5. assembly.blocks 는 정확히 3개, id='b1'|'b2'|'b3', order=1|2|3 은 정답 조립 순서
6. assembly.connectors 는 2~3개, 정확히 1개만 isCorrect:true
7. structure.pivotQuiz.options 는 정확히 2개, 정확히 1개 isCorrect:true, text 는 원문에 실제로 나온 단어/구
8. precheck.choices 는 정확히 2개, id='first'|'second', correctChoiceId 는 둘 중 하나
9. empathy.message 는 1~2문장, 느낌표 금지, 따뜻하고 담담
10. 모든 설명 필드는 120자 이내

좋은 예시:
입력: "좋은 아이디어인 건 맞는데, 현실적으로 리소스가 부족하지 않을까요?"
출력: [full worked JSON matching the mock fixture]

이제 아래 한국어 문장을 처리해라:
```

Estimated prompt size: ~2500-3000 input tokens. Response: up to ~1500 output tokens. `max_tokens` raised to **2048** in `dev-server.js` and `api/chat.ts`.

### User message

```ts
export function buildUserMessage(korean: string): string {
  return `원문: "${korean}"`
}
```

Deliberately minimal — all instructions are in the system prompt, which should cache well across sessions.

### dev-server.js / api/chat.ts update

Both proxies currently branch on a `step` field in the request. After this change, the request shape is:

```json
{ "systemPrompt": "...", "userMessage": "..." }
```

The proxy forwards unchanged to Claude, parses the response JSON (or surfaces a parse error), and returns the object to the client. No step-specific logic.

## 11. Error handling

### Layers

| Layer | Responsibility | On failure |
|---|---|---|
| `fetchOnce` (claude.ts) | AbortController with **4s** timeout + assertSessionPayload | throw `Error` → retry loop |
| `fetchSessionPayload` (claude.ts) | One retry on any `fetchOnce` failure (max wall time 2 × 4s = 8s) | throw on second failure |
| `runFetch` helper (store) | Map error to user-facing Korean message | `set({ payloadStatus: 'error', error })` |
| `LearningFlow` | Watch for `payloadStatus === 'error'` | Render `<ErrorOverlay>` with retry button |
| `StepEmpathy` | UX-side 10s wall as outer bound (always larger than `fetchSessionPayload`'s 8s max so it never fires first in practice — guards only against `claude.ts` hangs outside its own timeout) | Sets store error directly |

### Korean user messages (fixed set)

- Timeout: "응답이 너무 오래 걸려요. 다시 시도해주세요."
- Parse error: "AI 응답 형식이 이상해요. 다시 시도해주세요."
- Network: "네트워크가 불안정해요."
- Fallback: "문제가 생겼어요. 다시 시도해주세요."

### Retry from error state

`retryFetch()` resets `payloadStatus='loading'` and re-runs the fetch while keeping `currentStep='empathy'`. If successful, Empathy advances normally. If it fails again, error is re-displayed.

## 12. Data migration

### Schema version bump

```ts
// src/store/localStorage.ts
const SCHEMA_VERSION_KEY = 'eng-ception:schema-version'
const CURRENT_VERSION = 3

export const localStorageAdapter: DataStore = {
  async init() {
    const stored = localStorage.getItem(SCHEMA_VERSION_KEY)
    if (stored !== String(CURRENT_VERSION)) {
      localStorage.removeItem('eng-ception:records')
      localStorage.removeItem('eng-ception:patterns')
      localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_VERSION))
    }
  },
  // ... rest unchanged, typed to the new LearningRecord shape
}
```

Called once on boot from `src/main.tsx`:

```ts
import { localStorageAdapter as db } from './store/localStorage'
await db.init()
ReactDOM.createRoot(...).render(...)
```

Seed scenarios are **not** cleared (their schema is compatible). Any existing production users would lose their 3-step session history — acceptable per the big-bang decision (the 3-step flow is being retired, not improved).

### New LearningRecord shape

```ts
export interface LearningRecord {
  id: string
  schemaVersion: 3
  scenarioId: string | null
  originalKorean: string
  structureTypeId: string
  structureTypeLabel: string
  finalSentence: string
  precheckChoice: string | null
  afterChoice: string | null
  pivotQuizCorrect: boolean
  assemblyCorrect: boolean
  completedAt: string
}
```

Old fields removed: `userRestructure`, `userEnglish`, `aiRestructure`, `aiEnglish`, `extractedPatterns`, `stepsCompleted`.

### Pattern type

Unchanged. Existing `Pattern` interface fits cleanly: `id`, `template`, `category`, `tags`, `exampleOriginal`, `exampleEnglish`, `savedAt`, `reviewCount`, `lastReviewedAt`.

## 13. Commit plan

**Single atomic commit.** Two-commit split was considered but would require stub shims in the middle to keep typecheck passing; not worth the overhead for a testbed.

Proposed commit message:

```
feat(v8): replace 3-step flow with v8 seven-step learning journey

Rebuilds the web's learning journey from scratch to match the v8.html
prototype: Empathy → Pre-check → Step 0 (structure recognition) → Step 1
(block assembly) → Step 2 (feedback + word order comparison) → Step 3
(reflection + auto pattern save) → Step 4 (completion). The old
restructure/english/pattern flow is deleted.

The web becomes a living spec / beta testbed for the React Native app
that will follow — all prompts, types, state machine, and mocks are
platform-agnostic pure TypeScript so they can be ported to RN as-is.

Architecture:
- Single upfront Claude call returns a complete SessionPayload; every
  subsequent step reads from this payload with zero additional fetches.
- Empathy screen doubles as network cover (2.5s minimum + payload wait,
  10s timeout).
- Pattern auto-saves on Step 2 → Step 3 transition; LearningRecord
  saves on Step 4 completion.
- Client-side validation for all user taps (pivot quiz, block order,
  connector choice, Before/After) using embedded correctness flags.
- localStorage schema bumped to v3; old LearningRecord/Pattern data is
  cleared on boot (schema incompatible).

Deletes: StepRestructure/English/Pattern, FeedbackCard, old 3-step
prompts, old learningStore actions, old ChatStep/StepResponseMap types.

Adds: SessionPayload schema, 7 new Step components, 4 learning
primitives, validation layer, and a comprehensive mock fixture for
VITE_USE_MOCK=true design-review mode.
```

Preconditions: `npx tsc --noEmit` passes. Manual smoke of mock-mode end-to-end takes ~5 minutes.

## 14. Test plan (manual)

No automated test runner is wired into the project; verification is manual.

### Primary path (mock mode) — `VITE_USE_MOCK=true`

**A. Scenario card route**

1. Home loads with logo, streak badge, hero, input card, Try-these cards.
2. Tap one scenario card.
3. Empathy: echo text + "아, 이거 진짜 답답하지" + pulse bar. Auto-advances to Pre-check at ~2.5s.
4. Pre-check: original card + question + 2 choices. Tap any choice. Auto-advances to Step 0 after 400ms.
5. Step 0 (1/5): type chip, Korean decompose with highlights, core-structure strip, pivot quiz. Answer wrong → correct flash + feedback + "다음" enables. Tap "다음".
6. Step 1 (2/5): 3 shuffled blocks. Tap in any order to fill slots. Tap a filled block to clear. Fill correctly; connector area reveals. Tap the correct connector. Preview updates. Tap "문장 검토하기".
7. Step 2 (3/5): "맞았어" banner + final sentence + explanation + word-order compare. Tap "이 패턴 내 걸로 만들기".
8. Step 3 (4/5): "PATTERN SAVED" chip + original→English strip + Before/After. Pick either direction. Verdict reveals. Tap "다음".
9. Step 4 (5/5): "하나 풀었다" + "다음 문장으로". Tap. Return to Home.

**B. Custom input route**

1. Home → textarea any Korean → "풀어보기".
2. Same flow as above; mock fixture is insensitive to input.

### Edge cases

- Block toggle: tap a selected block → removed; re-tap → re-added at end of order.
- Block reset: "초기화" button empties `blockOrder`.
- Connector re-select: tapping a different connector replaces the choice.
- Back button on any step: returns to Home, store reset.
- Hard refresh mid-session (F5): load Home, no attempt to restore state.
- Pre-check and After disagreement: Step 3 verdict reflects the mismatch.

### Live API mode (optional, requires `.env.local` + `npm run dev:api`)

`VITE_USE_MOCK=false` and a valid `ANTHROPIC_API_KEY`:

1. Seed scenario s1 end-to-end.
2. Network tab shows **exactly one** `/api/chat` call per session.
3. Payload passes `assertSessionPayload` (if it fails, retry fires; if retry fails, error surfaces).
4. Human-review the output: are the blocks semantically correct? Is the connector choice defensible?
5. Repeat with s2, s5 — qualitatively compare consistency.

### Error paths

- Kill `dev:api`, submit custom input → Empathy → 10s timeout → "응답이 너무 오래 걸려요" → tap "다시 시도" → same error → terminal state.
- Temporarily patch `dev-server.js` to return `{}` for `/api/chat` → parse error → retry → second parse error → "AI 응답 형식이 이상해요".
- `dev-server.js` returning 500 → "문제가 생겼어요".

### localStorage migration

1. In DevTools console:
   ```js
   localStorage.setItem('eng-ception:schema-version', '2')
   localStorage.setItem('eng-ception:records', '[{"id":"old","userEnglish":"x"}]')
   ```
2. Hard refresh.
3. `db.init()` runs; `records` and `patterns` are gone, `schema-version` is `3`.

### Regression coverage (visual)

At 393px viewport:

- No horizontal overflow at any step.
- Progress bar fill: 20/40/60/80/100% at steps 0–4.
- `pressable` utility + `active:scale` work on all primary buttons.
- `key={currentStep}` + `sfr` animation plays on every step transition.
- Text contrast hierarchy: t1 for primary content, t2 for secondary/interactive, t3 for meta. No `text-t4` regressions.

## 15. Rollback

Single commit → single `git revert <SHA>`. localStorage is the only external state and is user-clearable via DevTools. `dev-server.js` is compatible with both old and new proxy request shapes after this change (it only forwards the request as-is).

## 16. Future work / RN handoff

These assets port to the upcoming React Native app without modification:

- `src/types/v8.ts` → RN `types/learning.ts`
- `src/services/prompts.ts` → RN `services/prompts.ts` (unchanged)
- `src/services/mocks.ts` → RN fixture
- `src/services/validate.ts` → RN validator (unchanged)
- `src/store/learningStore.ts` → RN store (Zustand works the same on RN)
- `src/services/claude.ts` → 90% reusable; only the `API_URL` / `fetch` call needs an RN-flavored HTTP client

UI components (`StepEmpathy`, `StepAssemble`, primitives, etc.) do not port — they need to be rewritten with RN primitives and StyleSheet. They remain valuable as **layout + interaction reference**.

Deferred until the RN phase:

- 10-types taxonomy (hardcoded library)
- Level 2 (user picks type) and Level 3 (voice input)
- Multi-session streak tracking wired to real data
- Spaced repetition for saved patterns
- Today's sentence / locked card / review nudge on Home
- PWA install prompts / offline-first
- Firebase Auth + Firestore migration
