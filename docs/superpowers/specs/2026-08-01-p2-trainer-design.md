# P2 트레이너 (비계 다이얼 Lv1~3) 설계

> **문서 성격:** 북극성 로드맵 **P2**("트레이너 Lv1~3 + 어휘 Lv3 승급(a)")의 단일 스펙. 북극성이 P2 스펙으로 넘긴 미결 4건 — 비계 승급 임계(§12)·청크 경계 메커니즘(§12)·M1 복습 흡수 확정(§7)·웹 이식 경계(§9) — 을 여기서 닫는다.
>
> 관련: 북극성 `2026-07-27-learning-program-design.md`(§5 비계 다이얼, §6 어휘 레이어, §7 로드맵), 저작 컨벤션 `2026-08-01-authoring-conventions-design.md`(R1~R5·V1~V6), 구문 인벤토리 `2026-08-01-construction-inventory-design.md`(구문 48·카드 48), 캡처 M1 플랜 `../plans/2026-07-27-capture-app-m1.md`(§7 개정 대상).
>
> **구현 리포:** `engception-app`(RN, 로컬 `C:\Users\Eisen\Desktop\Labs\engception-capture`).

## 1. 문제

L1(스키마)·L2(콘텐츠)는 섰다. 구문 48개, 그로부터 기계 파생된 큐레이션 카드 48장, FSRS 스케줄러, dueQueue, MMKV 영속화가 전부 green이다. **그런데 이걸 소비하는 것이 아무것도 없다.** `App.tsx`는 아직 Expo 보일러플레이트고, RN 앱에 화면이 하나도 없다.

즉 현재 상태는 "재료만 있고 훈련이 없는" 앱이다. 북극성의 두 근육(재배치·인출) 중 어느 쪽도 실행되지 않는다.

P2가 채우는 것은 L3(훈련 엔진) + L4(표면)이며, 핵심은 **비계 다이얼** — 같은 카드 하나를 성숙도에 따라 비계를 걷어내며 반복하는 단일 엔진이다.

### 1-A. 왜 지금 P2인가 (P1보다 먼저)

P1(캡처 M1 Chunk 3·4)은 카메라·OCR이라 **실물 기기가 필요**하고, 폰 세팅 전까지 착수할 수 없다. P2는 기기 없이 `@testing-library/react-native`로 상호작용까지 검증 가능하다(§10).

더 중요한 이유는 **버릴 코드를 안 만드는 것**이다. P1 플랜 Task 13은 `ReviewScreen`(English-first read/shadow)을 만드는데, 북극성 §7이 "M1 복습은 Lv1의 특수형이고 P2 다이얼이 **흡수·대체**한다(공존 아님)"고 이미 못 박았다. P1을 먼저 하면 만들자마자 대체될 화면을 만들게 된다. 순서를 뒤집으면 그 낭비가 사라진다.

## 2. 목표 / 비목표

**목표**
1. Lv1(조립) → Lv2(부분 인출) → Lv3(백지)를 **하나의 엔진**으로 구현하고, 레벨 선택은 FSRS 숙련도에서 **자동 파생**한다.
2. 큐레이션 카드 48장으로 다이얼이 실제로 돌아간다 — 앱을 켜면 훈련이 가능하다.
3. Lv3 실패 지점을 어휘 카드로 승급시키는 경로(a)를 열고, 그 카드를 **풀 수 있게** 한다.
4. 3탭 셸을 세워 P1이 캡처 화면만 꽂으면 되게 한다.
5. 기기 없이 동작 검증 100% — 미결은 시각 검증뿐.

**비목표**
- 캡처 화면 실물 구현(P1) · recognition(P3) · 클라우드(P4).
- `constructionId=null` 카드의 청크 분리(D6에서 P3로 연기 확정, §11).
- 어휘 `recognize`(E→K) 방향 UX · positional 어순 드릴 · 오디오/TTS.
- 디자인 시스템·테마 구축. RN 기본 컴포넌트 + 최소 스타일로 간다.

## 3. 결정 요약

