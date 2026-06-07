# Eng-ception 학습 여정 상세 스펙

> 화면 단위 구현 가이드. 각 화면의 목적, UI 요소, 상태 관리, 네비게이션을 정의한다.

---

## 1. 네비게이션 구조

```
탭 1: 홈 (index.tsx)
  ├── 홈 화면
  │   ├── 리뷰 안내 (nudge)
  │   ├── 오늘의 문장
  │   ├── 직접 등록
  │   └── 최근 문장 3개
  └── 학습 모달 (위에 겹침)
      ├── Empathy
      ├── Pre-check
      ├── Step 0 (구조 인식)
      ├── Step 1 (블록 조립)
      ├── Step 2 (피드백)
      ├── Step 3 (비교)
      └── Step 4 (완료)

탭 2: 구조 지도 (map.tsx)
  ├── 10 types 그리드
  └── 유형별 상세 (모달)
      ├── 설명
      ├── 예제 3개
      └── 진행률

탭 3: 내 기록 (history.tsx)
  ├── 스트릭 카운터
  ├── 주간 활동 히트맵
  └── 통계 (세션, 패턴, 유형별)

탭 4: 복습 (review.tsx)
  └── 오늘의 복습 카드 덱
```

---

## 2. 홈 화면 (index.tsx)

### 화면 목적
사용자가 학습을 시작하는 진입점. 리뷰 상태를 기반으로 UI를 제어한다.

### 상태 (Zustand store)
```typescript
interface HomeState {
  reviewsCompleted: boolean  // 오늘 복습 완료 여부
  streakCount: number
  nextSentenceType: 'today' | 'custom'
  selectedSentence: {
    id: string
    korean: string
    source: 'service' | 'user'
  } | null
}

// Actions
startSession(sentenceId: string)
skipToday()
```

### UI 레이아웃

**1. 헤더 (spacing.md 간격)**
```
┌─────────────────────────────────┐
│  Eng-ception          🔔 알림     │  ← 상태 없음 (Phase 1)
└─────────────────────────────────┘
```

**2. 리뷰 안내 (reviewsCompleted = false일 때만 표시)**
```
┌─────────────────────────────────┐
│ 🔄 오늘 아직 복습을 안 했어요    │
│ "오늘의 문장"은 복습 후 열려요   │
│ [복습 시작] (→ review.tsx)       │
└─────────────────────────────────┘
```

**3. 오늘의 문장 카드**
```
┌─────────────────────────────────┐
│ 📌 오늘의 문장                   │
├─────────────────────────────────┤
│ "물론 원격근무의 장점도 있지만, │
│  팀 시너지를 고려했을 때는       │
│  주 3회 출근이 더 효과적이라고   │
│  생각합니다."                    │
├─────────────────────────────────┤
│ [학습 시작]  [스킵]              │
└─────────────────────────────────┘
```

**조건부 렌더링:**
- `reviewsCompleted = true` → 카드 활성화 (배경색 정상)
- `reviewsCompleted = false` → 카드 비활성화 (배경색 어두워짐, 잠금 아이콘)

**4. 또는 직접 등록**
```
┌─────────────────────────────────┐
│ ✏️ 내 문장 등록 (1회/일)        │
├─────────────────────────────────┤
│ [텍스트 입력]  [🎤 음성 입력]   │
│ "오늘 막힌 문장이 뭐였어요?"     │
│ (Input field or voice)           │
│ [입력 완료]                      │
└─────────────────────────────────┘
```

**조건부 렌더링:**
- Free 사용자: 1회/일 (다 쓰면 "내일 다시 가능")
- Premium 사용자: 무제한

**5. 최근 문장 3개 (홈 하단)**
```
┌─────────────────────────────────┐
│ 최근 학습 문장                   │
├─────────────────────────────────┤
│ > "예산이 부족한 건 알겠는데..."  │
│ > "프리랜서로 일한 경험이..."     │
│ > "자꾸 내 의견을 무시하니까..."  │
└─────────────────────────────────┘
```

### 액션

