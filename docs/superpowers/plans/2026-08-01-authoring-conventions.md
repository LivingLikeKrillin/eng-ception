# 저작 컨벤션 (슬롯 청킹 + `curatedVerbs`) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구문 저작 규칙(청크 경계·`curatedVerbs` 의미)을 성문화하고, 기계로 강제 가능한 부분을 `validateLibrary`에 내린 뒤, 시드 14개를 새 규칙에 정합화한다.

**Architecture:** 순수 함수 검증기 확장이 전부다. `validateConstruction`(단일 구문)에 V1~V5, `validateLibrary`(교차 참조)에 V6을 추가하고, `Slot`에 필수 필드 `fill`을 넣는다. 신규 데이터 파일은 굴절 표 하나(`verbForms.ts`)뿐이며, 이미 존재하는 두 게이트 테스트(`constructions.test.ts`의 전 구문 검증, `library.integration.test.ts`의 전량 검증)가 리트로핏 완료의 판정자 역할을 한다. UI·스토어·RN 런타임은 전혀 건드리지 않는다.

**Tech Stack:** TypeScript(strict) · Jest(jest-expo) · 순수 TS 모듈(React Native 의존 없음)

**스펙:** `docs/superpowers/specs/2026-08-01-authoring-conventions-design.md` (웹 리포). 규칙 번호(R1~R5, V1~V6)는 전부 그 문서 기준.

---

## ⚠️ 작업 환경 (반드시 먼저 읽을 것)

- **구현 리포는 이 리포가 아니다.** 모든 경로는 `C:\Users\Eisen\Desktop\Labs\engception-capture`(RN 앱 `engception-app`) 기준이다. 이 플랜 문서만 웹 리포에 있다.
- **테스트:** `npx jest <path>` (단일), `npx jest` (전체). 현재 기준선 = **17 suites / 55 tests 통과**.
- **타입체크:** `npm run tsc` (= `tsc --noEmit`). RN 리포는 웹 리포와 달리 `tsc -b`가 아니다.
- **브랜치:** `master`에서 `feat/authoring-conventions`를 딴다.
- 커밋은 태스크 단위. 한 태스크가 끝날 때마다 전체 `npx jest`가 green이어야 한다.

---

## File Structure

| 파일 | 책임 | 상태 |
|---|---|---|
| `src/types/construction.ts` | `Slot`/`Construction` 스키마 | 수정 — `Slot.fill` 추가 |
| `src/data/verbForms.ts` | 큐레이션 동사 28개의 굴절 표면형 | **신규** |
| `src/services/validateLibrary.ts` | 저작 규칙의 기계 강제 (V1~V6) | 수정 |
| `src/data/constructions.ts` | 시드 구문 14개 | 수정 — 리트로핏 + `fill` 부여 |
| `src/data/seedCards.ts` | 시드 카드 5장 | 수정 — `SeedRow.headVerb` nullable |
| `docs/authoring-conventions.md` | 저작 치트시트(살아있는 문서) | **신규** |
| `src/types/construction.test.ts`, `src/services/validateLibrary.test.ts` | 픽스처 | 수정 — `fill` 백필 |

**경계:** 굴절 표는 검증기가 아니라 `data/`에 둔다 — P2 트레이너 렌더와 P3 recognition이 같은 표를 소비할 예정이라(스펙 §6), 검증 로직에 가두면 안 된다. 토크나이저(`surfaceTokens`)는 검증기 파일에 두되 **export**해서 나중에 재사용 가능하게 한다.

---

## Chunk 1: 구조 불변식 (스키마 무변경)

### Task 1: V1 — 완전분할 불변식 + `first-then` 정정

**Files:**
- Modify: `src/services/validateLibrary.ts`
- Modify: `src/data/constructions.ts:11-15` (`first-then`)
- Test: `src/services/validateLibrary.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/services/validateLibrary.test.ts` 끝에 추가:

```ts
test('V1 flags slots that do not join back to the example', () => {
  const bad: Construction = {
    ...good,
    slots: [{ role: 'subject', label: 'I' }, { role: 'verb', label: 'made him' }], // 'angry' 누락
  }
  expect(validateConstruction(bad, ['make', 'have', 'let']).join()).toMatch(/join/i)
})
test('V1 tolerates punctuation and case differences', () => {
  const ok: Construction = {
    ...good,
    slots: [{ role: 'verb', label: 'Do you mean' }, { role: 'object', label: 'the staging server' }],
    curatedVerbs: ['mean'],
    example: { en: 'Do you mean the staging server?', ko: '스테이징 서버 말하는 거야?' },
  }
  expect(validateConstruction(ok, ['mean'])).toEqual([])
})
test('V1 rejects a split contraction', () => {
  const bad: Construction = {
    ...good,
    slots: [{ role: 'subject', label: 'I' }, { role: 'verb', label: "'ll make him" }, { role: 'complement', label: 'angry' }],
    example: { en: "I'll make him angry.", ko: '내가 그를 화나게 할 거야.' },
  }
  expect(validateConstruction(bad, ['make']).join()).toMatch(/join/i)
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/services/validateLibrary.test.ts`
Expected: FAIL — 3개 중 최소 2개가 "received []" (에러가 안 나옴)

