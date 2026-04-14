# Eng-ception React Native 개발 로드맵 (업데이트)

> **기술 스택:** React Native (Expo) + Firebase + Claude API  
> **개발 체제:** 1인 풀스택  
> **디자인 방향:** 스픽 + Linear 벤치마킹 (다크 기반, 절제된 액센트)  
> **기존 웹:** eng-ception/ (React + Vite) — 유지, 별도 코드베이스  
> **새 프로젝트:** eng-ception-app/ (React Native + Expo)

---

## 프로토타입 반영사항 (vs 기존 로드맵)

**핵심 변화:**
- **네비게이션:** 기존 3탭 → **4탭 구조** (홈 / 구조 지도 / 내 기록 / 복습)
- **콘텐츠 소스:** 서비스 제공 "오늘의 문장" + 사용자 "직접 등록"
- **학습 흐름:** 기존 4단계 → **5단계 상세 플로우** (Empathy + Pre-check + Step 0~4)
- **레벨 진행:** 레벨 1(유형 제시) → 레벨 2(유형 선택, Unlock 기준 3연속 정답) → 레벨 3(음성 발화)
- **화면 재설계:** 내 기록("얼마나 했나") vs 구조 지도("뭘 배웠나") 분리
- **Approach A 채택:** Step 0에서 영어 어순 미표시. Step 2 피드백에서 설명

---

## 기존 웹 → RN 전환 시 재활용 가능한 것

| 레이어 | 재활용 여부 | 비고 |
|---|---|---|
| 비즈니스 로직 (Zustand 스토어) | **그대로** | Zustand은 RN에서 동일 동작 |
| API 호출 (services/claude.ts) | **그대로** | fetch 기반, RN 호환 |
| 프롬프트 (services/prompts.ts) | **그대로** | 순수 문자열, 플랫폼 무관. 분해 엔진 v1 포함 |
| 타입 정의 (types/index.ts) | **그대로 + 확장** | 타입은 유지, 새 학습 플로우 타입 추가 |
| 데이터 (seed-scenarios.ts) | **그대로 + 확장** | 기존 데이터 유지, "오늘의 문장" 데이터 추가 |
| UI 컴포넌트 | **전부 새로 작성** | HTML/CSS → RN 컴포넌트 |
| 스타일링 (Tailwind) | **사용 불가** | StyleSheet 또는 NativeWind |
| 라우팅 (React Router) | **교체** | Expo Router로 대체 |
| 저장소 (localStorage) | **교체** | AsyncStorage → Firebase |

---

## Phase 0: 프로젝트 셋업 + 디자인 시스템 + 학습 플로우 (2~3주)

### 0-1. Expo 프로젝트 초기화 (Day 1~2)

```bash
npx create-expo-app eng-ception-app --template tabs
cd eng-ception-app
```

**초기 패키지 설치:**
- `zustand` — 상태 관리 (기존 코드 재활용)
- `expo-router` — 파일 기반 라우팅 (Expo 기본 포함)
- `@react-native-firebase/app` + `auth` + `firestore` — Firebase
- `@react-native-community/speech-recognition` — 네이티브 음성 인식
- `expo-haptics` — 햅틱 피드백
- `react-native-reanimated` — 마이크로 인터랙션 애니메이션

