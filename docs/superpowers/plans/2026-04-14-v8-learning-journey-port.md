# v8 Learning Journey Port — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the web's 3-step learning flow with v8.html's seven-step journey (Empathy → Pre-check → Step 0..4) as a living spec / beta testbed for a future React Native app.

**Architecture:** Single upfront Claude call returns a complete `SessionPayload`; every subsequent UI step reads from this payload with zero additional fetches. Client-side validation against embedded correctness flags. Empathy screen doubles as network cover (min 2.5s + payload wait, 10s timeout outer wall). Pattern auto-saves on Step 2 → Step 3 transition; `LearningRecord` persists on Step 4 completion. Platform-agnostic pure TS for types/store/services/prompts/mocks/validators so the RN app can import them unchanged.

**Tech Stack:** React 19 + TypeScript 5.7 + Vite 6 + Tailwind CSS 4 + Zustand 5 + React Router 7 + Claude API (via `dev-server.js` proxy) + Vitest (new, added by this plan).

**Spec:** `docs/superpowers/specs/2026-04-14-v8-learning-journey-port-design.md` — read this before starting.

**Note on commits:** The spec proposes a single atomic commit for the final state, but TDD produces frequent per-task commits. Use frequent commits during execution; the final git history will have many small commits. Squashing is the reviewer's choice at merge time.

---

## File Structure (target)

```
src/
├── types/
│   ├── index.ts                      ✏️  Keep Scenario, redefine LearningRecord, remove ChatStep/StepResponseMap/*Response
│   └── v8.ts                         🆕  SessionPayload + related types
├── services/
│   ├── claude.ts                     ✏️  fetchSessionPayload(korean) single-call + timeout + retry
│   ├── prompts.ts                    ✏️  SYSTEM_PROMPT + buildUserMessage(korean)
│   ├── mocks.ts                      ✏️  mockSessionPayload(_korean) single fixture
│   └── validate.ts                   🆕  assertSessionPayload(json)
├── store/
│   ├── learningStore.ts              ✏️  7-step state machine (rewritten)
│   └── localStorage.ts               ✏️  schemaVersion=3, init() clears incompatible data, new LearningRecord shape
├── components/
│   ├── common/
│   │   ├── Navigation.tsx            (unchanged)
│   │   ├── ProgressBar.tsx           🆕  5-step progress (step0..step4)
│   │   ├── StepIndicator.tsx         ❌  Delete (replaced by ProgressBar)
│   │   └── FeedbackCard.tsx          ❌  Delete
│   └── learning/
│       ├── LearningFlow.tsx          ✏️  7-step switch router
│       ├── StepEmpathy.tsx           🆕
│       ├── StepPrecheck.tsx          🆕
│       ├── StepStructure.tsx         🆕
│       ├── StepAssemble.tsx          🆕
│       ├── StepFeedback.tsx          🆕
│       ├── StepReflect.tsx           🆕
│       ├── StepComplete.tsx          🆕
│       ├── StepRestructure.tsx       ❌  Delete
│       ├── StepEnglish.tsx           ❌  Delete
│       ├── StepPattern.tsx           ❌  Delete
│       └── primitives/
│           ├── OriginalCard.tsx      🆕
│           ├── StructureTypeChip.tsx 🆕
│           ├── KoreanDecompose.tsx   🆕
│           └── WordOrderCompare.tsx  🆕
├── pages/
│   ├── Home.tsx                      (unchanged)
│   ├── Learn.tsx                     ✏️  typeref + store method updates
│   ├── Patterns.tsx                  ✏️  typeref updates
│   └── Review.tsx                    ✏️  typeref updates
└── main.tsx                          ✏️  Call db.init() before rendering
```

Test files (new):

```
src/services/validate.test.ts
src/services/mocks.test.ts
src/store/learningStore.test.ts
src/store/localStorage.test.ts
```

---

## Chunk 0: Vitest setup

This chunk establishes a test harness. Everything after is TDD.

### Task 0.1: Install vitest

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dev dependency**

Run:
```bash
cd "C:/Users/Eisen/Desktop/Labs/[projects] trial/eng-ception"
npm install -D vitest
```

Expected: `vitest` appears in `package.json` devDependencies. No errors.

- [ ] **Step 2: Add `test` script**

Edit `package.json` `scripts`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "dev:api": "node --env-file=.env.local dev-server.js",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Smoke test**

Run:
```bash
npx vitest run --reporter=verbose
```

Expected: "No test files found, exiting with code 0" (vitest is installed and working; no tests exist yet).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(test): add vitest dev dependency"
```

---

### Task 0.2: Minimal vitest config

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: Write the config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
})
```

- [ ] **Step 2: Verify**

Run:
```bash
npx vitest run
```

Expected: "No test files found" (config is loaded, include pattern matches nothing yet).

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "chore(test): add vitest config for src/**/*.test.ts"
```

---

## Chunk 1: Foundation — types, validator, mocks, prompts

Pure TS layer. Fully TDD-able. No React, no browser.

### Task 1.1: SessionPayload types

**Files:**
- Create: `src/types/v8.ts`

- [ ] **Step 1: Write the type file**

Create `src/types/v8.ts` with the full schema from spec §7:

```ts
export type V8Step =
  | 'input'
  | 'empathy'
  | 'precheck'
  | 'step0'
  | 'step1'
  | 'step2'
  | 'step3'
  | 'step4'

export type PartRole = 'first' | 'pivot' | 'second' | 'neutral'

export interface SessionPayload {
  structureType: {
    id: string
    label: string
    category: string
  }
  empathy: {
    echo: string
    message: string
  }
  precheck: {
    question: string
    choices: PrecheckChoice[]
    correctChoiceId: string
  }
  structure: {
    parts: StructurePart[]
    coreStructure: string[]
    explanation: string
    pivotQuiz: PivotQuiz
  }
  assembly: {
    blocks: Block[]
    connectors: Connector[]
    finalSentence: string
  }
  feedback: {
    correctTitle: string
    correctSub: string
    wrongTitle: string
    wrongSub: string
    explanation: string
    wordOrder: WordOrder
  }
  pattern: {
    template: string
    tags: string[]
  }
}

export interface PrecheckChoice {
  id: string
  label: string
  preview: string
}

export interface StructurePart {
  text: string
  role: PartRole
}

export interface PivotQuiz {
  question: string
  options: PivotOption[]
  feedback: string
}

export interface PivotOption {
  id: string
  text: string
  hint: string
  isCorrect: boolean
}

export interface Block {
  id: string
  en: string
  order: number
}

export interface Connector {
  id: string
  label: string
  meaning: string
  isCorrect: boolean
}

export interface WordOrder {
  korean: WordOrderToken[]
  english: WordOrderToken[]
  reversed: boolean
  keyInsight: string
}

