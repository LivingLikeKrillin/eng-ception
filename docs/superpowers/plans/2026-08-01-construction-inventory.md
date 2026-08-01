# 구문 인벤토리 확장 (딜리버러블 A) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구문 인벤토리를 14 → 48로 확장하고, 시제·상·태를 `grammarFacet` 태그로 1급화하며, 큐레이션 카드를 구문에서 기계 파생한다.

**Architecture:** 스키마 2필드 추가(`domain`, `grammarFacet`) → 매칭 유틸 분리(`verbMatch.ts`) → 카드 파생 → 패밀리 4배치 저작. 기존 검증기 V1~V6가 저작 품질의 기계 게이트이고, 신규 3개 테스트(패싯 카운트·문법 커버·파생 수)가 **누락**을 잡는다. UI·스토어는 건드리지 않는다.

**Tech Stack:** TypeScript(strict) · Jest(jest-expo) · 순수 TS 모듈

**스펙:** `docs/superpowers/specs/2026-08-01-construction-inventory-design.md`

---

## ⚠️ 작업 환경

- **구현 리포:** `C:\Users\Eisen\Desktop\Labs\engception-capture`. 이 플랜만 웹 리포에 있다.
- **테스트:** `npx jest` (현재 기준선 **18 suites / 76 tests**). **타입체크:** `npm run tsc`.
- **브랜치:** `master`에서 `feat/construction-inventory`.
- **저작 규칙은 `docs/authoring-conventions.md`**(RN 리포)를 따른다. 이 플랜의 청크 표기 `[chunk]F` = `fill:'frame'`, `[chunk]C` = `fill:'content'`.

---

## File Structure

| 파일 | 책임 | 상태 |
|---|---|---|
| `src/types/construction.ts` | 스키마 | 수정 — `domain`, `grammarFacet`, `GRAMMAR_FACETS`, `isGrammarFacet` |
| `src/services/verbMatch.ts` | 동사 표면 매칭 | **신규** — `surfaceTokens`/`slotOfVerb` 이사 |
| `src/services/validateLibrary.ts` | 규칙 강제 | 수정 — import 교체 + `grammarFacet` 가드 |
| `src/data/seedCards.ts` | 큐레이션 카드 | **재작성** — 구문에서 파생 |
| `src/data/constructions.ts` | 구문 인벤토리 | 수정 — 필드 백필 + 34개 추가 |
| `src/data/library.test.ts` | 조회 헬퍼 테스트 | 수정 — 인벤토리 성장에 깨지지 않게 |
| `src/data/inventory.test.ts` | 인벤토리 완성도 게이트 | **신규** — 패싯 카운트·문법 커버 |

---

## Chunk 1: 스키마 + 파생 기반

### Task 1: `grammarFacet` + `domain` 필드

**Files:** `src/types/construction.ts`, `src/types/construction.test.ts`, `src/data/constructions.ts`

- [ ] **Step 1: 실패하는 테스트** — `construction.test.ts`에 추가

```ts
import { GRAMMAR_FACETS, isGrammarFacet } from './construction'

test('grammar facets are a closed 5-set', () => {
  expect(GRAMMAR_FACETS).toEqual(['perfect', 'progressive', 'passive', 'modal', 'conditional'])
})
test('isGrammarFacet guards', () => {
  expect(isGrammarFacet('perfect')).toBe(true)
  expect(isGrammarFacet('pluperfect')).toBe(false)
})
```

그리고 기존 `Construction literal` 테스트에 `domain: ['일상'], grammarFacet: []`를 추가한다.

- [ ] **Step 2: 실패 확인** — `npm run tsc` → `'domain' does not exist in type 'Construction'`

- [ ] **Step 3: 구현**

```ts
export const GRAMMAR_FACETS = ['perfect', 'progressive', 'passive', 'modal', 'conditional'] as const
export type GrammarFacet = (typeof GRAMMAR_FACETS)[number]

const GRAMMAR_FACET_SET = new Set<string>(GRAMMAR_FACETS)
export function isGrammarFacet(x: unknown): x is GrammarFacet {
  return typeof x === 'string' && GRAMMAR_FACET_SET.has(x)
}
```

