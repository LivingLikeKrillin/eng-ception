# Sub-project A — 진척 가시화 (Progress Surfacing) — Design

> Audit backlog 2026-06-09, feature items **F1 + F2 + F3 + F5 + F7**.
> First of three sequential sub-projects (A → B 인박스 → C 오프라인 리콜).

## 1. 목적 / 문제

SRS·습관 루프가 만들어졌지만(#6 SRS v1) **사용자에게 보이지 않는다.** 동기가 가장 높은 두 순간이 비어 보인다:

- **첫 완료 직후 / 신규 카드:** FSRS 새 카드는 미래로 스케줄되므로 완료 직후 due 카드가 0 → Home 넛지(`Home.tsx`)·Review "오늘 복습"(`Review.tsx`)이 둘 다 빈다 → 기능이 고장난 것처럼 보임 (F1).
- **습관 약속이 가짜였다:** Home 히어로("오늘도 말하고 싶었는데")와 방금 제거한 가짜 "4일째" 칩이 일일 습관을 약속하지만 아무것도 추적 안 함 (F2).
- **"근육"이 안 보임:** `masteryLabel` 숙련은 `stability≥21d`라 초기엔 거의 안 뜨고, 유일한 숙련 표면(CircuitDiagnostic)은 Review 하단에 접혀 있음 (F3).
- **시나리오 영구 고갈:** Home은 `getUnlearnedScenarios(3)` → 시드 15개 학습 후 "Try these"가 영구히 빔 (F5).
- **가짜 마이크 + a11y 공백:** Home의 "또는 말해봐" 마이크는 동작 안 하는 div로 범위 밖 음성입력을 암시; 아이콘 전용 컨트롤에 라벨 없음, 퀴즈 피드백에 `aria-live` 없음 (F7).

## 2. 범위 / 비범위

**범위(A):** 기존 `Pattern[]`·`LearningRecord[]` 위 **순수 파생** + Home/Review/스텝 UI + a11y. 새 데이터 모델·스키마·`DataStore` 메서드 **없음**.

**비범위:** capture-later inbox(=B), 오프라인 리콜(=C), 시드 `pattern5hId` 태깅(F5는 기록 기반 휴리스틱으로 대체), streak 마일스톤 텔레메트리/푸시 알림, 오디오.

## 3. 결정 (사용자 확정)

- **출하 단위:** 3개 순차 sub-project, A 먼저. 각자 spec→plan→PR→merge.
- **streak 정의:** **grace** — 오늘 완료 시 오늘 포함 연속일; 오늘 미완료라도 어제까지의 연속은 자정까지 "살아있음"으로 표시. 오늘·어제 둘 다 비활성이면 0. 일일목표 = "오늘 1개".
- **F5 휴리스틱:** **커버리지-갭(기록 기반)** — 시드 무변경; 미학습 우선, 모자라면 *덜 최근에 푼* 학습 시나리오로 백필(로테이션).
- **F3 배치:** "회로 N · 숙련 M" 요약은 **Review 상단**에만(Home 혼잡 회피). Home은 streak 칩 + 넛지.

## 4. 아키텍처 — 순수 로직 (I/O 없음, 전부 단위 테스트)

### 4.1 `services/srsView.ts` (확장)

```ts
// 가장 가까운 *미래* nextDueAt. null=미래 due 없음(전부 due now이거나 미스케줄).
export function nextDueDate(cards: Pattern[], now: Date): Date | null
```
- `nextDueAt != null && new Date(nextDueAt).getTime() > now.getTime()` 인 카드 중 최소 Date.
- 미스케줄(null) 카드는 "due now"이지 미래가 아니므로 제외.
- **(spec-review #3) 정확히 `now` 시점에 due인 카드는 strict-`>`라 제외 = "due now"로 취급** — `srsView.isDue`(`<=`)와 일관(경계 카드는 `dueQueue`/`dueCount`가 잡음). 이 경계 의미를 나중에 off-by-one으로 "고치지" 말 것.

### 4.2 `services/progress.ts` (신규) — records/patterns 위 진척 파생

```ts
export function localDayKey(iso: string): string          // 'YYYY-MM-DD' (로컬 tz)
export function computeStreak(records: LearningRecord[], now: Date): number
export function completedTodayCount(records: LearningRecord[], now: Date): number
export interface MasterySummary { circuits: number; mastered: number; learning: number; fresh: number }
export function masterySummary(cards: Pattern[]): MasterySummary
export function pickScenariosForHome(
  scenarios: Scenario[], records: LearningRecord[], limit: number,
): Scenario[]
export function formatRelativeDay(target: Date, now: Date): string  // '오늘'|'내일'|'N일 후'
```

- **`localDayKey`:** `completedAt`(ISO UTC)를 `new Date()`로 로컬 변환 후 `getFullYear/getMonth/getDate`로 키. 같은 날 여러 세션 = 1일.
- **`computeStreak`:** 활성일 Set(`localDayKey`) 구성 → 앵커 = 오늘(활성 시) else 어제(활성 시) else return 0 → 앵커에서 하루씩 뒤로 가며 Set에 있는 동안 카운트. **(spec-review #2) 하루 뒤로 가기는 ms 빼기(`-86400000`)가 아니라 로컬 캘린더 날짜로** — `new Date(y, m, d-1)` 후 다시 `localDayKey`로 비교. (DST 23/25h 날에 streak 누락/중복 방지; KR엔 DST 없지만 tz-안전 주장 유지·테스트가 Asia/Seoul 가정 안 하도록.) 오늘·어제 모두 비활성 → 0.
- **`completedTodayCount`:** `localDayKey === localDayKey(now.toISOString())` 인 record 수. (일일목표 boolean: `>0`.)
- **`masterySummary`:** `circuits = cards.length`(저장된 verb-card 각각이 회로), `mastered/learning/fresh = masteryLabel` 집계 (`srsView.masteryLabel` 재사용). 표시 = "회로 {circuits} · 숙련 {mastered}". **(spec-review #5) `learning`/`fresh`는 이 sub-project에서 미표시 — 향후 예약 필드로 유지(YAGNI 의도적, 집계 비용 0).**
- **`pickScenariosForHome`:** `learnedIds = {r.scenarioId}` (non-null만). `unlearned = scenarios ∉ learnedIds`. `unlearned.length >= limit` → `unlearned.slice(0,limit)`. else 부족분 백필: **(spec-review #1) 시나리오는 재학습(`다시 풀기`)으로 여러 번 완료될 수 있으므로, 먼저 `scenarioId`별 `max(completedAt)`로 리듀스**한 뒤 그 최신값 오름차순(덜 최근 먼저)으로 학습 시나리오 정렬해 채움. 반환 = `(unlearned ++ backfill).slice(0,limit)`. 결정적(동률은 scenario 배열 순서 유지).
- **`formatRelativeDay`:** 로컬 자정 경계 기준 일수 차. 0='오늘', 1='내일', n>1=`${n}일 후`. 음수(과거)는 '오늘' fallback — `nextDueDate`는 미래만 반환하므로 음수는 상류 버그 신호이나 표시 헬퍼라 방어적 fallback 허용.

> `now: Date`를 주입받아 순수성 유지(테스트 결정성). `Date.now()`/`new Date()` 직접 호출은 호출부(컴포넌트)에서만.

## 5. UI

### 5.1 Home (`pages/Home.tsx`)
- **streak 칩(F2):** 제거된 가짜 칩 자리에 진짜. `computeStreak`>0일 때만 "{N}일째" + 시계/불꽃 아이콘. 오늘 완료(`completedTodayCount>0`) 여부로 **채움/외곽선** 상태(=일일목표 시각화). `aria-label="연속 학습 {N}일째"`.
- **넛지(F1):** `dueCount>0` → 기존 "복습할 회로 {N}개 →"(Review로). `dueCount===0 && nextDueDate!=null` → "다음 복습: {formatRelativeDay} →". 둘 다 아니면(패턴 0) 표시 안 함. **(spec-review #4) 미래 due가 오늘 자정 전이라 `formatRelativeDay==='오늘'`이 나오는 경우(dueCount는 여전히 0) "다음 복습: 곧 →"으로 표기** — "오늘"이라 적으면 due 없는데 오늘 복습하라는 것처럼 읽힘.
- **로테이션(F5):** `getUnlearnedScenarios(3)` 대신 `db.getScenarios()`+`db.getLearningRecords()` → `pickScenariosForHome(.,.,3)`.
- **가짜 마이크 제거(F7):** "또는 말해봐" + 마이크 div 삭제. 입력 푸터의 풀어보기 버튼만 유지.

### 5.2 Review (`pages/Review.tsx`)
- **다 끝났어요 상태(F1):** `due.length===0`일 때 섹션을 숨기지 말고 all-caught-up 표시: "오늘 복습 다 끝났어요 ✓" + (`nextDueDate!=null`이면) "다음 복습: {formatRelativeDay}". 단 패턴이 1개라도 있을 때만(완전 신규 사용자는 숨김).
- **숙련 요약(F3):** 상단(복습 큐 위)에 `masterySummary` → "회로 {circuits} · 숙련 {mastered}" 한 줄. 패턴 0이면 숨김.

### 5.3 a11y (F7)
- `CircuitDiagnostic.tsx` 토글 버튼에 `aria-expanded={expanded.has(r.id)}` + `aria-label`(패턴명 + 펼치기/접기).
- 퀴즈 피드백에 `aria-live="polite"`: `StepStructure.tsx`(patternQuiz 힌트/피드백), `StepFeedback.tsx`(정답 판정).
- Home streak 칩 `aria-label`.

## 6. 데이터 흐름

```
Home mount → db.getScenarios()+getLearningRecords()+getPatterns()
  → pickScenariosForHome / computeStreak+completedTodayCount / dueQueue+nextDueDate
  → 칩·넛지·Try these 렌더
Review mount → db.getLearningRecords()+getPatterns()
  → dueQueue / nextDueDate / masterySummary → 섹션 렌더
```
모든 파생은 컴포넌트가 `new Date()`를 만들어 헬퍼에 주입.

## 7. 에러 처리

순수 함수는 빈 배열·null 필드에 안전(빈 입력→0/[]/null). UI는 기존 `db` 호출 패턴 그대로(이미 P0#3에서 어댑터가 corrupt-safe). 새 throw 경로 없음.

## 8. 테스트

- **`services/progress.test.ts`:** computeStreak(오늘만, 오늘+어제, 어제만=grace 유지, 그제까지만=오늘·어제 비활성→0, 하루 다건=1일, 빈=0, 긴 연속, **로컬 캘린더 날짜 스텝 — 월 경계 넘는 연속**), completedTodayCount, masterySummary(빈/혼합), pickScenariosForHome(미학습≥limit, 미학습<limit 백필 순서, 전부 학습 시 덜-최근 우선, **한 시나리오 2회 완료 시 max(completedAt)로 백필 정렬**, 동률 결정성), formatRelativeDay(오늘/내일/N일/과거).
- **`services/srsView.test.ts`:** nextDueDate(미래 최소, 전부 due now→null, 빈→null, 미스케줄 제외).
- UI는 node-vitest(jsdom 없음)라 컴포넌트 단위 테스트 없음 — 로직은 헬퍼로 추출해 커버. 기존 e2e(mock)·vitest 무손상 확인.

## 9. 검증 레시피

`npx tsc -b` 0 · `npx vitest run`(기존 125 + 신규 통과) · `npm run lint` · `npm run build` · `npm run test:e2e` 2 pass.

## 10. 파일 영향

신규: `services/progress.ts`, `services/progress.test.ts`. 수정: `services/srsView.ts`(+test), `pages/Home.tsx`, `pages/Review.tsx`, `components/review/CircuitDiagnostic.tsx`, `components/learning/StepStructure.tsx`, `components/learning/StepFeedback.tsx`. **어댑터·`DataStore`·스키마·fake adapter 무변경** → SRS 때의 "공유 타입/인터페이스 변경 시 전 구현체 깨짐" 비용 없음.

## 11. 다음 (이 spec 범위 밖)
- **B — 나중에 풀기 인박스(F4):** 새 `Capture` 모델 + db 메서드(양 어댑터+fake) + UI + PWA share_target(GET).
- **C — 오프라인 재연습(F6):** 경량 플래시카드 리콜(스키마 무변경, 저장된 Pattern 필드 사용).