**프로젝트 구조 설계:**
```
eng-ception-app/
├── app/                          # Expo Router (파일 기반 라우팅)
│   ├── _layout.tsx               # 루트 레이아웃 (4탭 네비게이션)
│   ├── index.tsx                 # 홈 (오늘의 문장 + 직접 등록 + 리뷰 안내)
│   ├── learn/
│   │   ├── [id].tsx              # 시나리오 학습
│   │   └── custom.tsx            # 직접 입력 학습
│   ├── map.tsx                   # 구조 지도 (10 types taxonomy)
│   ├── history.tsx               # 내 기록 (streak, stats, activity)
│   └── review.tsx                # 복습 (Spaced Repetition)
├── src/
│   ├── components/
│   │   ├── ui/                   # 디자인 시스템 기본 컴포넌트
│   │   │   ├── Text.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Badge.tsx
│   │   ├── learning/             # 학습 플로우 컴포넌트
│   │   │   ├── Empathy.tsx       # 공감 애니메이션 (2s 첫 시간, 0.7s 이후)
│   │   │   ├── PreCheck.tsx      # 어순 감각 사전 퀴즈
│   │   │   ├── Step0.tsx         # 구조 인식 + 전환점 퀴즈 (→ 블록 공개)
│   │   │   ├── Step1.tsx         # 블록 조립 + 연결어 선택
│   │   │   ├── Step2.tsx         # 피드백 + 어순 비교 (Approach A: 영어 어순)
│   │   │   ├── Step3.tsx         # Before/After 인셉션 비교
│   │   │   ├── Step4.tsx         # 완료 + Level 2 해금 배너
│   │   │   ├── FeedbackCard.tsx
│   │   │   └── StepProgress.tsx
│   │   ├── home/
│   │   │   ├── TodaySentence.tsx # 오늘의 문장 카드
│   │   │   ├── CustomInput.tsx   # 직접 등록
│   │   │   ├── ReviewNudge.tsx   # 리뷰 안내 (잠금 UI)
│   │   │   └── LevelBadge.tsx
│   │   ├── map/
│   │   │   ├── TypeCard.tsx      # 구조 유형 카드
│   │   │   └── ProgressCircle.tsx # 유형별 진행률
│   │   └── history/
│   │       ├── StreakCounter.tsx
│   │       ├── StatsChart.tsx
│   │       └── ActivityHeatmap.tsx
│   ├── services/
│   │   ├── claude.ts             # (웹에서 그대로)
│   │   ├── prompts.ts            # 분해 엔진 v1 프롬프트 포함
│   │   └── decompositionEngine.ts # 엔진 호출 로직
│   ├── store/
│   │   ├── learningStore.ts      # (웹에서 그대로 + 새 학습 플로우 상태)
│   │   ├── userStore.ts          # 사용자 레벨, 스트릭 등
│   │   └── reviewStore.ts        # 복습 데이터
│   ├── firebase/
│   │   ├── config.ts
│   │   ├── auth.ts
│   │   └── firestore.ts
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── index.ts              # (웹에서 그대로 + 확장)
│   │   ├── learning.ts           # 새 플로우 타입: LearningStep, EmpathyData, PreCheckData, etc.
│   │   └── taxonomy.ts           # 10 types 정의
│   ├── utils/
│   │   ├── levelProgression.ts   # 레벨 승급 로직 (3연속 정답)
│   │   ├── spaceRepetition.ts    # SM-2 알고리즘
│   │   └── validation.ts         # 입력 검증
│   └── data/
│       ├── seed-scenarios.ts     # (웹에서 그대로 + 확장)
│       ├── daily-sentences.ts    # 오늘의 문장 데이터
│       └── structure-types.ts    # 10 types 정보
└── assets/
    ├── fonts/
    └── images/
```

### 0-2. 디자인 시스템 구축 (Day 3~5)

**컬러 팔레트 (다크 기반):**
```typescript
// theme/colors.ts
export const colors = {
  // 배경
  bg: {
    primary: '#0F0F0F',        // 메인 배경
    secondary: '#1A1A1A',      // 카드 배경
    tertiary: '#252525',       // 인풋 배경
    elevated: '#2A2A2A',       // 모달 배경
  },
  // 텍스트
  text: {
    primary: '#F5F5F5',        // 본문
    secondary: '#A0A0A0',      // 보조 텍스트
    tertiary: '#666666',       // 비활성
    inverse: '#0F0F0F',        // 밝은 배경 위
  },
  // 액센트
  accent: {
    primary: '#4A9EBB',        // 주 액센트 (차분한 블루)
    primaryMuted: '#4A9EBB22', // 액센트 배경
    success: '#4CAF7D',        // 성공
    warning: '#E8A545',        // 경고
    error: '#D45555',          // 에러
  },
  // 보더
  border: {
    subtle: '#2A2A2A',
    default: '#333333',
    strong: '#444444',
  },
}
```

**타이포그래피 + 스페이싱** (기존과 동일)

### 0-3. 기본 UI 컴포넌트 (Day 5~7)