`Construction`에 추가:

```ts
  domain: string[]              // open tag ('업무' | '일상' | 'IT' …) — source of the card's domainFacet
  grammarFacet: GrammarFacet[]  // closed tag, orthogonal to `function`. [] = unmarked (simple present/past)
```

- [ ] **Step 4: 기존 시드 14개 백필**

`domain`은 아래 표대로, `grammarFacet`은 `ask-experience: ['perfect']` · `if-cond: ['conditional']` · `have-to: ['modal']` · 나머지 `[]`.

| 구문 | domain | 구문 | domain |
|---|---|---|---|
| `there-is` | `['업무','IT']` | `causative-bare` | `['업무']` |
| `first-then` | `['업무','IT']` | `lets` | `['업무']` |
| `ask-experience` | `['일상']` | `have-to` | `['업무']` |
| `find-oc` | `['일상']` | `im-afraid` | `['일상']` |
| `i-dont-think` | `['일상']` | `do-you-mean` | `['업무','IT']` |
| `so-that` | `['일상']` | `if-cond` | `['IT']` |
| `want-o-to-v` | `['업무']` | `thank-for` | `['일상']` |

- [ ] **Step 5: 검증기에 닫힌 집합 가드 추가** (`validateConstruction`)

```ts
  for (const g of c.grammarFacet) {
    if (!isGrammarFacet(g)) errs.push(`construction "${c.id}": bad grammarFacet "${g}"`)
  }
```

- [ ] **Step 6: 통과 확인** — `npm run tsc` exit 0 · `npx jest` 전부 PASS

- [ ] **Step 7: 커밋** — `feat(inventory): Construction.domain + grammarFacet (closed 5-set)`

---

### Task 2: `verbMatch.ts` 분리

**Files:** `src/services/verbMatch.ts`(신규), `src/services/validateLibrary.ts`, 테스트

- [ ] **Step 1: 테스트 이동** — `validateLibrary.test.ts`의 `surfaceTokens` 테스트를 새 파일 `src/services/verbMatch.test.ts`로 옮기고, import를 `./verbMatch`로 바꾼다. `slotOfVerb` 테스트를 추가:

```ts
import { surfaceTokens, slotOfVerb } from './verbMatch'

test('slotOfVerb finds the first slot surfacing an inflected form', () => {
  const slots = [{ label: 'I' }, { label: 'made him' }, { label: 'angry' }]
  expect(slotOfVerb('make', slots)).toBe(1)
  expect(slotOfVerb('take', slots)).toBe(-1)
})
test('slotOfVerb matches a clitic', () => {
  expect(slotOfVerb('be', [{ label: "I'm" }, { label: 'tired' }])).toBe(0)
})
```

- [ ] **Step 2: 실패 확인** — `npx jest src/services/verbMatch.test.ts` → Cannot find module

- [ ] **Step 3: 구현** — `surfaceTokens`와 `slotOfVerb`를 `validateLibrary.ts`에서 잘라 `verbMatch.ts`로 옮기고(`slotOfVerb`도 **export**), `validateLibrary.ts`는 `import { slotOfVerb } from './verbMatch'`로 바꾼다. `VERB_FORMS` import는 `verbMatch.ts`로 따라간다.

- [ ] **Step 4: 통과 확인** — `npx jest` 전부 PASS (테스트 위치만 바뀜)

- [ ] **Step 5: 커밋** — `refactor(services): extract verbMatch from validateLibrary`

---

### Task 3: 카드 파생

**Files:** `src/data/seedCards.ts`(재작성), `src/data/seedCards.test.ts`

- [ ] **Step 1: 실패하는 테스트** — `seedCards.test.ts`를 파생 계약으로 교체