| 버튼 | 네비게이션 | 스토어 변경 |
|---|---|---|
| [학습 시작] | 학습 모달 열기 | selectedSentence 설정 |
| [복습 시작] | → review.tsx | — |
| [스킵] | 다음 문장 로드 | nextSentenceType 변경 |
| [입력 완료] | 학습 모달 열기 | customInput 저장 (Firebase) |
| 최근 문장 탭 | 학습 모달 열기 | selectedSentence 설정 |

---

## 3. 학습 플로우 (모달, learn/[id].tsx + learn/custom.tsx)

> 총 5단계: Empathy → Pre-check → Step 0~4

### 공통 상태 (learningStore)

```typescript
interface LearningSession {
  id: string
  originalKorean: string
  inputMethod: 'text' | 'voice'
  source: 'today' | 'custom'
  
  // 각 단계 상태
  empathy: {
    skipped: boolean
    duration: number  // ms
  }
  precheck: {
    userChoice: 'ko' | 'en' | null
    correctAnswer: 'ko' | 'en'  // 실제로는 측정용이라 정답 없음
  }
  step0: {
    pivotCorrect: boolean | null
    duration: number
    blocksRevealed: boolean
  }
  step1: {
    orderCorrect: boolean | null
    connectorSelected: string | null
    duration: number
    attempts: number
  }
  step2: {
    feedbackRead: boolean
    wordOrderReversed: boolean | null
  }
  step3: {
    duration: number
  }
  step4: {
    patternSaved: boolean
    levelUnlocked: boolean  // 3연속 정답 → Level 2
  }
  
  // AI 응답
  aiDecomposition: {
    type: { id: 1-10, name: string, confidence: 0.0-1.0 }
    analysis: AnalysisData
    blocks: BlockData[]
    connectors: ConnectorOption[]
    quiz: QuizData
    feedback: FeedbackData
    precheck: PrecheckData
    pattern: PatternCard
    meta: MetaData
  }
}

// Actions
initSession(korean: string, source: 'today' | 'custom')
skipEmpathy()
setPrecheckChoice(choice: 'ko' | 'en')
submitPivotQuiz(answer: boolean)
revealBlocks()
submitBlockOrder(order: string[])
selectConnector(connector: string)
submitStep2Feedback(read: boolean, wordOrderReversed: boolean)
completeSession()
```

---

### 3.1 Empathy 단계 (1~2초)

**화면 목적**  
사용자의 감정(공감)을 인식하고, "당신이 말하려던 말을 이해했어"라는 메시지를 전달한다.

**화면 구성**

```
┌─────────────────────────────────┐
│                                 │
│     [🌀 공감 애니메이션]        │
│     (Empathy 일러스트 또는       │
│      펄스 애니메이션)           │
│                                 │
│   "당신이 말하려던 그 감정,     │
│    이해했어."                   │
│                                 │
│              [다음]              │
│            [건너뛰기]            │
│                                 │
└─────────────────────────────────┘
```

**애니메이션 스펙**
- **첫 시간:** 2초 (전체 애니메이션 + 텍스트 페이드인)
- **이후:** 0.7초 (축약된 버전)
- 라이브러리: `react-native-reanimated`

**상태 관리**
```typescript
useEffect(() => {
  const isFirstTime = learningStats.totalSessions === 0
  const empathyDuration = isFirstTime ? 2000 : 700
  
  setTimeout(() => {
    // Auto-advance 또는 사용자 클릭 대기
  }, empathyDuration)
}, [])
```

**액션**
| 버튼 | 다음 | 스토어 |
|---|---|---|
| [다음] 또는 자동 | Pre-check | empathy.skipped=false |
| [건너뛰기] | Pre-check | empathy.skipped=true |

---

### 3.2 Pre-check 단계 (어순 감각 퀴즈)

**화면 목적**  
"이 문장을 영어로 말할 때, 어디서부터 시작할 것 같은가?"를 측정한다. 정답/오답이 없고, 사용자의 현재 직감을 기록하는 것이 목적.

**화면 구성**

```
┌─────────────────────────────────┐
│ 어순 감각 (1/5)                 │  ← 5단계 진행 표시
├─────────────────────────────────┤
│ "이걸 영어로 말한다면             │
│  뭐부터 꺼낼 것 같아?"           │
├─────────────────────────────────┤
│ ○ 한국어 순서부터               │
│   "물론 원격근무의 장점도 있지만" │
│   (hint)                        │
│                                 │
│ ○ 영어 순서부터                 │
│   "팀 시너지를 고려했을 때는"    │
│   (hint)                        │
├─────────────────────────────────┤
│              [선택 완료]          │
└─────────────────────────────────┘
```