| # | 결정 | 근거 |
|---|---|---|
| D1 | 레벨은 **파생값**(`levelForCard`), 저장 필드가 아님 | `masteryLabel` 3밴드와 1:1 → 새 임계 발명 0, 강등 자동 |
| D2 | Lv2 채점 = **타이핑 자동판정 + 불일치 시 자가보정** | 북극성 "혼합"의 직역. 인출 부하 보존 + 동의어 오판 흡수 |
| D3 | 어휘 승급 = **Lv3 모범답에서 청크 탭-마킹** | 자동 승급의 노이즈(북극성 §12) 회피, 사용자가 진짜 결손만 지목 |
| D4 | 어휘 `meaning`은 **사용자가 한 줄 입력** | 청크 단위 한국어가 데이터에 없고 P2엔 Claude가 없다. 부호화 효과는 덤, P3에서 자동채움으로 기본값만 교체 |
| D5 | P2가 **셸·복습·컬렉션을 선점**, P1 플랜 개정 | 북극성 §7의 "흡수·대체"를 순서로 실현 → 버릴 코드 0 |
| D6 | `constructionId=null` 카드는 **Lv1 읽기/shadow 고정** | P3 recognition이 슬롯을 채우면 휴리스틱 청킹은 죽은 코드가 된다. 실측 데이터도 아직 없다 |
| D7 | 엔진 = **순수 함수 + 주입식 Zustand 스토어** | 웹 `learningStore`·RN `cardStore`에서 검증된 패턴, 렌더테스트에 그대로 얹힌다 |
| D8 | **시드 부트스트랩 + 채점 seam**을 P2가 메움 (§7) | 없으면 앱을 켜도 카드가 0장이고, Lv1/Lv2의 `Grade`를 커밋할 통로가 없다 |

## 4. 레벨 파생 모델 (D1)

```ts
// services/trainer/level.ts
export type TrainerLevel = 1 | 2 | 3

export function levelForCard(card: SentenceCard, ctor: Construction | null): TrainerLevel
```

판정 순서(위에서 먼저 맞는 것):

| 조건 | 레벨 | 이유 |
|---|---|---|
| `ctor == null` (구문 미부착) | **1** (읽기/shadow) | 슬롯이 없어 조립도 뼈대도 불가 — D6 |
| `ctor.patternKind === 'positional'` | **1** | Lv2는 구문 뼈대 단계 (저작 컨벤션 원리 D). 현재 인벤토리엔 0개, 방어적 분기 |
| `card.meaning == null` | **1** | Lv3의 프롬프트가 한국어 뜻이다. 뜻이 없으면 인출 과제가 성립하지 않음 |
| `card.reps === 0` | **1** | `masteryLabel` = '새내기' |
| `masteryLabel(card) === '숙련'` | **3** | stability ≥ 21일 |
| 그 외 | **2** | '학습중' |

**설계 함의**
- **강등이 공짜다.** Lv3에서 실패(grade 1)하면 FSRS가 stability를 깎고 → 밴드가 '학습중'으로 내려가고 → 다음 세션은 Lv2다. 별도 강등 로직이 없다.
- **임계 튜닝 지점이 1개**로 모인다: `srsView.ts`의 `MATURE_STABILITY_DAYS = 21`. 북극성 §12의 "비계 승급 임계 데이터 게이팅"이 이 상수 하나로 축약된다.
- **새 카드는 항상 Lv1**이므로 첫 만남에서 백지를 요구하지 않는다.

### 4-A. 저장 필드 `card.scaffoldLevel`의 위상

P0 스키마의 `CardMetaFields.scaffoldLevel`(`1|2|3`, non-null)은 **진실이 아니라 스냅샷**으로 강등한다.

- 진실 = `levelForCard(card, ctor)` — 언제나 재계산 가능.
- 저장 필드 = 채점 커밋 시 계산된 **다음 세션의 레벨**을 함께 기록. 용도는 (i) 컬렉션 리스트에서 구문 조회 없이 뱃지 렌더, (ii) P3 텔레메트리의 시계열.
- 스키마 변경 없음 → MMKV 마이그레이션 없음.
- **불변식:** 저장 필드는 읽기 경로의 분기 조건으로 **절대 쓰지 않는다.** 테스트로 고정한다(스냅샷이 파생값과 어긋난 카드를 넣어도 세션 레벨이 파생값을 따르는지).

### 4-B. 수동 오버라이드 — "백지 도전"