```ts
import { SEED_CARDS } from './seedCards'
import { SEED_CONSTRUCTIONS } from './constructions'

test('one derived card per construction', () => {
  expect(SEED_CARDS).toHaveLength(SEED_CONSTRUCTIONS.length)
  expect(new Set(SEED_CARDS.map((c) => c.id)).size).toBe(SEED_CARDS.length)
})
test('a derived card mirrors its construction', () => {
  const ctor = SEED_CONSTRUCTIONS.find((c) => c.id === 'causative-bare')!
  const card = SEED_CARDS.find((c) => c.constructionId === 'causative-bare')!
  expect(card.text).toBe(ctor.example.en)
  expect(card.meaning).toBe(ctor.example.ko)
  expect(card.functionFacet).toBe(ctor.function)
  expect(card.domainFacet).toEqual(ctor.domain)
  expect(card.headVerb).toBe('have') // surfaces in "have him"
})
test('a verb-axis-free construction derives a null headVerb', () => {
  const card = SEED_CARDS.find((c) => c.constructionId === 'thank-for')!
  expect(card.headVerb).toBeNull()
})
```

- [ ] **Step 2: 실패 확인** — `npx jest src/data/seedCards.test.ts` → FAIL (현 5장 손저작)

- [ ] **Step 3: 구현** — `seedCards.ts` 전체 교체

```ts
// Curated example cards — DERIVED from the construction inventory (spec §6).
// Single source of truth: fix an example and its card follows. Never hand-author here.
import type { SentenceCard } from '../types/card'
import type { Construction } from '../types/construction'
import { newCardDefaults } from '../services/srs'
import { slotOfVerb } from '../services/verbMatch'
import { SEED_CONSTRUCTIONS } from './constructions'

// The example's head verb = the first curated candidate that surfaces in it.
// V4 guarantees a hit whenever curatedVerbs is non-empty; [] yields null (V6 holds by construction).
function exampleHeadVerb(c: Construction): string | null {
  for (const v of c.curatedVerbs) {
    if (slotOfVerb(v, c.slots) >= 0) return v
  }
  return null
}

export const SEED_CARDS: SentenceCard[] = SEED_CONSTRUCTIONS.map((c) => ({
  type: 'sentence',
  id: `seed-${c.id}`,
  text: c.example.en,
  meaning: c.example.ko,
  analysis: null,
  thumbnailUri: null,
  createdAt: '2026-07-27T00:00:00.000Z',
  source: 'curated',
  constructionId: c.id,
  headVerb: exampleHeadVerb(c),
  functionFacet: c.function,
  functionFacetSecondary: null,
  domainFacet: c.domain,
  scaffoldLevel: 1,
  ...newCardDefaults(),
}))
```

- [ ] **Step 4: 통과 확인** — `npm run tsc` · `npx jest` 전부 PASS. 통합 게이트가 green이면 파생 카드 14장이 V6까지 통과한 것이다.

- [ ] **Step 5: 커밋** — `feat(inventory): derive seed cards from constructions`

---

### Task 4: 성장에 견디는 테스트로 교체

**Files:** `src/data/library.test.ts`, `src/data/inventory.test.ts`(신규)

- [ ] **Step 1: `library.test.ts` 수정** — 목록 동등 비교를 포함 단언으로

```ts
test('constructionsByFunction returns all for a facet', () => {
  const ids = constructionsByFunction('request').map((c) => c.id)
  expect(ids).toEqual(expect.arrayContaining(['causative-bare', 'want-o-to-v']))
  expect(ids.length).toBeGreaterThanOrEqual(2)
})
```

- [ ] **Step 2: `inventory.test.ts` 신규 — 목표 미달을 잡는 게이트**

```ts
import { SEED_CONSTRUCTIONS } from './constructions'
import { GRAMMAR_FACETS } from '../types/construction'
import type { FunctionId } from '../types/facets'

// Spec §4-A. Frequency-weighted, not uniform.
const TARGET: Record<FunctionId, number> = {
  inform: 5, 'explain-process': 3, narrate: 5,
  opine: 4, 'agree-disagree': 3, 'express-feeling': 3,
  request: 5, propose: 3, modality: 4, refuse: 3,
  clarify: 4, 'cause-condition': 4, socialize: 2,
}

test('every facet meets its target count', () => {
  for (const [fn, want] of Object.entries(TARGET)) {
    const got = SEED_CONSTRUCTIONS.filter((c) => c.function === fn).length
    expect({ fn, got }).toEqual({ fn, got: want })
  }
})
test('the inventory totals 48', () => {
  expect(SEED_CONSTRUCTIONS).toHaveLength(48)
})
test('every grammar facet is covered by at least one construction', () => {
  for (const g of GRAMMAR_FACETS) {
    expect(SEED_CONSTRUCTIONS.some((c) => c.grammarFacet.includes(g))).toBe(true)
  }
})
```