**재사용 컴포넌트 목록:**
- `Text` — 타이포 시스템 적용
- `Button` — primary/secondary/ghost, 최소 44pt, 햅틱 포함
- `Card` — 배경 + 라운딩 + 보더
- `Input` — 텍스트 입력 + 포커스 애니메이션
- `Badge` — 카테고리, 난이도 태그
- `ProgressBar` — 3단계 진행률
- `FeedbackCard` — AI 피드백 표시
- **NEW** `EmpathyAnimation` — 공감 애니메이션 (첫 시간 2초, 이후 0.7초)
- **NEW** `BlockCard` — 드래그 가능한 블록 (Step 1)
- **NEW** `ConnectorButtons` — 연결어 선택 (Step 1)
- **NEW** `StructureCard` — 구조 유형 선택 (Level 2)
- **NEW** `TypeProgressCircle` — 원형 진행률 (구조 지도)

### 0-4. 웹에서 로직 코드 마이그레이션 (Day 7~8)

웹 프로젝트에서 복사:
- `src/types/index.ts` → RN `src/types/`
- `src/services/claude.ts` → RN `src/services/`
- `src/services/prompts.ts` (분해 엔진 v1 포함) → RN `src/services/`
- `src/store/learningStore.ts` → RN `src/store/` (Firebase 어댑터로 수정, Phase 1)
- `src/data/seed-scenarios.ts` → RN `src/data/`

**추가 작업:**
- 새 타입 정의: `LearningStep`, `EmpathyData`, `PreCheckData`, `StructureType` (10개)
- 새 스토어: `userStore` (레벨, 스트릭), `reviewStore` (복습 데이터)

### 0-5. 4탭 네비게이션 + 새 학습 플로우 (Day 8~14)

**Expo Router 구조 (4탭):**
```
탭 1: 홈 (홈 화면 + 학습 모달)
탭 2: 구조 지도 (10 types 진행률)
탭 3: 내 기록 (streak, stats, activity)
탭 4: 복습 (스페이스 반복 카드)
```

**새 학습 플로우 (5단계):**

```
[홈] "오늘 막힌 문장이 뭐였어요?"
  ↓ (텍스트 또는 음성 입력)

[Empathy] 공감 애니메이션
  · 첫 시간: 2초 (전체 애니메이션)
  · 그 이후: 0.7초 (단축)
  → "당신이 말하려던 감정을 이해했어"
  ↓

[Pre-check] 어순 감각 퀴즈
  · "이걸 영어로 말한다면 뭐부터 꺼낼 것 같아?"
  · 선택지 2개: 한국어 순서 vs 영어 순서
  · 사용자 선택 (맞고 틀림 없이 측정만)
  ↓

[Step 0] 구조 인식 + 전환점 퀴즈
  · "이 문장은 [양보+주장] 구조입니다"
  · 논리 성분 한국어 분해 표시 (한국어 어순으로)
  · 블록은 아직 미공개
  · 전환점 퀴즈: "이 문장의 전환점은?" (2지선다)
  · 퀴즈 정답 후 → 블록 공개
  ↓

[Step 1] 블록 조립 + 연결어 선택
  · 영어 청크 블록 섞여서 제시 (순서 뒤섞임)
  · 사용자가 탭으로 올바른 순서에 배치
  · 연결어 선택 (though/although/but 등) — 3개 선택지
  ↓

[Step 2] 피드백 + 어순 비교 (Approach A)
  · 정답 확인: "맞았어" 또는 구체적 설명
  · "영어 어순이 한국어와 같은지/반대인지" 설명
  · **영어 어순 표현은 여기서 처음 보여줌**
  · Step 0에서 영어 어순은 표시하지 않음 ← Approach A
  ↓

[Step 3] Before/After 인셉션 비교
  · 사용자 입력 (한국어) → 제시된 영어
  · "구조를 이해하니까 표현이 달라지지?"
  ↓

[Step 4] 완료 + Level 2 해금 배너
  · 패턴 카드 저장
  · 총 3연속 정답 달성 시: "유형 선택 모드 해금! 레벨 2 시작"
  · 홈으로 자동 복귀
  
한 세션: 약 30~40초
```

**레벨 진행:**
- **레벨 1:** 앱이 유형 제시 + 블록 조립 (기본)
- **레벨 2:** 사용자 유형 선택 (3지선다) + 블록 조립 (같은 유형 3연속 정답으로 자동 승급)
- **레벨 3:** 음성 발화 모드 (유형 선택 + 마이크 활성화, Phase 2)