- [ ] **Step 3: 구현**

`src/services/validateLibrary.ts`의 import 아래에 추가:

```ts
// Normalize for the join invariant (R5): case, punctuation, whitespace.
// Apostrophes are NOT stripped — contractions are meaningful ("I'll" must not equal "I ll").
export function normalizeJoin(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?;:"“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
```

`validateConstruction` 안, 슬롯 루프 **뒤**에 추가:

```ts
  // V1 — slots must be a lossless partition of the example (spec R5).
  const joined = c.slots.map((s) => s.label).join(' ')
  if (normalizeJoin(joined) !== normalizeJoin(c.example.en)) {
    errs.push(`construction "${c.id}": slots do not join to example — got "${joined}"`)
  }
```

- [ ] **Step 4: 통과 확인 (단위) → 시드 게이트 실패 확인**

Run: `npx jest src/services/validateLibrary.test.ts` → PASS
Run: `npx jest` → **FAIL** — `constructions.test.ts`와 `library.integration.test.ts`가 `first-then`을 지목해야 한다. 이것이 스펙 §1이 예고한 실물 드리프트다. 다른 구문이 함께 걸리면 멈추고 보고할 것(스펙 예측과 불일치).

- [ ] **Step 5: 시드 정정**

`src/data/constructions.ts`의 `first-then` — 예문에는 있으나 슬롯에서 누락된 두 번째 `you`를 복원한다:

```ts
  {
    id: 'first-then', function: 'explain-process', patternKind: 'construction',
    slots: [
      { role: 'adverbial', label: 'First' }, { role: 'subject', label: 'you' }, { role: 'verb', label: 'build' },
      { role: 'conjunction', label: 'then' }, { role: 'subject', label: 'you' }, { role: 'verb', label: 'deploy' },
    ],
    curatedVerbs: ['do'], example: { en: 'First you build, then you deploy.', ko: '먼저 빌드하고, 그다음 배포해.' },
  },
```

- [ ] **Step 6: 전체 통과 확인**

Run: `npx jest` → 17 suites 전부 PASS (테스트 수는 58로 증가)

- [ ] **Step 7: 커밋**

```bash
git add src/services/validateLibrary.ts src/services/validateLibrary.test.ts src/data/constructions.ts
git commit -m "feat(authoring): V1 join invariant + fix first-then slot loss"
```

---

### Task 2: V2 — 청크 예산 2~6

**Files:**
- Modify: `src/services/validateLibrary.ts:14` (기존 `slots.length === 0` 검사를 대체)
- Test: `src/services/validateLibrary.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('V2 flags a construction with fewer than 2 chunks', () => {
  const bad: Construction = {
    ...good,
    slots: [{ role: 'verb', label: 'I made him angry' }],
    example: { en: 'I made him angry.', ko: '내가 그를 화나게 했어.' },
  }
  expect(validateConstruction(bad, ['make']).join()).toMatch(/slot count/i)
})
test('V2 flags a construction with more than 6 chunks', () => {
  const labels = ['I', 'made', 'him', 'angry', 'at', 'the', 'meeting']
  const bad: Construction = {
    ...good,
    slots: labels.map((label) => ({ role: 'modifier' as const, label })),
    example: { en: 'I made him angry at the meeting.', ko: '회의에서 그를 화나게 했어.' },
  }
  expect(validateConstruction(bad, ['make']).join()).toMatch(/slot count/i)
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/services/validateLibrary.test.ts` → FAIL (2건)

- [ ] **Step 3: 구현**

`validateConstruction`의 `if (c.slots.length === 0) errs.push(...)` 줄을 **교체**:

```ts
  // V2 — working-memory budget (spec R4). Replaces the old "no slots" check.
  if (c.slots.length < 2 || c.slots.length > 6) {
    errs.push(`construction "${c.id}": slot count ${c.slots.length} outside 2..6`)
  }
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest` → 전부 PASS (60 tests). 시드 14개는 2~6 범위 안이므로 게이트가 깨지지 않는다.

- [ ] **Step 5: 커밋**