**상태 관리**
```typescript
const precheckData = aiDecomposition.precheck
// {
//   question: "이걸 영어로 말한다면 뭐부터 꺼낼 것 같아?",
//   option_ko: { label: "인정부터", hint: "..." },
//   option_en: { label: "주장부터", hint: "..." }
// }
```

**액션**
| 버튼 | 다음 | 스토어 |
|---|---|---|
| 라디오 선택 + [완료] | Step 0 | setPrecheckChoice(choice) |

---

### 3.3 Step 0: 구조 인식 + 전환점 퀴즈 (5초)

**화면 목적**  
논리 성분을 한국어로 분해하고, 전환점을 찾는다. **아직 영어 어순은 보여주지 않는다 (Approach A).**

**화면 구성**

```
┌─────────────────────────────────┐
│ 구조 인식 (2/5)                  │
├─────────────────────────────────┤
│ 이 문장은 [양보+주장] 구조입니다 │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ✓ 물론 원격근무의 장점도     │  → 색상: "ok" (회색)
│ │   있지만                     │
│ │ ┊ ~지만                      │  → 색상: "neutral"
│ │ ⚠ 팀 시너지를 고려했을 때는  │  → 색상: "warn" (황색)
│ │   주 3회 출근이 더 효과적    │
│ └─────────────────────────────┘
│                                 │
│ "한국어는 이렇게 꺾여. 영어는   │
│  달라. 아래에서 찾아봐."        │
│                                 │
├─────────────────────────────────┤
│ 이 문장의 전환점은?              │  ← 퀴즈
│ ○ ~지만                         │  ← 정답
│   ("좋긴 한데…" 하고 꺾는 지점)  │
│ ○ 효과적이라고                  │  ← 오답
│   (주장의 내용)                  │
│              [답변]              │
└─────────────────────────────────┘
```

**Approach A 핵심:**
- Step 0에서 **영어 어순 표시 안 함**
- 한국어 구조만 시각화
- "영어는 달라"는 힌트만 제공
- 정확한 영어 어순은 Step 2에서 공개

**상태 관리**
```typescript
const step0 = learningSession.step0
const structureAnalysis = aiDecomposition.analysis
// {
//   pivot: "~지만",
//   components: [
//     { role: "인정", korean: "...", color: "ok" },
//     { role: "전환", korean: "~지만", color: "neutral" },
//     { role: "주장", korean: "...", color: "warn" }
//   ],
//   structure_summary: "인정 → 전환 → 주장"
// }

const quiz = aiDecomposition.quiz
// {
//   pivot_question: "이 문장의 전환점은?",
//   pivot_options: [
//     { text: "~지만", hint: "...", correct: true },
//     { text: "효과적이라고", hint: "...", correct: false }
//   ]
// }
```

**액션**

| 액션 | 다음 | 스토어 변경 |
|---|---|---|
| 퀴즈 정답 | Step 1 (블록 공개) | step0.pivotCorrect=true, blocksRevealed=true |
| 퀴즈 오답 | Step 0 (다시 풀기) | step0.pivotCorrect=false, 재선택 |

---

### 3.4 Step 1: 블록 조립 + 연결어 선택 (10~15초)

**화면 목적**  
영어 청크 블록을 올바른 순서로 배치하고, 연결어를 선택한다.

**화면 구성**

