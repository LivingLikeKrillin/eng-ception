# Sub-project C — 오프라인 재연습 (Offline Recall) — Design

> Audit backlog, feature item **F6**. Third/last of three sub-projects (A 진척가시화 ✅ → B 인박스 ✅ → **C 오프라인 리콜**).

## 1. 목적 / 문제

Review "오늘 복습"의 due 카드 탭이 현재 live API 세션(`fetchSessionPayload`)을 호출 → **오프라인/지하철(PWA 핵심 맥락)에서 작동 불가** + audit #1 타임아웃 직격. 저장된 `Pattern`엔 `exampleOriginal`(한국어)·`exampleEnglish`·`template`이 있어 **API 없이** 간격반복 리뷰가 가능하다. 간격반복의 정석은 무거운 재학습이 아니라 빠른 리콜이므로, due 카드 리뷰를 경량 플래시카드로 만든다.

## 2. 결정 (사용자 확정, 자율)

- **리콜 깊이 = ⓑ 자가평가→오프라인 일정 전진** (뷰어 전용 아님). due 큐를 오프라인에서 실제로 소화시키는 정석 SRS 리뷰.
- **streak/기록 = schedule-only** — 리콜은 `LearningRecord`를 쓰지 않음(일정만 전진). streak/회로 수는 "진짜 세션" 기준 유지, 리콜은 유지보수용. (`computeStreak`는 records 기반이라 영향 없음.)
- **진입 = due 카드 탭 → RecallCard 오버레이**(라우트 추가 없이 Review-local state). 전체 live 7스텝 재연습은 기존 경로(records "다시 풀기", Home 입력)로 유지.

## 3. 범위 / 비범위

**범위(C):** `applyReview` 헬퍼(DRY 추출) + `RecallCard` 컴포넌트 + Review 오버레이 배선 + due 카드 탭 동작 변경 + `srs-flow` e2e 갱신.

**비범위:** 딥 오프라인 캐싱 일반(폰트/세션 데이터), 리콜 통계/그래프, 오디오, 리콜의 LearningRecord 기록.

## 4. 아키텍처

### 4.1 `services/applyReview.ts` (신규) — DRY 추출

complete()의 SRS 블록(카드 로드→schedule→일정 저장+bypass 리셋→다른 due 카드 bypass++)을 **세션 독립 헬퍼**로 추출, complete()와 recall이 공유:

```ts
import { db } from '../store/db'
import { schedule, type CardSchedule, type Grade } from './srs'
import { isDue } from './srsView'

// Grade a single card and advance its FSRS schedule + the N-bypass bookkeeping.
// Shared by learningStore.complete() (session grade) and offline recall (self-rated grade).
export async function applyReview(
  patternId: string, triggerVerb: string, grade: Grade, now: Date,
): Promise<void> {
  const card = await db.getPattern(patternId, triggerVerb)
  const prev: CardSchedule | null = card
    ? { stability: card.stability, difficulty: card.difficulty, cardState: card.cardState,
        reps: card.reps, lapses: card.lapses, nextDueAt: card.nextDueAt, lastReviewedAt: card.lastReviewedAt }
    : null
  const next = schedule(prev, grade, now)
  await db.updatePatternSchedule(patternId, triggerVerb, { ...next, lastGrade: grade, bypassedCount: 0 })

  const all = await db.getPatterns()
  const otherDue = all.filter((p) => isDue(p, now) && !(p.patternId === patternId && p.triggerVerb === triggerVerb))
  await Promise.all(
    otherDue.map((p) => db.updatePatternSchedule(p.patternId, p.triggerVerb, { bypassedCount: p.bypassedCount + 1 })),
  )
}
```

### 4.2 `learningStore.complete()` — applyReview 사용 (동작 보존)