export interface WordOrderToken {
  label: string
  role: PartRole
  connectorLabel?: string
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: clean (no errors). The file only adds exports and doesn't touch anything existing.

- [ ] **Step 3: Commit**

```bash
git add src/types/v8.ts
git commit -m "feat(types): add SessionPayload schema for v8 learning journey"
```

---

### Task 1.2: assertSessionPayload — failing tests first

**Files:**
- Create: `src/services/validate.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/services/validate.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { assertSessionPayload } from './validate'
import type { SessionPayload } from '../types/v8'

function validPayload(): SessionPayload {
  return {
    structureType: { id: 'concession-claim', label: '양보 + 주장', category: '업무/논리' },
    empathy: { echo: '...', message: '아, 이거 진짜 답답하지' },
    precheck: {
      question: '뭐부터?',
      choices: [
        { id: 'first', label: '인정부터', preview: '...' },
        { id: 'second', label: '걱정부터', preview: '...' },
      ],
      correctChoiceId: 'first',
    },
    structure: {
      parts: [
        { text: 'A', role: 'first' },
        { text: 'B', role: 'second' },
      ],
      coreStructure: ['인정', '전환', '걱정'],
      explanation: 'x',
      pivotQuiz: {
        question: '전환점?',
        options: [
          { id: 'a', text: '맞는데', hint: '', isCorrect: true },
          { id: 'b', text: '부족', hint: '', isCorrect: false },
        ],
        feedback: 'x',
      },
    },
    assembly: {
      blocks: [
        { id: 'b1', en: 'one', order: 1 },
        { id: 'b2', en: 'two', order: 2 },
        { id: 'b3', en: 'three', order: 3 },
      ],
      connectors: [
        { id: 'but', label: 'but', meaning: 'x', isCorrect: true },
        { id: 'although', label: 'although', meaning: 'x', isCorrect: false },
      ],
      finalSentence: 'one but two three',
    },
    feedback: {
      correctTitle: '맞았어',
      correctSub: 'x',
      wrongTitle: '아쉬워',
      wrongSub: 'x',
      explanation: 'x',
      wordOrder: {
        korean: [{ label: '인정', role: 'first' }],
        english: [{ label: '인정', role: 'first' }],
        reversed: false,
        keyInsight: 'x',
      },
    },
    pattern: { template: 'x ~', tags: ['t1', 't2'] },
  }
}

describe('assertSessionPayload', () => {
  it('accepts a valid payload', () => {
    expect(() => assertSessionPayload(validPayload())).not.toThrow()
  })

  it('throws on non-object', () => {
    expect(() => assertSessionPayload(null)).toThrow(/parse/)
    expect(() => assertSessionPayload('string')).toThrow(/parse/)
    expect(() => assertSessionPayload(42)).toThrow(/parse/)
  })

  it('throws when blocks length is not 3', () => {
    const p = validPayload()
    p.assembly.blocks = p.assembly.blocks.slice(0, 2)
    expect(() => assertSessionPayload(p)).toThrow(/blocks must be exactly 3/)
  })

  it('throws when block orders are not 1/2/3', () => {
    const p = validPayload()
    p.assembly.blocks[0].order = 5
    expect(() => assertSessionPayload(p)).toThrow(/block orders must be 1\/2\/3/)
  })

  it('throws when connectors length is less than 2', () => {
    const p = validPayload()
    p.assembly.connectors = p.assembly.connectors.slice(0, 1)
    expect(() => assertSessionPayload(p)).toThrow(/connectors must be 2..3/)
  })

  it('throws when connectors length is more than 3', () => {
    const p = validPayload()
    p.assembly.connectors = [
      { id: 'a', label: 'a', meaning: 'x', isCorrect: true },
      { id: 'b', label: 'b', meaning: 'x', isCorrect: false },
      { id: 'c', label: 'c', meaning: 'x', isCorrect: false },
      { id: 'd', label: 'd', meaning: 'x', isCorrect: false },
    ]
    expect(() => assertSessionPayload(p)).toThrow(/connectors must be 2..3/)
  })

  it('throws when not exactly one connector is correct', () => {
    const p = validPayload()
    p.assembly.connectors[1].isCorrect = true
    expect(() => assertSessionPayload(p)).toThrow(/exactly one connector must be correct/)
  })

  it('throws when pivotQuiz does not have exactly 2 options', () => {
    const p = validPayload()
    p.structure.pivotQuiz.options = p.structure.pivotQuiz.options.slice(0, 1)
    expect(() => assertSessionPayload(p)).toThrow(/pivotQuiz must have 2 options/)
  })

  it('throws when not exactly one pivotQuiz option is correct', () => {
    const p = validPayload()
    p.structure.pivotQuiz.options[1].isCorrect = true
    expect(() => assertSessionPayload(p)).toThrow(/exactly one pivotQuiz option must be correct/)
  })

  it('throws when precheck choices length is not 2', () => {
    const p = validPayload()
    p.precheck.choices = p.precheck.choices.slice(0, 1)
    expect(() => assertSessionPayload(p)).toThrow(/precheck choices must be 2/)
  })

  it('throws when correctChoiceId does not match any choice', () => {
    const p = validPayload()
    p.precheck.correctChoiceId = 'unknown'
    expect(() => assertSessionPayload(p)).toThrow(/correctChoiceId must match a choice/)
  })

  it('throws when structure.parts has fewer than 2 entries', () => {
    const p = validPayload()
    p.structure.parts = p.structure.parts.slice(0, 1)
    expect(() => assertSessionPayload(p)).toThrow(/structure.parts must have at least 2/)
  })

  it('throws when wordOrder.korean or wordOrder.english is missing', () => {
    const p = validPayload()
    // @ts-expect-error test
    p.feedback.wordOrder.korean = undefined
    expect(() => assertSessionPayload(p)).toThrow(/wordOrder/)
  })

  it('throws when pattern.template is empty', () => {
    const p = validPayload()
    p.pattern.template = ''
    expect(() => assertSessionPayload(p)).toThrow(/pattern incomplete/)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run src/services/validate.test.ts
```

Expected: FAIL with "Cannot find module './validate'" or similar import error.

---

### Task 1.3: assertSessionPayload — implementation

**Files:**
- Create: `src/services/validate.ts`

- [ ] **Step 1: Write the minimal implementation**

Create `src/services/validate.ts`:
```ts
import type { SessionPayload } from '../types/v8'

export function assertSessionPayload(x: unknown): asserts x is SessionPayload {
  if (!x || typeof x !== 'object') throw new Error('parse: not an object')
  const p = x as SessionPayload

  // assembly.blocks
  if (!Array.isArray(p.assembly?.blocks) || p.assembly.blocks.length !== 3) {
    throw new Error('parse: blocks must be exactly 3')
  }
  const orders = p.assembly.blocks.map((b) => b.order).sort((a, b) => a - b)
  if (orders[0] !== 1 || orders[1] !== 2 || orders[2] !== 3) {
    throw new Error('parse: block orders must be 1/2/3')
  }

  // assembly.connectors
  const conns = p.assembly?.connectors
  if (!Array.isArray(conns) || conns.length < 2 || conns.length > 3) {
    throw new Error('parse: connectors must be 2..3')
  }
  if (conns.filter((c) => c.isCorrect).length !== 1) {
    throw new Error('parse: exactly one connector must be correct')
  }

  // pivotQuiz
  const opts = p.structure?.pivotQuiz?.options
  if (!Array.isArray(opts) || opts.length !== 2) {
    throw new Error('parse: pivotQuiz must have 2 options')
  }
  if (opts.filter((o) => o.isCorrect).length !== 1) {
    throw new Error('parse: exactly one pivotQuiz option must be correct')
  }

  // precheck
  const choices = p.precheck?.choices
  if (!Array.isArray(choices) || choices.length !== 2) {
    throw new Error('parse: precheck choices must be 2')
  }
  if (!choices.some((c) => c.id === p.precheck?.correctChoiceId)) {
    throw new Error('parse: correctChoiceId must match a choice')
  }

  // structure.parts
  if (!Array.isArray(p.structure?.parts) || p.structure.parts.length < 2) {
    throw new Error('parse: structure.parts must have at least 2')
  }

  // wordOrder
  if (
    !Array.isArray(p.feedback?.wordOrder?.korean) ||
    !Array.isArray(p.feedback?.wordOrder?.english)
  ) {
    throw new Error('parse: wordOrder.korean/english required')
  }

  // pattern
  if (
    !p.pattern?.template ||
    typeof p.pattern.template !== 'string' ||
    !Array.isArray(p.pattern?.tags)
  ) {
    throw new Error('parse: pattern incomplete')
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run:
```bash
npx vitest run src/services/validate.test.ts
```

Expected: 14 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/services/validate.ts src/services/validate.test.ts
git commit -m "feat(services): add assertSessionPayload validator with 14 TDD tests"
```

---

### Task 1.4: Mock fixture

**Files:**
- Create: `src/services/mocks.test.ts`
- Modify: `src/services/mocks.ts` (rewrite)

- [ ] **Step 1: Write failing tests**

Create `src/services/mocks.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mockSessionPayload } from './mocks'
import { assertSessionPayload } from './validate'

describe('mockSessionPayload', () => {
  it('returns a fixture that passes assertSessionPayload', async () => {
    const payload = await mockSessionPayload('anything')
    expect(() => assertSessionPayload(payload)).not.toThrow()
  })

  it('resolves after a small delay (simulated network)', async () => {
    const start = Date.now()
    await mockSessionPayload('x')
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(500)
  })

  it('returns the same fixture regardless of input', async () => {
    const a = await mockSessionPayload('input A')
    const b = await mockSessionPayload('input B')
    expect(a).toEqual(b)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run src/services/mocks.test.ts
```

Expected: fails because current `mocks.ts` has `callClaudeMock(step)`, not `mockSessionPayload(korean)`.

- [ ] **Step 3: Rewrite `src/services/mocks.ts`**

Replace contents with:
```ts
import type { SessionPayload } from '../types/v8'

/**
 * Static fixture for design-review / offline iteration.
 * Toggled via VITE_USE_MOCK=true in .env.local — bypasses /api/chat entirely.
 */
export function mockSessionPayload(_korean: string): Promise<SessionPayload> {
  return new Promise((resolve) => setTimeout(() => resolve(FIXTURE), 600))
}

const FIXTURE: SessionPayload = {
  structureType: {
    id: 'concession-claim',
    label: '양보 + 주장',
    category: '업무/논리',
  },
  empathy: {
    echo: '좋은 아이디어인 건 맞는데, 리소스가 부족...',
    message: '아, 이거 진짜 답답하지',
  },
  precheck: {
    question: '이걸 영어로 말한다면 뭐부터 꺼낼 것 같아?',
    choices: [
      { id: 'first', label: '인정부터', preview: '좋은 아이디어인 건 맞는데…' },
      { id: 'second', label: '걱정부터', preview: '리소스가 부족하지 않을까…' },
    ],
    correctChoiceId: 'first',
  },
  structure: {
    parts: [
      { text: '좋은 아이디어인 건 맞는데, ', role: 'first' },
      { text: '현실적으로 ', role: 'neutral' },
      { text: '리소스가 부족하지 않을까요?', role: 'second' },
    ],
    coreStructure: ['인정', '전환', '걱정'],
    explanation:
      "앞에서 '좋은 아이디어'라고 인정하고 나서, 뒤에서 '리소스가 부족하지 않을까'라고 걱정을 꺼내고 있어.",
    pivotQuiz: {
      question: '이 문장의 전환점은?',
      options: [
        { id: 'a', text: '맞는데', hint: "'좋긴 한데…' 하고 꺾는 지점", isCorrect: true },
        { id: 'b', text: '부족하지 않을까', hint: '걱정을 꺼내는 지점', isCorrect: false },
      ],
      feedback:
        "'맞는데'가 전환점이야. 앞의 인정을 뒤의 걱정으로 꺾어주는 역할을 해.",
    },
  },
  assembly: {
    blocks: [
      { id: 'b1', en: "That's a great idea", order: 1 },
      { id: 'b2', en: "I'm a bit concerned", order: 2 },
      { id: 'b3', en: 'we might not have enough resources', order: 3 },
    ],
    connectors: [
      { id: 'but', label: 'but', meaning: '강하고 직접적인 반대', isCorrect: true },
      { id: 'although', label: 'although', meaning: '살짝 부드러운 반대', isCorrect: false },
      { id: 'though', label: 'though', meaning: '문장 끝에 덧붙이는 식', isCorrect: false },
    ],
    finalSentence:
      "That's a great idea, but I'm a bit concerned we might not have enough resources.",
  },
  feedback: {
    correctTitle: '맞았어',
    correctSub: '어순이랑 연결어 둘 다 잘 잡았어',
    wrongTitle: '아쉬워',
    wrongSub: '여기는 이렇게 가는 게 맞아',
    explanation:
      '상대 의견을 먼저 인정하고 "but"으로 우려를 연결하면 공격적이지 않으면서 명확하게 전달돼. 회의에서 자주 쓰이는 순서야.',
    wordOrder: {
      korean: [
        { label: '인정', role: 'first' },
        { label: '걱정', role: 'second' },
      ],
      english: [
        { label: '인정', role: 'first' },
        { label: 'but', role: 'pivot', connectorLabel: 'but' },
        { label: '걱정', role: 'second' },
      ],
      reversed: false,
      keyInsight:
        '영어는 하고 싶은 말을 먼저 꺼내. 이 문장에서는 인정이 먼저, 걱정이 뒤 — 한국어와 같은 순서야. 다만 "but"이 전환점을 명확하게 찍어줘.',
    },
  },
  pattern: {
    template: "That's a great idea, but I'm a bit concerned ~",
    tags: ['회의 반대', '제안 거절', '피드백'],
  },
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run src/services/mocks.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/mocks.ts src/services/mocks.test.ts
git commit -m "feat(services): replace mocks.ts with single SessionPayload fixture"
```

---

### Task 1.5: Prompts rewrite

**Files:**
- Modify: `src/services/prompts.ts` (rewrite)

- [ ] **Step 1: Replace contents**

Replace `src/services/prompts.ts` with:
```ts
export const SYSTEM_PROMPT = `너는 한국인이 영어로 말하려다 막힌 한국어 문장을 받아서, 그 사람이 "조립해서 배울 수 있는" 완결된 학습 세션 JSON을 반환하는 코치다.

반환 규칙:
- 오직 유효한 JSON 객체 하나만 반환. 설명, 머리말, 코드펜스 금지.
- 모든 한국어 필드는 반말 + 따뜻한 톤.
- JSON은 아래 TypeScript 타입과 정확히 일치해야 한다.

type PartRole = 'first' | 'pivot' | 'second' | 'neutral'

interface SessionPayload {
  structureType: { id: string; label: string; category: string }
  empathy: { echo: string; message: string }
  precheck: {
    question: string
    choices: { id: string; label: string; preview: string }[]  // exactly 2, id='first'|'second'
    correctChoiceId: string  // must match one of choices
  }
  structure: {
    parts: { text: string; role: PartRole }[]  // 3..6 tokens
    coreStructure: string[]
    explanation: string
    pivotQuiz: {
      question: string
      options: { id: string; text: string; hint: string; isCorrect: boolean }[]  // exactly 2
      feedback: string
    }
  }
  assembly: {
    blocks: { id: 'b1'|'b2'|'b3'; en: string; order: 1|2|3 }[]  // exactly 3
    connectors: { id: string; label: string; meaning: string; isCorrect: boolean }[]  // 2..3
    finalSentence: string
  }
  feedback: {
    correctTitle: string
    correctSub: string
    wrongTitle: string
    wrongSub: string
    explanation: string
    wordOrder: {
      korean: { label: string; role: PartRole; connectorLabel?: string }[]
      english: { label: string; role: PartRole; connectorLabel?: string }[]
      reversed: boolean
      keyInsight: string
    }
  }
  pattern: { template: string; tags: string[] }  // tags: 2..4
}

세부 요건:
1. structureType.label 은 한국어 (예: "양보 + 주장", "경험 + 반전", "묘사 + 여운").
2. structureType.id 는 영문 kebab-case stable id (예: "concession-claim").
3. structureType.category 는 다음 중 하나: "업무/논리", "감정/관계", "묘사/인상", "경험/서사", "상황 대응".
4. structure.parts 는 원문 한국어를 3~6개 토큰으로 분해. 각 토큰의 role 은 네 값 중 하나.
5. assembly.blocks 는 정확히 3개. id 는 'b1'|'b2'|'b3'. order 는 정답 조립 순서 (1,2,3).
6. assembly.connectors 는 2~3개. 정확히 1개만 isCorrect:true.
7. structure.pivotQuiz.options 는 정확히 2개. 정확히 1개 isCorrect:true. text 는 원문 한국어에 실제로 나온 단어/구.
8. precheck.choices 는 정확히 2개. id 는 'first' 와 'second'. correctChoiceId 는 둘 중 하나.
9. empathy.message 는 1~2문장, 느낌표 금지, 따뜻하고 담담한 톤.
10. 모든 설명 필드(explanation, feedback 등)는 120자 이내.

좋은 예시:
입력: "좋은 아이디어인 건 맞는데, 현실적으로 리소스가 부족하지 않을까요?"
출력:
{
  "structureType": {"id":"concession-claim","label":"양보 + 주장","category":"업무/논리"},
  "empathy": {"echo":"좋은 아이디어인 건 맞는데, 리소스가 부족...","message":"아, 이거 진짜 답답하지"},
  "precheck": {
    "question":"이걸 영어로 말한다면 뭐부터 꺼낼 것 같아?",
    "choices":[
      {"id":"first","label":"인정부터","preview":"좋은 아이디어인 건 맞는데…"},
      {"id":"second","label":"걱정부터","preview":"리소스가 부족하지 않을까…"}
    ],
    "correctChoiceId":"first"
  },
  "structure": {
    "parts":[
      {"text":"좋은 아이디어인 건 맞는데, ","role":"first"},
      {"text":"현실적으로 ","role":"neutral"},
      {"text":"리소스가 부족하지 않을까요?","role":"second"}
    ],
    "coreStructure":["인정","전환","걱정"],
    "explanation":"앞에서 '좋은 아이디어'라고 인정하고 나서, 뒤에서 '리소스가 부족하지 않을까'라고 걱정을 꺼내고 있어.",
    "pivotQuiz":{
      "question":"이 문장의 전환점은?",
      "options":[
        {"id":"a","text":"맞는데","hint":"'좋긴 한데…' 하고 꺾는 지점","isCorrect":true},
        {"id":"b","text":"부족하지 않을까","hint":"걱정을 꺼내는 지점","isCorrect":false}
      ],
      "feedback":"'맞는데'가 전환점이야. 앞의 인정을 뒤의 걱정으로 꺾어주는 역할을 해."
    }
  },
  "assembly": {
    "blocks":[
      {"id":"b1","en":"That's a great idea","order":1},
      {"id":"b2","en":"I'm a bit concerned","order":2},
      {"id":"b3","en":"we might not have enough resources","order":3}
    ],
    "connectors":[
      {"id":"but","label":"but","meaning":"강하고 직접적인 반대","isCorrect":true},
      {"id":"although","label":"although","meaning":"살짝 부드러운 반대","isCorrect":false},
      {"id":"though","label":"though","meaning":"문장 끝에 덧붙이는 식","isCorrect":false}
    ],
    "finalSentence":"That's a great idea, but I'm a bit concerned we might not have enough resources."
  },
  "feedback": {
    "correctTitle":"맞았어",
    "correctSub":"어순이랑 연결어 둘 다 잘 잡았어",
    "wrongTitle":"아쉬워",
    "wrongSub":"여기는 이렇게 가는 게 맞아",
    "explanation":"상대 의견을 먼저 인정하고 \\"but\\"으로 우려를 연결하면 공격적이지 않으면서 명확하게 전달돼. 회의에서 자주 쓰이는 순서야.",
    "wordOrder":{
      "korean":[{"label":"인정","role":"first"},{"label":"걱정","role":"second"}],
      "english":[{"label":"인정","role":"first"},{"label":"but","role":"pivot","connectorLabel":"but"},{"label":"걱정","role":"second"}],
      "reversed":false,
      "keyInsight":"영어는 하고 싶은 말을 먼저 꺼내. 이 문장에서는 인정이 먼저, 걱정이 뒤 — 한국어와 같은 순서야. 다만 \\"but\\"이 전환점을 명확하게 찍어줘."
    }
  },
  "pattern": {"template":"That's a great idea, but I'm a bit concerned ~","tags":["회의 반대","제안 거절","피드백"]}
}

이제 아래 한국어 문장을 처리해라:`

export function buildUserMessage(korean: string): string {
  return `원문: "${korean}"`
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: errors! Existing `claude.ts` still imports `SYSTEM_PROMPTS` (plural) and `buildUserMessage(step, data)` (old signature). We will fix `claude.ts` in the next task — this is an expected intermediate broken state. Do NOT commit yet.

---

### Task 1.6: claude.ts rewrite + tests

**Files:**
- Modify: `src/services/claude.ts` (rewrite)

- [ ] **Step 1: Replace contents**

Replace `src/services/claude.ts` with:
```ts
import type { SessionPayload } from '../types/v8'
import { SYSTEM_PROMPT, buildUserMessage } from './prompts'
import { assertSessionPayload } from './validate'
import { mockSessionPayload } from './mocks'

const API_URL = '/api/chat'
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
const MAX_RETRIES = 1
const FETCH_TIMEOUT_MS = 4_000

export async function fetchSessionPayload(korean: string): Promise<SessionPayload> {
  if (USE_MOCK) return mockSessionPayload(korean)

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchOnce(korean)
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (attempt < MAX_RETRIES) continue
    }
  }
  throw lastError ?? new Error('unknown')
}