```
┌─────────────────────────────────┐
│ 블록 조립 (3/5)                  │
├─────────────────────────────────┤
│ 올바른 순서로 배치해 보세요.     │
│                                 │
│ [드래그 가능 영역]               │
│ ┌─────────────────────────────┐ │
│ │ 배치할 블록들 (섞여 있음)   │ │
│ │ ┌─────────────┐             │ │
│ │ │ but coming  │             │ │
│ │ │ to the      │             │ │
│ │ │ office...   │             │ │
│ │ └─────────────┘             │ │
│ │ ┌─────────────┐             │ │
│ │ │ I understand│             │ │
│ │ │ remote work │             │ │
│ │ │ has benefits│             │ │
│ │ └─────────────┘             │ │
│ │ [분리된 커넥터]              │ │
│ │ ┌─────────────┐             │ │
│ │ │ but / though│             │ │
│ │ │ / however   │             │ │
│ │ └─────────────┘             │ │
│ └─────────────────────────────┘
│                                 │
│ [배치 결과 표시 영역]            │
│ ┌─────────────────────────────┐ │
│ │ 1. I understand...          │ │
│ │ 2. [연결어 선택]            │ │
│ │ 3. coming to the office...  │ │
│ └─────────────────────────────┘
│                                 │
│ 연결어를 골라봐                  │
│ ○ but (강하고 직접적)           │
│ ○ however (격식 있고 부드러움)   │
│ ○ though (대화체)               │
│              [확인]              │
└─────────────────────────────────┘
```

**블록 구성 (aiDecomposition.blocks)**
```typescript
[
  { id: "b1", en: "I understand remote work has benefits", role: "인정" },
  { id: "b2", en: "coming to the office three times a week is more effective", role: "주장" },
  { id: "b3", en: "considering team synergy", role: "근거" }
]
// 뿌려질 때는 순서 섞임: [b2, b3, b1] 같은 식
```

**연결어 옵션 (aiDecomposition.connectors)**
```typescript
[
  { word: "but", nuance: "직접적이고 강한 전환", formality: "neutral" },
  { word: "however", nuance: "격식 있고 부드러운", formality: "formal" },
  { word: "though", nuance: "가벼운 대화체", formality: "casual" }
]
```

**상태 관리**
```typescript
const step1State = {
  blockOrder: string[]  // 사용자가 배치한 순서
  selectedConnector: string | null
  attempts: number  // 시도 횟수
  duration: number  // 밀리초
}
```

**액션**

| 액션 | 다음 | 스토어 |
|---|---|---|
| 블록 순서 정렬 완료 + 연결어 선택 + [확인] | Step 2 | step1.orderCorrect=true/false, connectorSelected 저장 |
| 오답 시 | 재선택 허용 | step1.attempts++ |

---

### 3.5 Step 2: 피드백 + 어순 비교 (5초)

**화면 목적**  
정답 확인 및 어순 비교 설명. **여기서 처음 영어 어순을 보여준다 (Approach A).**

**화면 구성 (정답인 경우)**

```
┌─────────────────────────────────┐
│ 피드백 (4/5)                     │
├─────────────────────────────────┤
│ ✓ 맞았어                         │
│                                 │
│ 상대 의견을 먼저 인정하고 'but'   │
│ 으로 자기 주장을 연결하면        │
│ 설득력 있으면서 무례하지 않아.   │
│ 회의에서 아주 자주 쓰이는 순서야 │
│                                 │
│ ─────────────────────────────── │
│ 어순 비교:                       │
│                                 │
│ 한국어: 인정 → 주장              │
│ 영어:   인정 → but → 주장        │  ← 처음 보는 영어 어순
│                                 │
│ 💡 이 문장에서는 한국어와 영어   │
│    어순이 같아. 인정이 먼저,     │
│    주장이 뒤. 하지만 but이       │
│    전환점을 명확하게 찍어줘.    │
│                                 │
├─────────────────────────────────┤
│              [다음]              │
└─────────────────────────────────┘
```

**화면 구성 (오답인 경우)**

```
┌─────────────────────────────────┐
│ 피드백 (4/5)                     │
├─────────────────────────────────┤
│ ⚠ 순서가 다르네                  │
│                                 │
│ 영어에서는 인정 → but → 주장     │
│ 순서가 자연스러워. 한국어처럼    │
│ 주장부터 꺼내면 너무 직접적으로  │
│ 들릴 수 있어.                   │
│                                 │
│ ─────────────────────────────── │
│ 어순 비교:                       │
│                                 │
│ 한국어: 인정 → 주장              │
│ 영어:   인정 → but → 주장        │  ← 정답 어순
│                                 │
│ 💡 한국어와 영어 어순이 같아.    │
│    하지만 but을 명시해야 해.    │
│                                 │
├─────────────────────────────────┤
│         [다시 시도] [건너뛰기]   │
└─────────────────────────────────┘
```