complete()의 인라인 SRS 블록을 `await applyReview(pid, verb, grade, now)`로 교체. grade는 기존대로 `gradeFromSignals(...)`로 산출. **동작 동일** → 기존 SRS describe 테스트(db.updatePatternSchedule/getPattern/getPatterns spy)는 그대로 통과. try/catch·idempotency·signals-once 유지.

### 4.3 `components/review/RecallCard.tsx` (신규)

전체화면 오버레이(`fixed inset-0`). Props: `{ card: Pattern; onGrade: (grade: Grade) => void; onClose: () => void }`. 로컬 state `revealed`.
- `data-testid="recall-card"`. 우상단 닫기(× , `aria-label="닫기"`).
- 한국어 `card.exampleOriginal` 크게 + "영어로 말해봐" 프롬프트.
- `!revealed`: **"영어 보기"** 버튼 → `setRevealed(true)`.
- `revealed`: `card.exampleEnglish`(+ `card.template` 작게) 공개 + 3 자가평가 버튼 → `onGrade(grade)`:
  - **막힘 → 1(Again)**, **애매 → 3(Good)**, **정확 → 4(Easy)**. (`recallGradeFor` 매핑은 컴포넌트 내 const 객체.)

### 4.4 `pages/Review.tsx` — 오버레이 배선

- state `recallCard: Pattern | null`.
- due 카드: 기존 "복습하기 →"(live navigate) → **"복습 →"**, onClick = `setRecallCard(c)`.
- 오버레이: `{recallCard && <RecallCard card={recallCard} onClose={()=>setRecallCard(null)} onGrade={handleRecallGrade} />}`.
- `handleRecallGrade(grade)`: `await applyReview(recallCard.patternId, recallCard.triggerVerb, grade, new Date())` → `setRecallCard(null)` → 패턴 새로고침(`db.getPatterns()` → due/summary 재계산). 
- 기존 `rePractice` 헬퍼는 due 카드에서 미사용이 되면 제거(records "다시 풀기"는 자체 navigate라 무관).

## 5. 오프라인 / 에러

`applyReview`는 db 어댑터 경계만 사용 → localStorage 동기·오프라인 안전, Firestore는 offline 큐잉. API 호출 0 → 비행기/지하철 동작. RecallCard는 순수 표시.

## 6. 테스트

- **`services/applyReview.test.ts`(신규):** 재생 카드 schedule + bypassedCount=0; 다른 due 카드 bypass++ (Promise.all); getPattern null(새 카드) 경로. (complete()의 SRS 테스트와 동형, applyReview 직접 호출.)
- **`learningStore.test.ts`:** 기존 SRS describe 그대로 통과(동작 보존 확인) — 변경 없음.
- **`recallGradeFor` 매핑**: 막힘→1/애매→3/정확→4 (컴포넌트 export한 작은 순수 맵 or 인라인; 인라인이면 e2e가 커버).
- **e2e `srs-flow.spec.ts` 갱신:** due 카드 탭 → `recall-card` 보임 → "영어 보기" → exampleEnglish 노출 → "정확" → 오버레이 닫힘(카드 재스케줄로 due에서 빠짐). 기존 "empathy 도달" 어서션 제거(그 경로는 records 다시풀기·learn-flow.spec이 커버).

## 7. 검증 레시피

`npx tsc -b` 0 · `npx vitest run`(149 + applyReview 신규) · `npm run lint` · `npm run build` · `npm run test:e2e`(learn-flow + 갱신된 srs-flow 2 pass).

## 8. 파일 영향

신규: `services/applyReview.ts`(+test), `components/review/RecallCard.tsx`. 수정: `store/learningStore.ts`(complete()가 applyReview 사용), `pages/Review.tsx`(오버레이+due 탭), `e2e/srs-flow.spec.ts`. 스키마·db 메서드·어댑터 무변경.

## 9. 완료 시
audit 백로그 기능 F1–F7 전부 SHIPPED(A+B+C). 남는 frontier = #7 BlockRole + Firebase phase-2 Kakao + prod provisioning + SRS data-gated tuning.
