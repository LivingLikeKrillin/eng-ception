# P0 — 메타데이터 backbone + 패턴 라이브러리 시드 Implementation Plan

> **For agentic workers:** REQUIRED: Use @superpowers:subagent-driven-development (if subagents available) or @superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking. Follow @superpowers:test-driven-development for every task (red → green → commit).

**Goal:** 학습 프로그램의 L1(메타데이터 스키마)과 L2(패턴 라이브러리 시드)를 `engception-capture` 리포에 타입·검증·시드 콘텐츠로 구현한다 — 기기 불필요, 순수 TS.

**Architecture:** 북극성 2축 모델(구문 × 핵심동사)을 타입으로 고정한다. `FunctionId`(13 기능패싯) + `Construction`(구문 틀) + `CardMetaFields`(기존 `SentenceCard` 확장) + `LexicalCard`(어휘). 손으로 저작하는 시드 콘텐츠(구문/동사/카드)는 **참조 무결성 검증기**(`validateLibrary`)로 테스트한다 — 콘텐츠의 "테스트"는 상호 참조 정합성이다. 순수 룩업 헬퍼(`getConstruction` 등)는 단위 테스트.

**Tech Stack:** TypeScript ~6.0.3 (strict), Jest 29 (jest-expo preset), 기존 M1 코드 스타일(colocated `*.test.ts`, `test()`/`expect()`).

**Spec:** `docs/superpowers/specs/2026-07-27-learning-program-design.md` (웹 리포). 이 계획은 그 §3(backbone)·§4(13 패싯)·§6(어휘)·§7(P0)을 구현한다.

---

## ⚠️ 작업 환경 (반드시 먼저 읽을 것)

- **코드 리포:** `C:\Users\Eisen\Desktop\Labs\engception-capture` — 웹 리포(`[projects] engception`)와 **별개의 git 리포**. 아래 모든 파일 경로·명령·커밋은 **이 RN 리포**에서 실행한다.
- **이 계획 문서**는 웹 리포에 있지만, **작업 산출물은 전부 RN 리포**에 커밋된다. 두 리포를 혼동하지 말 것.
- **명령 실행 디렉터리:** `cd "C:\Users\Eisen\Desktop\Labs\engception-capture"` 후 실행. (Windows, PowerShell 또는 Git Bash.)
- **테스트:** 전체 `npm test`, 단일 파일 `npx jest src/경로/파일.test.ts`.
- **타입체크:** `npm run tsc` (= `tsc --noEmit`).
- **기존 M1 자산 (건드리지 말 것, 단 card.ts는 확장):** `src/services/srs.ts`, `srsView.ts`, `segment.ts`, `normalize.ts`, `src/store/*`. 이들의 기존 테스트(19개)는 P0 후에도 전부 green이어야 한다.

## 재사용 vs 신규 (M1 화해)

- **`src/types/card.ts`** — 기존 `SentenceCard`를 **비파괴 확장**한다(메타데이터 필드 추가 + `type:'sentence'` 판별자). 새 필드는 캡처 시 채워지지 않으므로 `newCardMetaDefaults()`로 디폴트 제공.
- **`src/store/cardStore.ts`** — 카드 생성부에 `type:'sentence', ...newCardMetaDefaults()` 한 줄 추가(그 외 로직 불변). 기존 `cardStore.test.ts`는 수정 없이 계속 통과해야 한다.
- **`src/services/normalize.ts`의 `dedupKey`** — 카드 dedup 검증에 재사용.

## File Structure (P0가 만드는/고치는 파일)

**신규 (L1 스키마):**
- `src/types/facets.ts` — `FunctionId`(13) + `FunctionFamily` + `FUNCTION_FACETS` + `isFunctionId`
- `src/types/construction.ts` — `Construction` + `Slot` + `SlotRole` + `PatternKind`
- `src/types/lexical.ts` — `LexicalCard` + `LexicalUnit` + `LexicalDirection` + `newLexicalDefaults`

**수정 (L1, M1 확장):**
- `src/types/card.ts` — `CardMetaFields`/`CardSource`/`ScaffoldLevel` 추가, `SentenceCard`에 병합, `newCardMetaDefaults()`
- `src/store/cardStore.ts` — 카드 생성부에 메타 디폴트 스프레드 추가
- `src/store/dataStore.test.ts` — `SentenceCard` 팩토리에 메타 디폴트 스프레드 추가 (⚠️ 필수 필드 추가 시 `tsc`가 이 리터럴에서 TS2739로 깨짐 — jest는 못 잡고 `npm run tsc`에서만 드러남)
- `src/services/srsView.test.ts` — `SentenceCard` 팩토리에 메타 디폴트 스프레드 추가 (⚠️ 동일 이유)

**신규 (L2 시드 콘텐츠):**
- `src/data/verbs.ts` — `CURATED_VERBS`(웹 17 + 일상 고빈도)
- `src/data/constructions.ts` — 시드 구문 인벤토리(13 패싯 커버, 대표 ~15개)
- `src/data/seedCards.ts` — 큐레이션 예문 카드(`source:'curated'`, 메타 완전 채움)
- `src/data/seedLexical.ts` — 어휘 스키마 픽스처(최소 예시 3개; 도메인 단어장은 deferred)

**신규 (L2 검증·헬퍼):**
- `src/services/validateLibrary.ts` — 참조 무결성 검증기(구문·카드·어휘)
- `src/data/library.ts` — 룩업 헬퍼(`getConstruction`, `constructionsByFunction`, `isKnownVerb`)

---

## Chunk 1: L1 스키마 (타입 + 가드)

### Task 1: 기능 패싯 13 (`facets.ts`)

**Files:**
- Create: `src/types/facets.ts`
- Test: `src/types/facets.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/types/facets.test.ts
import { FUNCTION_FACETS, isFunctionId } from './facets'

test('13 function facets, unique ids', () => {
  expect(FUNCTION_FACETS).toHaveLength(13)
  const ids = FUNCTION_FACETS.map((f) => f.id)
  expect(new Set(ids).size).toBe(13)
})
test('every facet has a family and a Korean label', () => {
  for (const f of FUNCTION_FACETS) {
    expect(['information', 'attitude', 'suasion', 'interaction']).toContain(f.family)
    expect(f.labelKo.length).toBeGreaterThan(0)
  }
})
test('isFunctionId guards known/unknown', () => {
  expect(isFunctionId('inform')).toBe(true)
  expect(isFunctionId('nope')).toBe(false)
  expect(isFunctionId(42)).toBe(false)
})
```