Lv1/Lv2로 파생된 카드에서 사용자가 **상향만** 점프할 수 있다(북극성 §5 확정 결정 1). 세션 한정이며 **영속화하지 않는다** — 다음 세션은 다시 파생값. 하향 오버라이드는 없다(비계를 더 주는 건 학습적으로 무의미하고, 실패하면 자동으로 내려온다).

## 5. 다이얼 3레벨

세션 = 카드 1장 × 레벨 1개. 페이즈는 레벨마다 2단계(수행 → 결과)로 통일한다.

### 5-A. Lv1 — 재배치(조립)

**제공:** 구문 슬롯 청크 전부(셔플), 한국어 뜻.
**산출:** 순서.

- 보드는 `ctor.slots`를 셔플한 칩 목록. 탭하면 답 트레이에 쌓이고, 다시 탭하면 되돌린다. `다시`(전체 리셋)와 `정답 보기`(포기) 2개 버튼을 함께 둔다 — 포기 경로가 없으면 막힌 학습자가 세션을 이탈한다.
- V2가 슬롯 수 2~6을 보장하므로 칩은 항상 2개 이상이다.
- **셔플은 주입된 rng로** 결정론적으로 만든다(`shuffle(items, rng)`). 테스트는 항등 rng를 주입해 순서를 고정하고, "정답 순서와 동일한 셔플" 케이스도 명시적으로 만든다.
- 판정: 트레이가 다 차는 순간 자동 채점. `slots` 인덱스 순서와 완전 일치해야 정답.
- **웹 엔진과의 차이:** 웹의 `connector` 선택 단계는 **이식하지 않는다.** 웹은 3블록 고정 + 접속사 별도 선택이었지만, RN은 접속사가 `conjunction` role 슬롯으로 이미 청크에 들어있다(예: `first-then`의 `then`). 판정 로직은 `isAssemblyCorrect`의 순서 비교 부분만 가져온다.

**뜻 없는 카드:** `meaning == null`이지만 구문이 붙은 카드(P3 이후의 캡처 카드)는 한국어 프롬프트 없이 **청크 순서 복원만** 한다. Lv1은 성립하고 Lv2/Lv3만 막힌다.

**Lv1 읽기/shadow 변형** (`ctor == null` 또는 `positional`): 청크가 없으므로 영어 문장을 보여주고 소리내어 읽게 한 뒤 자가평가 3버튼. M1 복습이 여기로 흡수된다(D5). P2 시점에 이 경로를 타는 카드는 없다(큐레이션 48장은 전부 구문 부착) — P1 캡처 유입이 시작되면 활성화된다.

### 5-B. Lv2 — 부분 인출

**제공:** `fill: 'frame'` 슬롯은 그대로 렌더, `fill: 'content'` 슬롯은 입력칸. 한국어 뜻.
**산출:** content 청크 텍스트.

V3가 프레임 ≥1개·content 1~2개를 보장하므로 빈칸은 항상 1~2개다.

**판정 (D2):**
1. 제출 시 각 칸을 `normalizeAnswer`로 비교 → 칸별 `auto-correct | mismatch`.
2. mismatch 칸은 정답을 공개하고 **`사실상 맞음` 토글**을 붙인다. 동의어("check this" vs "review this")·어순 변이를 사용자가 인정하는 통로.
3. 최종 칸 상태 = `auto | self-corrected | wrong`.

**정규화 규칙** (`services/trainer/answer.ts`):
- 소문자화, 앞뒤 공백 제거, 연속 공백 1칸.
- 문장부호 제거: `. , ! ? ; : " “ ”` — **아포스트로피는 보존**(`I'll` ≠ `I ll`). `validateLibrary.normalizeJoin`과 동일한 규칙이므로 **`normalizeJoin`을 `services/normalize.ts`로 이동**하고 양쪽이 함께 쓴다(중복 정의 금지).
- 유니코드 곡선 아포스트로피(`’`)는 ASCII `'`로 접는다 — RN 키보드가 곡선을 넣는 기기가 있다.
- 그 이상(관사 무시, 어간 추출)은 **하지 않는다.** 오탐을 자가보정으로 흡수하는 편이 규칙을 불투명하게 만드는 것보다 낫다.

