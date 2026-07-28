# engception

> 한국어 사고를 자연스러운 영어 구문으로 재배치 — 5형식 표현력을 회로에 박는 훈련
> "정답을 주는 앱이 아니라, 말문을 여는 앱"

## ⚠️ 프로젝트 위상 (2026-07 개편)

**이 웹앱은 이제 레거시다.** 제품 본체는 별도 RN 앱 **`engception-app`**(로컬 `C:\Users\Eisen\Desktop\Labs\engception-capture`, GitHub private)으로 이동했다. 전략이 "5형식 웹앱"에서 **학습 프로그램**(재배치+인출 2근육)으로 확장됐고, RN 앱이 그 수렴점이다.

- **북극성 설계(정본):** `docs/superpowers/specs/2026-07-27-learning-program-design.md` — 재배치+인출, 비계 다이얼, 2축 패턴(구문×핵심동사), 13 기능패싯, 어휘 인출 레이어, 로드맵 P0~P4.
- **P0 계획(완료):** `docs/superpowers/plans/2026-07-27-p0-metadata-library.md` (메타데이터 backbone + 패턴 라이브러리 시드 — RN 리포에 구현됨).
- **이 웹앱의 역할:** 5형식 엔진의 순수 TS 로직(prompts·patternLabels·조립 판정·srs)이 RN 트레이너(P2)로 **이식될 원천**. 웹 자체는 더 키우지 않음.
- **아래 본문은 웹앱 자체엔 여전히 정확**하나, 새 개발은 RN 리포(`AGENTS.md` 참조)에서 진행된다.

## 프로젝트 개요

Eng-ception은 한국인이 영어로 말할 때 겪는 핵심 병목 — "머릿속 한국어를 영어로 옮기기 쉬운 구조로 재배치하는 능력" — 을 훈련하는 앱이다. 번역기는 정답을 주지만 Eng-ception은 근육을 만든다.

### 핵심 컨셉: "발화 실패 복기 도구"

실생활에서 말문이 막힌 순간을 캡처해서 훈련하는 방식. 사용자의 실제 삶이 콘텐츠가 된다.

### v9 전략 축: 5형식(SVOC) 표현력

v9에서 **5형식이 1급(first-class) 축**이 됐다. 한국 중·고급 학습자가 3형식 직역에 갇히는 게 가장 큰 구조적 병목이라는 가설(전문가 검증: Processability Theory Stage 5~6).

**v9.1 정정 — 5형식 = 인식 스킬, 강제 아님.** 세션은 입력이 **"5형식 모먼트"인지 판정**(`recognition.isFiveHMoment`)한다. 맞으면 5형식으로 끌어올리며 *이런 단서면 5형식*을 가르치고, 아니면 **간결형이 정답임을 인정**하고 *왜 5형식이 과한지·그 단서*를 가르친다. 한국인의 진짜 결손은 "5형식이 나은 *상황 자체*를 인식 못 함"이므로 목표는 강제가 아니라 **인식**. 자연 영어가 3형식인 자리에 5형식을 욱여넣으면 학습자의 구조 판단력을 해친다 → 금지. 모먼트면 `pattern5h`/`pattern` 채우고 SRS 카드 생성, 비모먼트면 `pattern5h`/`pattern`=null + 카드 미생성(LearningRecord는 기록). 설계: `docs/superpowers/specs/2026-06-10-v9.1-recognition-design.md`.

**범위(scope): 말하기·텍스트 전용 web PWA.** 듣기/오디오/TTS는 별도 제품(engception-listen)으로 분리됨 — 이 앱에 오디오 없음. 네이티브(RN)는 보류.

## 기술 스택

- **프론트엔드:** React 19 + TypeScript (strict) + Vite 6
- **스타일링:** Tailwind CSS 4
- **상태 관리:** Zustand 5
- **라우팅:** React Router 7
- **AI:** Claude API (Anthropic) — Vercel Edge Function 또는 dev-server.js 프록시 (모델: `claude-sonnet-4-6`)
- **저장소:** LocalStorage (현재, schema v6) → Firebase 마이그레이션 예정
- **SRS:** ts-fsrs 5.4.1 (간격 반복 스케줄러)
- **테스트:** Vitest (단위/통합) + Playwright (e2e)
- **배포:** Vercel (api/ 폴더 Edge Functions) + PWA (vite-plugin-pwa)
- **개발 체제:** 1인 풀스택 (Windows)

## 프로젝트 구조