- [ ] **Step 2: 실패 확인**

Run: `cd "C:\Users\Eisen\Desktop\Labs\engception-capture" && npx jest src/types/facets.test.ts`
Expected: FAIL — `Cannot find module './facets'`

- [ ] **Step 3: 구현**

```ts
// src/types/facets.ts
// Communicative function facets — the closed spine (13). Spec §4.
export type FunctionFamily = 'information' | 'attitude' | 'suasion' | 'interaction'

export type FunctionId =
  | 'inform' | 'explain-process' | 'narrate'      // information
  | 'opine' | 'agree-disagree' | 'express-feeling' // attitude
  | 'request' | 'propose' | 'modality' | 'refuse'  // suasion
  | 'clarify' | 'cause-condition' | 'socialize'    // interaction

export interface FunctionFacet {
  id: FunctionId
  family: FunctionFamily
  labelKo: string
}

export const FUNCTION_FACETS: readonly FunctionFacet[] = [
  { id: 'inform',          family: 'information', labelKo: '정보·상태 전달' },
  { id: 'explain-process', family: 'information', labelKo: '방법·절차 설명' },
  { id: 'narrate',         family: 'information', labelKo: '사건·경험 서술' },
  { id: 'opine',           family: 'attitude',    labelKo: '의견·평가' },
  { id: 'agree-disagree',  family: 'attitude',    labelKo: '동의·반대' },
  { id: 'express-feeling', family: 'attitude',    labelKo: '감정·반응' },
  { id: 'request',         family: 'suasion',     labelKo: '요청·지시' },
  { id: 'propose',         family: 'suasion',     labelKo: '제안·의도' },
  { id: 'modality',        family: 'suasion',     labelKo: '조언·의무·허가·능력' },
  { id: 'refuse',          family: 'suasion',     labelKo: '거절·완곡' },
  { id: 'clarify',         family: 'interaction', labelKo: '질문·확인' },
  { id: 'cause-condition', family: 'interaction', labelKo: '인과·조건' },
  { id: 'socialize',       family: 'interaction', labelKo: '의례·사교' },
]

const FUNCTION_ID_SET = new Set<string>(FUNCTION_FACETS.map((f) => f.id))
export function isFunctionId(x: unknown): x is FunctionId {
  return typeof x === 'string' && FUNCTION_ID_SET.has(x)
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest src/types/facets.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
cd "C:\Users\Eisen\Desktop\Labs\engception-capture"
git add src/types/facets.ts src/types/facets.test.ts
git commit -m "feat(p0): 13 function facets + isFunctionId guard"
```

---

### Task 2: 구문 타입 (`construction.ts`)

**Files:**
- Create: `src/types/construction.ts`
- Test: `src/types/construction.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`Construction`은 순수 타입이라 런타임 테스트할 게 적다. 타입이 컴파일되는지 + `SLOT_ROLES`/`PATTERN_KINDS` 상수 가드만 테스트한다.

```ts
// src/types/construction.test.ts
import { SLOT_ROLES, PATTERN_KINDS, isSlotRole } from './construction'
import type { Construction } from './construction'