**상태 관리**
```typescript
const step2Feedback = {
  isCorrect: boolean
  explanation: string
  wordOrderComparison: {
    koreanOrder: string[]
    englishOrder: string[]
    isReversed: boolean
    insight: string
  }
}
```

**액션**

| 액션 | 다음 | 스토어 |
|---|---|---|
| [다음] (정답) | Step 3 | step2.feedbackRead=true |
| [다시 시도] (오답) | Step 1 | step1 초기화, attempts++ |
| [건너뛰기] (오답) | Step 3 | step2.feedbackRead=true |

---

### 3.6 Step 3: Before/After 인셉션 비교 (3초)

**화면 목적**  
"구조를 이해하니까 표현이 달라지지?"라는 감각을 심어준다.

**화면 구성**

```
┌─────────────────────────────────┐
│ 구조 이해 (5/5)                  │
├─────────────────────────────────┤
│ 📝 Before (사용자 입력)          │
│ "물론 원격근무의 장점도 있지만,  │
│  팀 시너지를 고려했을 때는      │
│  주 3회 출근이 더 효과적이라고   │
│  생각합니다."                    │
│                                 │
│ 🎯 After (앱이 제시)            │
│ "I understand remote work has   │
│  its benefits, but coming to    │
│  the office three times a week  │
│  is more effective considering  │
│  team synergy."                 │
│                                 │
│ "구조가 명확하니까 표현이        │
│  완전히 달라졌지?"              │
│                                 │
├─────────────────────────────────┤
│              [저장]              │
└─────────────────────────────────┘
```

**상태 관리**
```typescript
const step3 = {
  before: learningSession.originalKorean
  after: aiDecomposition.blocks.assembled  // 완성된 영어
  duration: number  // 읽는 시간
}
```

**액션**

| 버튼 | 다음 | 스토어 |
|---|---|---|
| [저장] | Step 4 | step3.duration 기록 |

---

### 3.7 Step 4: 완료 + 레벨 업그레이드 배너 (3초)

**화면 목적**  
세션 완료 및 레벨 승격 (필요 시) 안내.

**화면 구성 (레벨 업그레이드 없음)**

```
┌─────────────────────────────────┐
│ 완료! (6/6)                      │
├─────────────────────────────────┤
│              ✓                   │
│                                 │
│ "이 구조 패턴을 기억해 봐."      │
│                                 │
│ 패턴 카드가 저장됐어.             │
│ 내 기록에서 언제든 다시 볼 수     │
│ 있어.                            │
│                                 │
│ 현재 진행: 1/3 연속 정답          │  ← 진행률 표시
│                                 │
├─────────────────────────────────┤
│              [홈으로]             │
└─────────────────────────────────┘
```

**화면 구성 (레벨 2 해금)**

```
┌─────────────────────────────────┐
│ 완료! (6/6)                      │
├─────────────────────────────────┤
│              ✓                   │
│                                 │
│ "이 구조 패턴을 기억해 봐."      │
│                                 │
│ 🎉 축하합니다!                   │
│ 3연속 정답을 달성했어요.         │
│                                 │
│ 🆙 레벨 2 해금!                  │  ← 밝은 배경
│ 이제부터는 구조 유형을            │  ← 강조 텍스트
│ 직접 선택해서 풀 수 있어.        │
│                                 │
│ (다음 학습부터 적용됨)           │
│                                 │
├─────────────────────────────────┤
│              [홈으로]             │
└─────────────────────────────────┘
```

**레벨 2 승격 조건**
- 같은 유형 (또는 어떤 유형이든) 3~5개 연속 정답
- `userStore.currentLevel` 업데이트
- 다음 세션 진입 시 Pre-check 후 Step 0 대신 "유형 선택" 화면 표시

**상태 관리**
```typescript
const step4 = {
  patternSaved: true
  levelUnlocked: boolean  // 3연속 정답 달성 여부
  nextLevel: number | null  // 2 (레벨 업)
}

// 레벨 업 로직
if (consecutiveCorrect >= 3 && userLevel === 1) {
  userStore.updateLevel(2)
  step4.levelUnlocked = true
}
```

**액션**

| 버튼 | 다음 | 스토어 |
|---|---|---|
| [홈으로] | Home (index.tsx) | 세션 저장, Firebase에 업로드 |