- [ ] **Step 3: 실패 확인** — `npx jest src/data/inventory.test.ts` → FAIL (14개뿐, 문법 태그 미달). **이 테스트는 배치 4가 끝날 때까지 빨간 상태로 둔다** — 저작 진척도 계기판 역할이다.

- [ ] **Step 4: 커밋** — `test(inventory): facet-count and grammar-coverage gates (red until batch 4)`

---

## Chunk 2: 저작 배치

각 배치의 절차는 동일하다:

1. 아래 표대로 `constructions.ts`에 추가 (청크·`fill`은 표기 그대로)
2. `npx jest src/data/constructions.test.ts src/data/library.integration.test.ts` → V1~V6 전량 통과
3. `npm run tsc` → 필수 필드 누락 없음
4. 커밋

**표기:** `[chunk]F` = frame, `[chunk]C` = content. role은 저작 규칙 R1대로 부여한다.

### Task 5: 배치 1 — 정보 (+10)

| id | facet | 청크 | curatedVerbs | grammar | domain | 예문 |
|---|---|---|---|---|---|---|
| `its-adj` | inform | `[It's]F [really busy]C [today]C` | `['be']` | — | `['일상']` | It's really busy today. / 오늘 진짜 바빠. |
| `it-is-to-v` | inform | `[It's]F [hard]C [to explain]C` | `['be']` | — | `['업무']` | It's hard to explain. / 설명하기 어려워. |
| `passive-be-pp` | inform | `[It]F [was released]F [last week]C` | `['be']` | `passive` | `['업무','IT']` | It was released last week. / 지난주에 출시됐어. |
| `looks-like` | inform | `[It]F [looks like]F [a bug]C` | `['look']` | — | `['IT']` | It looks like a bug. / 버그 같은데. |
| `way-to` | explain-process | `[The way to do it]F [is]F [to restart]C` | `['be','do']` | — | `['IT']` | The way to do it is to restart. / 하는 방법은 재시작이야. |
| `all-you-have-to` | explain-process | `[All you have to do]F [is]F [restart it]C` | `['be']` | — | `['IT']` | All you have to do is restart it. / 재시작만 하면 돼. |
| `past-simple` | narrate | `[I]F [sent]F [it]C [yesterday]C` | `['send','tell','show','bring']` | — | `['업무']` | I sent it yesterday. / 어제 보냈어. |
| `ive-pp` | narrate | `[I've]F [already sent]F [it]C` | `['send','tell','see']` | `perfect` | `['업무']` | I've already sent it. / 이미 보냈어. |
| `used-to` | narrate | `[I]F [used to go]F [there]C [a lot]C` | `['go','be','do']` | — | `['일상']` | I used to go there a lot. / 예전엔 거기 자주 갔어. |
| `was-ing-when` | narrate | `[I]F [was going home]F [when]F [it happened]C` | `['go','come','take']` | `progressive` | `['일상']` | I was going home when it happened. / 집에 가던 중에 그 일이 생겼어. |

⚠️ `ive-pp`의 `curatedVerbs`에 **`have`를 넣지 말 것** — `I've`의 clitic `'ve`가 `have`의 굴절형이라 V4가 조동사를 head verb로 오인한다(스펙 §7의 알려진 한계).

### Task 6: 배치 2 — 태도 (+7)