### 5-C. Lv3 — 완전 인출(백지)

**제공:** 한국어 뜻 + 기능패싯 라벨(예: "요청·부탁") 힌트만.
**산출:** 영어 문장 통째.

- 입력은 **자유 타이핑 1칸**. 자동 채점하지 않는다 — 문장 단위에서 정답은 여럿이고, 자동판정이 여기서 틀리면 학습자가 옳은 답을 틀렸다고 믿게 된다.
- 제출 → **reveal**: 모범답 + 구문 라벨 + 슬롯 청크 분해를 보여주고, 학습자 입력을 나란히 놓는다.
- 채점 = 자가평가 3버튼 → 기존 `gradeFromSelfRating`('again'|'good'|'easy') 그대로.
- reveal 화면의 청크가 **어휘 승급 탭 타깃**이다(§6).

### 5-D. 채점 테이블

| Lv | 시그널 | Grade |
|---|---|---|
| 1 | 첫 시도 정답 | 3 (good) |
| 1 | 리셋 후 정답 | 2 (hard) |
| 1 | 포기(정답 보기) | 1 (again) |
| 1 (읽기/shadow) | 자가평가 | `gradeFromSelfRating` |
| 2 | 모든 칸 `auto` | 4 (easy) |
| 2 | 모든 칸 통과하되 `self-corrected` 포함 | 3 (good) |
| 2 | 절반 이상 통과(빈칸 2개 중 1개) | 2 (hard) |
| 2 | 통과 0 | 1 (again) |
| 3 | 자가평가 | `gradeFromSelfRating` |

**왜 Lv1 만점이 4가 아닌가:** 비계가 가장 두꺼운 상태의 성공이므로 회상 강도가 낮다. Lv2 만점(비계 얇음 + 자동판정)만 4를 준다. FSRS의 grade는 "얼마나 쉽게 떠올랐나"이고, 비계량이 곧 난이도이므로 레벨별 상한을 다르게 두는 것이 모델과 정합한다.

새 함수는 `services/trainer/grade.ts`에 `gradeFromAssembly` / `gradeFromFill` 2개. `srs.ts`는 손대지 않는다(`gradeFromSelfRating`은 이미 있다).

## 6. 어휘 승급 레이어 (경로 a)

### 6-A. 생성 (D3·D4)

Lv3 reveal 화면에서 모범답의 청크를 탭 → 바텀시트:

| 필드 | 채우는 방법 |
|---|---|
| `text` | 탭한 청크 라벨 |
| `meaning` | **사용자 입력**(필수, 공백이면 저장 비활성) |
| `collocationContext` | 소스 문장 전체(자동) |
| `sourceCardId` | 소스 카드 id |
| `domainFacet` | 소스 카드 승계 |
| `unit` | 공백 있으면 `chunk`, 없으면 `word` |
| `direction` | `produce` 고정 |
| SRS 필드 | `newCardDefaults()` |

- 중복 방지: `dedupKey(text)` 기준으로 이미 있으면 새로 만들지 않고 기존 카드를 연다.
- `validateLibrary`의 어휘 검사(빈 `meaning`/`text` 금지)를 저장 전에 통과해야 한다.

### 6-B. 인출 큐

카드만 쌓이고 못 푸는 반쪽 상태를 피하기 위해 **K→E 인출 큐를 P2에 포함**한다. 비용이 작다 — 뜻을 프롬프트로 보여주고 영어를 타이핑하는 것은 Lv2의 단일 빈칸과 같은 상호작용이라 `answer.ts`·판정·자가보정을 그대로 재사용한다.

- 문장 카드와 **같은 FSRS·같은 판정**, **별도 큐**(북극성 §6).
- 채점: Lv2 테이블의 단일 칸 케이스(auto=4 / self-corrected=3 / wrong=1). 어휘는 부분 점수가 없으므로 2는 나오지 않는다.
- 어휘 카드에는 비계 다이얼을 적용하지 않는다(레벨 개념 없음).

### 6-C. 저장소 확장

`DataStore`에 어휘 CRUD 4종 추가: `getAllLexical` / `addLexical` / `updateLexicalSchedule` / `deleteLexical`. 메모리 어댑터·MMKV 어댑터 양쪽 구현.