---

## 4. 구조 지도 (map.tsx)

### 화면 목적
10개 구조 유형 전체를 한눈에 보고, 유형별 진행률을 추적한다.

### 상태
```typescript
interface MapState {
  typeProgress: {
    [typeId: 1-10]: {
      correct: number
      attempts: number
      lastLevel: 1 | 2 | 3
      examplesViewed: number
    }
  }
  selectedType: number | null
  detailModalOpen: boolean
}
```

### UI 레이아웃

**1. 헤더**
```
구조 지도
당신이 배운 구조 유형들
```

**2. 유형 그리드 (2x5)**
```
┌────────────────────────────────┐
│  양보+주장      조건+결론       │
│  ○ 60%        ○ 40%           │
│  Level 1      Level 1         │
│                                │
│  순서+이유      이유+결론       │
│  ○ 75%        ○ 50%           │
│  Level 2      Level 1         │
│                                │
│  ... (10개까지)                │
└────────────────────────────────┘
```

각 카드:
- 원형 진행률 (%)
- 유형 이름 (한국어)
- 현재 레벨 (1/2/3)
- 탭하면 상세 모달 열기

**3. 상세 모달**
```
┌─────────────────────────────────┐
│ 양보+주장                         │
├─────────────────────────────────┤
│ 업무/논리                        │
│                                 │
│ 구조:                           │
│ "A이긴 한데, B라고 본다"        │
│                                 │
│ 진행: 6/10 정답                  │
│ 레벨: 1 → 2 해금 대기            │
│ (3연속 정답 필요)               │
│                                 │
│ 예제:                           │
│ 1. "물론 원격근무의 장점도..."   │
│ 2. "예산이 부족한 건 알겠는데..." │
│ 3. "좋은 아이디어인 건 맞는데..." │
│                                 │
│              [닫기]             │
└─────────────────────────────────┘
```

---

## 5. 내 기록 (history.tsx)

### 화면 목적
"얼마나 했나" 통계. Streak, 활동, 통계를 한눈에.

### 상태
```typescript
interface HistoryState {
  currentStreak: number
  longestStreak: number
  totalSessions: number
  totalPatterns: number
  thisWeekActivity: { [date: string]: number }  // 날짜: 세션 수
  typesLearned: number  // 10 중 몇 개
}
```

### UI 레이아웃

**1. 스트릭 카운터**
```
┌─────────────────────────────────┐
│ 🔥 7일 연속                     │
│ 최고 기록: 14일                  │
└─────────────────────────────────┘
```

**2. 주간 활동 히트맵**
```
┌─────────────────────────────────┐
│ 이번 주                          │
│                                 │
│ Mo Tu We Th Fr Sa Su            │
│ ■  ■  ■  ■  □  ■  ■           │  ← 색상: 진할수록 세션 많음
│ 3  3  2  5  0  1  4             │
└─────────────────────────────────┘
```

**3. 통계 카드**
```
┌─────────────────────────────────┐
│ 총 학습                          │
│ 세션: 47개                       │
│ 패턴: 23개                       │
│ 구조 유형: 8/10                  │
└─────────────────────────────────┘
```

---

## 6. 복습 탭 (review.tsx)

### 화면 목적
Spaced Repetition 기반 복습. "오늘의 복습" 카드 덱.

### 상태
```typescript
interface ReviewState {
  todayReviews: PatternCard[]  // SM-2 기반 선별
  currentIndex: number
  reviewsCompleted: boolean
  masteryScores: { [patternId: string]: 0-5 }  // 0~5 점
}
```

### UI 레이아웃

**1. 복습 카드 덱**
```
┌─────────────────────────────────┐
│ 오늘의 복습          3/5         │
├─────────────────────────────────┤
│                                 │
│ 패턴:                           │
│ "I understand ~, but ~"         │
│                                 │
│ [카드 뒤집기]                    │
│ (또는 자동으로)                  │
│                                 │
│ 💭 이 패턴을 어떻게 알고 있어?  │
│                                 │
│ ○ 완전히 까먹었어               │  ← 1점
│ ○ 어렴풋이 기억나               │  ← 2점
│ ○ 기억은 나는데 확실하지 않아    │  ← 3점
│ ○ 확실하게 기억 중               │  ← 4점
│ ○ 완벽하게 알고 있어             │  ← 5점
│                                 │
│           [선택 완료]             │
└─────────────────────────────────┘
```