```bash
git add src/services/validateLibrary.ts src/services/validateLibrary.test.ts
git commit -m "feat(authoring): V2 chunk budget 2..6"
```

---

### Task 3: R2 리트로핏 — subject 청크가 동사를 삼킨 2건

R2는 **기계 검사가 아니다**(V1은 청크 *경계*만 보지 재배치를 못 본다 — `[I don't think]`는 예문과 정상적으로 join된다). 사람이 규칙을 적용하는 저작 수정이며, 회귀 보호는 V1이 계속 green인 것으로만 확인한다. Task 8의 선택 규칙(V7)을 채택하면 이후로는 기계가 잡는다.

**Files:**
- Modify: `src/data/constructions.ts` (`i-dont-think`, `im-afraid`)

- [ ] **Step 1: 두 구문을 R2에 맞게 재분할**

```ts
  {
    id: 'i-dont-think', function: 'agree-disagree', patternKind: 'construction',
    slots: [
      { role: 'subject', label: 'I' }, { role: 'verb', label: "don't think" },
      { role: 'subordinate-clause', label: "that's right" },
    ],
    curatedVerbs: ['think'], example: { en: "I don't think that's right.", ko: '그건 아닌 것 같아.' },
  },
```

```ts
  {
    id: 'im-afraid', function: 'refuse', patternKind: 'construction',
    slots: [
      { role: 'subject', label: "I'm" }, { role: 'complement', label: 'afraid' },
      { role: 'subordinate-clause', label: "I can't make it" },
    ],
    curatedVerbs: ['be'], example: { en: "I'm afraid I can't make it.", ko: '미안하지만 못 갈 것 같아.' },
  },
```

`I'm`은 clitic이라 subject 청크에 남고(R2 허용), `I don't think`는 공백을 건너 동사를 삼켰으므로 분리한다.

- [ ] **Step 2: 통과 확인**

Run: `npx jest` → 전부 PASS. V1이 계속 green이면 재분할이 예문을 손상하지 않았다는 뜻이다.

- [ ] **Step 3: 커밋**

```bash
git add src/data/constructions.ts
git commit -m "fix(seed): re-chunk i-dont-think/im-afraid per R2 (subject must not swallow a verb)"
```

---

## Chunk 2: Lv2 뼈대 (`Slot.fill`)

### Task 4: `Slot.fill` 필수 필드 + 전량 백필

필수 필드로 넣기 때문에 기존 `Slot` 리터럴이 **전부 컴파일 에러**가 된다. 이는 의도된 설계다(누락을 컴파일 타임에 포착). `npm run tsc`가 이 태스크의 진짜 게이트다.