| id | facet | 청크 | curatedVerbs | grammar | domain | 예문 |
|---|---|---|---|---|---|---|
| `i-think` | opine | `[I]F [think]F [it's worth trying]C` | `['think','feel','find']` | — | `['일상']` | I think it's worth trying. / 해볼 만한 것 같아. |
| `seems-to-me` | opine | `[It seems to me]F [that this won't work]C` | `[]` | — | `['업무']` | It seems to me that this won't work. / 내 생각엔 이거 안 될 것 같아. |
| `what-i-like` | opine | `[What I like about it]F [is]F [the design]C` | `['be']` | — | `['일상']` | What I like about it is the design. / 그거에서 마음에 드는 건 디자인이야. |
| `thats-not-right` | agree-disagree | `[That's]F [not quite right]C` | `['be']` | — | `['일상']` | That's not quite right. / 그건 좀 아닌 것 같아. |
| `agree-but` | agree-disagree | `[I]F [see your point]F [but]F [it's risky]C` | `['see','get']` | — | `['업무']` | I see your point, but it's risky. / 무슨 말인진 알겠는데, 위험해. |
| `make-me-feel` | express-feeling | `[That]F [makes me]F [feel better]C` | `['make','let','have']` | — | `['일상']` | That makes me feel better. / 그러니까 기분이 좀 낫네. |
| `im-getting` | express-feeling | `[I'm]F [getting]F [tired]C` | `['get','be','feel']` | `progressive` | `['일상']` | I'm getting tired. / 슬슬 피곤해지네. |

⚠️ `make-me-feel`의 `curatedVerbs`에 **`feel`을 넣지 말 것** — `feel better`가 content 청크라 V5(head verb 청크는 frame)에 걸린다. 사역 번들 `[makes me]`가 R3 예외다.
⚠️ `seems-to-me`는 head verb `seem`이 큐레이션 28에 없다 → `[]`가 정답(placeholder 금지).

### Task 7: 배치 3 — 설득·양태 (+10)

| id | facet | 청크 | curatedVerbs | grammar | domain | 예문 |
|---|---|---|---|---|---|---|
| `could-you` | request | `[Could you]F [take a look]F [at this]C` | `['take','give','show']` | `modal` | `['업무']` | Could you take a look at this? / 이것 좀 봐줄래? |
| `let-me-know` | request | `[Let me know]F [if anything changes]C` | `['let']` | — | `['업무']` | Let me know if anything changes. / 무슨 일 있으면 알려줘. |
| `have-o-pp` | request | `[I'll]F [have it fixed]F [by tomorrow]C` | `['have','get']` | `passive` | `['업무']` | I'll have it fixed by tomorrow. / 내일까지 고쳐 놓을게. |
| `im-going-to` | propose | `[I'm]F [going to take]F [a break]C` | `['take','get','make']` | — | `['일상']` | I'm going to take a break. / 좀 쉬려고. |
| `why-dont-we` | propose | `[Why don't we]F [take]F [a break]C` | `['take','go','do']` | — | `['일상']` | Why don't we take a break? / 우리 좀 쉴까? |
| `should` | modality | `[You]F [should ask]F [him]C` | `['ask','tell','see','take']` | `modal` | `['업무']` | You should ask him. / 걔한테 물어보는 게 좋겠어. |
| `can-permission` | modality | `[You]F [can call]F [me]C [anytime]C` | `['call','ask','come']` | `modal` | `['일상']` | You can call me anytime. / 언제든 전화해도 돼. |
| `dont-have-to` | modality | `[You]F [don't have to come]F [today]C` | `['come','go','do']` | `modal` | `['일상']` | You don't have to come today. / 오늘 안 와도 돼. |
| `id-rather-not` | refuse | `[I'd]F [rather not go]F [tonight]C` | `['go','do','take']` | `modal` | `['일상']` | I'd rather not go tonight. / 오늘 밤엔 안 가는 게 좋겠어. |
| `some-other-time` | refuse | `[Maybe]F [some other time]C` | `[]` | — | `['일상']` | Maybe some other time. / 다음 기회에. |

⚠️ `id-rather-not`의 `curatedVerbs`에 **`have`를 넣지 말 것** — `I'd`의 `'d`가 `have`의 굴절형과 충돌한다.
⚠️ `have-o-pp`는 R3 사역 번들(`[have it fixed]`)이다 — O와 p.p.를 쪼개지 않는다.

### Task 8: 배치 4 — 상호작용 (+7)

