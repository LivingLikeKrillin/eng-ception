# 저작 컨벤션 — 슬롯 청킹 · `curatedVerbs` 정책 설계

> **문서 성격:** 북극성 §11 딜리버러블 A의 **선결 항목**(P0 코드리뷰에서 표면화)을 해소하는 단일 스펙. 구문 인벤토리를 시드 14개 이상으로 키우기 전에, 청크 경계와 `curatedVerbs`의 의미를 성문화하고 **기계로 강제**한다.
>
> 관련: 북극성 `2026-07-27-learning-program-design.md`(원리 C=청킹, §5=비계 다이얼, §11=딜리버러블 A), P0 계획 `2026-07-27-p0-metadata-library.md`(이 문서가 확장하는 스키마·검증기의 출처).
>
> **구현 리포:** `engception-app`(RN, 로컬 `C:\Users\Eisen\Desktop\Labs\engception-capture`). 이 웹 리포에는 설계 문서만 둔다.

## 1. 문제

P0가 만든 라이브러리 백본(`Construction` / `validateLibrary`)에는 **저작 규칙이 없다.** 결과로 시드 14개에서 이미 세 종류의 드리프트가 관측된다.

| 드리프트 | 실물 |
|---|---|
| subject 슬롯이 동사를 삼킴 | `i-dont-think`: `subject: "I don't think"` · `im-afraid`: `subject: "I'm afraid"` |
| 번들링 기준 불일치 | `causative-bare`는 `verb: "have him"`(V+O 묶음), `want-o-to-v`는 `object: "you"` / `complement: "to review this"`로 분리 |
| placeholder 동사 | `first-then`·`if-cond`·`thank-for`가 `curatedVerbs: ['do']` — 프레임의 head verb가 아니라 자리 채우기 |
| 예문 분할 손실 | `first-then`의 슬롯을 이으면 `"First you build then deploy"` ≠ 예문 `"First you build, then you deploy."` (`you` 누락) |

현 검증기는 이 넷 중 **하나도 잡지 못한다** — `curatedVerbs`는 "큐레이션 집합 소속"만 보고 관련성은 보지 않으며, 슬롯은 role 유효성과 라벨 비어있음만 본다.

**왜 지금인가.** 슬롯은 P2 트레이너의 Lv1 조립 청크 UI가 **그대로 소비**한다(원리 C: 구문 슬롯 경계 = 청크 경계). 규칙 없이 인벤토리를 100개로 키우면 교육적 오염이 표면에서 드러나고, 그때는 전량 재저작이다.

## 2. 목표 / 비목표

**목표**
1. 청크 경계 규칙을 결정론적으로 성문화 — 같은 문장을 두 번 저작해도 같은 분할이 나온다.
2. `curatedVerbs`의 의미를 확정하고 placeholder를 금지한다.
3. 규칙 중 기계로 강제 가능한 것은 전부 `validateLibrary`로 내린다 — "테스트에 안 잡히는 드리프트"를 없앤다.
4. 시드 14개를 새 규칙에 정합화해, 규칙이 실제로 작동함을 인벤토리에서 즉시 검증한다.

**비목표**
- 인벤토리 확장 자체(딜리버러블 A 본편) — 이 스펙은 그 **선결 조건**만 다룬다.
- `positional` 패턴(부사·형용사 어순)의 청킹 규칙 — 북극성 §10에서 P2 이후로 연기됨. 본 스펙의 규칙은 `patternKind: 'construction'`을 전제한다.
- P2 트레이너 UI 구현. 본 스펙은 트레이너가 **소비할 데이터의 계약**만 정한다.

## 3. 확정된 결정

| # | 결정 | 근거 |
|---|---|---|
| D1 | **슬롯 = 화면 청크(인출 단위)**, role은 그 청크의 대표 성분 | 원리 C, 웹앱 선례(`[I][made him][angry]`). 문법 정규형을 택하면 "made him"을 다시 묶는 병합 규칙을 P2가 따로 설계해야 함 = 문제 이월 |
| D2 | 규칙 형식 = **일반규칙 + 닫힌 예외목록** | 계열 템플릿은 구문 수만큼 증식하고, 인지부하 예산만으로는 결정론이 약함(= 지금 드리프트의 원인) |
| D3 | **강한 불변식** — 슬롯은 예문의 완전분할 | 누락·중복·순서를 기계가 전부 잡음. 저작 시 예문·슬롯 동기화 부담은 수용 |
| D4 | **Lv2 뼈대 표시를 지금 도입** (`Slot.fill`) | 북극성 §5 Lv2가 요구. 인벤토리를 키운 뒤 추가하면 전량 백필 |
| D5 | `curatedVerbs` 정합규칙 + **표면 출현 검사** | 굴절 표는 큐레이션 동사 28개로 닫혀 있어 비용이 작고, P2 렌더·P3 recognition에서 재사용됨 |
| D6 | 설계 스펙=웹 리포, 저작 치트시트=RN 리포 | 스펙은 동결된 결정 기록, 치트시트는 시드 파일 옆에서 저작 중 참조되는 살아있는 문서 — 역할이 달라 중복이 아님 |