MMKV 키를 새로 쓰므로 **기존 문장 카드 키는 건드리지 않는다** → 마이그레이션 불필요. `lexicalStore.ts`는 `cardStore.ts`와 평행 구조(주입식 `createLexicalActions` + Zustand 훅).

`srsView.ts`의 `isDue`/`dueQueue`/`nextDueDate`/`masteryLabel`은 현재 `SentenceCard`로 타입이 좁다. **`SrsCardFields & { createdAt: string }` 제네릭으로 넓혀** 어휘 카드도 같은 뷰 함수를 쓴다(구현 변경 없음 — 이미 이 필드들만 읽는다). `LexicalCard`에 `createdAt`이 없으므로 **필드를 추가**한다(P0 스키마 확장 1건 — 어휘 카드는 아직 실사용 데이터가 0이라 비용 없음). 기존 `seedLexical.ts` 픽스처 3건도 함께 채워야 `tsc`가 통과한다.

## 7. 빠져 있던 연결 2건

설계 검토 중 확인된, 지금 없으면 **앱을 켜도 훈련이 시작되지 않는** 연결이다.

**(1) 시드 카드 적재 경로가 없다.** `SEED_CARDS` 48장은 코드 상수일 뿐이고, 화면이 읽는 것은 `db.getAllCards()`(MMKV)다. 둘을 잇는 코드가 어디에도 없다 — P0는 데이터만, M1 Chunk 2는 저장소만 만들었고 부트스트랩은 어느 쪽 범위도 아니었다.

→ **`services/bootstrap.ts`의 `seedIfNeeded(store)`** 를 추가하고 앱 기동 시 1회 호출한다(웹 `main.tsx`의 시드 적재와 같은 역할).
- **멱등:** 기존 카드의 `dedupKey(text)` 집합과 대조해 없는 것만 넣는다. `cardStore.saveSentences`의 dedup 규칙과 동일.
- **사용자 데이터 파괴 금지:** 시드는 추가만 하고 기존 카드의 SRS 상태는 절대 덮어쓰지 않는다.
- `SEED_CARDS`는 고정 id(`seed-<constructionId>`)를 갖고 있으므로 인벤토리가 늘어나면 다음 기동에서 새 구문만 추가된다.
- 시드 카드의 `createdAt`이 전부 동일 상수(`2026-07-27T…`)라 `dueQueue`의 tiebreak가 무의미해진다 → 48장이 한 덩어리로 due가 된다. 정렬 안정성만 확보되면 되므로 **id 문자열을 최종 tiebreak로 추가**한다.

**(2) `cardStore.gradeCard`가 자가평가만 받는다.** 현재 시그니처는 `(id, rating: SelfRating)`이고 내부에서 `gradeFromSelfRating`을 부른다. Lv1/Lv2는 이미 `Grade`를 산출하므로 자가평가로 되돌릴 수 없다.

→ `createCardActions`에 **`gradeCardWith(id, grade: Grade, at?)`** 를 추가하고, 기존 `gradeCard(id, rating)`은 `gradeFromSelfRating` → `gradeCardWith` 위임으로 축소한다. 호출부(M1 복습)는 시그니처가 유지되므로 무손상. 채점 커밋 시 `scaffoldLevel` 스냅샷(4-A)도 이 경로에서 함께 갱신한다.

**(2-a) 스냅샷을 쓸 통로가 없다.** `DataStore.updateSchedule`의 patch 타입이 `Partial<SrsCardFields>`인데 `scaffoldLevel`은 `CardMetaFields` 소속이라 타입이 막는다.
→ patch 타입을 **`Partial<SrsCardFields & Pick<CardMetaFields, 'scaffoldLevel'>>`** 로 넓힌다. 메모리·MMKV 어댑터 둘 다 patch를 그대로 spread하므로 **런타임 구현 변경은 0**, 타입만 넓어진다. 메타 필드 전체를 열지 않는 이유는 `constructionId`/`functionFacet` 같은 recognition 소유 필드가 채점 경로로 새는 걸 막기 위해서다(그건 P3의 몫).

## 8. 표면 (D5)

### 8-A. 내비게이션