### 0-6. 네이티브 음성 입력 + 리뷰 시스템 (Day 12~14)

**QuickInput 컴포넌트:**
- 텍스트 입력창 + 마이크 버튼
- 마이크 탭: 음성 인식 시작 + 파형 애니메이션
- 인식 완료: 텍스트 자동 입력

**홈 화면 구성:**
- 상단: 리뷰 안내 ("오늘 아직 복습을 안 했어요")
- 중앙: "오늘의 문장" (서비스 제공 또는 잠금 상태)
- 버튼: "직접 등록" (텍스트/음성)
- 하단: 최근 문장 3개 (빠른 접근)

**내 기록 탭:**
- 스트릭 카운터
- 주간 활동 히트맵
- 총 세션 수, 패턴 수

**구조 지도 탭:**
- 10 types 카드 그리드
- 각 유형별 진행률 (원형)
- 탭하면 유형 상세보기 (예제 3개)

---

## Phase 1: Firebase + 인증 + 배포 (3~4주차)

### 1-1. Firebase 셋업

**서비스:**
- Authentication (카카오 + 구글 + Apple)
- Firestore (학습 데이터)
- Cloud Functions (Claude API 프록시)
- Analytics (이벤트 트래킹)

### 1-2. Firestore 스키마 (업데이트)

```
users/{userId}
├── displayName, email, provider, plan
├── level: 1-3
├── stats: { totalSessions, totalPatterns, streak, lastActiveAt, currentStreak }
├── progressByType: { type1: { correct: 5, attempts: 7, lastLevel: 1 }, ... }
└── preferences: { targetLevel }

sessions/{sessionId}
├── userId, createdAt, completedAt, status
├── source: "today" | "custom"
├── originalKorean, inputMethod: "text" | "voice"
├── structureType: { id: 1-10, name: "양보+주장", confidence: 0.95 }
├── steps: {
│   empathy: { duration: 2000, skipped: false },
│   precheck: { userChoice: "ko" | "en", correct: null },
│   step0: { pivot_correct: true, duration: 3000 },
│   step1: { order_correct: true, connector: "but", duration: 12000 },
│   step2: { feedback_read: true, word_order_reversed: false },
│   step3: { duration: 5000 },
│   step4: { patternSaved: true, levelUnlocked: false }
│ }
├── aiAnalysis: { components, blocks, connectors }
└── completionTime: 35

patterns/{patternId}
├── template, koreanContext, category
├── examples: [{ korean, english, sessionId, userLevel }]
└── usageCount

users/{userId}/savedPatterns/{patternId}
├── savedAt, reviewCount, mastery
├── nextReviewAt (SM-2 기반)
└── difficulty

users/{userId}/todaysSentence/{date}
├── korean, source: "service" | "user"
├── completed: boolean
├── sessionId (참조)
```

### 1-3. 배포

**앱스토어:**
- EAS Build (iOS/Android)
- 개인정보 처리방침 필수
- 앱 아이콘, 스플래시, 스크린샷

---

## Phase 2: 레벨 2 (유형 선택) + 복습 시스템 + 첫 매출 (5~8주차)

### 2-1. 레벨 2 구현

**유형 선택 모드:**
- Step 0 전에 "이 문장의 구조는?" 화면
- 3지선다 (정답 유형 + level2_distractors 2개)
- 정답 시 기존 Step 1~4 진행
- 오답 시 "다시 생각해봐" 후 재선택 (제한 없음)

**자동 승급 기준:**
- 같은 유형 3~5개 연속 정답
- 사용자에게 명시적 "레벨업" 알리지 않음
- 다음 학습 시 자연스럽게 유형 선택 모드 활성화

### 2-2. Spaced Repetition 복습

- 복습 탭: "오늘의 복습" 카드 덱
- SM-2 간소화 알고리즘
- 플립 인터랙션
- 숙달도 트래킹

### 2-3. 인앱 결제 + 프리미엄 모델

| 구분 | Free | Premium |
|---|---|---|
| 일일 학습 | 2회 | 무제한 |
| 내 문장 입력 | 1회/일 | 무제한 |
| 오늘의 문장 | "오늘의 문장" (2회만) | 무제한 + 과거 문장 |
| 패턴 라이브러리 | 최근 10개 | 전체 + 검색 |
| 구조 지도 | 진행률 표시만 | 자세한 분석 |
| 복습 시스템 | 미제공 | Spaced Repetition |
| OPIc 트랙 | 미제공 | 전체 (Phase 2) |