| id | facet | 청크 | curatedVerbs | grammar | domain | 예문 |
|---|---|---|---|---|---|---|
| `what-if` | clarify | `[What if]F [it doesn't work]C` | `[]` | `conditional` | `['일상']` | What if it doesn't work? / 안 되면 어떡하지? |
| `tag-question` | clarify | `[That's]F [the latest build]C [isn't it]F` | `['be']` | — | `['IT']` | That's the latest build, isn't it? / 그게 최신 빌드 맞지? |
| `show-again` | clarify | `[Could you]F [show me]F [again]C` | `['show','tell','give']` | `modal` | `['업무']` | Could you show me again? / 다시 보여줄래? |
| `because` | cause-condition | `[I'm]F [late]C [because]F [the train stopped]C` | `['be']` | — | `['일상']` | I'm late because the train stopped. / 기차가 멈춰서 늦었어. |
| `make-o-v` | cause-condition | `[The update]F [made it]F [crash]C` | `['make','let','have']` | — | `['IT']` | The update made it crash. / 업데이트 때문에 죽었어. |
| `so-that-purpose` | cause-condition | `[I]F [came early]F [so that]F [I could see him]C` | `['come','go','take']` | — | `['일상']` | I came early so that I could see him. / 걔 보려고 일찍 왔어. |
| `sorry-for` | socialize | `[Sorry for]F [the delay]C` | `[]` | — | `['업무']` | Sorry for the delay. / 늦어서 미안해. |

⚠️ `what-if`는 `[]`다 — `doesn't`의 `do`가 content 청크에 있어 `['do']`로 두면 V5에 걸린다. 어차피 조건 접속 틀이라 동사 축이 없다.
⚠️ `so-that-purpose`의 `curatedVerbs`에 **`see`를 넣지 말 것** — content 청크에 있다.

- [ ] **배치 4 종료 시:** `npx jest src/data/inventory.test.ts` → **PASS**(48개, 패싯 목표 전량 충족, 문법 5종 커버). Task 4에서 빨갛게 둔 게이트가 여기서 초록이 된다.

---

## Chunk 3: 마감

### Task 9: 치트시트 갱신

**Files:** `docs/authoring-conventions.md`(RN 리포)

- [ ] **Step 1:** `fill` 판정 절에 `grammarFacet`·`domain` 저작 규칙을 추가한다 — 닫힌 5-집합의 의미, 빈 배열 = 무표지, 도메인은 열린 태그.
- [ ] **Step 2:** §5 에러 매핑 표에 `bad grammarFacet` 행을 추가한다.
- [ ] **Step 3:** **저작 함정 절 신설** — 배치 표의 ⚠️ 4건을 일반화한다: "`'ve`/`'d` clitic이 `have`의 굴절형이라 조동사를 head verb로 오인한다", "content 청크에 있는 동사는 `curatedVerbs`에 넣지 마라(V5)". 실제로 저작하다 밟은 지뢰라 다음 확장 때 그대로 재발한다.
- [ ] **Step 4: 커밋** — `docs(authoring): grammarFacet/domain rules + curatedVerbs pitfalls`

### Task 10: 최종 검증

- [ ] `npm run tsc` exit 0
- [ ] `npx jest` — 전 suite PASS, 약 90 tests
- [ ] `SEED_CONSTRUCTIONS.length === 48` · `SEED_CARDS.length === 48`
- [ ] `library.integration.test.ts` green — 48구문 + 48카드가 V1~V6 전량 통과

---

## 완료 기준

- [ ] 구문 48개, 패싯별 목표 배분 충족 (`inventory.test.ts` green)
- [ ] `GRAMMAR_FACETS` 5종 각각 최소 1개 구문
- [ ] 카드 48장 전부 파생 — `seedCards.ts`에 손저작 문자열 0
- [ ] 치트시트에 신규 필드 규칙 + 저작 함정 반영
- [ ] `CURATED_VERBS` 28개 무변경

## 다음 단계 (이 플랜 밖)

**P2 트레이너**(Lv1~3 비계 다이얼) — 이제 소비할 재료가 48구문/48카드다. `Slot.fill`이 Lv2 렌더를, `grammarFacet`이 회로 진단의 제2 축을 제공한다. 커버리지 실측은 P1 캡처 데이터가 쌓인 뒤 2차 확장의 근거로 쓴다(스펙 §8).