```
RootTabs (bottom-tabs)
├── 캡처   — 플레이스홀더 ("P1에서 연결")
├── 훈련   — TrainScreen (기본 탭), 문장 due + 어휘 due 뱃지
└── 컬렉션 — CollectionScreen (문장/어휘 세그먼트)
```

`@react-navigation/{native,bottom-tabs}`는 이미 설치돼 있다. 스택은 이번에 넣지 않는다 — 카드 상세는 P1 Task 14로 남긴다.

### 8-B. 화면 구성

| 파일 | 역할 |
|---|---|
| `screens/TrainScreen.tsx` | 오늘 문장 N·어휘 M 요약, 시작 버튼, 세션 중이면 다이얼 호스트 렌더 |
| `screens/CollectionScreen.tsx` | 문장/어휘 리스트 + `masteryLabel` + 레벨 뱃지 |
| `screens/CaptureScreen.tsx` | 플레이스홀더 |
| `components/trainer/AssembleBoard.tsx` | Lv1 칩 보드 + 트레이 |
| `components/trainer/FillBlanks.tsx` | Lv2 프레임 렌더 + 입력칸 + 자가보정 |
| `components/trainer/RecallReveal.tsx` | Lv3 입력 → 모범답 대조 + 청크 탭 |
| `components/trainer/SelfRateBar.tsx` | 3버튼 자가평가 (Lv1 shadow·Lv3 공용) |
| `components/trainer/LexicalMarkSheet.tsx` | 뜻 입력 바텀시트 |
| `components/trainer/LevelBadge.tsx` | Lv 표시 + '백지 도전' 진입점 |

**큐 진행:** 문장 큐와 어휘 큐는 **섞지 않는다** — TrainScreen에서 각각 진입 버튼을 갖고, 한 세션은 한 종류만 연속 재생한다(다이얼과 어휘는 상호작용이 달라 섞으면 맥락 전환 비용이 든다). 각 큐는 `dueQueue` 순서를 따르고, 큐가 비면 완료 화면(빈 상태 문구 + 다음 due 시각 `nextDueDate`)을 보여준다.

### 8-C. P1 플랜 개정

`docs/superpowers/plans/2026-07-27-capture-app-m1.md`를 이 스펙과 함께 개정한다.

| Task | 개정 |
|---|---|
| 13 (ReviewCard + ReviewScreen) | **삭제.** P2 다이얼이 대체 (북극성 §7) |
| 14 (Collection + CardDetail) | **축소** — `CardDetailScreen` + 컬렉션→상세 스택만. 리스트 본체는 P2 |
| 15 (3탭 내비 + 뱃지) | **축소** — 캡처 탭에 실물 화면 연결. 셸·뱃지는 P2 |

### 8-D. 이식 경계 (북극성 §9 미결)

웹 5형식 엔진에서 **가져오는 것**: 조립 순서 판정 로직(`isAssemblyCorrect`의 순서 비교), 세션 스토어의 주입식 액션 팩토리 패턴.
**안 가져오는 것**: React DOM 컴포넌트 전부, `SessionPayload`(Claude 1회 호출 구조 — P2는 로컬 온리), `connector` 선택, `patternQuiz`, 7스텝 시퀀스(empathy/precheck 등 — 다이얼과 상충).
결론: 이식이라기보다 **로직 재사용은 함수 1개 수준**이고 나머지는 신규 작성이다. 북극성 §9의 "RN 이식 비용" 위험은 낮은 쪽으로 판명됐다.

## 9. 모듈 경계

```
src/services/trainer/
  level.ts    levelForCard(card, ctor) → 1|2|3
  chunks.ts   shuffle(items, rng) · isOrderCorrect(order, slots) · blanksOf(ctor)
  answer.ts   normalizeAnswer(s) · matches(input, expected)
  grade.ts    gradeFromAssembly(signals) · gradeFromFill(cells)
src/store/
  trainerStore.ts  세션 상태 (createTrainerActions{store, now, rng} 주입)
  lexicalStore.ts  어휘 CRUD + 채점
```

**데이터 흐름**
```
cards → dueQueue → [세션 카드] → levelForCard → 레벨별 화면
                                        ↓ 시그널
                              grade.ts → schedule() → updateSchedule
                                        ↓ (Lv3 reveal)
                                  탭-마킹 → LexicalCard
```