## 4. 청크 경계 규칙

### R1 — 역할 앵커 최대 확장 (기본)
청크 하나 = **head 성분 1개 + 그에 문법적으로 종속된 기능어 전부**(관사·전치사·`to`·부정·조동사). 따라서 슬롯 수 = 문장의 head 성분 수.

```
[I][want][you][to review this]        // want의 to V 보어는 to까지 한 청크
[There is][a problem][with the build] // 전치사구는 통째
```

### R2 — 정서법 우선: 축약형 분할 금지
축약형은 공백이 없어 쪼갤 수 없다. **주어+조동사/계사 축약**(`I'll`, `I'm`, `we've`)은 subject 청크에 귀속하고 `role: 'subject'`를 유지한다.

이로써 P0 리뷰의 "subject는 NP만"이 정밀화된다 — **subject 청크는 NP + 붙어있는 clitic까지. 공백을 건너 동사를 삼키면 위반.**

| 위반 | 교정 |
|---|---|
| `[I don't think]` | `[I]` `[don't think]` |
| `[I'm afraid]` | `[I'm]` `[afraid]` |
| `[I'll]` ✅ (clitic이라 허용) | — |

### R3 — 예외: 사역·지각 계열은 `[V+O]` 한 덩어리 (닫힌 목록)
보어가 표지 없는 원형이라 O와 C의 경계가 학습자 눈에 보이지 않는다. 웹앱이 `[made him]`을 한 덩어리로 낸 것과 같은 근거다.

| 계열 | 분할 | 근거 |
|---|---|---|
| 사역 bare — make/have/let + O + 원형 | `[I'll][have him][call you]` | 보어 무표지 |
| 지각 — see/hear/watch + O + V/V-ing | `[I][saw him][leave]` | 보어 무표지 |
| **그 외 전부** — want/ask/tell + O + to V, 수여, 판단 | `[I][want][you][to review this]` | `to`·형용사·명사가 경계를 표시 |

**이 표에 없으면 예외가 아니다.** 예외를 늘리려면 이 문서를 고쳐야 하고, 그 시점에 "예외가 늘고 있다"가 눈에 보인다.

### R4 — 예산: 청크 2~6개
원리 C(작업기억)의 상한. 6을 넘으면 규칙 문제가 아니라 **예문이 길다는 신호**다 → 예문을 줄인다.

### R5 — 완전분할 불변식
슬롯 라벨을 순서대로 공백으로 이으면 `example.en`과 일치해야 한다(대소문자·구두점·연속공백 정규화 후). 저작자가 무엇을 하든 슬롯이 예문의 **손실 없는 분할**임이 보장된다.

R2(축약 분할 금지)는 별도 검사가 필요 없다 — 축약을 쪼개면 join에 공백이 끼어 R5가 자동으로 잡는다.

## 5. `Slot.fill` — Lv2 뼈대

```ts
export interface Slot {
  role: SlotRole
  label: string
  fill: 'frame' | 'content'   // 신규
}
```

**`fill`은 언어학적 판정이 아니라 교육적 지정이다** — "Lv2에서 이 청크를 **주는가**(`frame`), 학습자가 **인출하는가**(`content`)". 이 정의가 R3 번들과의 충돌을 없앤다: `[have him]`은 `him`이 내용어여도 `frame`이다. 사역 틀을 보여주는 것이 Lv2의 목적이기 때문이다.

**저작 규칙**
- `content`는 **1~2개**. 인출 부담을 한곳에 몰아야 Lv2가 Lv3(백지)와 구별된다.
- **head verb가 든 청크는 항상 `frame`** — 그것이 구문의 정체성이다.
- `frame` ≥1 **and** `content` ≥1. 어느 한쪽이 0이면 Lv2가 성립하지 않는다.

| 구문 | Lv2 렌더 |
|---|---|
| `ask-experience` | `Have you ever been` + `___` → "to Busan" 인출 |
| `causative-bare` | `I'll` `have him` + `___` → "call you" 인출 |
| `want-o-to-v` | `I` `want` `you` + `___` → "to review this" 인출 |

**Lv1·Lv3와의 관계:** Lv1은 `fill`을 무시하고 전 청크를 섞어 제시한다. Lv3는 청크를 아예 주지 않는다. 즉 `fill`은 **Lv2 전용 필드**이며, 다른 레벨의 동작을 바꾸지 않는다.

