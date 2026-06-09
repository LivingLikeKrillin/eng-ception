# Sub-project B — 나중에 풀기 인박스 (Capture-later Inbox) — Design

> Audit backlog 2026-06-09, feature item **F4**. Second of three sequential sub-projects (A 진척가시화 ✅ → **B 인박스** → C 오프라인 리콜).

## 1. 목적 / 문제

앱 thesis = "발화 실패 복기" — 말문 막힌 순간을 캡처해 훈련. 그런데 현재 캡처 경로는 **학습 시점에 Home에 타이핑하는 것뿐** → 실생활에서 막힌 그 순간은 휘발된다. 인박스로 "지금 stash, 나중에 drill"을 만들어 실생활이 콘텐츠가 되게 한다.

## 2. 범위 / 비범위

**범위(B):** 새 `Capture` 모델 + `DataStore` 3 메서드(양 어댑터 + fake 3곳) + `migrateToCloud` 포함 + Home 인박스 UI + PWA `share_target`(GET).

**비범위:** capture 전용 analytics 이벤트(추후), 인박스 정렬/검색/태그/편집, 멀티-디바이스 실시간 동기, 오디오. 오프라인 리콜(=C).

## 3. 결정 (사용자 확정)

- **인박스 표면 = Home** (캡처·드릴 둘 다 'start' 액션 → Home이 허브).
- **드릴 의미 = 드릴 시작 시 인박스에서 제거**(promote: 실 세션→LearningRecord로 승격). 버리려면 ×.
  - **(spec-review I4) 트레이드오프 명시·수용:** "풀기"가 캡처를 즉시 삭제 후 navigate하므로, 세션을 **중도 포기하면 그 한국어는 유실**됨(LearningRecord는 `complete()`에서만 저장; korean은 세션 중 router state에만 존재). 경량 인박스로서 수용 — 재캡처 가능하고, 기존 `Review.tsx` 재연습 UX와 동일 성질(단 거기선 원본 Pattern이 영속이라 무손실, 여기선 Capture가 소멸하는 차이). 무손실이 필요해지면 추후 `complete()`까지 삭제 지연(=learningStore 결합)으로 확장.
- **share_target = 자동 저장** — 공유 텍스트는 `Capture(source:'share')`로 바로 인박스에 적재(별도 토스트 시스템 불필요), Home 인박스 섹션에 보임.

## 4. 데이터 모델 — `types/index.ts`

```ts
export interface Capture {
  id: string
  korean: string
  createdAt: string          // ISO
  source: 'manual' | 'share'
}
```
스키마 버전 bump 불필요 — 새 localStorage 키는 빈 채 시작하고 `init()` 마이그레이션은 records/patterns만 건드림.

## 5. 저장소 — `DataStore` 확장

```ts
saveCapture(capture: Capture): Promise<void>
getCaptures(): Promise<Capture[]>
deleteCapture(id: string): Promise<void>
```
**SRS 교훈(공유 인터페이스 변경):** 이 3 메서드 추가는 `dataStore.ts` + `localStorage.ts` + `firestoreDataStore.ts` + `db.ts` 파사드 + **fake 3곳**(`db.test.ts` fakeAdapter & "routes every method" 단언, `learningStore.test.ts` vi.mock, `migrateToCloud.test.ts` memStore)를 **한 커밋으로** 동시 수정해야 tsc가 안 깨진다.

- **localStorage(`localStorage.ts`):** 키 `eng-ception:captures`. `saveCapture` push(+`MAX_CAPTURES=50` 캡, 초과 시 오래된 것부터 제거 — quota 안전). `getCaptures` 반환. `deleteCapture` id 필터. 기존 quota-safe `getItem/setItem` 재사용.
- **Firestore(`firestoreDataStore.ts`):** `/users/{uid}/captures/{id}`. `saveCapture`=`setDoc(doc(col,id),c)`(offline 큐잉), `getCaptures`=`getDocs`, `deleteCapture`=`deleteDoc`. **보안 룰 변경 불필요** — `firestore.rules`의 `/users/{uid}/{document=**}`가 이미 커버.
- **(spec-review I1) 정렬:** `getDocs`는 순서 미보장(기본 doc id 순). 어댑터에서 `orderBy` 대신 **UI에서 `createdAt` 내림차순 정렬**(어댑터 무관, 양 tier 일관). getCaptures는 정렬 없이 raw 반환.

## 6. 로그인 병합 — `migrateToCloud.ts`