**Files:**
- Modify: `src/types/construction.ts:19-22`
- Modify: `src/data/constructions.ts` (14개 전부)
- Modify: `src/types/construction.test.ts:18`, `src/services/validateLibrary.test.ts:8` (+ Task 1·2에서 추가한 픽스처)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/types/construction.test.ts`의 `Construction literal` 테스트를 교체:

```ts
test('a Construction literal type-checks and carries fill', () => {
  const c: Construction = {
    id: 'demo', function: 'inform', patternKind: 'construction',
    slots: [
      { role: 'verb', label: 'there is', fill: 'frame' },
      { role: 'object', label: 'a problem', fill: 'content' },
    ],
    curatedVerbs: ['be'], example: { en: 'There is a problem.', ko: '문제가 있어.' },
  }
  expect(c.slots.filter((s) => s.fill === 'content')).toHaveLength(1)
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm run tsc`
Expected: FAIL — `Object literal may only specify known properties, and 'fill' does not exist in type 'Slot'`

- [ ] **Step 3: 구현 — 스키마**

`src/types/construction.ts`:

```ts
export const SLOT_FILLS = ['frame', 'content'] as const
export type SlotFill = (typeof SLOT_FILLS)[number]

export interface Slot {
  role: SlotRole
  label: string // human-facing chunk, e.g. "made him", "angry" (spec 원리 C: chunk = slot)
  fill: SlotFill // Lv2 scaffold: 'frame' = shown to the learner, 'content' = retrieved by the learner
}
```

- [ ] **Step 4: 구현 — 시드 14개에 `fill` 부여**

`src/data/constructions.ts`. 판정 기준(스펙 §5): head verb가 든 청크는 항상 `frame`, `content`는 1~2개.

| 구문 | frame | content |
|---|---|---|
| `there-is` | There is | a problem · with the build |
| `first-then` | First · you · then · you | build · deploy |
| `ask-experience` | Have you ever been | to Busan |
| `find-oc` | I · find | it · useful |
| `i-dont-think` | I · don't think | that's right |
| `so-that` | I'm | so tired · that I can't focus |
| `want-o-to-v` | I · want · you | to review this |
| `causative-bare` | I'll · have him | call you |
| `lets` | Let's | ship it |
| `have-to` | We · have to fix | this · first |
| `im-afraid` | I'm · afraid | I can't make it |
| `do-you-mean` | Do you mean | the staging server |
| `if-cond` | If | it fails · roll back |
| `thank-for` | Thanks for | your help |

- [ ] **Step 5: 구현 — 테스트 픽스처 백필**

`src/services/validateLibrary.test.ts`의 `good`:

```ts
const good: Construction = {
  id: 'causative-bare', function: 'cause-condition', patternKind: 'construction',
  slots: [
    { role: 'subject', label: 'I', fill: 'frame' },
    { role: 'verb', label: 'made him', fill: 'frame' },
    { role: 'complement', label: 'angry', fill: 'content' },
  ],
  curatedVerbs: ['make', 'have', 'let'], example: { en: 'I made him angry.', ko: '내가 그를 화나게 했어.' },
}
```

Task 1·2에서 추가한 `bad`/`ok` 픽스처에도 `fill`을 채운다. **뒤에 올 규칙을 미리 만족시켜라** — 픽스처마다 (1) `frame` ≥1 · `content` ≥1 · `content` ≤2 (V3), (2) 큐레이션 동사가 표면에 나타나는 청크는 `frame` (V5). 그러면 Task 5·8에서 픽스처를 다시 손댈 일이 없다. 예: V2 초과 픽스처(슬롯 7개)는 `made`가 든 청크를 `frame`으로, `content`는 2개 이하로 둔다.

- [ ] **Step 6: 통과 확인**

Run: `npm run tsc` → exit 0
Run: `npx jest` → 전부 PASS

- [ ] **Step 7: 커밋**

```bash
git add src/types/construction.ts src/types/construction.test.ts src/data/constructions.ts src/services/validateLibrary.test.ts
git commit -m "feat(authoring): Slot.fill (frame|content) for the Lv2 scaffold"
```

---

### Task 5: V3 — frame/content 균형

**Files:**
- Modify: `src/services/validateLibrary.ts`
- Test: `src/services/validateLibrary.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('V3 flags a construction with no content slot', () => {
  const bad: Construction = { ...good, slots: good.slots.map((s) => ({ ...s, fill: 'frame' as const })) }
  expect(validateConstruction(bad, ['make']).join()).toMatch(/content/i)
})
test('V3 flags a construction with no frame slot', () => {
  const bad: Construction = { ...good, slots: good.slots.map((s) => ({ ...s, fill: 'content' as const })) }
  expect(validateConstruction(bad, ['make']).join()).toMatch(/frame/i)
})
test('V3 flags more than 2 content slots', () => {
  const bad: Construction = {
    ...good,
    slots: [
      { role: 'subject', label: 'I', fill: 'frame' },
      { role: 'verb', label: 'made', fill: 'content' },
      { role: 'object', label: 'him', fill: 'content' },
      { role: 'complement', label: 'angry', fill: 'content' },
    ],
    example: { en: 'I made him angry.', ko: '내가 그를 화나게 했어.' },
  }
  expect(validateConstruction(bad, ['make']).join()).toMatch(/content slots/i)
})
test('V3 does not apply to positional patterns', () => {
  const positional: Construction = {
    ...good,
    id: 'adv-order', patternKind: 'positional', curatedVerbs: [],
    slots: [
      { role: 'adverbial', label: 'at home', fill: 'frame' },
      { role: 'adverbial', label: 'every day', fill: 'frame' },
    ],
    example: { en: 'at home every day', ko: '집에서 매일' },
  }
  expect(validateConstruction(positional, ['make'])).toEqual([])
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/services/validateLibrary.test.ts` → FAIL (4건)

- [ ] **Step 3: 구현**

`validateConstruction`의 V1 검사 **뒤**에 추가:

```ts
  // V3 — Lv2 scaffold must be renderable (spec §5). Positional patterns have no Lv2 (원리 D).
  if (c.patternKind === 'construction') {
    const frames = c.slots.filter((s) => s.fill === 'frame').length
    const contents = c.slots.length - frames
    if (frames === 0) errs.push(`construction "${c.id}": no frame slot — Lv2 impossible`)
    if (contents === 0) errs.push(`construction "${c.id}": no content slot — Lv2 impossible`)
    if (contents > 2) errs.push(`construction "${c.id}": ${contents} content slots (max 2)`)
  }
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest` → 전부 PASS. 시드 14개는 Task 4의 표대로면 전부 통과한다.

- [ ] **Step 5: 커밋**

```bash
git add src/services/validateLibrary.ts src/services/validateLibrary.test.ts
git commit -m "feat(authoring): V3 frame/content balance (construction-kind only)"
```

---

## Chunk 3: 동사 축 검사

### Task 6: 굴절 표 `verbForms.ts`

**Files:**
- Create: `src/data/verbForms.ts`
- Test: `src/data/verbForms.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { VERB_FORMS } from './verbForms'
import { CURATED_VERBS } from './verbs'

test('every curated verb has a forms entry', () => {
  for (const v of CURATED_VERBS) expect(VERB_FORMS[v]).toBeDefined()
})
test('no forms entry outside the curated set', () => {
  for (const k of Object.keys(VERB_FORMS)) expect(CURATED_VERBS).toContain(k)
})
test('every entry contains its own base form', () => {
  for (const [base, forms] of Object.entries(VERB_FORMS)) expect(forms).toContain(base)
})
test('irregulars are covered', () => {
  expect(VERB_FORMS.be).toEqual(expect.arrayContaining(['am', 'is', 'are', 'was', 'were', 'been']))
  expect(VERB_FORMS.have).toEqual(expect.arrayContaining(['has', 'had']))
  expect(VERB_FORMS.make).toContain('made')
  expect(VERB_FORMS.see).toEqual(expect.arrayContaining(['saw', 'seen']))
  expect(VERB_FORMS.give).toEqual(expect.arrayContaining(['gave', 'given']))
})
test('clitic forms are attached to their lemma', () => {
  expect(VERB_FORMS.be).toContain("'m")
  expect(VERB_FORMS.have).toContain("'ve")
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/data/verbForms.test.ts` → FAIL (Cannot find module './verbForms')

- [ ] **Step 3: 구현**

```ts
// Inflected surface forms for the curated verb set (spec §6).
// Closed by construction: keys === CURATED_VERBS. Consumed by validateLibrary V4/V5 today,
// and by the P2 trainer renderer / P3 recognition later.
// Clitics are listed under their lemma so contracted chunks ("I'm", "we've") still match.
export const VERB_FORMS: Record<string, string[]> = {
  // web 5형식 core (17)
  make: ['make', 'makes', 'made', 'making'],
  have: ['have', 'has', 'had', 'having', "'ve", "'s", "'d"],
  let: ['let', 'lets', 'letting'],
  get: ['get', 'gets', 'got', 'gotten', 'getting'],
  see: ['see', 'sees', 'saw', 'seen', 'seeing'],
  hear: ['hear', 'hears', 'heard', 'hearing'],
  watch: ['watch', 'watches', 'watched', 'watching'],
  want: ['want', 'wants', 'wanted', 'wanting'],
  ask: ['ask', 'asks', 'asked', 'asking'],
  tell: ['tell', 'tells', 'told', 'telling'],
  need: ['need', 'needs', 'needed', 'needing'],
  find: ['find', 'finds', 'found', 'finding'],
  call: ['call', 'calls', 'called', 'calling'],
  give: ['give', 'gives', 'gave', 'given', 'giving'],
  show: ['show', 'shows', 'showed', 'shown', 'showing'],
  send: ['send', 'sends', 'sent', 'sending'],
  bring: ['bring', 'brings', 'brought', 'bringing'],
  // daily high-frequency (11)
  be: ['be', 'am', 'is', 'are', 'was', 'were', 'been', 'being', "'m", "'s", "'re"],
  do: ['do', 'does', 'did', 'done', 'doing'],
  go: ['go', 'goes', 'went', 'gone', 'going'],
  come: ['come', 'comes', 'came', 'coming'],
  take: ['take', 'takes', 'took', 'taken', 'taking'],
  put: ['put', 'puts', 'putting'],
  keep: ['keep', 'keeps', 'kept', 'keeping'],
  feel: ['feel', 'feels', 'felt', 'feeling'],
  think: ['think', 'thinks', 'thought', 'thinking'],
  mean: ['mean', 'means', 'meant', 'meaning'],
  look: ['look', 'looks', 'looked', 'looking'],
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest src/data/verbForms.test.ts` → PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/data/verbForms.ts src/data/verbForms.test.ts
git commit -m "feat(authoring): inflected form table for the curated verb set"
```

---

### Task 7: `curatedVerbs=[]` 리트로핏 + 시드 로우 타입 개방

**V4보다 먼저 와야 한다.** `first-then`·`if-cond`·`thank-for`가 `['do']`를 들고 있는 상태에서 V4를 켜면 세 구문이 즉시 게이트를 빨갛게 만든다("한 태스크 끝날 때마다 green" 원칙 위반).

**Files:**
- Modify: `src/data/constructions.ts` (`first-then`, `if-cond`, `thank-for`)
- Modify: `src/data/seedCards.ts:7`

- [ ] **Step 1: 세 구문의 placeholder 제거**

`curatedVerbs: ['do']` → `curatedVerbs: []` (세 곳). 라이트버브가 프레임의 동사 자리를 채우지 않는 구문이라는 1급 선언이다. 셋 다 예문에 `do`의 어떤 굴절형도 나타나지 않는다 — 그래서 다음 태스크의 V4가 이들을 지목했을 것이다.

- [ ] **Step 2: 시드 로우 타입 개방**

`src/data/seedCards.ts`의 `SeedInput`:

```ts
  constructionId: string; headVerb: string | null
```

V6(Task 9)가 요구하는 `null`을 표현할 수 없으면 `[]` 구문의 예문 카드를 아예 저작할 수 없다. 현재 카드 5장은 전부 non-null이라 값 변경은 없다.

- [ ] **Step 3: 통과 확인**

Run: `npm run tsc` → exit 0
Run: `npx jest` → 전부 PASS (아직 V4가 없으므로 이 변경만으로는 검사가 늘지 않는다)

- [ ] **Step 4: 커밋**

```bash
git add src/data/constructions.ts src/data/seedCards.ts
git commit -m "fix(seed): drop placeholder curatedVerbs; allow null headVerb in seed rows"
```

---

### Task 8: V4·V5 — 동사 표면 출현 + head verb 청크는 frame

**Files:**
- Modify: `src/services/validateLibrary.ts`
- Test: `src/services/validateLibrary.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { surfaceTokens } from './validateLibrary'

test('surfaceTokens splits contractions into token, base and clitic', () => {
  expect(surfaceTokens("I'm")).toEqual(expect.arrayContaining(["i'm", 'i', "'m"]))
  expect(surfaceTokens("Let's ship it")).toEqual(expect.arrayContaining(['let', "'s", 'ship', 'it']))
  expect(surfaceTokens('made him,')).toEqual(expect.arrayContaining(['made', 'him']))
})
test('V4 flags curated verbs that never appear in any slot label', () => {
  const bad: Construction = { ...good, curatedVerbs: ['take'] }
  expect(validateConstruction(bad, ['take']).join()).toMatch(/no curated verb appears/i)
})
test('V4 passes when at least one candidate verb appears', () => {
  // 'have'/'let' are candidates that don't appear; 'make' appears as "made" → ok
  expect(validateConstruction(good, ['make', 'have', 'let'])).toEqual([])
})
test('V4 matches a verb hidden in a contraction', () => {
  const ok: Construction = {
    ...good,
    slots: [
      { role: 'subject', label: "I'm", fill: 'frame' },
      { role: 'complement', label: 'so tired', fill: 'content' },
    ],
    curatedVerbs: ['be'], example: { en: "I'm so tired.", ko: '너무 피곤해.' },
  }
  expect(validateConstruction(ok, ['be'])).toEqual([])
})
test('V5 flags a head-verb chunk marked as content', () => {
  const bad: Construction = {
    ...good,
    slots: [
      { role: 'subject', label: 'I', fill: 'frame' },
      { role: 'verb', label: 'made him', fill: 'content' },
      { role: 'complement', label: 'angry', fill: 'content' },
    ],
  }
  expect(validateConstruction(bad, ['make', 'have', 'let']).join()).toMatch(/must be fill/i)
})
test('V4 is skipped for constructions with no verb axis', () => {
  const noVerbAxis: Construction = {
    ...good,
    id: 'thank-for', function: 'socialize', curatedVerbs: [],
    slots: [
      { role: 'verb', label: 'Thanks for', fill: 'frame' },
      { role: 'object', label: 'your help', fill: 'content' },
    ],
    example: { en: 'Thanks for your help.', ko: '도와줘서 고마워.' },
  }
  expect(validateConstruction(noVerbAxis, ['make'])).toEqual([])
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/services/validateLibrary.test.ts` → FAIL (surfaceTokens 미존재 + V4/V5 미구현)

- [ ] **Step 3: 구현**

`src/services/validateLibrary.ts` 상단에 import 추가:

```ts
import { VERB_FORMS } from '../data/verbForms'
```

`normalizeJoin` 아래에 추가:

```ts
// Comparable surface tokens of a chunk label: the whole token, plus base and clitic when
// the token contains an apostrophe ("I'm" → i'm / i / 'm, "don't" → don't / do / 't).
export function surfaceTokens(label: string): string[] {
  const out: string[] = []
  for (const raw of label.toLowerCase().split(/\s+/)) {
    const t = raw.replace(/^[^a-z']+/, '').replace(/[^a-z']+$/, '')
    if (!t) continue
    out.push(t)
    const i = t.indexOf("'")
    if (i > 0) {
      out.push(t.slice(0, i))
      out.push(t.slice(i))
    }
  }
  return out
}

// Index of the first slot whose label surfaces this verb, or -1.
function slotOfVerb(verb: string, slots: { label: string }[]): number {
  const forms = new Set(VERB_FORMS[verb] ?? [verb])
  for (let i = 0; i < slots.length; i++) {
    if (surfaceTokens(slots[i].label).some((t) => forms.has(t))) return i
  }
  return -1
}
```

V3 블록 안(같은 `patternKind === 'construction'` 가드 아래)에 추가:

```ts
    // V4 — the verb axis must actually surface in the frame (spec §6). At least one candidate.
    // V5 — and the chunk it surfaces in is the frame's identity, so it must be shown at Lv2.
    if (c.curatedVerbs.length > 0) {
      const hits = c.curatedVerbs.map((v) => slotOfVerb(v, c.slots)).filter((i) => i >= 0)
      if (hits.length === 0) {
        errs.push(`construction "${c.id}": no curated verb appears in any slot label`)
      }
      for (const i of new Set(hits)) {
        if (c.slots[i].fill !== 'frame') {
          errs.push(`construction "${c.id}": head-verb chunk "${c.slots[i].label}" must be fill:'frame'`)
        }
      }
    }
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest` → 전부 PASS. Task 7에서 `[]`로 바꾼 3개를 뺀 **11개**가 V4·V5를 통과해야 한다. 여기서 실패하는 구문이 나오면 placeholder를 하나 더 놓친 것이므로, 예문에 그 동사가 정말 안 나타나는지 확인하고 `[]` 대상인지 판단할 것(스펙 §6 치환 테스트).

- [ ] **Step 5: 커밋**

```bash
git add src/services/validateLibrary.ts src/services/validateLibrary.test.ts
git commit -m "feat(authoring): V4/V5 curated-verb surfacing + head-verb chunk is frame"
```

- [ ] **Step 6: (선택) V7 — subject 청크의 동사 삼킴 검사**

스펙에는 없는 **추가 규칙**이다. 채택 여부를 사용자에게 확인한 뒤에만 구현할 것. 굴절 표가 생긴 지금은 R2 위반의 절반을 기계로 잡을 수 있다:

```ts
    // V7 — a subject chunk must not swallow a verb across a space (spec R2).
    for (const s of c.slots) {
      if (s.role !== 'subject') continue
      const tokens = surfaceTokens(s.label).filter((t) => !t.startsWith("'"))
      const hit = tokens.find((t) => Object.values(VERB_FORMS).some((f) => f.includes(t)))
      if (hit && tokens.length > 1) {
        errs.push(`construction "${c.id}": subject chunk "${s.label}" swallows a verb ("${hit}")`)
      }
    }
```

`[I'm]`은 clitic만 있어 통과하고, `[I don't think]`는 `think` 때문에 걸린다. 한계: `[I'm afraid]`처럼 동사가 아닌 보어를 삼킨 경우는 못 잡는다.

---

## Chunk 4: 카드 교차 검사

### Task 9: V6 — `[]` 구문을 무는 카드는 `headVerb=null`

**Files:**
- Modify: `src/services/validateLibrary.ts:66-74` (카드↔구문 교차 검사 블록)
- Test: `src/services/validateLibrary.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
test('V6 flags a card carrying a headVerb for a verb-axis-free construction', () => {
  const noVerbAxis: Construction = {
    ...good, id: 'thank-for', function: 'socialize', curatedVerbs: [],
    slots: [
      { role: 'verb', label: 'Thanks for', fill: 'frame' },
      { role: 'object', label: 'your help', fill: 'content' },
    ],
    example: { en: 'Thanks for your help.', ko: '도와줘서 고마워.' },
  }
  const card = {
    type: 'sentence', id: 'c5', text: 'Thanks for your help.', meaning: null, analysis: null, thumbnailUri: null,
    createdAt: 'now', source: 'curated', constructionId: 'thank-for', headVerb: 'do',
    functionFacet: 'socialize', functionFacetSecondary: null, domainFacet: [], scaffoldLevel: 1,
    stability: null, difficulty: null, nextDueAt: null, lastReviewedAt: null,
    reps: 0, lapses: 0, cardState: 'new', lastGrade: null,
  } as SentenceCard
  const errs = validateLibrary({ constructions: [noVerbAxis], verbs: ['do'], cards: [card], lexical: [] })
  expect(errs.join()).toMatch(/must be null/i)
  // 기존 "not in construction" 에러와 중복 보고되지 않아야 한다
  expect(errs.join()).not.toMatch(/not in construction/)
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest src/services/validateLibrary.test.ts` → FAIL (`/must be null/` 불일치, `not in construction`이 대신 나옴)

- [ ] **Step 3: 구현**

`validateLibrary`의 카드↔구문 교차 검사에서 headVerb 검사 부분을 교체:

```ts
        // V6 — an empty verb axis is a first-class declaration, not missing data.
        if (ctor.curatedVerbs.length === 0) {
          if (card.headVerb !== null) {
            errs.push(`card "${card.id}": construction "${ctor.id}" has no verb axis, so headVerb must be null`)
          }
        } else if (card.headVerb !== null && !ctor.curatedVerbs.includes(card.headVerb)) {
          errs.push(`card "${card.id}": headVerb "${card.headVerb}" not in construction "${ctor.id}" verbs`)
        }
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest` → 전부 PASS (기존 `not in construction` 테스트도 계속 green — 그 픽스처는 `curatedVerbs`가 비어있지 않다)

- [ ] **Step 5: 커밋**

```bash
git add src/services/validateLibrary.ts src/services/validateLibrary.test.ts
git commit -m "feat(authoring): V6 empty verb axis implies null headVerb"
```

---

## Chunk 5: 저작 치트시트

### Task 10: `docs/authoring-conventions.md`

스펙(동결된 근거)과 달리 이 문서는 **저작 중에 열어놓는 살아있는 규칙서**다. 근거·대안 논의는 스펙에 두고, 여기엔 판정에 필요한 것만 남긴다.

**Files:**
- Create: `docs/authoring-conventions.md` (RN 리포)

- [ ] **Step 1: 문서 작성**

구성(이 순서 그대로):

1. **한 줄 요약** — "슬롯은 화면 청크다. 예문의 완전분할이어야 하고, 각 청크는 Lv2에서 주거나(frame) 인출한다(content)."
2. **R1~R5** — 스펙 §4의 규칙과 예시를 그대로 옮긴다.
3. **R3 예외 목록(표)** — 사역·지각만. "이 표에 없으면 예외가 아니다" 문장 포함.
4. **`fill` 판정** — head verb 청크는 항상 frame, content 1~2개.
5. **`curatedVerbs` 치환 테스트** — "후보 동사를 동사 자리에 넣어도 같은 기능 패싯의 자연스러운 문장인가?" + `[]` 정책.
6. **위반/교정 대조표** — Task 1·3·7에서 실제로 고친 5건(`first-then`, `i-dont-think`, `im-afraid`, `first-then`·`if-cond`·`thank-for`의 `['do']`)을 before/after로. **실제로 리포에서 일어난 수정이라 가장 좋은 교보재다.**
7. **검증기 에러 메시지 → 규칙 매핑 표** — V1~V6의 실제 문자열과 대응 규칙. 저작 중 에러를 보면 바로 규칙을 찾을 수 있어야 한다.
8. **맨 끝: "규칙을 바꿀 때"** — 예외를 추가하려면 스펙과 이 문서를 함께 고칠 것. R3 예외가 3건을 넘으면 규칙 형식 자체를 재검토(스펙 §12).

- [ ] **Step 2: 정확성 확인**

에러 메시지 표(7번)의 문자열이 `validateLibrary.ts`의 실제 `errs.push` 문자열과 일치하는지 대조한다. 불일치하면 문서를 코드에 맞춘다.

- [ ] **Step 3: 커밋**

```bash
git add docs/authoring-conventions.md
git commit -m "docs(authoring): slot chunking + curatedVerbs cheat sheet"
```

---

## 완료 기준

- [ ] `npm run tsc` exit 0
- [ ] `npx jest` — 17 suites 전부 PASS, 테스트 수 55 → 약 75
- [ ] `constructions.test.ts`의 "every seed construction passes integrity validation" green — 시드 14개가 V1~V5를 전부 통과
- [ ] `library.integration.test.ts`의 전량 게이트 green — V6까지 포함해 라이브러리 무결
- [ ] `docs/authoring-conventions.md`가 존재하고, 에러 메시지 표가 코드와 일치
- [ ] 스펙 §8의 리트로핏 6행이 전부 반영됨

## 다음 단계 (이 플랜 밖)

딜리버러블 A 본편 — 13 기능패싯별 구문 인벤토리 확장. 이 플랜이 그 **선결 조건**이었으므로, 완료 즉시 착수 가능하다. 확장 중 R3 예외 추가 압력이 3건을 넘으면 스펙 §12에 따라 규칙 형식을 재검토한다.