## 6. `curatedVerbs` 정책

**의미 확정:** "이 프레임의 동사 슬롯을 채울 수 있는 **후보 head verb** 목록." 예문에 실제 쓰인 동사 1개가 아니라, 틀을 유지한 채 교체 가능한 집합이다(축 B).

**치환 테스트(저작자용):** 후보 동사를 프레임의 동사 자리에 넣었을 때 **같은 기능 패싯을 유지한 자연스러운 문장**이 되는가? 안 되면 목록에서 뺀다.

**placeholder 금지.** 라이트버브가 실제로 채워지지 않는 프레임(순수 어순·접속·정형 표현)은 `['do']`/`['be']`가 아니라 **`[]`**.

| 구문 | 현재 | 변경 | 이유 |
|---|---|---|---|
| `first-then` | `['do']` | `[]` | head가 build/deploy — 틀이 동사를 고르지 않음 |
| `if-cond` | `['do']` | `[]` | 조건 접속 틀 |
| `thank-for` | `['do']` | `[]` | 정형 표현 |
| `there-is`·`so-that`·`im-afraid` | `['be']` | **유지** | be가 실제 head |

**`[]`의 계약:** `curatedVerbs=[]`인 구문을 참조하는 카드는 `headVerb=null`이어야 한다. `[]`는 "동사 축이 없는 구문"이라는 1급 선언이지 데이터 누락이 아니다.

**굴절 표 (`src/data/verbForms.ts`, 신규):** 큐레이션 동사 28개 → 굴절형 배열(`be → am/is/are/was/were/been/being`, `make → makes/made/making`, …). 집합이 닫혀 있어 28행이면 완결되고, P2 Lv2 렌더·P3 recognition에서 재사용된다. §7의 V4가 이 표를 소비한다.

## 7. 검증기 규칙

`validateConstruction`에 V1~V5, `validateLibrary`(교차 참조)에 V6을 추가한다. 반환 형식은 기존과 동일 — 에러 문자열 배열(`[]` = 정상).

| # | 규칙 | 위치 | 잡는 것 |
|---|---|---|---|
| V1 | `join(slots.label, ' ')` === `example.en` (정규화 후) | construction | 누락·중복·순서 오류, 축약 분할 |
| V2 | 슬롯 수 2~6 | construction | 예산 초과, 통청크 저작 |
| V3 | `frame` ≥1 **and** `content` ≥1 **and** `content` ≤2 | construction | Lv2 불성립 |
| V4 | `curatedVerbs` 비어있지 않으면 **최소 하나**의 굴절형이 어느 슬롯 라벨에든 출현 | construction | 무관한 동사 오저작 |
| V5 | V4가 매치된 청크는 **전부** `fill: 'frame'` | construction | head verb를 빈칸으로 낸 오저작 |
| V6 | `curatedVerbs=[]`인 구문을 참조하는 카드는 `headVerb === null` | library | `[]` 계약 위반 |

**`positional` 구문의 적용 범위:** V1·V2는 전 구문에 적용하고, **V3·V4·V5는 `patternKind: 'construction'`에만** 적용한다. 어순 패턴은 동사 축도 Lv2 뼈대 개념도 갖지 않으므로(북극성 원리 D·§10), 이들에 대해서는 검사를 건너뛴다. 시드에 `positional` 구문은 아직 0개지만, 규칙을 지금 명시해 두지 않으면 첫 어순 패턴을 저작할 때 검증기가 잘못 거부한다.

**정규화 함수(V1):** 소문자화 → 구두점(`.,!?;:"` 및 인용부호) 제거 → 연속공백 1개로 축약 → trim. 어포스트로피는 **제거하지 않는다**(축약형이 유의미하므로).

**토크나이저(V4):** 라벨을 공백 분할 → 양끝 구두점 제거 → 어포스트로피가 있으면 base + clitic으로 분리(`I'm` → `I` + `'m`) → base와 원 토큰 둘 다 굴절 표와 대조. `Let's`는 base `let`으로 통과한다. **동사가 여러 개인 구문에서도 "최소 하나"만 요구**하므로, 후보 목록 중 예문에 안 쓰인 동사는 문제가 되지 않는다(`ask-experience`의 `go`/`see`).

**V4의 알려진 한계:** 표면 출현만 보므로 "예문에 우연히 등장하는 큐레이션 동사"(예: 본동사가 아닌 `have`가 완료형 조동사로 등장)를 head verb로 오인할 수 있다. 이는 **치환 테스트(§6)라는 사람 판정을 대체하지 않는 보조 검사**다 — placeholder 드리프트라는 관측된 실패 모드를 막는 것이 목적이다.

## 8. 리트로핏 (시드 14개)