records/patterns와 동일하게 captures도 비파괴 union: 로컬 captures를 cloud에 업로드(id 기준 idempotent — `setDoc` 덮어쓰기) → 전부 성공 시에만 로컬 captures 삭제. **(spec-review I3) captures를 업로드 `Promise.all`과 삭제 `Promise.all` 양쪽 모두에 추가**(`local.getCaptures()`도 초기 `Promise.all`에 합류). 테스트 memStore에 capture 3메서드 필요(§10).

## 7. UI — `pages/Home.tsx` + 신규 헬퍼

- **캡처 버튼:** 빠른 입력 푸터에서 "풀어보기" 옆에 보조 **"나중에"** 버튼(입력 trim 있으면 활성). 클릭 → `db.saveCapture({ id: crypto.randomUUID(), korean: input.trim(), createdAt: new Date().toISOString(), source: 'manual' })` → 입력 비우기 + 인박스 새로고침.
- **인박스 섹션:** "나중에 풀 거 N" — `captures` 역순(최근 먼저) 리스트. 각 항목: 한국어 텍스트 + **풀기**(→ `db.deleteCapture(id)` 후 `navigate('/learn/custom',{state:{input:korean}})`) + **×**(→ `db.deleteCapture(id)` + 새로고침). captures 0이면 섹션 숨김.
- **share_target 처리 (spec-review C1 — StrictMode 안전):** `load()`와 **분리된 별도 effect**. dev StrictMode는 effect를 mount→cleanup→mount 2회 실행하고 라우터 `navigate`는 비동기라, 단순 navigate-replace는 두 번째 마운트에서 `location.search`가 아직 살아있어 **중복 캡처**됨(각 `crypto.randomUUID()`라 id-idempotency로도 안 막힘). 따라서:
  1. `parseShareText(window.location.search)` 읽기.
  2. 텍스트 있고 `consumedRef.current === false`이면 → **동기적으로** `consumedRef.current = true` + `window.history.replaceState({}, '', '/')`로 쿼리 즉시 제거(라우터 navigate 아님 — 동기 strip).
  3. 그 다음 `await db.saveCapture({ id: crypto.randomUUID(), korean: text, createdAt: now, source: 'share' })` → 인박스 새로고침.
  `consumedRef`(useRef) + 동기 strip 조합으로 더블마운트·재렌더 모두 1회만 적재.
- **신규 순수 헬퍼 `services/shareTarget.ts`:** `parseShareText(search: string): string | null` — `URLSearchParams`에서 `text`(없으면 `title`) 추출, trim, 빈 문자열은 null.

## 8. PWA — `vite.config.ts` manifest

```ts
share_target: {
  action: '/',
  method: 'GET',
  params: { title: 'title', text: 'text', url: 'url' },
}
```
GET이므로 서비스워커 핸들러 불필요 — OS가 `/?title=&text=&url=`로 PWA를 염. (POST는 SW 필요 → 회피.) 설치된 PWA에서만 OS 공유 시트에 노출.

## 9. 에러 처리

`saveCapture`/`deleteCapture`는 어댑터 경계에서 이미 quota/오프라인 안전(localStorage swallow, Firestore 큐잉). UI는 기존 `db` 패턴 그대로. `parseShareText`는 malformed search에 null 반환(throw 없음).

## 10. 테스트

- **`localStorage.test.ts`:** capture CRUD(save/get/delete), `MAX_CAPTURES` 캡(오래된 것 제거).
- **`db.test.ts`:** fakeAdapter에 3 메서드 + "routes every method"에 3개 추가.
- **`migrateToCloud.test.ts`:** memStore에 captures 지원 + captures union/clear 테스트.
- **`firestoreDataStore.test.ts`(emulator):** capture CRUD round-trip.
- **`shareTarget.test.ts`(신규):** `parseShareText` — text 추출, title 폴백, 빈/없음→null, malformed.
- 기존 e2e/vitest 무손상 확인.

## 11. 검증 레시피

`npx tsc -b` 0 · `npx vitest run`(141 + 신규) · `npm run lint` · `npm run build`(manifest에 share_target 포함 확인) · `npm run test:e2e` 2 pass · (`npm run test:emulator` capture 포함, Java 필요).

## 12. 파일 영향

신규: `services/shareTarget.ts`(+test). 수정: `types/index.ts`, `store/dataStore.ts`, `store/localStorage.ts`(+test), `store/firestoreDataStore.ts`(+emulator test), `store/db.ts`, `store/db.test.ts`, `services/migrateToCloud.ts`(+test), `store/learningStore.test.ts`(vi.mock), `pages/Home.tsx`, `vite.config.ts`.

## 13. 다음 (범위 밖)
- **C — 오프라인 재연습(F6):** 경량 플래시카드 리콜(스키마 무변경, 저장된 Pattern 필드 사용).