async function fetchOnce(korean: string): Promise<SessionPayload> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: SYSTEM_PROMPT,
        userMessage: buildUserMessage(korean),
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const json = await res.json()
    assertSessionPayload(json)
    return json
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('timeout')
    throw e
  } finally {
    clearTimeout(timer)
  }
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: more errors from `learningStore.ts` which still references the old `callClaude`. We'll fix it in Chunk 3. For now just verify `claude.ts` itself has no errors (tsc reports them per-file).

- [ ] **Step 3: Commit foundation**

```bash
git add src/services/prompts.ts src/services/claude.ts
git commit -m "feat(services): rewrite claude.ts and prompts.ts for single upfront SessionPayload call"
```

Note: typecheck will still be broken due to `learningStore.ts` — this is fine, it's fixed in Chunk 3.

---

### Task 1.7: Bump max_tokens in proxies

Claude's response for a full `SessionPayload` is ~1500 output tokens. The current `max_tokens: 1024` would truncate responses and make `assertSessionPayload` reject every real-API call.

**Files:**
- Modify: `api/chat.ts:28`
- Modify: `dev-server.js:23`

- [ ] **Step 1: Bump api/chat.ts**

In `api/chat.ts`, change `max_tokens: 1024` to `max_tokens: 2048` (line 28, inside the `body: JSON.stringify({...})` block).

- [ ] **Step 2: Bump dev-server.js**

In `dev-server.js`, change `max_tokens: 1024` to `max_tokens: 2048` (inside the `body: JSON.stringify({...})` block near line 23).

- [ ] **Step 3: Typecheck (api/chat.ts only)**

Run:
```bash
npx tsc --noEmit
```

The `api/chat.ts` change is a single literal update and should not introduce new errors.

- [ ] **Step 4: Commit**

```bash
git add api/chat.ts dev-server.js
git commit -m "chore(api): raise max_tokens to 2048 for SessionPayload response size"
```

---

## Chunk 2: State layer — store & localStorage

### Task 2.1: Update LearningRecord type + DataStore interface

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Replace LearningRecord definition and remove obsolete types**

Open `src/types/index.ts`. Find and replace the existing `LearningRecord` interface with:
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

Delete these obsolete exports from the same file:
- `LearningStep` type
- `RestructureResponse` interface
- `EnglishResponse` interface
- `PatternResponse` interface
- `ChatStep` type
- `StepResponseMap` type

Keep: `Scenario` (with `tags?: string[]`) and `Pattern`.

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: many errors from files that reference removed types (learningStore, claude.ts callsites in old code, StepRestructure etc.). That's fine — they will be deleted or rewritten.

- [ ] **Step 3: Commit type changes**