**가격:** 월 9,900원 / 연 79,900원

### 2-4. OPIc 트랙 개발 (Phase 2 후반)

- 30일 커리큘럼
- 일일 알림
- 별도 시나리오 세트

---

## Phase 3: 레벨 3 (음성 발화) + 고도화 (9~14주차)

### 3-1. 레벨 3 구현

**음성 발화 모드:**
- 유형 선택 → 마이크 활성화
- "영어로 말해보세요" (Step 1 블록 없음)
- 음성 인식 텍스트 변환 → 구조 평가
- 피드백: 구조 맞음/틀림 + 자연스러움 평가

**검증 포인트:**
- 레벨 3에서 사용자가 블록 없이 올바른 구조의 영어 발화 → 실제 발화 능력 증명

### 3-2. TTS + 음성 비교

- `expo-speech` — AI 영어 문장 읽어주기
- `expo-av` — 사용자 발화 녹음
- 원어민 발음과 비교 (Phase 3 후반)

### 3-3. TOEIC Speaking 트랙 (OPIc 검증 후)

**전제 조건:** 
- OPIc 트랙 완주율 40%+
- 7일 재방문율 30%+

**구현:**
- Part 1-2: 문장 읽기 (발음 비교)
- Part 3: 사진 묘사 (이미지 입력 + 재구성)
- Part 4: 질문 응답 (기존 플로우)
- Part 5-6: 정보 활용/의견 (시간 제한)

---

## Phase 4: B2B + 스케일 (15주차~)

- API 분리 + 화이트라벨
- 한국인 발화 실패 TOP 100 리포트
- 다국어 확장 (일본어, 중국어 → 영어)

---

## 디자인 원칙 (모든 Phase)

1. **색상 절제:** 액센트 1개 (#4A9EBB)
2. **순수 검정/흰색 금지:** #0F0F0F / #F5F5F5
3. **여백 과감하게:** spacing.lg(24px) 자주 사용
4. **모든 인터랙션에 피드백:** 햅틱 + 미세 애니메이션
5. **일관된 라운딩:** 카드 12px, 버튼 10px, 인풋 8px
6. **폰트 위계 엄수:** h1/h2/body/caption 4단계만

**마이크로 인터랙션:**
- 버튼 프레스: 햅틱 + 스케일 0.97
- AI 응답: 펄스 애니메이션
- 피드백 등장: 슬라이드 + 페이드인
- 패턴 저장: 체크마크 + 녹색 플래시

---

## 1인 개발 주간 리듬

| 요일 | 집중 영역 |
|---|---|
| 월~수 | 핵심 기능 개발 |
| 목 | 버그 수정 + 디자인 디테일 |
| 금 | 데이터 분석 + 피드백 |
| 토 | 앱스토어 업데이트 |
| 일 | 휴식/리서치 |

---

## 비용 예측 (월간, 1,000 사용자 기준)

| 항목 | 예상 비용 |
|---|---|
| Firebase (Blaze) | $25~50 |
| Claude API | $100~200 |
| Apple Developer | $8.25/월 |
| Expo EAS | $0~15 |
| RevenueCat | $0 (월 $2,500까지) |
| **월 합계** | **$135~275** |

---

## 마일스톤 타임라인

```
Week 1-3    Phase 0: Expo 셋업 + 디자인 + 4탭 네비게이션 + 새 학습 플로우
─────────── 로컬 프로토타입 완료 ───────────

Week 4-7    Phase 1: Firebase + 인증 + 배포
─────────── 앱스토어 출시 ───────────

Week 8-11   Phase 2: 레벨 2 + 복습 + OPIc 트랙
─────────── 첫 매출 ───────────

Week 12-19  Phase 3: 레벨 3 + TTS + TOEIC 트랙
─────────── 데이터 해자 + 시험 2종 ───────────

Week 20+    Phase 4: B2B 준비
```

---

*최종 업데이트: 2026-04-13*  
*반영: 프로토타입 검증 결과 (분해 엔진 v1, 10 types 100% 분류 성공)*