```
engception/
├── api/
│   └── chat.ts                   # Vercel Edge Function (Claude API 프록시, model claude-sonnet-4-6)
├── e2e/
│   ├── learn-flow.spec.ts        # Playwright e2e — mock 모드로 7스텝 전체 워크스루
│   └── srs-flow.spec.ts          # Playwright e2e — 완료→복습 due 카드→재연습 empathy 도달
├── src/
│   ├── main.tsx                  # 앱 엔트리포인트 (db.init() + 시드 시나리오 적재)
│   ├── App.tsx                   # 라우터 설정
│   ├── index.css                 # Tailwind 임포트
│   ├── types/
│   │   ├── index.ts              # Scenario, LearningRecord(v4|v5|v6), Capture, Pattern(+FSRS 필드)
│   │   ├── v9.ts                 # V9Step, Pattern5HId, CURATED_VERBS(17), SessionPayload 등 v9 핵심 타입
│   │   └── events.ts             # AnalyticsEvent 엔벨로프 + EventName union (이벤트 트래킹)
│   ├── data/
│   │   ├── seed-scenarios.ts     # 시드 시나리오 15개 (s1~s15; s11~s15는 저빈도 5형식 커버)
│   │   └── patternLabels.ts      # PATTERN_LABEL — Pattern5HId → 한국어 표시명 맵
│   ├── services/
│   │   ├── claude.ts             # fetchSessionPayload — 세션당 단 1회 API 호출 (+ mock/timeout/retry)
│   │   ├── prompts.ts            # SYSTEM_PROMPT(5형식 코치) + buildUserMessage
│   │   ├── validate.ts           # assertSessionPayload — 런타임 스키마 검증 (실응답 가드)
│   │   ├── mocks.ts              # mockSessionPayload — VITE_USE_MOCK=true 시 사용
│   │   ├── analytics.ts          # track() 파사드 — swappable AnalyticsSink + dev egress
│   │   ├── analyticsLifecycle.ts # visibilitychange → session_abandon(hidden)
│   │   ├── firebase.ts           # Firebase 단일 init + isFirebaseConfigured() 게이트 + 에뮬레이터 연결
│   │   ├── migrateToCloud.ts     # 로그인 시 로컬→Firestore 비파괴 union 병합 + 조건부 로컬 클리어
│   │   ├── srs.ts                # 순수 FSRS 스케줄러 (ts-fsrs 래핑) — schedule(), gradeFromSignals(), newCardDefaults()
│   │   ├── srsView.ts            # Pattern[] 위 순수 파생 — isDue, dueQueue, masteryLabel, rollupByPattern
│   │   └── pwa/
│   │       └── installPrompt.ts  # beforeinstallprompt 캡처 + 설치 상태/iOS Safari 감지 + dismiss 영속화
│   ├── store/
│   │   ├── dataStore.ts          # DataStore 인터페이스 (영속화 추상화; +getPattern/updatePatternSchedule)
│   │   ├── db.ts                 # 스왑 가능한 db 파사드 + setDbAdapter (setSink 평행; 7 소비자가 import)
│   │   ├── localStorage.ts       # LocalStorage 어댑터 (schema v6; v4/v5→v6 비파괴 마이그레이션)
│   │   ├── firestoreDataStore.ts # createFirestoreDataStore(fs,uid) — Firestore 어댑터 (withDefaults FSRS 백필)
│   │   ├── analyticsSink.ts      # AnalyticsSink 인터페이스 + noop + MemoryAnalyticsSink
│   │   ├── localAnalyticsSink.ts # localStorage 링버퍼 sink (engception:events)
│   │   ├── firestoreAnalyticsSink.ts # createFirestoreAnalyticsSink(fs,uid) — Firestore 텔레메트리 sink
│   │   ├── auth.ts               # 구글 로그인 + 어댑터/sink 스왑 reaction의 단일 소유자
│   │   └── learningStore.ts      # Zustand 7스텝 세션 상태 + isAssemblyCorrect + 이벤트 계측 + complete() SRS 스케줄링
│   ├── pages/
│   │   ├── Home.tsx              # 홈 (빠른 입력 + 시나리오 + 최근 학습 + SRS due-count 넛지)
│   │   ├── Learn.tsx             # 학습 페이지 (LearningFlow 호스트)
│   │   ├── Patterns.tsx          # 패턴 라이브러리 (5형식 primary 내비)
│   │   └── Review.tsx            # 복습 (학습 기록 + 저장 패턴 + SRS 오늘 복습 큐 + 회로 진단)
│   └── components/
│       ├── common/
│       │   ├── Navigation.tsx    # 하단 탭 네비게이션
│       │   ├── ProgressBar.tsx   # step0~step4 진행률 표시
│       │   ├── AuthControl.tsx   # 구글 로그인/로그아웃 (미설정 시 null 렌더; Home 헤더)
│       │   └── InstallBanner.tsx # PWA 설치 배너 (안드로이드/데스크톱 버튼 + iOS 힌트, dismiss; ≥1 완료 세션 후 Home)
│       ├── home/
│       │   ├── ScenarioCard.tsx
│       │   └── RecentLearning.tsx
│       ├── review/
│       │   └── CircuitDiagnostic.tsx # 2-레이어 회로 진단 — Pattern5HId 롤업 + 카드별 숙련도
│       └── learning/
│           ├── LearningFlow.tsx      # 학습 플로우 컨트롤러 (currentStep → 스텝 컴포넌트 라우팅)
│           ├── StepEmpathy.tsx       # 공감 (echo + message)
│           ├── StepPrecheck.tsx      # 어디부터? 2지선다
│           ├── StepStructure.tsx     # step0: 5형식 구조 발견 + comparison + patternQuiz(힌트 스캐폴드)
│           ├── StepAssemble.tsx      # step1: 3블록 조립 + connector 선택
│           ├── StepFeedback.tsx      # step2: 정답 판정 + WordOrderCompare + PatternNote
│           ├── StepReflect.tsx       # step3: verb family + 패턴 저장 + after-choice
│           ├── StepComplete.tsx      # step4: 완료
│           └── primitives/           # 재사용 UI 프리미티브
│               ├── OriginalCard.tsx
│               ├── StructureTypeChip.tsx
│               ├── Pattern5HChip.tsx     # 5형식 패턴 hero 칩
│               ├── KoreanDecompose.tsx
│               ├── ComparisonCard.tsx    # 3형식 vs 5형식 대조 (comparison.show 조건부)
│               ├── WordOrderCompare.tsx
│               └── PatternNoteCard.tsx
├── dev-server.js                 # 로컬 개발용 Express API 프록시 (model claude-sonnet-4-6)
├── firebase.json                 # 에뮬레이터 설정 (auth 9099 / firestore 8080) + rules 포인터
├── .firebaserc                   # 기본 프로젝트 demo-engception (demo- 접두사 → 실 클라우드 불필요)
├── firestore.rules               # 보안 규칙 — /users/{uid}/** 본인만 read/write
├── playwright.config.ts          # e2e — vite strict port 5219, mock 모드
├── pwa-assets.config.ts          # @vite-pwa/assets-generator 설정 (logo.png → 아이콘 세트)
├── public/                       # 생성된 PWA 아이콘 (pwa-64/192/512, maskable-512, apple-touch-180, favicon.ico) + logo.png
├── vite.config.ts                # Vite + PWA + Tailwind 설정
└── tsconfig.json                 # 루트는 files:[]+references (→ `tsc -b` 로 빌드, `--noEmit` 아님)
```

