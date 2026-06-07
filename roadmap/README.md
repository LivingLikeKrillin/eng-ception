# Eng-ception 제품 로드맵

> 제품 단계·우선순위·의존성의 단일 소스. 상위 뷰 — 설계 상세는 v9 스펙, 실행 상세는 v9 플랜에 위임한다.
> **갱신:** 2026-06-07

---

## 0. 제품 정체성

한국어 사고를 **자연스러운 영어 5형식 구문으로 재배치**하는 능력을 훈련하는 앱. 번역기는 정답을 주지만 Eng-ception은 회로를 만든다.

- **단일 모드:** 텍스트 기반 **말하기·영어적 사고 훈련**. (듣기·받아쓰기·오디오는 자매 제품 `engul`이 담당 — 본 앱에 듣기/TTS 없음.)
- **플랫폼:** **웹 PWA** (모바일 퍼스트). RN(Expo)은 보류 — 필요해지면 재검토.
- **훈련 축:** 5형식(7패턴 / 17 큐레이션 동사)을 `SessionPayload`의 1급 차원으로.

> 결정 근거: [`scope_speaking_only`](../) 메모리 · 자세한 설계는 §아래 소스-오브-트루스.

---

## 1. 현재 위치 (2026-06-07)

| 항목 | 상태 |
|---|---|
| **브랜치** | `feat/v9-5h-axis` (off master) |
| **v9 설계** | ✅ 스펙 완료 (8 open Q 해소, 전문가 리뷰 반영) |
| **v9 구현 계획** | ✅ 플랜 완료 — 7청크 / ~40태스크 / ~45테스트, **플랜 리뷰 7/7 Approved** |
| **v9 코드** | ❌ **미착수** (master엔 레거시 3-step) |
| **저장소** | LocalStorage (schema v4 예정) · DataStore 추상화 |
| **AI** | Claude API (Vercel Edge `api/chat.ts` / dev 프록시) |

**다음 행동:** v9 플랜 실행 (Chunk 1 Foundation부터, TDD).

---

## 2. 단계 (Phases)

각 단계는 그 자체로 출시 가능한 상태를 목표로 한다.

### Phase 1 — v9 말하기 빌드  ◀ NOW
5형식 축을 박은 7스텝 학습 플로우(Empathy → Pre-check → Step 0~4)를 master 위에 새로 구축.
- 단일 Claude 호출 → 완결 `SessionPayload`, 이후 스텝은 추가 fetch 0
- Step 0 비교 카드(3형식↔5형식) + patternQuiz(힌트 스캐폴드)
- Step 1 슬롯 단위 청크 조립 · Step 2 patternNote · Step 3 동사 패밀리 저장(`patternId+triggerVerb` dedup)
- 과소노출 패턴은 **큐레이션 시드 시나리오**(s11~s15)로 커버
- **완료 기준:** mock + 실 API 양쪽 동작, ~45 테스트 green, typecheck/lint clean
- 산출물: [v9 스펙](../docs/superpowers/specs/2026-05-08-v9-5h-axis-design.md) · [v9 플랜](../docs/superpowers/plans/2026-05-08-v9-5h-axis-port.md)

### Phase 2 — 정착(Retention) 코어: SRS + 진단
반복 노출을 체계화해 "자동성"까지 끌고 가는 레이어. (LocalStorage 위에서 단일 기기로 먼저 가능.)
- **2-Layer SRS** — 상위 `Pattern5HId` 롤업 / 코어 `(patternId, triggerVerb)` FSRS 카드. schema v5 마이그레이션(`interval`/`easeFactor`/`nextDueAt`/`bypassedCount`).
- **"내 회로 진단" 뷰** — 패턴별 노출·정답률, `(patternId, verb)` 30~50회 varied-rep 임계 → "숙련" 라벨.
- **organic-first 스케줄링** + soft-bias(due 카드를 Claude 프롬프트에 힌트로) — 발화 실패 복기 본질 유지.
- 근거: 전문가 리뷰([`expert_pedagogy_review`](../)), v9 플랜 "Deferred to post-v9".