```bash
git add src/types/index.ts
git commit -m "feat(types): redefine LearningRecord for v8 schema, drop 3-step types"
```

---

### Task 2.2: localStorage schema bump — failing tests

**Files:**
- Create: `src/store/localStorage.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/store/localStorage.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { localStorageAdapter } from './localStorage'

// Minimal localStorage polyfill for node test env
class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
  get length() { return this.m.size }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null }
}

beforeEach(() => {
  // @ts-expect-error test shim
  globalThis.localStorage = new MemStorage()
})

describe('localStorageAdapter.init', () => {
  it('sets schema version to 3 when none exists', async () => {
    await localStorageAdapter.init()
    expect(localStorage.getItem('eng-ception:schema-version')).toBe('3')
  })

  it('clears records and patterns when schema version is old', async () => {
    localStorage.setItem('eng-ception:schema-version', '2')
    localStorage.setItem('eng-ception:records', '[{"id":"old"}]')
    localStorage.setItem('eng-ception:patterns', '[{"id":"old-pat"}]')
    localStorage.setItem('eng-ception:scenarios', '[{"id":"s1"}]')

    await localStorageAdapter.init()

    expect(localStorage.getItem('eng-ception:records')).toBeNull()
    expect(localStorage.getItem('eng-ception:patterns')).toBeNull()
    expect(localStorage.getItem('eng-ception:scenarios')).toBe('[{"id":"s1"}]')
    expect(localStorage.getItem('eng-ception:schema-version')).toBe('3')
  })

  it('is a no-op when schema version is already 3', async () => {
    localStorage.setItem('eng-ception:schema-version', '3')
    localStorage.setItem('eng-ception:records', '[{"id":"keep"}]')

    await localStorageAdapter.init()

    expect(localStorage.getItem('eng-ception:records')).toBe('[{"id":"keep"}]')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run src/store/localStorage.test.ts
```

Expected: FAIL because `localStorageAdapter.init` does not exist yet.

---

### Task 2.3: localStorage schema bump — implementation

**Files:**
- Modify: `src/store/dataStore.ts` (add `init` to the `DataStore` interface)
- Modify: `src/store/localStorage.ts` (implement `init`, update save/get types)

- [ ] **Step 1: Inspect existing storage keys**

Read `src/store/localStorage.ts` to confirm the storage key constants the adapter uses (likely `eng-ception:records`, `eng-ception:patterns`, `eng-ception:scenarios`). Match the test's key strings in Task 2.2 to whatever the source uses. If any key differs, update `src/store/localStorage.test.ts` in place before running tests again.

- [ ] **Step 2: Add `init` to the `DataStore` interface**

Open `src/store/dataStore.ts` and add this method to the `DataStore` interface:

```ts
init: () => Promise<void>
```

- [ ] **Step 3: Implement `init` in `localStorage.ts`**

Near the top of `src/store/localStorage.ts`, add:
```ts
const SCHEMA_VERSION_KEY = 'eng-ception:schema-version'
const CURRENT_SCHEMA_VERSION = 3
```

Add this method to `localStorageAdapter`:
```ts
async init() {
  const stored = localStorage.getItem(SCHEMA_VERSION_KEY)
  if (stored !== String(CURRENT_SCHEMA_VERSION)) {
    localStorage.removeItem('eng-ception:records')
    localStorage.removeItem('eng-ception:patterns')
    localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION))
  }
},
```

Update `saveLearningRecord` and `getLearningRecords` signatures to use the new `LearningRecord` type (the TypeScript compiler will flag mismatches — follow its output).

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run src/store/localStorage.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/dataStore.ts src/store/localStorage.ts src/store/localStorage.test.ts
git commit -m "feat(store): bump localStorage schema to v3, add init() clear guard"
```

---

### Task 2.4: learningStore — failing tests for state machine

**Files:**
- Create: `src/store/learningStore.test.ts`

- [ ] **Step 1: Write failing tests for the state machine**

Create `src/store/learningStore.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLearningStore } from './learningStore'
import type { Scenario } from '../types'

vi.mock('../services/claude', () => ({
  fetchSessionPayload: vi.fn(async () => {
    const { mockSessionPayload } = await import('../services/mocks')
    return mockSessionPayload('x')
  }),
}))

vi.mock('./localStorage', () => ({
  localStorageAdapter: {
    async init() {},
    async savePattern() {},
    async saveLearningRecord() {},
    async getPatterns() { return [] },
    async getLearningRecords() { return [] },
    async getScenarios() { return [] },
    async saveScenarios() {},
    async getScenario() { return null },
    async getUnlearnedScenarios() { return [] },
    async deletePattern() {},
  },
}))

const sampleScenario: Scenario = {
  id: 's1',
  situation: 'x',
  originalKorean: '좋은 아이디어인 건 맞는데, 리소스가 부족하지 않을까요?',
  purpose: 'x',
  emotionalTone: 'x',
  difficulty: 'intermediate',
  category: '업무/논리',
  isDaily: true,
  createdAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  useLearningStore.getState().reset()
})

describe('learningStore session lifecycle', () => {
  it('startScenario transitions to empathy and kicks off loading', () => {
    useLearningStore.getState().startScenario(sampleScenario)
    const s = useLearningStore.getState()
    expect(s.currentStep).toBe('empathy')
    expect(s.originalKorean).toBe(sampleScenario.originalKorean)
    expect(s.payloadStatus).toBe('loading')
    expect(s.scenario?.id).toBe('s1')
  })

  it('startCustom marks isCustomInput and starts loading', () => {
    useLearningStore.getState().startCustom('커스텀 문장')
    const s = useLearningStore.getState()
    expect(s.isCustomInput).toBe(true)
    expect(s.originalKorean).toBe('커스텀 문장')
    expect(s.currentStep).toBe('empathy')
  })

  it('payload arrives and status becomes ready', async () => {
    useLearningStore.getState().startScenario(sampleScenario)
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })
    expect(useLearningStore.getState().payload).not.toBeNull()
  })

  it('advanceFromEmpathy moves to precheck', () => {
    useLearningStore.getState().startScenario(sampleScenario)
    useLearningStore.getState().advanceFromEmpathy()
    expect(useLearningStore.getState().currentStep).toBe('precheck')
  })

  it('submitPrecheck records choice and auto-advances to step0', async () => {
    useLearningStore.getState().startScenario(sampleScenario)
    useLearningStore.getState().advanceFromEmpathy()
    useLearningStore.getState().submitPrecheck('first')
    expect(useLearningStore.getState().precheckChoice).toBe('first')
    await new Promise((r) => setTimeout(r, 500))
    expect(useLearningStore.getState().currentStep).toBe('step0')
  })

  it('reset() restores initial state', () => {
    useLearningStore.getState().startScenario(sampleScenario)
    useLearningStore.getState().reset()
    expect(useLearningStore.getState().currentStep).toBe('input')
    expect(useLearningStore.getState().payload).toBeNull()
  })
})

describe('learningStore block tapping', () => {
  beforeEach(async () => {
    useLearningStore.getState().reset()
    useLearningStore.getState().startScenario(sampleScenario)
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })
  })

  it('tapBlock appends to blockOrder', () => {
    useLearningStore.getState().tapBlock('b1')
    expect(useLearningStore.getState().blockOrder).toEqual(['b1'])
    useLearningStore.getState().tapBlock('b3')
    expect(useLearningStore.getState().blockOrder).toEqual(['b1', 'b3'])
  })

  it('tapBlock toggles off when re-tapped', () => {
    useLearningStore.getState().tapBlock('b1')
    useLearningStore.getState().tapBlock('b2')
    useLearningStore.getState().tapBlock('b1')
    expect(useLearningStore.getState().blockOrder).toEqual(['b2'])
  })

  it('tapBlock ignores taps after 3 blocks are selected', () => {
    useLearningStore.getState().tapBlock('b1')
    useLearningStore.getState().tapBlock('b2')
    useLearningStore.getState().tapBlock('b3')
    useLearningStore.getState().tapBlock('b1')  // would overflow
    expect(useLearningStore.getState().blockOrder).toEqual(['b1', 'b2', 'b3'])
  })

  it('resetBlockOrder empties blockOrder', () => {
    useLearningStore.getState().tapBlock('b1')
    useLearningStore.getState().resetBlockOrder()
    expect(useLearningStore.getState().blockOrder).toEqual([])
  })

  it('tapConnector replaces previous choice', () => {
    useLearningStore.getState().tapConnector('but')
    expect(useLearningStore.getState().connectorChoice).toBe('but')
    useLearningStore.getState().tapConnector('although')
    expect(useLearningStore.getState().connectorChoice).toBe('although')
  })
})