## 학습 플로우 (7스텝, 단일 세션)

```
input    : 한국어 입력 (Home 빠른 입력 또는 시나리오 선택) → 여기서 단 1회 API 호출
empathy  : 공감 — AI가 입력을 echo + 따뜻한 한마디
precheck : "어디부터 말할까?" 2지선다 (correctChoiceId)
step0    : 5형식 구조 발견 — 한국어 분해 + (조건부)3형식↔5형식 대조 + patternQuiz
step1    : 조립 — 3개 블록(5형식 슬롯 단위 청크) 순서 배치 + connector 선택
step2    : 피드백 — 조립 정답 판정 + 어순 비교(WordOrder) + patternNote
step3    : 정리 — verb family 확인 + 패턴 저장(자동) + after-choice
step4    : 완료
```

**핵심 설계 1 — 세션당 API 호출은 단 1회.** input 직후 `fetchSessionPayload(korean)`가 완결된 `SessionPayload` 하나를 받아온다. 이후 7스텝은 전부 이 페이로드 하나로 클라이언트에서 구동된다 (네트워크 추가 호출 없음). API 응답을 기다리는 동안 empathy/precheck 화면을 먼저 보여줘 체감 지연을 가린다 (`payloadStatus: loading`).

**핵심 설계 2 — patternQuiz "잘 모르겠어"는 정답을 공개하지 않는다.** 3지선다(정답 동사 / 함정 동사 / "잘 모르겠어"). "잘 모르겠어"를 누르면 정답 대신 **힌트 스캐폴드**(정답 옵션의 `hint`)를 띄우고 퀴즈를 열어둬 두 번째 선택을 강제한다. → correct-cold / correct-after-hint / wrong 3-way 시그널을 스키마 비용 0으로 수집 (전문가 리뷰 반영: desirable difficulty 보존).