### Phase 3 — 계정 & 동기화 (Firebase)
실사용자·다기기·텔레메트리 기반 튜닝의 전제.
- **Auth** (카카오 + 구글), **Firestore**로 LocalStorage 교체(DataStore 어댑터만 교체), Cloud Functions로 프록시 이전.
- 이벤트 트래킹(세션 시작/완료, 스텝별 소요, 이탈 단계).
- *Phase 2의 Dynamic-N 튜닝·Time-to-Stabilization A/B는 이 단계의 텔레메트리 누적 후 가능.*

### Phase 4 — 성장(Growth)
- 시나리오 뱅크 확장(패턴 균형), 선택형 인터랙션(Step 0 선택지 UX), PWA 최적화(오프라인·설치 유도).
- A/B: organic 첫카드 interval 단축이 장기 안정화에 기여하는가(Time-to-Stabilization).

### Phase 5 — 플랫폼/수익화 (보류)
- 네이티브(RN) 재검토는 앱스토어 배포·푸시·햅틱 가치가 정당화될 때만.
- 수익화는 엔진 검증 이후 — 지금은 빌더/회로 엔진에 집중.

---

## 3. 우선순위 (현재)

| 등급 | 범위 |
|---|---|
| **P0 (지금)** | Phase 1 v9 빌드 — 이게 없으면 제품 없음 |
| **P1 (다음)** | Phase 2 SRS 코어 + 진단 뷰 — 정착이 곧 가치 |
| **P2** | Phase 3 Firebase 계정/동기화 — 실사용자 전환 시점 |
| **P3** | Phase 4 성장 · Phase 5 보류 항목 |

---

## 4. 의존성

```
Phase 1 (v9 빌드)
   └─▶ Phase 2 (SRS + 진단)        ← schema v5, dedup 키는 v9에서 이미 박힘
          └─▶ Phase 3 (Firebase)   ← 계정 = 텔레메트리/멀티기기 전제
                 └─▶ Phase 4 (성장 · A/B는 텔레메트리 필요)
```
*권장 순서. SRS 코어는 LocalStorage 위에서 Firebase 전에 먼저 가능 — 순서를 바꾸려면 여기서 결정.*

---

## 5. 범위 밖 / 보류 (Parked)

| 항목 | 상태 | 이유 |
|---|---|---|
| 듣기·받아쓰기·오디오 | **드롭** | 자매 제품 `engul`이 담당. 팟캐스트 저작권 회피. |
| 인앱 TTS/음성 | **드롭** | 모델 문장이 동적 생성 → 사전생성 부적합, 듣기로 드리프트. |
| RN(Expo) 네이티브 | **보류** | 핵심 근거(듣기 오디오 정밀도) 소멸. 웹 PWA가 제품. |
| BlockRole IO/DO 구분 | **스펙 후속** | 4형식 두 목적어를 'object'로 통합 중. 사용자 테스트 후 재검토. |
| Pattern5HChip 톤다운/토글 | **출시 후 재검토** | 문법용어 거부감 vs 반복 학습 가치. |
| 수익화 | **후순위** | 엔진 검증 이후. |

---

## 6. 소스-오브-트루스

| 문서 | 역할 |
|---|---|
| [v9 5형식 스펙](../docs/superpowers/specs/2026-05-08-v9-5h-axis-design.md) | 말하기 설계의 진실 — 모호하면 여기 |
| [v9 구현 플랜](../docs/superpowers/plans/2026-05-08-v9-5h-axis-port.md) | 실행 상세 (7청크/태스크/테스트) |
| [pedagogy-overview](../docs/pedagogy-overview.md) | 교수법 근거 (전문가 리뷰용) |
| [claude-design-brief](../docs/claude-design-brief.md) | UI 프로토타이핑 컨텍스트 |
| `archive/` | 레거시 RN/pre-v9 로드맵 (역사 보존) |

> 이 README는 **상위 로드맵**이다. 설계·구현 결정은 위 소스 문서가 우선한다.
