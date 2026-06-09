# Sub-project D — 사전 생성 콘텐츠 팩 (Curated Content Pack, v9.1) — Design

> 콜드스타트 즉시성: 시드 시나리오 탭 시 라이브 API 대신 **번들된 완성 SessionPayload**를 즉시 로드(오프라인·무료·일관). v9.1 위에서 재작성 — 자연 3형식 시드는 **간결형(isFiveHMoment:false)** 으로 정직하게 담는다.

## 1. 배경
콘텐츠는 세션당 라이브 Claude 생성이라 콜드스타트(신규 유저)에 즉시성·오프라인·무료·일관성이 없다. v9.1로 **간결형도 표현 가능**해졌으므로 시드 15개 전부를 사전 생성해 번들한다. 유저 본인 입력은 라이브 유지.

## 2. 결정 (사용자 확정, 유지)
- **손큐레이션 스타터 + 확장 스크립트.** 시드 15개를 손큐레이션, 추후 실Claude로 확장.
- **범위 15개 전부.** v9.1 덕에 강제 없이 정직하게: 10 모먼트 + 5 간결형.
- **claude.ts 팩-우선 로드**(scenarioId), 유저 커스텀은 라이브.

## 3. 시드 → 판정 매핑 (v9.1)
**모먼트(10, isFiveHMoment:true):** s1 make / s2 find / s5 get-pp / s8 ask / s9 let / s11 show / s12 tell / s13 see / s14 hear / s15 get-toV.
**간결형(5, isFiveHMoment:false)** — 자연 영어가 3형식이라 5형식 강제는 해악:
- s3 "계속 기억에 남아" → "It stuck with me." (vs 억지 "I find it memorable")
- s4 "하다 보니 꽤 재밌더라" → "It turned out to be pretty fun."
- s6 "네 마음 이해해" → "I understand how you feel." (5형식 맞추려면 뜻 왜곡)
- s7 "앉아서 멍 때리기 좋았어" → "It was a great place to just zone out."
- s10 "그때 느낌이 남아 있더라" → "The old feeling was still there."

## 4. 아키텍처
- **`data/contentPack.ts`(신규):** `Record<scenarioId, SessionPayload>` (v9.1 형태, 타입 인라인 → tsc 컴파일 검증). 15 항목.
- **`claude.ts` 팩-우선:** `fetchSessionPayload(korean, scenarioId?)` — `scenarioId && CONTENT_PACK[scenarioId]`면 검증 후 즉시 반환(네트워크 0). 우선순위 pack > mock > live. `runFetch`로 감싸 fetch 이벤트는 그대로(저지연).
- **`learningStore.runFetch`:** `fetchSessionPayload(get().originalKorean, get().scenario?.id)`. 커스텀은 scenario null → 라이브. (학습스토어 테스트는 claude 통째로 vi.mock → 팩 경로 안 탐, 무영향.)
- **확장 스크립트 `scripts/gen-content-pack.ts`(신규):** Node 22 `--experimental-strip-types`, 시드 한국어로 실Claude 호출(`ANTHROPIC_API_KEY`)→`assertSessionPayload`→붙여넣기용 JSON 출력. human-in-loop.

## 5. 검증/테스트
- **`contentPack.test.ts`(신규):** ① 모든 항목 `assertSessionPayload` 통과 ② key가 실제 seed id ③ 모먼트면 `pattern5h.id===pattern.patternId`, 간결형이면 pattern5h/pattern null ④ `fetchSessionPayload(x,'s1')`가 팩 반환 + `global.fetch` 미호출(오프라인 증명).
- 기존 vitest/e2e 무손상(커스텀 경로만 씀; e2e는 mock 'seed').

## 6. 파일 영향
신규: `data/contentPack.ts`(+test), `scripts/gen-content-pack.ts`. 수정: `services/claude.ts`, `store/learningStore.ts`(runFetch 1줄). 스키마·db 무변경.

## 7. 비범위
강제-제거 라이브 품질 튜닝, 시드 셋 개편, UGC. (구 `feat/content-pack` WIP 10-entry는 구 스키마라 폐기.)