**핵심 설계 3 — 조립 블록은 단어가 아니라 5형식 슬롯 단위 청크.** `[I][made him][angry]` (O) / `[I][made][him][angry]` (X). 목적어-보어 관계를 한 덩어리로 시각화해 회로화를 가속 (프롬프트 §5에 강제).

## Claude API 사용 패턴

- 학습 세션당 Claude API **1회 호출** → `SessionPayload` (전체 세션 데이터)
- `services/prompts.ts`의 `SYSTEM_PROMPT`에 5형식 코치 지시 + 전체 JSON 타입 + 7-패턴 분류표 + 좋은 예시 1개
- 응답은 반드시 JSON 객체 하나 (프롬프트에서 강제, 코드펜스/머리말 금지)
- `services/validate.ts`의 `assertSessionPayload`가 응답을 런타임 검증 (실패 시 throw → 한국어 에러 + 재시도)
- API 호출은 `api/chat.ts` (Vercel Edge) 또는 `dev-server.js` (로컬)를 통해 프록시. 클라이언트는 API key 직접 사용 안 함
- `claude.ts`: `MAX_RETRIES=1`, `FETCH_TIMEOUT_MS=60_000` (실 생성 ~19s 대응), `max_tokens: 2500`
- **Mock 모드:** `VITE_USE_MOCK=true` 시 `mockSessionPayload`가 API 대신 응답 (테스트/오프라인 개발용)

## 5형식 7-패턴 분류 (`types/v9.ts`)

`Pattern5HId` 7종, **큐레이션 동사 17개** (`CURATED_VERBS`). 의도적으로 좁게 — 커버리지보다 숙련.

| ID | 메타 라벨 | 큐레이션 동사 | 구조 |
|---|---|---|---|
| `causative-bare` | 사역 (make/have/let) | make, have, let | + O + 동사원형/형용사 |
| `causative-toV` | 사역 (get + to V) | get | + O + to V |
| `causative-result` | 사역 결과 | get, have | + O + pp |
| `perception` | 지각동사 | see, hear, watch | + O + V / V-ing |
| `want-toV` | 요청/희망 + to V | want, ask, tell, need | + O + to V |
| `judgment` | 판단·명명 | find, call | + O + 형용사/명사 |
| `ditransitive` | 수여동사 (4형식) | give, tell, show, send, bring | + IO + DO |