**의존 방향:** `services/trainer/*`는 store를 모른다(순수). `trainerStore`가 services + `db`를 조립한다. 화면은 store만 본다. 이 방향이 지켜져야 순수 로직 테스트가 RN 런타임 없이 돈다.

## 10. 테스트 전략

**순수 로직 (jest, 기존 방식)**
- `levelForCard` — 6개 분기 전부 + 저장 스냅샷이 어긋나도 파생값을 따르는지(4-A 불변식).
- `chunks` — 셔플 결정론, 정답 순서와 같은 셔플, 부분 배치, 리셋.
- `answer` — 대소문자·구두점·공백·곡선 아포스트로피·축약 보존.
- `grade` — 채점 테이블 9행 전부.
- `trainerStore` — 레벨별 세션 전이, 채점 커밋 시 `updateSchedule` 호출 인자, 스냅샷 필드 갱신.
- `lexicalStore` — 생성·중복 흡수·필수 `meaning` 가드.
- `seedIfNeeded` — 빈 저장소에 48장 적재, 재호출 시 증가 없음, 기존 카드의 SRS 상태 보존, 인벤토리 증가 시 새 구문만 추가.

**렌더/상호작용 (`@testing-library/react-native` 신규 devDep)**

`jest.config.js`는 이미 `*.test.tsx`와 `@react-navigation/*` 트랜스파일을 커버하므로 설정 변경이 없다. MMKV는 기존 `__mocks__`로 해결되지만 `react-native-screens`/`react-native-safe-area-context`는 테스트에서 mock이 필요할 수 있다 — 구현 시 확인 항목.
- Lv1: 칩 탭 → 정답 → grade 3 커밋. 리셋 경로 → grade 2.
- Lv2: 오답 입력 → 정답 공개 → 자가보정 → grade 3.
- Lv3: 제출 → reveal → 청크 탭 → 뜻 입력 → 어휘 카드 생성.
- 내비 스모크: 3탭 렌더, 훈련 탭 뱃지 카운트.

**게이트:** `npm test` + `npm run tsc`(babel 테스트가 타입 에러를 못 잡으므로 필수) + `library.integration.test.ts`가 여전히 `[]`.

**미결:** 실기기 시각 검증(레이아웃·터치 영역·키보드 가림). 기기 도착 후 수동 체크리스트로 처리.

## 11. 범위 밖 (연기)

- 구문 없는 카드의 청크 분리 → **P3**(recognition이 슬롯을 채움).
- 어휘 `recognize`(E→K) 방향 · 큐레이션 시드 어휘(c) · 탭-저장(b) → P3.
- positional 어순 드릴 → 별도 phase(북극성 §10).
- 세션 이벤트 트래킹(웹의 `analytics.ts` 대응) → P3 이후. 지금은 `scaffoldLevel` 스냅샷이 최소 시계열 역할.
- 다이얼 애니메이션·디자인 시스템·다크 테마.

## 12. 열린 위험

| 위험 | 흡수 방법 |
|---|---|
| Lv2 자동판정 오탐(동의어·어순 변이) | 자가보정 토글이 1차 흡수. 보정 빈도가 높게 나오면 정규화가 아니라 **content 슬롯 저작**(더 결정적인 청크로)을 고친다 |
| 승급 임계 21일이 과하거나 이름 | 튜닝 지점이 `MATURE_STABILITY_DAYS` 하나 — 실사용 후 조정. Lv2 체류가 길면 낮춘다 |
| Lv3 자가평가의 관대함(다 'good' 누르기) | P2에선 감수. reveal에서 모범답과 나란히 보여주는 것이 최소 견제. 객관 시그널은 P3 Claude 채점 |
| 어휘 뜻 입력 마찰로 승급이 안 일어남 | P3에서 Claude 자동채움을 **기본값**으로 넣고 사용자는 수정만 하게 바꾼다(§6-A의 필드 구성은 그대로) |
| 큐레이션 48장이 금방 소진 | 48장은 초기 검증용. 실사용 재료는 P1 캡처 유입이 채운다 |
| 기기 없이 쓴 UI가 실기기에서 깨짐 | 렌더테스트가 로직을 고정하므로 수정은 스타일 국소에 그친다 |
