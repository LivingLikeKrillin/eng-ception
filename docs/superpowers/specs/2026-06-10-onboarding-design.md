# 첫 실행 온보딩 (First-run Onboarding) — Design

> 신규 유저가 비직관적 컨셉을 이해하고 첫 세션을 시작하게. 3카드 인트로(형태 A), 첫 실행에만, 스킵 가능. speaking-only web PWA.

## 1. 목적
컨셉("말문 막힌 한국어 → 영어 구조 재배치" + v9.1 "5형식을 *언제* 쓰는지 인식")이 처음 보는 사람에게 안 직관적 → 이탈 위험. 짧은 인트로로 컨셉+트위스트를 가르치고 콘텐츠 팩 시드로 즉시 첫 세션 진입.

## 2. 결정 (사용자 확정)
형태 **A — 3카드 인트로 오버레이**. 첫 실행에만(신규 유저), 스킵 가능, 마지막 카드 CTA가 콘텐츠 팩 시드로 첫 세션 시작.

## 3. 아키텍처 (작고 격리)
- **`services/onboarding.ts`(신규):** `hasSeenOnboarding(): boolean` / `markOnboardingSeen(): void` — localStorage 키 `eng-ception:onboarded`, best-effort try/catch (installPrompt dismiss 패턴 평행). DataStore 아님(기기-로컬 UI 상태, 클라우드 동기 안 함).
- **`components/onboarding/Onboarding.tsx`(신규):** 전체화면 오버레이(`fixed inset-0 z-50 bg-bg`). props `{ onFinish: (startSeed: boolean) => void }`. 로컬 state `card`(0..2). 점 인디케이터 + "건너뛰기"(우상단, 모든 카드) + 카드별 하단 버튼. testid `onboarding`.
- **Home 트리거(`pages/Home.tsx`):** mount 시 `records` 로드 후 — `!hasSeenOnboarding() && records.length === 0`이면 `showOnboarding=true`. **기존 유저(records>0 & 플래그 없음)는 표시 안 하고 즉시 `markOnboardingSeen()`**(업데이트 후 갑툭튀 방지). `onFinish(startSeed)`: `markOnboardingSeen()` → startSeed면 `navigate('/learn/s1')`(콘텐츠 팩 → 즉시·오프라인), 아니면 `setShowOnboarding(false)`.

## 4. 3카드 내용 (카피는 구현서 다듬음)
1. **컨셉:** "말문 막힌 순간, 한국어로 그냥 적어봐. 영어로 옮기기 쉬운 구조로 재배치해줄게." [다음]
2. **트위스트(핵심):** "5형식이 늘 정답은 아냐. *언제* 쓰면 더 나은지 — 그 감을 키우는 게 목표." + 미니 대비 1줄(모먼트 예 vs 간결형 정답 예). [다음]
3. **CTA:** "예시 하나로 바로 시작해볼까?" → **시작하기**(`onFinish(true)`) / **둘러보기**(`onFinish(false)`).

## 5. 데이터 흐름
```
Home mount → db.getLearningRecords()
  → !hasSeenOnboarding() && records.length===0 ? setShowOnboarding(true)
                                               : (records>0 && !seen) markOnboardingSeen()
Onboarding 카드 넘김(card 0→1→2) / 건너뛰기 → onFinish(false)
CTA 시작하기 → onFinish(true) → markOnboardingSeen() + navigate('/learn/s1')
```

## 6. 엣지
- 신규 정의 = 기록 0 & 플래그 없음. 기록 있으면(기존 유저) 절대 안 뜸 + 플래그 세팅.
- 스킵/완료 영속 → 재노출 안 함. localStorage 실패는 best-effort(안 뜨거나 매번 뜰 수 있음 — 치명적 아님).
- standalone(PWA)에서도 동일. 오버레이는 불투명 `bg-bg`로 Home 가림.
- e2e 기존(learn-flow/srs-flow)은 `/learn/custom` 직행 → Home 안 거쳐 온보딩 무영향.

## 7. 테스트
- **`onboarding.test.ts`(신규):** `hasSeenOnboarding` 기본 false → `markOnboardingSeen` 후 true; localStorage throw 시 best-effort(예외 안 던짐, false 반환).
- **신규 e2e(`onboarding.spec.ts` 또는 learn-flow에 추가):** `/` 첫 방문(빈 localStorage) → `onboarding` 노출 → "시작하기" → empathy 도달(콘텐츠 팩 s1, mock 모드서도 동작). + 건너뛰기 경로(닫히고 Home).
- Onboarding 컴포넌트 자체는 node-vitest(no jsdom)라 단위 테스트 없음 — 로직은 service + e2e로 커버.

## 8. 파일 영향
신규: `services/onboarding.ts`(+test), `components/onboarding/Onboarding.tsx`, e2e 1. 수정: `pages/Home.tsx`(트리거). 스키마·db 무변경.

## 9. 비범위
가이드된 인터랙티브 첫 세션(형태 B), 다국어, A/B, 재방문 리마인더, 설정에서 온보딩 다시보기(추후 쉬우면 추가 가능).