test('slot roles are a closed 10-set', () => {
  expect(SLOT_ROLES).toHaveLength(10)
  expect(new Set(SLOT_ROLES).size).toBe(10)
})
test('pattern kinds', () => {
  expect(PATTERN_KINDS).toEqual(['construction', 'positional'])
})
test('isSlotRole guards', () => {
  expect(isSlotRole('subject')).toBe(true)
  expect(isSlotRole('banana')).toBe(false)
})
test('a Construction literal type-checks', () => {
  const c: Construction = {
    id: 'demo', function: 'inform', patternKind: 'construction',
    slots: [{ role: 'verb', label: 'there is' }, { role: 'object', label: 'a problem' }],
    curatedVerbs: ['be'], example: { en: 'There is a problem.', ko: '문제가 있어.' },
  }
  expect(c.slots).toHaveLength(2)
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/types/construction.test.ts`
Expected: FAIL — `Cannot find module './construction'`

- [ ] **Step 3: 구현**

```ts
// src/types/construction.ts
import type { FunctionId } from './facets'

// Slot roles — closed set, mirrors the analysis role set (capture spec §5) for continuity.
export const SLOT_ROLES = [
  'subject', 'verb', 'object', 'complement',
  'modifier', 'adverbial',
  'subordinate-clause', 'relative-clause', 'prepositional-phrase', 'conjunction',
] as const
export type SlotRole = (typeof SLOT_ROLES)[number]

export const PATTERN_KINDS = ['construction', 'positional'] as const
export type PatternKind = (typeof PATTERN_KINDS)[number]

const SLOT_ROLE_SET = new Set<string>(SLOT_ROLES)
export function isSlotRole(x: unknown): x is SlotRole {
  return typeof x === 'string' && SLOT_ROLE_SET.has(x)
}

export interface Slot {
  role: SlotRole
  label: string // human-facing chunk, e.g. "made him", "angry" (spec 원리 C: chunk = slot)
}

export interface Construction {
  id: string             // kebab, unique — e.g. 'causative-bare', 'ask-experience'
  function: FunctionId   // which facet this construction serves
  patternKind: PatternKind
  slots: Slot[]          // skeleton = chunk boundaries
  curatedVerbs: string[] // light-verb lemmas that fill this frame (axis B)
  example: { en: string; ko: string }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest src/types/construction.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/types/construction.ts src/types/construction.test.ts
git commit -m "feat(p0): Construction/Slot/SlotRole/PatternKind types"
```

---

### Task 3: 카드 메타 확장 + 어휘 카드 (`card.ts`, `lexical.ts`)

**Files:**
- Modify: `src/types/card.ts`
- Create: `src/types/lexical.ts`
- Modify: `src/store/cardStore.ts:20-23` (카드 생성부)
- Modify: `src/store/dataStore.test.ts:5-8` (`SentenceCard` 팩토리)
- Modify: `src/services/srsView.test.ts:4-9` (`SentenceCard` 팩토리)
- Test: `src/types/card.test.ts`, `src/types/lexical.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/types/card.test.ts
import { newCardMetaDefaults } from './card'
import type { SentenceCard } from './card'

test('newCardMetaDefaults = captured, unfilled metadata', () => {
  const m = newCardMetaDefaults()
  expect(m.source).toBe('captured')
  expect(m.constructionId).toBeNull()
  expect(m.headVerb).toBeNull()
  expect(m.functionFacet).toBeNull()
  expect(m.functionFacetSecondary).toBeNull()
  expect(m.domainFacet).toEqual([])
  expect(m.scaffoldLevel).toBe(1)
})
test('a curated SentenceCard type-checks with filled metadata', () => {
  const c: SentenceCard = {
    type: 'sentence', id: 'x', text: 'I made him angry.', meaning: '내가 그를 화나게 했어.',
    analysis: null, thumbnailUri: null, createdAt: '2026-07-27T00:00:00.000Z',
    source: 'curated', constructionId: 'causative-bare', headVerb: 'make',
    functionFacet: 'cause-condition', functionFacetSecondary: null,
    domainFacet: ['일상'], scaffoldLevel: 1,
    stability: null, difficulty: null, nextDueAt: null, lastReviewedAt: null,
    reps: 0, lapses: 0, cardState: 'new', lastGrade: null,
  }
  expect(c.type).toBe('sentence')
})
```

```ts
// src/types/lexical.test.ts
import { newLexicalDefaults } from './lexical'
import type { LexicalCard } from './lexical'

test('newLexicalDefaults = chunk + produce', () => {
  const d = newLexicalDefaults()
  expect(d.unit).toBe('chunk')
  expect(d.direction).toBe('produce')
})
test('a LexicalCard type-checks', () => {
  const l: LexicalCard = {
    type: 'lexical', id: 'l1', unit: 'chunk', direction: 'produce',
    text: 'meet the deadline', meaning: '마감을 맞추다',
    collocationContext: 'We barely met the deadline.', domainFacet: ['업무'],
    sourceCardId: null,
    stability: null, difficulty: null, nextDueAt: null, lastReviewedAt: null,
    reps: 0, lapses: 0, cardState: 'new', lastGrade: null,
  }
  expect(l.text).toBe('meet the deadline')
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/types/card.test.ts src/types/lexical.test.ts`
Expected: FAIL — `newCardMetaDefaults` / `./lexical` 미존재

- [ ] **Step 3: 구현 — `card.ts` 확장**

`src/types/card.ts`를 아래로 교체(기존 `SrsCardFields`/`CardStateName`는 유지, 확장 추가):

```ts
// src/types/card.ts
import type { FunctionId } from './facets'

export type CardStateName = 'new' | 'learning' | 'review' | 'relearning'

// The persisted FSRS subset. Superset of srs.ts CardSchedule (adds lastGrade, which
// the store owns — schedule() does not return it). Structurally satisfies CardSchedule.
export interface SrsCardFields {
  stability: number | null
  difficulty: number | null
  nextDueAt: string | null
  lastReviewedAt: string | null // REQUIRED: schedule() computes elapsed_days from it
  reps: number
  lapses: number
  cardState: CardStateName
  lastGrade: 1 | 2 | 3 | 4 | null
}

export type CardSource = 'curated' | 'captured'
export type ScaffoldLevel = 1 | 2 | 3

// Metadata backbone fields (spec §3). All nullable/defaulted: captured cards fill them
// lazily via recognition (P3); curated seed cards author them up-front.
// Invariant (documented, not type-enforced): after recognition, functionFacet is non-null.
export interface CardMetaFields {
  source: CardSource
  constructionId: string | null       // null = "beyond pattern" (recognition miss)
  headVerb: string | null             // light-verb lemma (axis B)
  functionFacet: FunctionId | null    // always set after analysis; null before
  functionFacetSecondary: FunctionId | null
  domainFacet: string[]               // open user tags
  scaffoldLevel: ScaffoldLevel
}

export interface SentenceCard extends SrsCardFields, CardMetaFields {
  type: 'sentence'
  id: string
  text: string            // canonical English sentence
  meaning: string | null  // Korean, lazy (P3)
  analysis: null          // P3 fills; typed loosely for now
  thumbnailUri: string | null
  createdAt: string       // ISO; doubles as SRS recency key
}

// Defaults for a freshly captured card (metadata unfilled until recognition).
export function newCardMetaDefaults(): CardMetaFields {
  return {
    source: 'captured', constructionId: null, headVerb: null,
    functionFacet: null, functionFacetSecondary: null,
    domainFacet: [], scaffoldLevel: 1,
  }
}
```

- [ ] **Step 4: 구현 — `lexical.ts` 신규**

```ts
// src/types/lexical.ts
import type { SrsCardFields } from './card'

export type LexicalUnit = 'word' | 'chunk'
export type LexicalDirection = 'produce' | 'recognize'

export interface LexicalCard extends SrsCardFields {
  type: 'lexical'
  id: string
  unit: LexicalUnit
  direction: LexicalDirection   // default 'produce' (K→E)
  text: string                  // "meet the deadline" | "throughput"
  meaning: string               // Korean — K→E retrieval prompt (REQUIRED, spec §6)
  collocationContext: string    // one real-use line (a word is never naked)
  domainFacet: string[]
  sourceCardId: string | null   // which sentence Card it came from
}

export function newLexicalDefaults(): Pick<LexicalCard, 'unit' | 'direction'> {
  return { unit: 'chunk', direction: 'produce' }
}
```

- [ ] **Step 5: 구현 — `cardStore.ts` 카드 생성부 수정 (M1 비파괴)**

`src/store/cardStore.ts`에서 import에 `newCardMetaDefaults` 추가하고 카드 리터럴에 `type` + 메타 디폴트를 스프레드한다:

```ts
// line 4 import 교체:
import type { SentenceCard } from '../types/card'
import { newCardMetaDefaults } from '../types/card'
```

```ts
// 카드 생성부(기존 20~23행)를 교체:
const card: SentenceCard = {
  type: 'sentence',
  id: genId(), text: text.trim(), meaning: null, analysis: null,
  thumbnailUri, createdAt: now().toISOString(),
  ...newCardMetaDefaults(), ...newCardDefaults(),
}
```

- [ ] **Step 6: 나머지 M1 `SentenceCard` 팩토리 2곳 수정 (tsc 회귀 방지)**

`SentenceCard`에 필수 필드를 추가했으므로, `: SentenceCard`로 타입 명시된 기존 팩토리 리터럴이 `tsc`에서 깨진다(`...over`는 `Partial`이라 필수 필드 미보장 → TS2739). **jest는 통과하고 `npm run tsc`에서만 실패**하므로 반드시 여기서 함께 고친다.

`src/store/dataStore.test.ts` — 상단 import에 값 import 추가하고 팩토리에 스프레드:

```ts
// 기존: import type { SentenceCard } from '../types/card'
import type { SentenceCard } from '../types/card'
import { newCardMetaDefaults } from '../types/card'
```

```ts
// 팩토리 리터럴(5~8행)을 교체 — type + 메타 디폴트를 ...over 앞에 스프레드:
const card = (over: Partial<SentenceCard>): SentenceCard => ({
  type: 'sentence',
  id: over.id ?? 'id1', text: over.text ?? 'She left.', meaning: null, analysis: null,
  thumbnailUri: null, createdAt: '2026-07-27T00:00:00.000Z',
  ...newCardMetaDefaults(), ...newCardDefaults(), ...over,
})
```

`src/services/srsView.test.ts` — 값 import 추가하고 팩토리에 스프레드:

```ts
// 기존 import 아래에 추가:
import { newCardMetaDefaults } from '../types/card'
```

```ts
// base 팩토리(4~9행)를 교체 — type + 메타 디폴트를 ...over 앞에 스프레드:
const base = (over: Partial<SentenceCard>): SentenceCard => ({
  type: 'sentence',
  id: 'x', text: 't', meaning: null, analysis: null, thumbnailUri: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  ...newCardMetaDefaults(),
  stability: null, difficulty: null, nextDueAt: null, lastReviewedAt: null,
  reps: 0, lapses: 0, cardState: 'new', lastGrade: null, ...over,
})
```

- [ ] **Step 7: 통과 확인 (신규 + 기존 M1 회귀)**

Run: `npx jest src/types/card.test.ts src/types/lexical.test.ts src/store/cardStore.test.ts src/store/dataStore.test.ts src/services/srsView.test.ts`
Expected: PASS — 신규 4개 + 기존 cardStore/dataStore/srsView 전부 green (M1 회귀 없음)

- [ ] **Step 8: 전체 타입체크 (이 태스크의 진짜 게이트)**

Run: `npm run tsc`
Expected: exit 0, 출력 없음. (Step 6를 빠뜨렸다면 여기서 dataStore.test.ts·srsView.test.ts TS2739로 실패한다.)

- [ ] **Step 9: 커밋**

```bash
git add src/types/card.ts src/types/lexical.ts src/store/cardStore.ts src/store/dataStore.test.ts src/services/srsView.test.ts src/types/card.test.ts src/types/lexical.test.ts
git commit -m "feat(p0): extend Card with metadata backbone + LexicalCard type"
```

---

### Task 4: 라이브러리 검증기 (`validateLibrary.ts`)

손으로 저작할 시드 콘텐츠(Chunk 2)의 참조 무결성을 지키는 검증기를 **먼저** 만든다. 이게 시드 콘텐츠의 "테스트"다.

**Files:**
- Create: `src/services/validateLibrary.ts`
- Test: `src/services/validateLibrary.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/services/validateLibrary.test.ts
import { validateConstruction, validateLibrary } from './validateLibrary'
import type { Construction } from '../types/construction'
import type { SentenceCard } from '../types/card'

const good: Construction = {
  id: 'causative-bare', function: 'cause-condition', patternKind: 'construction',
  slots: [{ role: 'subject', label: 'I' }, { role: 'verb', label: 'made him' }, { role: 'complement', label: 'angry' }],
  curatedVerbs: ['make', 'have', 'let'], example: { en: 'I made him angry.', ko: '내가 그를 화나게 했어.' },
}

test('a well-formed construction has no errors', () => {
  expect(validateConstruction(good, ['make', 'have', 'let'])).toEqual([])
})
test('construction with unknown function is flagged', () => {
  const bad = { ...good, function: 'bogus' as never }
  expect(validateConstruction(bad, ['make']).join()).toMatch(/function/)
})
test('construction with a verb outside the curated set is flagged', () => {
  expect(validateConstruction(good, ['have', 'let']).join()).toMatch(/make/)
})
test('validateLibrary flags duplicate construction ids', () => {
  const errs = validateLibrary({
    constructions: [good, good], verbs: ['make', 'have', 'let'], cards: [], lexical: [],
  })
  expect(errs.join()).toMatch(/duplicate/i)
})
test('validateLibrary flags a card pointing at a missing construction', () => {
  const card = {
    type: 'sentence', id: 'c1', text: 'x', meaning: null, analysis: null, thumbnailUri: null,
    createdAt: 'now', source: 'curated', constructionId: 'nope', headVerb: 'make',
    functionFacet: 'cause-condition', functionFacetSecondary: null, domainFacet: [], scaffoldLevel: 1,
    stability: null, difficulty: null, nextDueAt: null, lastReviewedAt: null,
    reps: 0, lapses: 0, cardState: 'new', lastGrade: null,
  } as SentenceCard
  const errs = validateLibrary({ constructions: [good], verbs: ['make', 'have', 'let'], cards: [card], lexical: [] })
  expect(errs.join()).toMatch(/nope/)
})
test('validateLibrary flags a card whose facet mismatches its construction', () => {
  const card = {
    type: 'sentence', id: 'c2', text: 'y', meaning: null, analysis: null, thumbnailUri: null,
    createdAt: 'now', source: 'curated', constructionId: 'causative-bare', headVerb: 'make',
    functionFacet: 'inform', functionFacetSecondary: null, domainFacet: [], scaffoldLevel: 1,
    stability: null, difficulty: null, nextDueAt: null, lastReviewedAt: null,
    reps: 0, lapses: 0, cardState: 'new', lastGrade: null,
  } as SentenceCard
  // card claims 'causative-bare' (function 'cause-condition') but tags facet 'inform' → mismatch
  const errs = validateLibrary({ constructions: [good], verbs: ['make', 'have', 'let'], cards: [card], lexical: [] })
  expect(errs.join()).toMatch(/function/)
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/services/validateLibrary.test.ts`
Expected: FAIL — 모듈 미존재

- [ ] **Step 3: 구현**

```ts
// src/services/validateLibrary.ts
import { isFunctionId } from '../types/facets'
import { isSlotRole, PATTERN_KINDS } from '../types/construction'
import type { Construction } from '../types/construction'
import type { SentenceCard } from '../types/card'
import type { LexicalCard } from '../types/lexical'
import { dedupKey } from './normalize'

// Validate one construction against the curated verb set. Returns error strings ([] = ok).
export function validateConstruction(c: Construction, verbs: string[]): string[] {
  const errs: string[] = []
  const verbSet = new Set(verbs)
  if (!isFunctionId(c.function)) errs.push(`construction "${c.id}": unknown function "${c.function}"`)
  if (!PATTERN_KINDS.includes(c.patternKind)) errs.push(`construction "${c.id}": bad patternKind`)
  if (c.slots.length === 0) errs.push(`construction "${c.id}": no slots`)
  for (const s of c.slots) {
    if (!isSlotRole(s.role)) errs.push(`construction "${c.id}": bad slot role "${s.role}"`)
    if (!s.label.trim()) errs.push(`construction "${c.id}": empty slot label`)
  }
  for (const v of c.curatedVerbs) {
    if (!verbSet.has(v)) errs.push(`construction "${c.id}": verb "${v}" not in curated set`)
  }
  if (!c.example.en.trim() || !c.example.ko.trim()) errs.push(`construction "${c.id}": incomplete example`)
  return errs
}

export interface Library {
  constructions: Construction[]
  verbs: string[]
  cards: SentenceCard[]
  lexical: LexicalCard[]
}

// Whole-library referential integrity. Returns error strings ([] = healthy).
export function validateLibrary(lib: Library): string[] {
  const errs: string[] = []
  const verbSet = new Set(lib.verbs)
  const ctorById = new Map<string, Construction>()

  for (const c of lib.constructions) {
    if (ctorById.has(c.id)) errs.push(`duplicate construction id "${c.id}"`)
    ctorById.set(c.id, c)
    errs.push(...validateConstruction(c, lib.verbs))
  }

  const seen = new Set<string>()
  for (const card of lib.cards) {
    if (card.headVerb !== null && !verbSet.has(card.headVerb)) {
      errs.push(`card "${card.id}": headVerb "${card.headVerb}" not curated`)
    }
    if (card.functionFacet !== null && !isFunctionId(card.functionFacet)) {
      errs.push(`card "${card.id}": bad functionFacet`)
    }
    if (card.source === 'curated' && card.functionFacet === null) {
      errs.push(`card "${card.id}": curated card must have a functionFacet`)
    }
    if (card.constructionId !== null) {
      const ctor = ctorById.get(card.constructionId)
      if (!ctor) {
        errs.push(`card "${card.id}": constructionId "${card.constructionId}" missing`)
      } else {
        // Cross-checks: the card must be consistent with the frame it claims.
        if (card.headVerb !== null && !ctor.curatedVerbs.includes(card.headVerb)) {
          errs.push(`card "${card.id}": headVerb "${card.headVerb}" not in construction "${ctor.id}" verbs`)
        }
        if (card.functionFacet !== null && card.functionFacet !== ctor.function) {
          errs.push(`card "${card.id}": functionFacet "${card.functionFacet}" != construction "${ctor.id}" function "${ctor.function}"`)
        }
      }
    }
    const key = dedupKey(card.text)
    if (seen.has(key)) errs.push(`duplicate card text "${card.text}"`)
    seen.add(key)
  }

  for (const l of lib.lexical) {
    if (!l.meaning.trim()) errs.push(`lexical "${l.id}": empty meaning`)
    if (!l.text.trim()) errs.push(`lexical "${l.id}": empty text`)
    if (l.unit !== 'word' && l.unit !== 'chunk') errs.push(`lexical "${l.id}": bad unit`)
    if (l.direction !== 'produce' && l.direction !== 'recognize') errs.push(`lexical "${l.id}": bad direction`)
  }
  return errs
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest src/services/validateLibrary.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/services/validateLibrary.ts src/services/validateLibrary.test.ts
git commit -m "feat(p0): library referential-integrity validators"
```

---

## Chunk 2: L2 시드 콘텐츠 + 헬퍼

### Task 5: 엄선 동사셋 (`verbs.ts`)

**Files:**
- Create: `src/data/verbs.ts`
- Test: `src/data/verbs.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/data/verbs.test.ts
import { CURATED_VERBS } from './verbs'

test('curated verbs are unique, lowercase, non-empty', () => {
  expect(CURATED_VERBS.length).toBeGreaterThanOrEqual(25)
  expect(new Set(CURATED_VERBS).size).toBe(CURATED_VERBS.length)
  for (const v of CURATED_VERBS) expect(v).toBe(v.toLowerCase())
})
test('includes the web 5형식 core + daily high-freq verbs', () => {
  for (const v of ['make', 'have', 'let', 'get', 'give', 'be', 'do', 'go', 'take']) {
    expect(CURATED_VERBS).toContain(v)
  }
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/data/verbs.test.ts` → FAIL (모듈 미존재)

- [ ] **Step 3: 구현**

```ts
// src/data/verbs.ts
// Curated light-verb set (spec §11-B). Web 5형식 17 + daily high-frequency verbs.
// Deliberately narrow: mastery over coverage. All base-form lemmas, lowercase.
export const CURATED_VERBS: string[] = [
  // web 5형식 core (17)
  'make', 'have', 'let', 'get', 'see', 'hear', 'watch',
  'want', 'ask', 'tell', 'need', 'find', 'call',
  'give', 'show', 'send', 'bring',
  // daily high-frequency (11)
  'be', 'do', 'go', 'come', 'take', 'put', 'keep', 'feel', 'think', 'mean', 'look',
]
```

- [ ] **Step 4: 통과 확인** → `npx jest src/data/verbs.test.ts` → PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/data/verbs.ts src/data/verbs.test.ts
git commit -m "feat(p0): curated light-verb set (17 core + 11 daily)"
```

---

### Task 6: 시드 구문 인벤토리 (`constructions.ts`)

13 패싯을 모두 커버하는 대표 구문 ~15개를 저작한다. **전체 인벤토리(딜리버러블 A)는 P0 이후 계속 확장** — 여기선 각 패싯 최소 1개 + 5형식 대표를 시드.

**Files:**
- Create: `src/data/constructions.ts`
- Test: `src/data/constructions.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/data/constructions.test.ts
import { SEED_CONSTRUCTIONS } from './constructions'
import { CURATED_VERBS } from './verbs'
import { validateConstruction } from '../services/validateLibrary'
import { FUNCTION_FACETS } from '../types/facets'

test('every seed construction passes integrity validation', () => {
  const errs = SEED_CONSTRUCTIONS.flatMap((c) => validateConstruction(c, CURATED_VERBS))
  expect(errs).toEqual([])
})
test('construction ids are unique', () => {
  const ids = SEED_CONSTRUCTIONS.map((c) => c.id)
  expect(new Set(ids).size).toBe(ids.length)
})
test('all 13 function facets are covered by at least one construction', () => {
  const covered = new Set(SEED_CONSTRUCTIONS.map((c) => c.function))
  for (const f of FUNCTION_FACETS) expect(covered.has(f.id)).toBe(true)
})
```

- [ ] **Step 2: 실패 확인** → `npx jest src/data/constructions.test.ts` → FAIL

- [ ] **Step 3: 구현**

```ts
// src/data/constructions.ts
// Seed construction inventory — covers all 13 facets (deliverable A continues past P0).
import type { Construction } from '../types/construction'

export const SEED_CONSTRUCTIONS: Construction[] = [
  // ── information ──
  {
    id: 'there-is', function: 'inform', patternKind: 'construction',
    slots: [{ role: 'verb', label: 'There is' }, { role: 'object', label: 'a problem' }, { role: 'prepositional-phrase', label: 'with the build' }],
    curatedVerbs: ['be'], example: { en: 'There is a problem with the build.', ko: '빌드에 문제가 있어.' },
  },
  {
    id: 'first-then', function: 'explain-process', patternKind: 'construction',
    slots: [{ role: 'adverbial', label: 'First' }, { role: 'subject', label: 'you' }, { role: 'verb', label: 'build' }, { role: 'conjunction', label: 'then' }, { role: 'verb', label: 'deploy' }],
    curatedVerbs: ['do'], example: { en: 'First you build, then you deploy.', ko: '먼저 빌드하고, 그다음 배포해.' },
  },
  {
    id: 'ask-experience', function: 'narrate', patternKind: 'construction',
    slots: [{ role: 'verb', label: 'Have you ever been' }, { role: 'adverbial', label: 'to Busan' }],
    curatedVerbs: ['be', 'do', 'go', 'see'], example: { en: 'Have you ever been to Busan?', ko: '부산 가본 적 있어?' },
  },
  // ── attitude ──
  {
    id: 'find-oc', function: 'opine', patternKind: 'construction',
    slots: [{ role: 'subject', label: 'I' }, { role: 'verb', label: 'find' }, { role: 'object', label: 'it' }, { role: 'complement', label: 'useful' }],
    curatedVerbs: ['find'], example: { en: 'I find it useful.', ko: '난 그게 유용하다고 봐.' },
  },
  {
    id: 'i-dont-think', function: 'agree-disagree', patternKind: 'construction',
    slots: [{ role: 'subject', label: "I don't think" }, { role: 'subordinate-clause', label: "that's right" }],
    curatedVerbs: ['think'], example: { en: "I don't think that's right.", ko: '그건 아닌 것 같아.' },
  },
  {
    id: 'so-that', function: 'express-feeling', patternKind: 'construction',
    slots: [{ role: 'subject', label: "I'm" }, { role: 'complement', label: 'so tired' }, { role: 'subordinate-clause', label: "that I can't focus" }],
    curatedVerbs: ['be'], example: { en: "I'm so tired that I can't focus.", ko: '너무 피곤해서 집중이 안 돼.' },
  },
  // ── suasion ──
  {
    id: 'want-o-to-v', function: 'request', patternKind: 'construction',
    slots: [{ role: 'subject', label: 'I' }, { role: 'verb', label: 'want' }, { role: 'object', label: 'you' }, { role: 'complement', label: 'to review this' }],
    curatedVerbs: ['want', 'ask', 'tell', 'need'], example: { en: 'I want you to review this.', ko: '이거 네가 검토해줬으면 해.' },
  },
  {
    id: 'causative-bare', function: 'request', patternKind: 'construction',
    slots: [{ role: 'subject', label: "I'll" }, { role: 'verb', label: 'have him' }, { role: 'complement', label: 'call you' }],
    curatedVerbs: ['make', 'have', 'let'], example: { en: "I'll have him call you.", ko: '그가 너한테 전화하게 할게.' },
  },
  {
    id: 'lets', function: 'propose', patternKind: 'construction',
    slots: [{ role: 'verb', label: "Let's" }, { role: 'complement', label: 'ship it' }],
    curatedVerbs: ['let'], example: { en: "Let's ship it.", ko: '이거 내보내자.' },
  },
  {
    id: 'have-to', function: 'modality', patternKind: 'construction',
    slots: [{ role: 'subject', label: 'We' }, { role: 'verb', label: 'have to fix' }, { role: 'object', label: 'this' }, { role: 'adverbial', label: 'first' }],
    curatedVerbs: ['have'], example: { en: 'We have to fix this first.', ko: '이걸 먼저 고쳐야 해.' },
  },
  {
    id: 'im-afraid', function: 'refuse', patternKind: 'construction',
    slots: [{ role: 'subject', label: "I'm afraid" }, { role: 'subordinate-clause', label: "I can't make it" }],
    curatedVerbs: ['be'], example: { en: "I'm afraid I can't make it.", ko: '미안하지만 못 갈 것 같아.' },
  },
  // ── interaction ──
  {
    id: 'do-you-mean', function: 'clarify', patternKind: 'construction',
    slots: [{ role: 'verb', label: 'Do you mean' }, { role: 'object', label: 'the staging server' }],
    curatedVerbs: ['mean'], example: { en: 'Do you mean the staging server?', ko: '스테이징 서버 말하는 거야?' },
  },
  {
    id: 'if-cond', function: 'cause-condition', patternKind: 'construction',
    slots: [{ role: 'conjunction', label: 'If' }, { role: 'subordinate-clause', label: 'it fails' }, { role: 'verb', label: 'roll back' }],
    curatedVerbs: ['do'], example: { en: 'If it fails, roll back.', ko: '실패하면 롤백해.' },
  },
  {
    id: 'thank-for', function: 'socialize', patternKind: 'construction',
    slots: [{ role: 'verb', label: 'Thanks for' }, { role: 'object', label: 'your help' }],
    curatedVerbs: ['do'], example: { en: 'Thanks for your help.', ko: '도와줘서 고마워.' },
  },
]
```

> **주의(저작 규칙):** `curatedVerbs`는 항상 **원형(base form)** (`make`/`be`, `made`/`is` 아님). 굴절형은 `slots[].label`·`example`에만. (웹 스펙 §5형식 규칙 계승.)

- [ ] **Step 4: 통과 확인** → `npx jest src/data/constructions.test.ts` → PASS (3 tests, 13 패싯 전부 커버)

- [ ] **Step 5: 커밋**

```bash
git add src/data/constructions.ts src/data/constructions.test.ts
git commit -m "feat(p0): seed construction inventory (all 13 facets)"
```

---

### Task 7: 큐레이션 예문 카드 (`seedCards.ts`)

**Files:**
- Create: `src/data/seedCards.ts`
- Test: `src/data/seedCards.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/data/seedCards.test.ts
import { SEED_CARDS } from './seedCards'
import { SEED_CONSTRUCTIONS } from './constructions'
import { CURATED_VERBS } from './verbs'
import { validateLibrary } from '../services/validateLibrary'

test('seed cards pass whole-library integrity', () => {
  const errs = validateLibrary({
    constructions: SEED_CONSTRUCTIONS, verbs: CURATED_VERBS, cards: SEED_CARDS, lexical: [],
  })
  expect(errs).toEqual([])
})
test('all seed cards are curated with a filled functionFacet + meaning', () => {
  for (const c of SEED_CARDS) {
    expect(c.source).toBe('curated')
    expect(c.functionFacet).not.toBeNull()
    expect(c.meaning).not.toBeNull()
  }
})
```

- [ ] **Step 2: 실패 확인** → FAIL

- [ ] **Step 3: 구현**

```ts
// src/data/seedCards.ts
// Curated example cards — instances of seed constructions with fully-authored metadata.
import type { SentenceCard } from '../types/card'
import { newCardDefaults } from '../services/srs'

interface SeedInput {
  id: string; text: string; meaning: string
  constructionId: string; headVerb: string
  functionFacet: SentenceCard['functionFacet']; domainFacet: string[]
}

const RAW: SeedInput[] = [
  { id: 'seed-1', text: "I'll have him call you.", meaning: '그가 너한테 전화하게 할게.',
    constructionId: 'causative-bare', headVerb: 'have', functionFacet: 'request', domainFacet: ['업무'] },
  { id: 'seed-2', text: 'I want you to review this.', meaning: '이거 네가 검토해줬으면 해.',
    constructionId: 'want-o-to-v', headVerb: 'want', functionFacet: 'request', domainFacet: ['업무'] },
  { id: 'seed-3', text: 'I find it useful.', meaning: '난 그게 유용하다고 봐.',
    constructionId: 'find-oc', headVerb: 'find', functionFacet: 'opine', domainFacet: ['일상'] },
  { id: 'seed-4', text: 'Have you ever been to Busan?', meaning: '부산 가본 적 있어?',
    constructionId: 'ask-experience', headVerb: 'be', functionFacet: 'narrate', domainFacet: ['일상'] },
  { id: 'seed-5', text: 'We have to fix this first.', meaning: '이걸 먼저 고쳐야 해.',
    constructionId: 'have-to', headVerb: 'have', functionFacet: 'modality', domainFacet: ['업무'] },
]

export const SEED_CARDS: SentenceCard[] = RAW.map((r) => ({
  type: 'sentence',
  id: r.id, text: r.text, meaning: r.meaning, analysis: null, thumbnailUri: null,
  createdAt: '2026-07-27T00:00:00.000Z',
  source: 'curated', constructionId: r.constructionId, headVerb: r.headVerb,
  functionFacet: r.functionFacet, functionFacetSecondary: null,
  domainFacet: r.domainFacet, scaffoldLevel: 1,
  ...newCardDefaults(),
}))
```

- [ ] **Step 4: 통과 확인** → `npx jest src/data/seedCards.test.ts` → PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/data/seedCards.ts src/data/seedCards.test.ts
git commit -m "feat(p0): curated seed cards (integrity-validated)"
```

---

### Task 8: 어휘 스키마 픽스처 (`seedLexical.ts`)

> **범위 주의:** 스펙 §6(c)에 따라 **큐레이션 도메인 단어장은 deferred.** 여기 3개는 `LexicalCard` 스키마·검증을 exercise 하는 **최소 픽스처**일 뿐, 단어장이 아니다.

**Files:**
- Create: `src/data/seedLexical.ts`
- Test: `src/data/seedLexical.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/data/seedLexical.test.ts
import { SEED_LEXICAL } from './seedLexical'
import { SEED_CONSTRUCTIONS } from './constructions'
import { CURATED_VERBS } from './verbs'
import { validateLibrary } from '../services/validateLibrary'

test('seed lexical fixtures pass integrity', () => {
  const errs = validateLibrary({
    constructions: SEED_CONSTRUCTIONS, verbs: CURATED_VERBS, cards: [], lexical: SEED_LEXICAL,
  })
  expect(errs).toEqual([])
})
test('covers both word and chunk units', () => {
  const units = new Set(SEED_LEXICAL.map((l) => l.unit))
  expect(units.has('word')).toBe(true)
  expect(units.has('chunk')).toBe(true)
})
```

- [ ] **Step 2: 실패 확인** → FAIL

- [ ] **Step 3: 구현**

```ts
// src/data/seedLexical.ts
// Minimal LexicalCard fixtures to exercise the schema/validators. NOT a curated wordlist
// (domain wordlist = deferred, spec §6(c)). Real lexical cards are born organically (P2/P3).
import type { LexicalCard } from '../types/lexical'
import { newLexicalDefaults } from '../types/lexical'
import { newCardDefaults } from '../services/srs'

interface SeedLex { id: string; unit: LexicalCard['unit']; text: string; meaning: string; ctx: string; domain: string[] }

const RAW: SeedLex[] = [
  { id: 'lex-1', unit: 'chunk', text: 'meet the deadline', meaning: '마감을 맞추다', ctx: 'We barely met the deadline.', domain: ['업무'] },
  { id: 'lex-2', unit: 'chunk', text: 'roll out a feature', meaning: '기능을 배포하다', ctx: 'We rolled out the new feature.', domain: ['IT'] },
  { id: 'lex-3', unit: 'word', text: 'throughput', meaning: '처리량', ctx: 'Our throughput dropped after the update.', domain: ['IT'] },
]

export const SEED_LEXICAL: LexicalCard[] = RAW.map((r) => ({
  type: 'lexical',
  id: r.id,
  ...newLexicalDefaults(), // unit:'chunk', direction:'produce'
  unit: r.unit,            // override unit per fixture (lex-3 = 'word')
  text: r.text, meaning: r.meaning, collocationContext: r.ctx,
  domainFacet: r.domain, sourceCardId: null,
  ...newCardDefaults(),
}))
```

- [ ] **Step 4: 통과 확인** → `npx jest src/data/seedLexical.test.ts` → PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/data/seedLexical.ts src/data/seedLexical.test.ts
git commit -m "feat(p0): lexical schema fixtures (word + chunk)"
```

---

### Task 9: 룩업 헬퍼 (`library.ts`)

**Files:**
- Create: `src/data/library.ts`
- Test: `src/data/library.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/data/library.test.ts
import { getConstruction, constructionsByFunction, isKnownVerb } from './library'

test('getConstruction finds by id, undefined for miss', () => {
  expect(getConstruction('causative-bare')?.function).toBe('request')
  expect(getConstruction('nope')).toBeUndefined()
})
test('constructionsByFunction returns all for a facet', () => {
  const reqs = constructionsByFunction('request')
  expect(reqs.map((c) => c.id).sort()).toEqual(['causative-bare', 'want-o-to-v'])
})
test('isKnownVerb checks the curated set', () => {
  expect(isKnownVerb('make')).toBe(true)
  expect(isKnownVerb('yeet')).toBe(false)
})
```

- [ ] **Step 2: 실패 확인** → FAIL

- [ ] **Step 3: 구현**

```ts
// src/data/library.ts
import type { Construction } from '../types/construction'
import type { FunctionId } from '../types/facets'
import { SEED_CONSTRUCTIONS } from './constructions'
import { CURATED_VERBS } from './verbs'

const BY_ID = new Map(SEED_CONSTRUCTIONS.map((c) => [c.id, c]))
const VERB_SET = new Set(CURATED_VERBS)

export function getConstruction(id: string): Construction | undefined {
  return BY_ID.get(id)
}
export function constructionsByFunction(fn: FunctionId): Construction[] {
  return SEED_CONSTRUCTIONS.filter((c) => c.function === fn)
}
export function isKnownVerb(v: string): boolean {
  return VERB_SET.has(v)
}
```

- [ ] **Step 4: 통과 확인** → `npx jest src/data/library.test.ts` → PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/data/library.ts src/data/library.test.ts
git commit -m "feat(p0): library lookup helpers"
```

---

### Task 10: 전체 라이브러리 통합 검증 + 최종 게이트

**Files:**
- Create: `src/data/library.integration.test.ts`

- [ ] **Step 1: 통합 테스트 작성**

조립된 전체 라이브러리(구문+동사+시드카드+시드어휘)가 무결한지 한 번에 검증한다.

```ts
// src/data/library.integration.test.ts
import { SEED_CONSTRUCTIONS } from './constructions'
import { CURATED_VERBS } from './verbs'
import { SEED_CARDS } from './seedCards'
import { SEED_LEXICAL } from './seedLexical'
import { validateLibrary } from '../services/validateLibrary'

test('the assembled P0 library has zero integrity errors', () => {
  const errs = validateLibrary({
    constructions: SEED_CONSTRUCTIONS, verbs: CURATED_VERBS, cards: SEED_CARDS, lexical: SEED_LEXICAL,
  })
  expect(errs).toEqual([])
})
```

- [ ] **Step 2: 통과 확인** → `npx jest src/data/library.integration.test.ts` → PASS

- [ ] **Step 3: 전체 스위트 + 타입체크 (M1 회귀 없음 확인)**

Run: `npm test`
Expected: 기존 M1 19개 + P0 신규 전부 PASS, 실패 0

Run: `npm run tsc`
Expected: exit 0

- [ ] **Step 4: 최종 커밋**

```bash
git add src/data/library.integration.test.ts
git commit -m "feat(p0): full-library integration validation gate"
```

---

## 완료 기준 (Definition of Done)

- [ ] `npm test` — M1 기존 + P0 신규 전부 green, 실패 0
- [ ] `npm run tsc` — exit 0
- [ ] 13 기능 패싯 전부 ≥1 구문으로 커버됨 (Task 6 테스트가 보장)
- [ ] 전체 라이브러리 참조 무결성 0 에러 (Task 10 게이트)
- [ ] M1 회귀 없음: `cardStore.test.ts`는 무수정 통과; `dataStore.test.ts`·`srsView.test.ts`는 팩토리에 메타 디폴트만 추가(로직·단언 불변)하고 통과. 이 셋의 런타임 동작 변화 0.

## P0 이후 (이 계획 범위 밖)
- **딜리버러블 A 확장:** 구문 인벤토리를 패싯당 여러 개로 심화 (커버리지는 깊이에서).
- **P1:** 캡처 M1 마무리 (Chunk 3·4, 기기 필요).
- **P2:** 트레이너 Lv1~3 + 어휘 Lv3 승급(a) — 이 스키마·라이브러리를 소비. 슬롯 없는 카드의 청크 경계 분리 메커니즘 확정(스펙 §12).
- **P3:** Claude recognition(캡처→구문 매핑) + 지연 번역 + 어휘 탭-저장(b).