**2. 복습 완료**
```
┌─────────────────────────────────┐
│ ✓ 오늘 복습 완료!               │
│                                 │
│ 5개 패턴을 복습했어.             │
│ 내일 또 봐!                      │
│                                 │
│              [홈으로]             │
└─────────────────────────────────┘
```

**SM-2 로직**
```typescript
// 마스터리 스코어에 따라 nextReviewAt 계산
const interval = calculateInterval(score, reviewCount)
// score 5: 10일 뒤
// score 4: 5일 뒤
// score 3: 3일 뒤
// score 2: 1일 뒤
// score 1: 내일
```

---

## 7. 레벨 2 구현 (Step 0 → 유형 선택)

### 레벨 2 진입 조건
- `userLevel === 2`

### 화면 흐름

**[Empathy] → [Pre-check] → [유형 선택] → [Step 1~4]**

### 유형 선택 화면

```
┌─────────────────────────────────┐
│ 유형 선택 (2/5)                  │
├─────────────────────────────────┤
│ 이 문장의 구조는?                │
│                                 │
│ ○ 양보+주장                      │  (정답)
│   ("A이긴 한데, B라고 본다")     │
│                                 │
│ ○ 조건/상황+결론 (distractor 1)  │
│   ("A를 고려하면 B가 낫다")      │
│                                 │
│ ○ 이유+결론 (distractor 2)       │
│   ("A때문에 B해야 한다")         │
│                                 │
│              [확인]              │
└─────────────────────────────────┘
```

**상태 관리**
```typescript
const level2State = {
  selectedType: number | null
  isCorrect: boolean | null
  attempts: number
}

// 정답 시: Step 1로 진행
// 오답 시: "다시 생각해봐" + 재선택
// 3~5개 연속 정답 시: "레벨 3 준비 중..." (Phase 2 후반)
```

---

## 8. 레벨 3 구현 (음성 발화, Phase 2 후반)

> Phase 2 후반에 구현. 스펙은 01-updated-rn-roadmap.md 참고.

---

## 9. 상태 흐름도

```
홈 (reviewsCompleted ?)
  ├─ true  → 오늘의 문장 활성화
  └─ false → 오늘의 문장 잠금 + 복습 안내

학습 선택
  ├─ 오늘의 문장 / 직접 입력
  └─ Empathy → Pre-check → [Step 0 또는 유형선택] → Step 1~4

Step 1 결과
  ├─ 정답 → Step 2
  └─ 오답 → Step 1 (재시도)

Step 2 결과
  ├─ 정답 → Step 3
  ├─ 오답 + 다시 시도 → Step 1
  └─ 오답 + 건너뛰기 → Step 3

Step 4
  ├─ 레벨 2 해금 → userLevel = 2
  ├─ consecutiveCorrect++ (3 달성 → 해금)
  └─ 패턴 저장 → Firebase

다음 세션 (userLevel = 2)
  ├─ Empathy → Pre-check → 유형선택 → Step 1~4

구조 지도
  └─ 10 types 진행률 표시

내 기록
  └─ streak, stats, activity 표시

복습
  └─ SM-2 기반 오늘의 복습 카드
```

---

## 10. Firebase 연동 체크리스트

각 화면에서 저장해야 할 데이터:

| 화면 | 저장 시점 | 데이터 |
|---|---|---|
| Step 4 (완료) | 클릭 후 | sessions/{sessionId} (모든 단계 결과) |
| Step 4 | 클릭 후 | users/{userId}/stats (업데이트) |
| Step 4 | 정답일 때 | users/{userId}/progressByType |
| Step 4 | 3연속 정답 | users/{userId}/level = 2 |
| 홈 | 진입 시 | reviewsCompleted 여부 체크 |
| 복습 | 선택 후 | users/{userId}/savedPatterns/{patternId}/mastery |

---

*이 문서는 개발자 구현의 기준점이다. 화면별로 정확한 좌표, 애니메이션 타이밍, 색상 코드는 디자인 시스템 문서를 참고할 것.*