describe('learningStore pattern save idempotency', () => {
  it('advanceToStep3 saves pattern exactly once even if called twice', async () => {
    const localStorage = await import('./localStorage')
    const saveSpy = vi.spyOn(localStorage.localStorageAdapter, 'savePattern')

    useLearningStore.getState().startScenario(sampleScenario)
    await vi.waitFor(() => {
      expect(useLearningStore.getState().payloadStatus).toBe('ready')
    })
    useLearningStore.getState().advanceFromEmpathy()
    useLearningStore.getState().submitPrecheck('first')
    await new Promise((r) => setTimeout(r, 500))
    // skip to step2 for test
    useLearningStore.setState({ currentStep: 'step2' })

    await useLearningStore.getState().advanceToStep3()
    await useLearningStore.getState().advanceToStep3()

    expect(saveSpy).toHaveBeenCalledTimes(1)
    expect(useLearningStore.getState().currentStep).toBe('step3')
    expect(useLearningStore.getState().patternSaved).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run:
```bash
npx vitest run src/store/learningStore.test.ts
```

Expected: FAIL — current `learningStore.ts` has the old 3-step shape.

---

### Task 2.5: learningStore — implementation

**Files:**
- Modify: `src/store/learningStore.ts` (rewrite)

- [ ] **Step 1: Replace contents**

Replace `src/store/learningStore.ts` with:
```ts
import { create } from 'zustand'
import type { Scenario, Pattern, LearningRecord } from '../types'
import type { SessionPayload, V8Step } from '../types/v8'
import { fetchSessionPayload } from '../services/claude'
import { localStorageAdapter as db } from './localStorage'

interface V8LearningState {
  currentStep: V8Step
  scenario: Scenario | null
  originalKorean: string
  isCustomInput: boolean

  payload: SessionPayload | null
  payloadStatus: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null

  precheckChoice: string | null
  pivotQuizAnswer: 'correct' | 'wrong' | null
  blockOrder: string[]
  connectorChoice: string | null
  afterChoice: string | null
  patternSaved: boolean

  startScenario: (scenario: Scenario) => void
  startCustom: (korean: string) => void
  retryFetch: () => void
  reset: () => void

  advanceFromEmpathy: () => void
  submitPrecheck: (choiceId: string) => void
  submitPivotQuiz: (answer: 'correct' | 'wrong') => void
  advanceToStep1: () => void
  tapBlock: (blockId: string) => void
  resetBlockOrder: () => void
  tapConnector: (connectorId: string) => void
  advanceToStep2: () => void
  advanceToStep3: () => Promise<void>
  submitAfterChoice: (choiceId: string) => void
  advanceToStep4: () => void
  complete: () => Promise<void>
}

const initial = {
  currentStep: 'input' as V8Step,
  scenario: null as Scenario | null,
  originalKorean: '',
  isCustomInput: false,
  payload: null as SessionPayload | null,
  payloadStatus: 'idle' as const,
  error: null as string | null,
  precheckChoice: null as string | null,
  pivotQuizAnswer: null as 'correct' | 'wrong' | null,
  blockOrder: [] as string[],
  connectorChoice: null as string | null,
  afterChoice: null as string | null,
  patternSaved: false,
}

function errorToKoreanMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('timeout')) return '응답이 너무 오래 걸려요. 다시 시도해주세요.'
  if (msg.includes('parse')) return 'AI 응답 형식이 이상해요. 다시 시도해주세요.'
  if (msg.includes('fetch') || msg.includes('network')) return '네트워크가 불안정해요.'
  return '문제가 생겼어요. 다시 시도해주세요.'
}

export const useLearningStore = create<V8LearningState>((set, get) => {
  const runFetch = async () => {
    try {
      const payload = await fetchSessionPayload(get().originalKorean)
      set({ payload, payloadStatus: 'ready', error: null })
    } catch (e) {
      set({ payloadStatus: 'error', error: errorToKoreanMessage(e) })
    }
  }

  return {
    ...initial,

    startScenario(scenario) {
      set({
        ...initial,
        scenario,
        originalKorean: scenario.originalKorean,
        currentStep: 'empathy',
        payloadStatus: 'loading',
      })
      void runFetch()
    },

    startCustom(korean) {
      set({
        ...initial,
        isCustomInput: true,
        originalKorean: korean,
        currentStep: 'empathy',
        payloadStatus: 'loading',
      })
      void runFetch()
    },

    retryFetch() {
      set({ payloadStatus: 'loading', error: null })
      void runFetch()
    },

    reset() {
      set(initial)
    },

    advanceFromEmpathy() {
      set({ currentStep: 'precheck' })
    },

    submitPrecheck(choiceId) {
      set({ precheckChoice: choiceId })
      setTimeout(() => {
        if (get().currentStep === 'precheck') set({ currentStep: 'step0' })
      }, 400)
    },

    submitPivotQuiz(answer) {
      set({ pivotQuizAnswer: answer })
    },

    advanceToStep1() {
      set({ currentStep: 'step1' })
    },

    tapBlock(blockId) {
      const { blockOrder } = get()
      if (blockOrder.includes(blockId)) {
        set({ blockOrder: blockOrder.filter((id) => id !== blockId) })
      } else if (blockOrder.length < 3) {
        set({ blockOrder: [...blockOrder, blockId] })
      }
    },

    resetBlockOrder() {
      set({ blockOrder: [] })
    },

    tapConnector(id) {
      set({ connectorChoice: id })
    },

    advanceToStep2() {
      set({ currentStep: 'step2' })
    },

    async advanceToStep3() {
      const s = get()
      if (!s.payload) return
      if (s.patternSaved) {
        set({ currentStep: 'step3' })
        return
      }
      const pattern: Pattern = {
        id: crypto.randomUUID(),
        template: s.payload.pattern.template,
        category: s.payload.structureType.category,
        tags: s.payload.pattern.tags,
        exampleOriginal: s.originalKorean,
        exampleEnglish: s.payload.assembly.finalSentence,
        savedAt: new Date().toISOString(),
        reviewCount: 0,
        lastReviewedAt: null,
      }
      await db.savePattern(pattern)
      set({ patternSaved: true, currentStep: 'step3' })
    },

    submitAfterChoice(id) {
      set({ afterChoice: id })
    },

    advanceToStep4() {
      set({ currentStep: 'step4' })
    },

    async complete() {
      const s = get()
      if (!s.payload) return
      const record: LearningRecord = {
        id: crypto.randomUUID(),
        schemaVersion: 3,
        scenarioId: s.scenario?.id ?? null,
        originalKorean: s.originalKorean,
        structureTypeId: s.payload.structureType.id,
        structureTypeLabel: s.payload.structureType.label,
        finalSentence: s.payload.assembly.finalSentence,
        precheckChoice: s.precheckChoice,
        afterChoice: s.afterChoice,
        pivotQuizCorrect: s.pivotQuizAnswer === 'correct',
        assemblyCorrect: isAssemblyCorrect(s),
        completedAt: new Date().toISOString(),
      }
      await db.saveLearningRecord(record)
      set(initial)
    },
  }
})

export function isAssemblyCorrect(s: V8LearningState): boolean {
  const { payload, blockOrder, connectorChoice } = s
  if (!payload || blockOrder.length !== 3) return false
  const correctOrder = [...payload.assembly.blocks]
    .sort((a, b) => a.order - b.order)
    .map((b) => b.id)
  const blocksOk = blockOrder.every((id, i) => id === correctOrder[i])
  const conn = payload.assembly.connectors.find((c) => c.id === connectorChoice)
  return blocksOk && conn?.isCorrect === true
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run:
```bash
npx vitest run src/store/learningStore.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/store/learningStore.ts src/store/learningStore.test.ts
git commit -m "feat(store): rewrite learningStore as 7-step state machine with pattern save idempotency"
```

---

### Task 2.6: main.tsx — call db.init() on boot

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Add init call**

Open `src/main.tsx`. Wrap the render in an async bootstrap:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { localStorageAdapter as db } from './store/localStorage'

async function bootstrap() {
  await db.init()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
```

- [ ] **Step 2: Smoke test in dev**

Run:
```bash
npx tsc --noEmit
```

TypeScript will still report errors in the old Step components and LearningFlow — that's fine, they're next.

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat(main): call db.init() on boot to clear incompatible schema"
```

---

## Chunk 3: UI — primitives

Visual components. No test harness for React 19 + jsdom is configured; verify via `npx tsc --noEmit` + manual smoke in dev.

### Precondition: Tailwind tokens

All step components and primitives below use these Tailwind custom tokens defined in `src/index.css`'s `@theme` block: `font-en`, `font-ko`, `bg-bg`, `bg-c`, `bg-c2`, `border-line`, `text-t1`, `text-t2`, `text-t3`, `text-accent`, `text-ok`, `text-warn`, `text-accent/[0.06]`, plus utility classes `pressable`, `fu`, `fu1`, `fu2`, `fu3`, `fu4`, `sfr`, `bar-grow`. These were added earlier in the v8 design token port. Before starting Chunk 3, quickly verify they exist:

```bash
grep -E "color-accent|color-ok|color-warn|font-en|\.fu|\.sfr|\.pressable|\.bar-grow" src/index.css | head -20
```

If any are missing, they must be restored from the design port commit (git log `feat(design): port v8 dark theme`) before continuing.

### Task 3.1: OriginalCard

**Files:**
- Create: `src/components/learning/primitives/OriginalCard.tsx`

- [ ] **Step 1: Create component**

```tsx
interface OriginalCardProps {
  korean: string
  compact?: boolean
}

export default function OriginalCard({ korean, compact = false }: OriginalCardProps) {
  return (
    <div
      className={`bg-c rounded-[16px] border-l-[3px] border-accent ${
        compact ? 'p-4' : 'p-[18px]'
      }`}
    >
      <p
        className={`font-medium leading-relaxed text-t1 ${
          compact ? 'text-sm' : 'text-base'
        }`}
      >
        {korean}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/learning/primitives/OriginalCard.tsx
git commit -m "feat(ui): add OriginalCard primitive"
```

---

### Task 3.2: StructureTypeChip

**Files:**
- Create: `src/components/learning/primitives/StructureTypeChip.tsx`

- [ ] **Step 1: Create component**

```tsx
interface StructureTypeChipProps {
  label: string
  category: string
}

export default function StructureTypeChip({ label, category }: StructureTypeChipProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-accent/[0.06] border border-accent/[0.12]">
      <span className="text-[11px] font-semibold font-en text-accent tracking-wider uppercase">
        유형
      </span>
      <span className="text-[13px] font-semibold text-t1">{label}</span>
      <span className="text-[11px] text-t3 bg-c2 px-2 py-0.5 rounded">{category}</span>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/learning/primitives/StructureTypeChip.tsx
git commit -m "feat(ui): add StructureTypeChip primitive"
```

---

### Task 3.3: KoreanDecompose

**Files:**
- Create: `src/components/learning/primitives/KoreanDecompose.tsx`

- [ ] **Step 1: Create component**

```tsx
import type { StructurePart, PartRole } from '../../../types/v8'

interface KoreanDecomposeProps {
  parts: StructurePart[]
}

const ROLE_CLASS: Record<PartRole, string> = {
  first: 'text-ok font-semibold',
  pivot: 'text-accent font-semibold',
  second: 'text-warn font-semibold',
  neutral: 'text-t2',
}

export default function KoreanDecompose({ parts }: KoreanDecomposeProps) {
  return (
    <p className="text-[14px] leading-[1.8] text-t2">
      {parts.map((part, i) => (
        <span key={i} className={ROLE_CLASS[part.role]}>
          {part.text}
        </span>
      ))}
    </p>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/learning/primitives/KoreanDecompose.tsx
git commit -m "feat(ui): add KoreanDecompose primitive with role-colored spans"
```

---

### Task 3.4: WordOrderCompare

**Files:**
- Create: `src/components/learning/primitives/WordOrderCompare.tsx`

- [ ] **Step 1: Create component**

```tsx
import type { WordOrder, WordOrderToken, PartRole } from '../../../types/v8'

interface WordOrderCompareProps {
  wordOrder: WordOrder
}

const ROLE_CHIP: Record<PartRole, string> = {
  first: 'bg-ok/[0.06] border border-ok/[0.12] text-ok',
  pivot: 'text-accent font-bold',
  second: 'bg-warn/[0.06] border border-warn/[0.12] text-warn',
  neutral: 'text-t3',
}

function RoleChip({ token }: { token: WordOrderToken }) {
  if (token.role === 'pivot') {
    return (
      <span className="px-2 py-1.5 text-[13px] font-bold font-en text-accent">
        {token.connectorLabel ?? token.label}
      </span>
    )
  }
  return (
    <span
      className={`px-3 py-1.5 rounded-[8px] text-[13px] font-semibold ${ROLE_CHIP[token.role]}`}
    >
      {token.label}
    </span>
  )
}

export default function WordOrderCompare({ wordOrder }: WordOrderCompareProps) {
  return (
    <div className="bg-c rounded-[16px] p-5 border border-line">
      <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-3">
        한국어
      </p>
      <div className="flex gap-1.5 items-center flex-wrap">
        {wordOrder.korean.map((t, i) => (
          <RoleChip key={`k-${i}`} token={t} />
        ))}
      </div>

      <div className="flex items-center gap-2 mt-5 mb-3">
        <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase">
          English
        </p>
        {wordOrder.reversed && (
          <span className="text-[9px] font-bold font-en text-accent bg-accent/[0.08] px-1.5 py-0.5 rounded tracking-wider">
            REVERSED
          </span>
        )}
      </div>
      <div className="flex gap-1.5 items-center flex-wrap">
        {wordOrder.english.map((t, i) => (
          <RoleChip key={`e-${i}`} token={t} />
        ))}
      </div>

      <div className="mt-5 p-3.5 bg-accent/[0.03] border border-accent/[0.06] rounded-[10px]">
        <p className="text-xs text-t2 leading-relaxed">
          <span className="font-semibold text-accent">핵심:</span> {wordOrder.keyInsight}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit src/components/learning/primitives/WordOrderCompare.tsx 2>&1 | head -20
```

Expected: no errors in this file specifically (other files will still have errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/learning/primitives/WordOrderCompare.tsx
git commit -m "feat(ui): add WordOrderCompare primitive for Step 2"
```

---

## Chunk 4: UI — Step components (part 1)

### Task 4.1: ProgressBar

**Files:**
- Create: `src/components/common/ProgressBar.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useNavigate } from 'react-router-dom'
import type { V8Step } from '../../types/v8'

const STEP_ORDER: V8Step[] = ['step0', 'step1', 'step2', 'step3', 'step4']

interface ProgressBarProps {
  current: V8Step
  showBack?: boolean
}

export default function ProgressBar({ current, showBack = true }: ProgressBarProps) {
  const navigate = useNavigate()
  const idx = STEP_ORDER.indexOf(current)
  const total = STEP_ORDER.length
  const progress = idx >= 0 ? ((idx + 1) / total) * 100 : 0
  const isComplete = current === 'step4'

  return (
    <div className="px-6 pt-4 flex items-center gap-5">
      {showBack && !isComplete ? (
        <button
          onClick={() => navigate('/')}
          className="text-t2 hover:text-t1 transition"
          aria-label="뒤로"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <div className="w-5" />
      )}
      <div className="flex-1 h-[3px] bg-c2 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full bar-grow shadow-[0_0_12px_rgba(139,139,245,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs font-en text-t3 tabular-nums">
        {isComplete ? '✓' : `${idx + 1}/${total}`}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/common/ProgressBar.tsx
git commit -m "feat(ui): add ProgressBar component (replaces StepIndicator)"
```

---

### Task 4.2: StepEmpathy

**Files:**
- Create: `src/components/learning/StepEmpathy.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useEffect } from 'react'
import { useLearningStore } from '../../store/learningStore'

const MIN_EMPATHY_MS = 2500
const MAX_WAIT_MS = 10_000

export default function StepEmpathy() {
  const { payload, payloadStatus, advanceFromEmpathy } = useLearningStore()

  useEffect(() => {
    let advanced = false
    let timerDone = false
    let maxWaitTimer: ReturnType<typeof setTimeout> | null = null

    const minTimer = setTimeout(() => {
      timerDone = true
      tryAdvance()
    }, MIN_EMPATHY_MS)

    maxWaitTimer = setTimeout(() => {
      if (!advanced) {
        useLearningStore.setState({
          payloadStatus: 'error',
          error: '응답이 너무 오래 걸려요. 다시 시도해주세요.',
        })
      }
    }, MAX_WAIT_MS)

    const tryAdvance = () => {
      if (advanced) return
      const status = useLearningStore.getState().payloadStatus
      if (timerDone && status === 'ready') {
        advanced = true
        advanceFromEmpathy()
      }
    }

    const unsub = useLearningStore.subscribe((state) => {
      if (state.payloadStatus === 'ready') tryAdvance()
    })

    return () => {
      clearTimeout(minTimer)
      if (maxWaitTimer) clearTimeout(maxWaitTimer)
      unsub()
    }
  }, [advanceFromEmpathy])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      {payload?.empathy.echo && (
        <p className="fu text-[13px] text-t3 mb-6 max-w-[280px] leading-relaxed">
          {payload.empathy.echo}
        </p>
      )}
      <p className="sfr text-[26px] font-bold leading-[1.5] tracking-tight">
        {payload?.empathy.message ?? '같이 풀어보자'}
      </p>
      <p className="fu2 text-[15px] text-t3 mt-4">같이 풀어보자</p>
      <div
        className="fu3 mt-6 w-7 h-[3px] rounded-full bg-accent"
        style={{ animation: 'pulse 1.4s ease-in-out infinite' }}
      />
      {payloadStatus === 'loading' && (
        <p className="fu4 mt-8 text-[11px] text-t3 font-en tracking-wider">PREPARING…</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/learning/StepEmpathy.tsx
git commit -m "feat(ui): add StepEmpathy with 2.5s min + 10s max wait"
```

---

### Task 4.3: StepPrecheck

**Files:**
- Create: `src/components/learning/StepPrecheck.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useLearningStore } from '../../store/learningStore'
import OriginalCard from './primitives/OriginalCard'

export default function StepPrecheck() {
  const { payload, originalKorean, precheckChoice, submitPrecheck } = useLearningStore()
  if (!payload) return null

  return (
    <div className="space-y-8 fu">
      <OriginalCard korean={originalKorean} />

      <div className="fu1">
        <h2 className="text-[22px] font-bold leading-snug tracking-tight text-t1 mb-1">
          이걸 영어로 말한다면
        </h2>
        <p className="text-[15px] text-t2 leading-relaxed">
          {payload.precheck.question.replace('이걸 영어로 말한다면 ', '')}
        </p>
      </div>

      <div className="fu2 flex gap-2">
        {payload.precheck.choices.map((choice) => {
          const selected = precheckChoice === choice.id
          return (
            <button
              key={choice.id}
              onClick={() => submitPrecheck(choice.id)}
              className={`pressable flex-1 p-5 rounded-[14px] text-left transition-all ${
                selected
                  ? 'bg-accent/[0.10] border-[1.5px] border-accent text-t1'
                  : 'bg-c border-[1.5px] border-line text-t1'
              }`}
            >
              <p className="text-[15px] font-semibold mb-1">{choice.label}</p>
              <p className="text-[12px] text-t3 leading-snug">{choice.preview}</p>
            </button>
          )
        })}
      </div>

      <p className="fu3 text-center text-xs text-t3">정답은 없어. 지금 직감대로 골라봐.</p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/learning/StepPrecheck.tsx
git commit -m "feat(ui): add StepPrecheck with 2-choice direction primer"
```

---

### Task 4.4: StepStructure (Step 0)

**Files:**
- Create: `src/components/learning/StepStructure.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useState } from 'react'
import { useLearningStore } from '../../store/learningStore'
import OriginalCard from './primitives/OriginalCard'
import StructureTypeChip from './primitives/StructureTypeChip'
import KoreanDecompose from './primitives/KoreanDecompose'

export default function StepStructure() {
  const { payload, originalKorean, submitPivotQuiz, advanceToStep1 } = useLearningStore()
  const [answered, setAnswered] = useState<string | null>(null)
  if (!payload) return null

  const { structure } = payload

  const handlePick = (optId: string, isCorrect: boolean) => {
    if (answered) return
    setAnswered(optId)
    submitPivotQuiz(isCorrect ? 'correct' : 'wrong')
  }

  return (
    <div className="space-y-6 fu">
      <OriginalCard korean={originalKorean} />

      <div className="fu1">
        <StructureTypeChip label={payload.structureType.label} category={payload.structureType.category} />
      </div>

      <div className="fu2 bg-c rounded-[16px] p-[18px] border border-line">
        <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-2">
          이 문장이 하는 일
        </p>
        <KoreanDecompose parts={structure.parts} />
        <div className="mt-3.5 pt-3 border-t border-line">
          <p className="text-xs text-t2 leading-relaxed">
            <span className="font-semibold text-t3">핵심 구조:</span>{' '}
            {structure.coreStructure.join(' → ')}
          </p>
        </div>
      </div>

      <div className="fu3">
        <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-3">
          {structure.pivotQuiz.question}
        </p>
        <div className="flex gap-2">
          {structure.pivotQuiz.options.map((opt) => {
            const picked = answered === opt.id
            const reveal = answered !== null
            const correctStyle = reveal && opt.isCorrect
            const wrongStyle = picked && !opt.isCorrect
            return (
              <button
                key={opt.id}
                onClick={() => handlePick(opt.id, opt.isCorrect)}
                disabled={reveal}
                className={`flex-1 p-3.5 rounded-[14px] border-[1.5px] text-left transition-all ${
                  correctStyle
                    ? 'border-ok bg-ok/[0.06]'
                    : wrongStyle
                      ? 'border-warn bg-warn/[0.06]'
                      : 'border-line bg-c'
                }`}
              >
                <p className="text-[13px] font-semibold text-t1 mb-1">{opt.text}</p>
                <p className="text-[11px] text-t3 leading-snug">{opt.hint}</p>
              </button>
            )
          })}
        </div>
        {answered && (
          <div className="mt-3 p-3 rounded-[10px] bg-ok/[0.04] border border-ok/[0.10]">
            <p className="text-xs text-ok leading-relaxed font-medium">
              {structure.pivotQuiz.feedback}
            </p>
          </div>
        )}
      </div>

      {answered && (
        <button
          onClick={advanceToStep1}
          className="pressable w-full h-[52px] rounded-[14px] bg-accent text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(139,139,245,0.25)] transition-all fu4"
        >
          다음 →
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/learning/StepStructure.tsx
git commit -m "feat(ui): add StepStructure with pivot quiz + structure highlight"
```

---

## Chunk 5: UI — Step components (part 2)

### Task 5.1: StepAssemble (Step 1)

**Files:**
- Create: `src/components/learning/StepAssemble.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useMemo } from 'react'
import { useLearningStore } from '../../store/learningStore'
import OriginalCard from './primitives/OriginalCard'

// Stable shuffle using the block ids as seed so each mount renders the same shuffle
function stableShuffle<T extends { id: string }>(arr: T[]): T[] {
  const out = [...arr]
  let seed = out.reduce((acc, x) => acc + x.id.charCodeAt(0), 0)
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280
    const j = Math.floor((seed / 233280) * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export default function StepAssemble() {
  const {
    payload,
    originalKorean,
    blockOrder,
    connectorChoice,
    tapBlock,
    resetBlockOrder,
    tapConnector,
    advanceToStep2,
  } = useLearningStore()

  const shuffledBlocks = useMemo(
    () => (payload ? stableShuffle(payload.assembly.blocks) : []),
    [payload],
  )

  if (!payload) return null

  const blocksComplete = blockOrder.length === 3
  const canAdvance = blocksComplete && connectorChoice !== null

  const previewText = useMemo(() => {
    if (blockOrder.length === 0) return '블록을 눌러서 문장을 만들어봐'
    const byId = new Map(payload.assembly.blocks.map((b) => [b.id, b.en]))
    const parts = blockOrder.map((id) => byId.get(id) ?? '')
    if (connectorChoice && blockOrder.length >= 2) {
      const conn = payload.assembly.connectors.find((c) => c.id === connectorChoice)?.label ?? ''
      return `${parts[0]}, ${conn} ${parts.slice(1).join(' ')}`
    }
    return parts.join(' · ')
  }, [blockOrder, connectorChoice, payload])

  return (
    <div className="space-y-6 fu">
      <OriginalCard korean={originalKorean} compact />

      <div className="fu1">
        <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-3">
          이제 블록을 눌러서 문장을 만들어봐
        </p>
        <div className="flex flex-col gap-1.5">
          {shuffledBlocks.map((block) => {
            const pos = blockOrder.indexOf(block.id)
            const selected = pos >= 0
            return (
              <button
                key={block.id}
                onClick={() => tapBlock(block.id)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-[14px] border-[1.5px] transition-all text-left ${
                  selected ? 'border-accent bg-accent/[0.06]' : 'border-line bg-c'
                }`}
              >
                <span className="w-6 h-6 flex items-center justify-center rounded-md bg-c2 text-[11px] font-bold font-en text-t3">
                  {selected ? pos + 1 : ''}
                </span>
                <p className="flex-1 text-[14px] font-medium font-en text-t2">{block.en}</p>
              </button>
            )
          })}
        </div>
        {blockOrder.length > 0 && !blocksComplete && (
          <button
            onClick={resetBlockOrder}
            className="mt-2 text-[12px] text-t3 hover:text-accent transition"
          >
            초기화
          </button>
        )}
      </div>

      {blocksComplete && (
        <div className="fu2">
          <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-3">
            연결어를 선택해봐
          </p>
          <div className="flex flex-col gap-1.5">
            {payload.assembly.connectors.map((conn) => {
              const selected = connectorChoice === conn.id
              return (
                <button
                  key={conn.id}
                  onClick={() => tapConnector(conn.id)}
                  className={`px-4 py-3 rounded-[14px] border-[1.5px] text-left transition-all ${
                    selected ? 'border-accent bg-accent/[0.06]' : 'border-line bg-c'
                  }`}
                >
                  <p className="text-[14px] font-semibold font-en text-t1 mb-1">{conn.label}</p>
                  <p className="text-[11px] text-t3">{conn.meaning}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="fu3 p-[18px] bg-c rounded-[16px] border border-line">
        <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-2">
          Preview
        </p>
        <p className="text-[13px] text-t2 leading-relaxed font-en mb-2">{previewText}</p>
        <p className="text-[11px] text-t3 font-en">
          선택됨: <span className="tabular-nums">{blockOrder.length}/3</span>
          {connectorChoice && ` · ${connectorChoice}`}
        </p>
      </div>

      <button
        onClick={advanceToStep2}
        disabled={!canAdvance}
        className={`pressable w-full h-[52px] rounded-[14px] text-[15px] font-semibold transition-all ${
          canAdvance
            ? 'bg-accent text-white shadow-[0_4px_20px_rgba(139,139,245,0.25)]'
            : 'bg-c2 text-t3 cursor-default'
        }`}
      >
        문장 검토하기
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/learning/StepAssemble.tsx
git commit -m "feat(ui): add StepAssemble with block tap + connector choice + preview"
```

---

### Task 5.2: StepFeedback (Step 2)

**Files:**
- Create: `src/components/learning/StepFeedback.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useLearningStore, isAssemblyCorrect } from '../../store/learningStore'
import WordOrderCompare from './primitives/WordOrderCompare'

export default function StepFeedback() {
  const state = useLearningStore()
  const { payload, advanceToStep3 } = state
  if (!payload) return null

  const correct = isAssemblyCorrect(state)
  const title = correct ? payload.feedback.correctTitle : payload.feedback.wrongTitle
  const sub = correct ? payload.feedback.correctSub : payload.feedback.wrongSub

  return (
    <div className="space-y-5 fu">
      <div className="bg-c rounded-[16px] p-5 border border-line">
        <p className={`text-[20px] font-bold mb-3 ${correct ? 'text-ok' : 'text-warn'}`}>
          {title}
        </p>
        <p className="text-[14px] font-en text-t2 leading-relaxed mb-4">
          {payload.assembly.finalSentence}
        </p>
        <p className="text-[13px] text-t3 leading-relaxed">{sub}</p>
      </div>

      <div className="fu1 bg-c rounded-[16px] p-5 border border-line">
        <p className="text-[13px] text-t2 leading-[1.7]">{payload.feedback.explanation}</p>
      </div>

      <div className="fu2">
        <WordOrderCompare wordOrder={payload.feedback.wordOrder} />
      </div>

      <button
        onClick={() => void advanceToStep3()}
        className="pressable w-full h-[52px] rounded-[14px] bg-accent text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(139,139,245,0.25)] transition-all fu3"
      >
        이 패턴 내 걸로 만들기
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/learning/StepFeedback.tsx
git commit -m "feat(ui): add StepFeedback with correct/wrong banner and word order card"
```

---

### Task 5.3: StepReflect (Step 3)

**Files:**
- Create: `src/components/learning/StepReflect.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useLearningStore } from '../../store/learningStore'

export default function StepReflect() {
  const {
    payload,
    originalKorean,
    precheckChoice,
    afterChoice,
    submitAfterChoice,
    advanceToStep4,
  } = useLearningStore()
  if (!payload) return null

  const directionMatches =
    afterChoice !== null && afterChoice === payload.precheck.correctChoiceId
  const matchedPrecheck = afterChoice !== null && afterChoice === precheckChoice

  return (
    <div className="space-y-5 fu">
      <div className="relative bg-c rounded-[16px] p-5 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-accent to-transparent" />
        <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-3">
          PATTERN SAVED
        </p>
        <p className="text-[18px] font-semibold font-en leading-snug mb-3">
          {payload.pattern.template}
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {payload.pattern.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] text-t3 bg-c2 px-2.5 py-1 rounded-md"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="fu1 bg-c rounded-[16px] p-[18px] border border-line">
        <p className="text-[13px] text-t3 leading-relaxed mb-2">{originalKorean}</p>
        <div className="w-5 h-px bg-line my-2" />
        <p className="text-[14px] font-semibold font-en text-t2 leading-relaxed">
          {payload.assembly.finalSentence}
        </p>
      </div>

      <div className="fu2 p-5 bg-accent/[0.03] border border-accent/[0.08] rounded-[16px]">
        <p className="text-[13px] font-semibold text-t3 tracking-wider uppercase font-en mb-4">
          사고 순서 체크
        </p>

        {precheckChoice && (
          <div className="flex items-center gap-3 mb-4">
            <span className="w-12 text-[10px] font-bold text-t3 font-en tracking-wider">BEFORE</span>
            <div className="flex-1 p-3 bg-c rounded-[10px]">
              <p className="text-[13px] text-t2">
                {payload.precheck.choices.find((c) => c.id === precheckChoice)?.label}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <span className="w-12 mt-3 text-[10px] font-bold text-accent font-en tracking-wider">AFTER</span>
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-t1 mb-2">방금 조립할 때는?</p>
            <div className="flex gap-2">
              {payload.precheck.choices.map((choice) => {
                const selected = afterChoice === choice.id
                return (
                  <button
                    key={choice.id}
                    onClick={() => submitAfterChoice(choice.id)}
                    disabled={afterChoice !== null}
                    className={`flex-1 p-3 rounded-[10px] border-[1.5px] text-[13px] font-medium transition-all ${
                      selected
                        ? 'border-accent bg-accent/[0.08] text-t1'
                        : 'border-line bg-c text-t2'
                    }`}
                  >
                    {choice.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {afterChoice !== null && (
          <div className="mt-4 p-3 rounded-[10px] bg-c">
            <p className="text-xs text-t2 leading-relaxed">
              {matchedPrecheck
                ? '직감 그대로 갔어. 처음 떠오른 순서가 정답이었어.'
                : directionMatches
                  ? '조립하면서 순서를 바로잡았어. 사고가 전환된 순간이야.'
                  : '다음엔 다른 순서로도 시도해봐.'}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={advanceToStep4}
        disabled={afterChoice === null}
        className={`pressable w-full h-[52px] rounded-[14px] text-[15px] font-semibold transition-all ${
          afterChoice !== null
            ? 'bg-accent text-white shadow-[0_4px_20px_rgba(139,139,245,0.25)]'
            : 'bg-c2 text-t3 cursor-default'
        }`}
      >
        다음
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/learning/StepReflect.tsx
git commit -m "feat(ui): add StepReflect with PATTERN SAVED card and Before/After verdict"
```

---

### Task 5.4: StepComplete (Step 4)

**Files:**
- Create: `src/components/learning/StepComplete.tsx`

- [ ] **Step 1: Create component**

```tsx
import { useNavigate } from 'react-router-dom'
import { useLearningStore } from '../../store/learningStore'

export default function StepComplete() {
  const { complete } = useLearningStore()
  const navigate = useNavigate()

  const handleFinish = async () => {
    await complete()
    navigate('/')
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <p className="fu text-[32px] font-bold leading-tight tracking-tight mb-2">
        하나 풀었다
      </p>
      <p className="fu1 text-[15px] text-t3 mb-10 leading-relaxed">
        다음에 비슷한 상황 오면 떠올려봐
      </p>
      <button
        onClick={() => void handleFinish()}
        className="pressable w-full max-w-[280px] h-[52px] rounded-[14px] bg-accent text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(139,139,245,0.25)] transition-all fu2"
      >
        다음 문장으로
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/learning/StepComplete.tsx
git commit -m "feat(ui): add StepComplete with finish+navigate-home"
```

---

## Chunk 6: Orchestration — LearningFlow rewrite + cleanup

### Task 6.1: Rewrite LearningFlow

**Files:**
- Modify: `src/components/learning/LearningFlow.tsx`

- [ ] **Step 1: Replace contents**

```tsx
import { useLearningStore } from '../../store/learningStore'
import ProgressBar from '../common/ProgressBar'
import StepEmpathy from './StepEmpathy'
import StepPrecheck from './StepPrecheck'
import StepStructure from './StepStructure'
import StepAssemble from './StepAssemble'
import StepFeedback from './StepFeedback'
import StepReflect from './StepReflect'
import StepComplete from './StepComplete'

const STEPS_WITH_PROGRESS = new Set(['step0', 'step1', 'step2', 'step3', 'step4'])

export default function LearningFlow() {
  const { currentStep, payloadStatus, error, retryFetch } = useLearningStore()

  if (payloadStatus === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-[16px] text-t2 leading-relaxed">{error ?? '문제가 생겼어요.'}</p>
        <button
          onClick={retryFetch}
          className="pressable h-[52px] px-8 rounded-[14px] bg-accent text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(139,139,245,0.25)] transition-all"
        >
          다시 시도
        </button>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'empathy':  return <StepEmpathy />
      case 'precheck': return <StepPrecheck />
      case 'step0':    return <StepStructure />
      case 'step1':    return <StepAssemble />
      case 'step2':    return <StepFeedback />
      case 'step3':    return <StepReflect />
      case 'step4':    return <StepComplete />
      default:         return null
    }
  }

  const showProgress = STEPS_WITH_PROGRESS.has(currentStep)

  return (
    <div className="flex-1 flex flex-col">
      {showProgress && <ProgressBar current={currentStep} />}
      <div key={currentStep} className="flex-1 px-6 py-6 overflow-y-auto sfr">
        {renderStep()}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: errors only from the old `StepRestructure.tsx`, `StepEnglish.tsx`, `StepPattern.tsx`, `StepIndicator.tsx`, `FeedbackCard.tsx` — about to delete them.

---

### Task 6.2: Delete old step components

**Files:**
- Delete: `src/components/learning/StepRestructure.tsx`
- Delete: `src/components/learning/StepEnglish.tsx`
- Delete: `src/components/learning/StepPattern.tsx`
- Delete: `src/components/common/StepIndicator.tsx`
- Delete: `src/components/common/FeedbackCard.tsx`

- [ ] **Step 1: Delete**

```bash
rm src/components/learning/StepRestructure.tsx
rm src/components/learning/StepEnglish.tsx
rm src/components/learning/StepPattern.tsx
rm src/components/common/StepIndicator.tsx
rm src/components/common/FeedbackCard.tsx
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: errors from `Learn.tsx` (`LearningStep` type), `Patterns.tsx`/`Review.tsx` (if they still use old fields). Fix in next task.

---

### Task 6.3: Verify Learn.tsx (no edits expected)

**Files:**
- Verify only: `src/pages/Learn.tsx`

This task is **verify-only**. `Learn.tsx` does not import `LearningStep` directly — it only destructures `currentStep` from the store and compares it to the string literal `'input'`. With the store rewritten, `currentStep` is now typed as `V8Step` (which still includes `'input'`), so no edits should be required.

Note on hard-refresh behavior: Zustand state is in-memory, so a hard refresh resets the store to `currentStep='input'`, and the existing `useEffect` guard (`if (currentStep !== 'input') return`) handles everything correctly. Spec §5's "stale non-input state" branch is dead code in practice — leave the existing guard as-is.

- [ ] **Step 1: Typecheck**

Run:
```bash
npx tsc --noEmit 2>&1 | grep Learn.tsx
```

Expected: no output (no errors in Learn.tsx). If errors appear, they will almost certainly be imports of deleted types — remove those imports.

---

### Task 6.4: Update Patterns.tsx and Review.tsx

**Files:**
- Modify: `src/pages/Patterns.tsx`
- Modify: `src/pages/Review.tsx`

- [ ] **Step 1: Update Patterns.tsx**

Open `Patterns.tsx`. The `Pattern` type is unchanged, so the component should already compile. Verify with:
```bash
npx tsc --noEmit 2>&1 | grep Patterns.tsx
```

If any error appears, fix inline (likely none).

- [ ] **Step 2: Update Review.tsx**

The new `LearningRecord` has different fields. Review.tsx currently reads `r.originalKorean`, `r.completedAt`, `r.scenarioId` — all still present. Verify:
```bash
npx tsc --noEmit 2>&1 | grep Review.tsx
```

If there are references to removed fields (`userEnglish`, `extractedPatterns`, etc.), remove them.

- [ ] **Step 3: Full typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: clean (no errors anywhere).

- [ ] **Step 4: Commit**

```bash
git add src/components/learning/LearningFlow.tsx src/pages/Learn.tsx src/pages/Patterns.tsx src/pages/Review.tsx
git rm src/components/learning/StepRestructure.tsx src/components/learning/StepEnglish.tsx src/components/learning/StepPattern.tsx src/components/common/StepIndicator.tsx src/components/common/FeedbackCard.tsx
git commit -m "feat(ui): wire up 7-step LearningFlow, delete legacy step components"
```

---

## Chunk 7: Verification & smoke test

### Task 7.1: Full typecheck + test run

- [ ] **Step 1: Typecheck entire project**

Run:
```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run the entire test suite**

Run:
```bash
npx vitest run
```

Expected: All tests pass (validate: 14, mocks: 3, localStorage: 3, learningStore: 12 = 32 tests).

---

### Task 7.2: Mock-mode smoke in dev server

- [ ] **Step 1: Ensure `.env.local` has `VITE_USE_MOCK=true`**

```bash
cat .env.local
```

Expected: contains `VITE_USE_MOCK=true`.

- [ ] **Step 2: Start dev server in background**

Start `npm run dev` with `run_in_background: true` so the session is free to continue. Confirm the server is reachable by fetching http://localhost:5173/ and expecting HTTP 200. Open the URL manually in a browser for the visual smoke.

- [ ] **Step 3: Smoke the scenario route**

Manually in browser:
1. Home loads with logo, streak, hero, Try-these cards.
2. Click first scenario card.
3. Empathy screen shows for ~2.5s, then Pre-check.
4. Pick any direction. Step 0 appears.
5. Answer pivot quiz (wrong then correct are both OK). "다음" enables.
6. Step 1: tap 3 blocks, pick connector, "문장 검토하기".
7. Step 2: banner shows, word order compare renders. "이 패턴 내 걸로 만들기".
8. Step 3: PATTERN SAVED appears, Before/After. Pick direction. "다음".
9. Step 4: "하나 풀었다". "다음 문장으로" returns Home.

Verify localStorage contains a new pattern and learning record (DevTools → Application → Local Storage).

- [ ] **Step 4: Smoke the custom input route**

Home → textarea → "풀어보기" → repeat steps 3–9 above. Confirm identical behavior.

- [ ] **Step 5: Smoke error path**

Temporarily set `VITE_USE_MOCK=false` (without API key/proxy) and hard refresh. Start a session. Empathy → wait 10s → error overlay with "다시 시도". Tap retry → same error.

Set `VITE_USE_MOCK=true` again and hard refresh to return to mock mode.

---

### Task 7.3: Patterns + Review page smoke

- [ ] **Step 1: Visit /patterns**

After running one full session, navigate to `/patterns`. Verify the saved pattern template appears with its category and tags.

- [ ] **Step 2: Visit /review**

Navigate to `/review`. Verify the saved LearningRecord shows the original Korean and completed date. "다시 풀기" should navigate to the correct route.

---

### Task 7.4: localStorage migration smoke

- [ ] **Step 1: Inject old schema**

In DevTools console:
```js
localStorage.setItem('eng-ception:schema-version', '2')
localStorage.setItem('eng-ception:records', '[{"id":"old","userEnglish":"x"}]')
localStorage.setItem('eng-ception:patterns', '[{"id":"old-pat"}]')
```

- [ ] **Step 2: Hard refresh**

F5 in browser.

- [ ] **Step 3: Verify clear**

In DevTools console:
```js
localStorage.getItem('eng-ception:schema-version')  // '3'
localStorage.getItem('eng-ception:records')          // null
localStorage.getItem('eng-ception:patterns')         // null
```

---

### Task 7.5: Final lint pass

- [ ] **Step 1: Run eslint**

```bash
npm run lint
```

Expected: clean (no new warnings). Fix any warnings introduced by the new files.

- [ ] **Step 2: Commit any lint fixes**

If lint fixes were needed:
```bash
git add -A
git commit -m "chore: lint fixes for v8 journey port"
```

---

## Rollback

If anything breaks during or after execution:

```bash
# Find the first commit of this feature
git log --oneline | head -30

# Revert the range
git revert <first-commit-sha>..HEAD
```

Or for a clean reset of the entire work:
```bash
git reset --hard <commit-before-chunk-0>
```

localStorage only contains plan-native state (schema v3); no external DB to roll back.

---

## Done

At this point:
- 7-step v8 learning journey runs end-to-end in mock mode
- Real Claude API mode works when `.env.local` has `ANTHROPIC_API_KEY` and `VITE_USE_MOCK=false` + `npm run dev:api`
- All platform-agnostic layers (types, validate, prompts, mocks, store) are ready for RN port
- Manual smoke matches spec §14
- Tests: ~31 passing
- Typecheck: clean
- Lint: clean
- `docs/superpowers/specs/2026-04-14-v8-learning-journey-port-design.md` is the source of truth for any ambiguity during execution