| 구문 | 조치 | 위반 규칙 |
|---|---|---|
| `first-then` | `you` 복원(6청크로) + `curatedVerbs=[]` | V1, §6 |
| `if-cond` | `curatedVerbs=[]` | §6 |
| `thank-for` | `curatedVerbs=[]` | §6 |
| `i-dont-think` | `[I don't think]` → `[I][don't think]` | R2 |
| `im-afraid` | `[I'm afraid]` → `[I'm][afraid]` | R2 |
| 14개 전부 | `fill` 부여 | V3 |

`causative-bare`·`want-o-to-v`는 **현행 유지** — R3 예외 목록과 이미 일치한다(웹앱 선례를 따랐기 때문).

**카드 파급 = 현재 없음.** 시드 카드 5장은 `causative-bare`·`want-o-to-v`·`find-oc`·`ask-experience`·`have-to`만 참조하며, `[]`가 되는 세 구문을 참조하는 카드는 없다. 다만 `seedCards.ts`의 내부 `SeedRow` 타입이 `headVerb: string`(non-nullable)이라, `[]` 구문의 예문 카드를 앞으로 저작하려면 이 타입을 `string | null`로 열어야 한다 — V6가 요구하는 값을 표현할 수 없기 때문이다. (`SentenceCard.headVerb`는 이미 nullable이므로 시드 로우 타입만의 문제다.)

## 9. 산출물

```
engception-app (RN, 구현)
├── docs/authoring-conventions.md      # 신규 — 저작 치트시트(살아있는 문서)
├── src/types/construction.ts          # Slot.fill 추가
├── src/data/verbForms.ts              # 신규 — 굴절 표(28)
├── src/data/constructions.ts          # 리트로핏
└── src/services/validateLibrary.ts    # V1~V6

engception (웹, 문서)
└── docs/superpowers/specs/2026-08-01-authoring-conventions-design.md   # 이 문서
```

**치트시트 구성:** R1~R5 → R3 예외 목록 → `fill` 판정 → `curatedVerbs` 치환 테스트 → **위반/교정 대조표**(§8의 5건을 그대로 교보재로 사용). 스펙(동결된 근거)과 달리 치트시트는 규칙이 바뀔 때마다 갱신된다.

## 10. 테스트 전략

리포 컨벤션대로 TDD(red → green → commit).

- **규칙마다 위반 픽스처 1개 + 통과 픽스처 1개** — 기존 `validateLibrary.test.ts`의 negative-branch 패턴을 그대로 따른다.
- **`library.integration.test.ts`의 전량 게이트가 리트로핏 완료의 판정자** — 시드 14개가 V1~V6를 전부 통과해야 green.
- **`verbForms.ts`:** 28개 항목이 각자 base form을 포함하는지 + 대표 불규칙 5개(be/have/make/see/give) 스팟체크.
- 회귀 기준선: 현재 **17 suites / 55 tests** 전부 통과 상태 유지.

**타입 파급 주의:** `Slot.fill`을 **필수 필드**로 넣으면 기존 `Slot` 리터럴이 전부 컴파일 에러가 된다 — `constructions.ts` 시드 14개와 `construction.test.ts`·`validateLibrary.test.ts`의 픽스처가 대상이다. 이는 의도된 것이다(누락을 컴파일 타임에 잡는 게 optional + 런타임 검사보다 낫다). 진행 순서 2단계에서 `tsc` 통과를 게이트로 삼는다.

## 11. 진행 순서

각 단계가 독립적으로 green이라 중간에 멈춰도 리포가 깨지지 않는다.

1. **V1·V2** (스키마 변경 없음) → `first-then` 즉시 검출·수정
2. **`Slot.fill` 추가 + V3·V5** → 시드 14개에 `fill` 부여
3. **`verbForms.ts` + V4**
4. **V6** (카드 교차 검사) + 카드 `headVerb` 정정
5. **치트시트 저작** (`docs/authoring-conventions.md`)

## 12. 열린 위험

- **`content` ≤2 상한이 임의값이다.** 인지부하 근거는 있으나 실측은 없다. P2 트레이너에서 Lv2 정답률이 바닥이면 상한을 1로 조이고, 너무 쉬우면 3까지 연다 — **데이터 게이팅 항목**.
- **R3 예외 목록의 확장 압력.** 인벤토리를 키우다 보면 "이것도 무표지 보어"라는 사례가 나온다. 목록에 추가하되, 3건을 넘어가면 규칙 형식 자체(계열 템플릿)를 재검토한다.
- **`fill`이 구문 단위로만 저작된다.** 같은 구문이라도 카드마다 인출 부담을 달리 하고 싶을 수 있다(카드별 override). 지금은 YAGNI — P2에서 필요가 확인되면 `SentenceCard`에 선택적 override를 얹는다(비파괴 확장).