- **`triggerVerb`는 항상 원형(base form)** — `make`/`see` (O), `made`/`saw` (X). 굴절형은 display 필드(template, patternQuiz 옵션 text, finalSentence)에만. StepReflect의 verb-family 볼딩(`pattern5h.verbs[i] === triggerVerb`)이 원형을 전제로 함.
- **BlockRole에 IO/DO 구분 없음:** 4형식(ditransitive)은 간접·직접목적어 둘 다 `object`로 표기 (`complement` 금지). → 알려진 갭(Deferred #8), 사용자 테스트에서 혼란 확인 시 스펙 확장.

## 주요 데이터 모델

### `types/index.ts`
- **Scenario:** 시드 시나리오 (situation, originalKorean, purpose, emotionalTone, difficulty, category, tags?, isDaily, createdAt)
- **LearningRecord (schema v4|v5|v6):** 세션 전체 기록. `schemaVersion: 4 | 5 | 6`(신규 기록은 6으로 씀). **v9.1:** `isFiveHMoment`(boolean) 추가; `pattern5hId`·`triggerVerb`는 **nullable**(간결형 세션이면 null). 시그널 — `patternQuizCorrect`, `patternQuizUnsure`(힌트 사용; correct=true와 공존 가능), `assemblyCorrect`; 선택 — `precheckChoice`, `afterChoice`; 결과 — `finalSentence`, `structureTypeId/Label`. v4/v5 기록은 읽기 시 `withRecordDefaults`로 `isFiveHMoment=true` 백필(전부 5형식이었음).
- **Pattern:** 재사용 가능한 발화 패턴. `template`(verb-specific "I made him ~"), `patternId`(Pattern5HId), `triggerVerb`(dedup 키), `category`, `tags`, `exampleOriginal/English`, `reviewCount`, `lastReviewedAt` + **FSRS 스케줄 필드(schema v5):** `stability`(일 단위, null=미스케줄), `difficulty`(1..10), `nextDueAt`(ISO, null→즉시 due), `reps`, `lapses`, `bypassedCount`(회피 카운터), `cardState`('new'|'learning'|'review'|'relearning'), `lastGrade`(1..4|null)

### `types/v9.ts`
- **V9Step:** `'input'|'empathy'|'precheck'|'step0'|'step1'|'step2'|'step3'|'step4'`
- **Pattern5HId / Pattern5HMeta / CURATED_VERBS / SessionPayload** (전체 세션 페이로드 — empathy, precheck, structure(comparison+patternQuiz), assembly(blocks+blockRoles+connectors), feedback(wordOrder+patternNote), pattern)
- **BlockRole:** `'subject'|'verb'|'object'|'complement'`

## 상태 관리 (`store/learningStore.ts`)

Zustand 스토어가 7스텝 세션 전체를 관리한다. 세션 시작 시 `runFetch`가 백그라운드로 페이로드를 받아온다.

주요 액션:
- `startScenario(scenario)` / `startCustom(korean)` — 세션 시작 → empathy로 전환 + API 호출
- `retryFetch()` / `reset()` — 재시도 / 초기화
- `advanceFromEmpathy()` → precheck, `submitPrecheck(id)` → (400ms 후) step0
- `submitPatternQuiz(answer)` — `{correct, unsure}` 기록, `advanceToStep1()` → step1
- `tapBlock(id)` / `resetBlockOrder()` — 블록 배치 (3개 차면 잠김, `다시`로 리셋)
- `tapConnector(id)`, `advanceToStep2()` → step2
- `advanceToStep3()` *(async)* → **패턴 저장**(dedup) 후 step3
- `submitAfterChoice(id)`, `advanceToStep4()` → step4
- `complete()` *(async)* → `gradeFromSignals` → `schedule()` → FSRS 상태 저장 + `bypassedCount` 리셋(완료 카드) / 다른 due 카드 `bypassedCount++`(N=3 에스컬레이션) → **LearningRecord(v5) 저장** 후 세션 초기화
- `isAssemblyCorrect(state)` — 블록 순서 + connector 정답 판정 (export 헬퍼)

**currentStep 전환 방식:** API 응답 후 자동 전환하지 않고, 사용자가 화면을 확인한 뒤 다음 버튼을 누르면 스텝 컴포넌트가 위 advance 액션을 호출한다.

## 저장소 (`store/localStorage.ts`, schema v6)

- `DataStore` 인터페이스(`dataStore.ts`)로 영속화 추상화 → Firestore 어댑터가 `localStorage.ts` 옆에 슬롯인 가능. SRS 추가로 `getPattern(patternId, triggerVerb)` + `updatePatternSchedule(patternId, triggerVerb, partial)` 2개 신규 메서드.
- `init()`: `CURRENT_SCHEMA_VERSION = 6`. 저장된 `'4'`/`'5'`이면 **비파괴 v4/v5→v6 마이그레이션** — records/patterns 유지, (v4면) 패턴 FSRS 디폴트 백필 + records에 `isFiveHMoment=true` 백필(`withRecordDefaults`, srs.ts 공유). 레거시(≤3)/미상만 파괴적 clear. `getLearningRecords`도 읽기 시 `withRecordDefaults` 적용(Firestore 어댑터도 동일).
- **패턴 dedup: `patternId + triggerVerb` 복합키.** 같은 키 재저장 시 `reviewCount++` + `lastReviewedAt` 갱신 — SRS 하위 레이어 키로 사용됨.
- `MAX_RECORDS = 100` (초과 시 오래된 기록부터 제거)

## 이벤트 트래킹 (event tracking)

세션의 **행동·시간 레이어**를 포착 — `LearningRecord`(완료 시에만 저장)가 못 보는 이탈 세션/단계별 시간/fetch 지연. `services/analytics.ts`의 `track(name, props, sessionId)` 파사드가 content-free `AnalyticsEvent`를 swappable `AnalyticsSink`로 보냄. 기본 sink는 noop; `main.tsx`가 `localAnalyticsSink`(localStorage 링버퍼, `engception:events`, 자체 version key, MAX 1000 회전)를 주입 (`VITE_DISABLE_ANALYTICS=true`면 비활성, noop 유지). 계측은 `learningStore`에 집중 — `transitionTo`(단계별 dwell), 타임드 `runFetch`(fetch_start/success/error + `classifyError` kind), `complete`(session_complete), 공개 `abandonIfActive(reason)`(reset/restart + `visibilitychange` 리스너로 탭 종료 drop-off; `sessionEnded` 가드로 중복 방지). 7종 이벤트: `session_start`/`session_complete`/`session_abandon`/`step_dwell`/`fetch_start`/`fetch_success`/`fetch_error`. 이벤트는 PIPA-safe (raw 한국어/영어 없음 — id/pattern/bool/타이밍만). dev에서 `window.__engEvents()`(=globalThis)로 확인. Firebase/PostHog sink는 동일 `AnalyticsSink` 인터페이스로 나중 슬롯인 (DataStore 평행). 설계: `docs/superpowers/specs/2026-06-07-event-tracking-design.md`.

## SRS (간격 반복)

**2-레이어 구조.** 상위 = `Pattern5HId` 롤업(7패턴 숙련도 집계), 하위 = `(patternId, triggerVerb)` 개별 FSRS 카드.

### 스케줄러 (`services/srs.ts`)
`ts-fsrs@5.4.1` 래핑 — DSR 모델, 기본 가중치. 주요 상수: `REQUEST_RETENTION=0.9`, `N_BYPASS=3`, `INTRO_PHASE=false`(0.25일 초기 인터벌 시드 — 미래 A/B 암, 현재 비활성). `enable_short_term=false`(세션 빈도가 낮아 분 단위 학습 스텝 불필요, New → Review 직행).

- `schedule(prev, grade, now)` — 이전 `CardSchedule | null` + grade(1..4) → `NextSchedule`
- `gradeFromSignals({ assemblyCorrect, patternQuizCorrect, patternQuizUnsure })` → grade(1..4) 4-way 테이블: 조립OK+퀴즈cold=4, 조립OK+힌트=3, 조립OK+퀴즈틀림=2, 조립실패+인식OK=2, 전체실패=1
- `newCardDefaults()` → FSRS 초기값 (`stability/difficulty/nextDueAt=null`, reps/lapses/bypassedCount=0, cardState='new')

### 뷰 파생 (`services/srsView.ts`)
`Pattern[]` 위 순수 함수. `isDue(card, now)`, `dueQueue(cards, now)`(에스컬레이션→초과기일→savedAt 정렬), `masteryLabel(card)` → '새내기'/'학습중'/'숙련'(stability ≥21일 cutoff; 데이터 기반 튜닝 보류), `rollupByPattern(cards, now)` → `PatternRollup[]`(id/cards/dueCount/escalatedCount).

### complete() 스케줄링 (`store/learningStore.ts`)
세션 완료 시: `gradeFromSignals` → 듀얼 시그널로 grade 산출 → `getPattern`으로 현재 카드 로드 → `schedule()` → `updatePatternSchedule`로 FSRS 상태 저장 + 완료 카드 `bypassedCount` 리셋. **N=3 에스컬레이션(단일 모드 soft-bias):** 다른 모든 due 카드 `bypassedCount++`(3 이상이면 dueQueue 우선순위 상위 부상).

### UI
- **복습 페이지(`pages/Review.tsx`):** "오늘 복습" 섹션 — `dueQueue`로 due 카드 나열, 탭 시 해당 카드의 `exampleOriginal`을 `input` router-state로 시드해 기존 학습 플로우 재실행(re-practice). "회로 진단" — `CircuitDiagnostic.tsx`가 `rollupByPattern`으로 2-레이어 뷰 표시(Pattern5HId별 카드 수/due수/숙련도).
- **홈(`pages/Home.tsx`):** due 카드 ≥1개이면 "복습할 회로 N개 →" 넛지 표시.
- **organic-first:** 하드 큐 없음, 프롬프트 바이어스 없음. 재실습 유도만.

### 데이터 충돌 (클라우드 로그인 병합)
로그인 merge 시 FSRS 필드 충돌 = **클라우드 우선(cloud-authoritative)**. 코드 변경 없음 — 기존 `migrateToCloud.ts`의 union 병합 동작 그대로(문서화만).

### 연기 항목 (데이터 게이팅)
Time-to-Stabilization A/B, dynamic N, 사용자별 가중치 최적화, intro-phase 활성화, mastery-band 튜닝. 설계: `docs/superpowers/specs/2026-06-09-srs-design.md`.

## Firebase (cloud tier) — 선택적 클라우드 동기화

**local-first + 선택적 구글 로그인.** 로그아웃/미설정 → `localStorage`, 로그인 → Firestore. `isFirebaseConfigured()`(`services/firebase.ts`) 런타임 게이트: `VITE_FIREBASE_*` 없으면 Firebase 초기화·로그인 UI 전부 비활성 → **현재 로컬 동작 그대로 보존** (기존 80→89 테스트·e2e 무손상).

- **스왑 seam:** `store/db.ts`의 `db` 파사드 + `setDbAdapter()` — `services/analytics.ts`의 `setSink()`와 정확히 평행. 7개 소비자(learningStore·Home·Learn·Patterns·Review·RecentLearning·main)는 `db`만 import; auth 상태가 한 곳에서 어댑터를 교체.
- **어댑터:** `createFirestoreDataStore(fs, uid)` / `createFirestoreAnalyticsSink(fs, uid)` 팩토리 (Firestore+uid 주입 → 테스트는 에뮬레이터 인스턴스 주입). 시나리오는 번들 seed라 Firestore에 저장 안 함; records `/users/{uid}/records/{id}`, patterns `/users/{uid}/patterns/{patternId__triggerVerb}` (복합키=doc id). **패턴 dedup = `setDoc`+`increment(1)` (offline 큐잉됨; `runTransaction` 아님 — 서버 왕복이라 오프라인서 실패).** `MAX_RECORDS` 캡 없음(클라우드는 전량 보관).
- **로그인 병합:** `services/migrateToCloud.ts` — 로컬 records/patterns를 비파괴 union으로 클라우드에 올리고, **모든 쓰기 성공 시에만** 로컬 클리어 (실패 시 로컬 보존, 손실 없음). 이벤트는 마이그레이션 안 함(content-free 일회성).
- **auth:** `store/auth.ts`가 스왑의 단일 소유자 — `registerAuthReaction()`(부트스트랩, 설정 시에만), `signInWithGoogle/signOutUser/onUserChanged`. `migratedUid` 가드(토큰 갱신 중복 방지), merge 실패 시 스왑 안 함+로그. **`VITE_DISABLE_ANALYTICS` 존중: setSink만 게이트, `setDbAdapter`는 무조건** (데이터는 항상 동기화, 텔레메트리만 비활성). UI: `components/common/AuthControl.tsx`(미설정 시 null 렌더, 실패한 로그인 표시).
- **보안 규칙:** `firestore.rules` — `/users/{uid}/**` 본인만 read/write. **에뮬레이터 우선 개발:** `firebase.json`/`.firebaserc`(demo-engception, 실 클라우드 불필요). `npm run test:emulator`(Java 필요)는 `firebase emulators:exec`로 자동 기동, 게이트는 `FIRESTORE_EMULATOR_HOST`(exec가 set) — 잘못 돌려도 깨끗이 skip.
- **phase 2 (이번 범위 밖):** 카카오 로그인(Firebase 네이티브 미지원 → custom-token Cloud Function + Blaze), Cloud Functions 전반, 프로덕션 프로비저닝(체크리스트는 spec §10). 설계: `docs/superpowers/specs/2026-06-07-firebase-migration-design.md`, 계획: `docs/superpowers/plans/2026-06-07-firebase-migration.md`.

## PWA

범위 = **설치 경험(install experience) + 앱-쉘(app-shell) 캐싱**. 딥 오프라인(세션 데이터 오프라인 동작)·폰트 캐싱은 범위 밖.

- **아이콘:** `@vite-pwa/assets-generator`가 `logo.png`에서 아이콘 세트를 생성 (`pwa-assets.config.ts`). 로고 바뀔 때만 `npm run generate-pwa-assets`(= `npx @vite-pwa/assets-generator@1.0.2`, **on-demand·정확버전 핀** — 프로젝트 devDep 아님; vite-plugin-pwa의 peer `^0.2.6`과 충돌해 `npm ci`가 깨지던 걸 회피, `-y` 없이 설치 프롬프트 노출)로 `public/` 산출물(pwa-64/192/512, maskable-512, apple-touch-180, favicon.ico) 갱신 후 커밋. 산출물이 커밋돼 있어 빌드/dev/test는 이 도구 불필요. manifest + iOS standalone meta는 `vite.config.ts`/`index.html`에 연결.
- **설치 프롬프트:** `services/pwa/installPrompt.ts`가 `beforeinstallprompt`를 캡처(`registerInstallPrompt()`는 `main.tsx` 부트스트랩에서 `db.init()` 직후 1회) → mini-infobar 억제 후 자체 UI로 구동. `InstallBanner`(`components/common/`)는 **≥1 완료 세션 후** Home에 표시(안드로이드/데스크톱은 프롬프트 버튼, iOS Safari는 "공유 → 홈 화면에 추가" 힌트). dismiss는 `engception:install-dismissed`로 영속화; standalone 실행 중엔 숨김. PIPA-safe (콘텐츠 없음).
- **서비스 워커:** `vite-plugin-pwa`(Workbox)는 **빌드/preview 전용** (dev에선 비활성). `navigateFallbackDenylist:[/api]` + Firestore/Auth는 passthrough (캐시 안 함).
- 설계: `docs/superpowers/specs/2026-06-08-pwa-design.md`.

## 개발 컨벤션

- TypeScript strict 모드
- 컴포넌트: 함수형 + 기본 export (`export default function ComponentName()`)
- 상태: Zustand store (전역), React useState/useReducer (로컬)
- 스타일: Tailwind utility 클래스 (인라인), 모바일 퍼스트
- 파일 네이밍: PascalCase (컴포넌트), camelCase (유틸/서비스/스토어)
- import 정렬: React → 외부 라이브러리 → 내부 모듈
- UI: rounded-xl, 충분한 터치 영역, `pressable`/`active:` 상태 포함

## 커맨드

```bash
npm run dev        # 프론트엔드 개발 서버 (Vite, port 5173)
npm run dev:api    # API 프록시 서버 (Express, port 3001, --env-file=.env.local)
npm run build      # 프로덕션 빌드 (tsc -b && vite build)
npm run lint       # ESLint 실행
npm run preview    # 빌드 결과 미리보기
npm run test       # Vitest 단위/통합 (= vitest run, 118 pass | 10 skip)
npm run test:watch # Vitest watch
npm run test:e2e   # Playwright e2e (mock 모드, vite strict port 5219)
npm run test:emulator # Firestore 어댑터 + 룰 + 로그인 데이터흐름 (Java 필요; firebase emulators:exec 자동 기동, 10 tests)
```

**개발 시:** mock 모드(`VITE_USE_MOCK=true`)면 `npm run dev`만으로 충분. 실 Claude API를 쓰려면 `VITE_USE_MOCK=false` + `npm run dev:api` 동시 실행.

**검증 레시피:** `npx tsc -b` (NOT `--noEmit` — 루트 tsconfig가 `files:[]`+references라 no-op) · `npx vitest run` (118 pass | 10 skip) · `npm run lint` · `npm run build` (PWA 아티팩트 — manifest+SW+precache 생성 확인) · `npm run test:e2e` · `npm run test:emulator` (Java 필요, 에뮬레이터 게이트 10 — 기본 카운트엔 미포함).

## 환경 변수

```
ANTHROPIC_API_KEY=        # Claude API 키 (서버 사이드 — api/chat.ts, dev-server.js 에서만)
VITE_USE_MOCK=            # 'true' 면 mockSessionPayload 사용 (API 호출 안 함)
VITE_DISABLE_ANALYTICS=   # 'true' 면 이벤트 트래킹 비활성 (기본 noop sink 유지)
VITE_FIREBASE_API_KEY=    # Firebase 웹 config — 셋 다 있어야 isFirebaseConfigured()=true (없으면 순수 로컬 모드)
VITE_FIREBASE_PROJECT_ID= #   ↑ (apiKey + projectId + appId 가 게이트)
VITE_FIREBASE_APP_ID=     #   ↑
VITE_FIREBASE_AUTH_DOMAIN= # 구글 로그인 팝업용 (init엔 선택, 로그인엔 필요)
VITE_USE_FIREBASE_EMULATOR= # 'true' 면 로컬 에뮬레이터(Auth 9099/Firestore 8080)에 연결 (개발용)
```

## 다음 단계 (미완료)

1. **Firebase 마이그레이션:** ✅ v1 구현됨 (branch `feat/firebase-migration` — local-first + 선택적 구글 로그인, Firestore 어댑터/sink 슬롯인, 비파괴 병합, 에뮬레이터 테스트). 위 "Firebase (cloud tier)" 섹션 참조. **남은 것:** 프로덕션 프로비저닝(체크리스트 spec §10) + **phase 2 = 카카오 로그인(custom-token Cloud Function + Blaze)**.
2. **PWA 최적화:** 오프라인 캐싱 + 홈 화면 설치 유도. `vite-plugin-pwa` 이미 연결됨
3. **이벤트 트래킹:** 세션 시작/완료, 단계별 소요 시간, 이탈 단계
4. **post-v9 SRS (2-Layer):** ✅ v1 구현됨 (branch `feat/srs` — ts-fsrs 스케줄러, schema v5 비파괴 마이그레이션, dueQueue+회로 진단 UI, 에뮬레이터 포함). 위 "SRS (간격 반복)" 섹션 참조. **남은 것(데이터 게이팅):** Time-to-Stabilization A/B · dynamic N · 사용자별 가중치 최적화 · intro-phase 활성화 · mastery-band 튜닝. 설계: `docs/superpowers/specs/2026-06-09-srs-design.md`.
