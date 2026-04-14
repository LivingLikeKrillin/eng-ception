# Eng-ception MVP Design Spec

## 1. 제품 개요

한국어로 떠오른 복잡한 생각을 영어로 말하기 쉬운 구조로 재구성하는 훈련 PWA.
번역이 아니라 사고 재구성 훈련에 초점.

### 핵심 사용자

- 메인 사용자: 본인 (개발자, 영어 발화 구조화 훈련 목적)
- 향후 무료 공개 가능성 있음

### MVP 성공 기준

- "아, 이렇게 쪼개면 말할 수 있구나"를 반복 체감
- 매일 시나리오 카드로 앱을 여는 습관 형성
- 패턴 축적을 통해 재사용 가능한 발화 구조 확보

---

## 2. 기술 스택

| 레이어 | 선택 | 이유 |
|--------|------|------|
| 프론트엔드 | Vite + React + TypeScript | 가볍고 빠름, PWA 플러그인 지원 |
| PWA | vite-plugin-pwa | 홈 화면 추가, 오프라인 캐시 |
| 스타일링 | Tailwind CSS | 빠른 UI 개발 |
| 상태 관리 | Zustand | 가벼운 상태 관리 |
| 데이터 저장 | LocalStorage (Data Layer 추상화) | 초기 MVP, 나중에 Supabase 전환 가능 |
| API 프록시 | Vercel Edge Functions 또는 Cloudflare Workers | API 키 보호, 서버리스 |
| LLM | Claude API (Anthropic) | 한국어 이해력 우수 |
| 배포 | Vercel | 무료 티어, 간편 배포 |

---

## 3. 시스템 아키텍처

```
┌─────────────────────┐
│  Vite + React PWA   │
│  (프론트엔드)        │
└─────────┬───────────┘
          │ fetch /api/*
┌─────────▼───────────┐
│  Serverless Proxy   │
│  (Vercel Edge Fn)   │
│  - API 키 보호       │
│  - 요청 전달         │
└─────────┬───────────┘
          │ Claude API
┌─────────▼───────────┐
│  Anthropic API      │
│  (Claude Sonnet)    │
└─────────────────────┘

┌─────────────────────┐
│  Data Layer         │
│  (추상화 인터페이스)  │
│  ├─ LocalStorage    │ ← MVP
│  └─ Supabase        │ ← 향후
└─────────────────────┘
```

### Data Layer 인터페이스

```typescript
interface DataStore {
  // 시나리오 카드
  getScenarios(): Promise<Scenario[]>
  getScenario(id: string): Promise<Scenario | null>
  getUnlearnedScenarios(limit: number): Promise<Scenario[]>
  saveScenarios(scenarios: Scenario[]): Promise<void>

  // 학습 기록
  saveLearningRecord(record: LearningRecord): Promise<void>
  getLearningRecords(): Promise<LearningRecord[]>
  deleteLearningRecord(id: string): Promise<void>

  // 패턴
  savePattern(pattern: Pattern): Promise<void>
  getPatterns(): Promise<Pattern[]>
  deletePattern(id: string): Promise<void>
}
```

---

## 4. 핵심 학습 플로우

사용자가 먼저 시도 → AI가 피드백하는 인터랙티브 구조.
각 단계마다 별도의 Claude API 호출.

### Step 1: 원문 제시
- 시나리오 카드 선택: 상황 설명 + 말하기 목적 + 원문 함께 제시
- 직접 입력: 한국어 문장만 입력. situation/purpose/emotionalTone은 AI가 호출 #1에서 추론

### Step 2: 직접 쪼개보기 (사용자 시도)
- "이 문장의 핵심 의미를 2~3개로 나눠보세요"
- 기본 입력 필드 2개, "하나 더 추가" 버튼으로 최대 4개까지

### Step 3: AI 의미 분해 + 피드백 (Claude 호출 #1)
- AI가 의미 분해 제안
- 사용자 시도와 비교하여 피드백
- "왜 이렇게 나누는지" 설명

### Step 4: 직접 쉬운 한국어 (사용자 시도)
- AI의 의미 분해 각 항목에 대해, 영어로 옮기기 쉬운 한국어로 바꿔보기
- 의미 분해 개수만큼 텍스트 입력 필드 제공 (예: 분해가 3개면 입력도 3개)

### Step 5: AI 쉬운 한국어 + 피드백 (Claude 호출 #2)
- AI가 쉬운 한국어 제안
- 사용자 시도와 비교 피드백
- 왜 이 표현이 영어로 옮기기 더 쉬운지 설명

### Step 6: 직접 영어 시도 (사용자 시도)
- 쉬운 한국어를 보고 영어로 작성
- 텍스트 입력

### Step 7: AI 단계별 영어 + 피드백 (Claude 호출 #3)
- Layer 1: 짧고 안전한 영어
- Layer 2: 자연스러운 영어
- Layer 3: 더 정교한 영어
- 사용자 영어 시도에 대한 피드백 (잘한 점, 개선점)

### Step 8: 패턴 추출 + 저장 (Claude 호출 #4)
- 이 문장에서 재사용 가능한 패턴 추출
- 예: "I'm not saying A. I just think B."
- 저장 버튼으로 패턴 라이브러리에 추가

### API 호출 요약

학습 1회당 Claude API 호출: **4회**
- 호출 #1: 의미 분해 + 사용자 시도 피드백
- 호출 #2: 쉬운 한국어 + 사용자 시도 피드백
- 호출 #3: 단계별 영어 + 사용자 시도 피드백
- 호출 #4: 패턴 추출

---

## 5. 화면 구조

### 5.1 홈 화면

```
┌──────────────────────────┐
│  Eng-ception             │
├──────────────────────────┤
│                          │
│  오늘의 시나리오           │
│  ┌────────────────────┐  │
│  │ 상황: 연인과 다툰 뒤  │  │
│  │ "그 말이 틀렸다는 건  │  │
│  │  아닌데..."          │  │
│  │        [시작하기]     │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ 상황: 회의에서       │  │
│  │ "불가능하다는 뜻은..." │  │
│  │        [시작하기]     │  │
│  └────────────────────┘  │
│                          │
│  [내 문장 직접 입력하기]    │
│                          │
│  최근 학습                │
│  · 3/17 - "그게 꼭..."   │
│  · 3/16 - "정확히..."    │
│                          │
├──────────────────────────┤
│  🏠 홈  📚 패턴  🔄 복습  │
└──────────────────────────┘
```

### 5.2 학습 화면 (스텝 바이 스텝)

```
┌──────────────────────────┐
│  ← 뒤로     Step 2/8     │
├──────────────────────────┤
│                          │
│  원문:                    │
│  "그 말이 틀렸다는 건      │
│   아닌데, 지금 상황에선    │
│   좀 안 맞는 것 같아."    │
│                          │
│  ─────────────────────   │
│                          │
│  이 문장의 핵심 의미를     │
│  2~3개로 나눠보세요:      │
│                          │
│  1. [________________]   │
│  2. [________________]   │
│  3. [________________]   │
│                          │
│      [+ 하나 더 추가]     │
│                          │
│         [제출하기]        │
│                          │
└──────────────────────────┘
```

### 5.3 패턴 라이브러리

```
┌──────────────────────────┐
│  내 패턴 라이브러리        │
├──────────────────────────┤
│  [전체] [감정] [의견]     │
│  [묘사] [경험] [상황]     │
│                          │
│  ┌────────────────────┐  │
│  │ I'm not saying A.  │  │
│  │ I just think B.    │  │
│  │ #완곡한반대 #감정    │  │
│  │ 저장일: 3/17        │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │ It's not that A.   │  │
│  │ It's more that B.  │  │
│  │ #뉘앙스 #설명       │  │
│  │ 저장일: 3/16        │  │
│  └────────────────────┘  │
│                          │
├──────────────────────────┤
│  🏠 홈  📚 패턴  🔄 복습  │
└──────────────────────────┘
```

### 5.4 복습 화면

```
┌──────────────────────────┐
│  복습                     │
├──────────────────────────┤
│                          │
│  자주 막힌 패턴            │
│  ┌────────────────────┐  │
│  │ "A는 아닌데 B" 패턴  │  │
│  │ 3회 학습 / 1회 막힘   │  │
│  │       [다시 풀기]     │  │
│  └────────────────────┘  │
│                          │
│  저장한 문장               │
│  ┌────────────────────┐  │
│  │ "그게 꼭 불가능..."   │  │
│  │ 3/17 학습            │  │
│  │       [다시 풀기]     │  │
│  └────────────────────┘  │
│                          │
├──────────────────────────┤
│  🏠 홈  📚 패턴  🔄 복습  │
└──────────────────────────┘
```

---

## 6. 데이터 모델

```typescript
interface Scenario {
  id: string
  situation: string        // 상황 설명
  originalKorean: string   // 한국어 원문
  purpose: string          // 말하기 목적
  emotionalTone: string    // 감정 톤
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string         // 카테고리 (감정/의견/묘사/경험/상황)
  isDaily: boolean         // 오늘의 시나리오 여부
  createdAt: string
}

interface LearningRecord {
  id: string
  scenarioId: string | null  // 시나리오 기반이면 ID, 직접 입력이면 null
  originalKorean: string

  // 사용자 시도
  userDecomposition: string[]
  userEasyKorean: string[]
  userEnglish: string

  // AI 제안
  aiDecomposition: string[]
  aiEasyKorean: string[]
  aiEnglishLayers: {
    safe: string
    natural: string
    refined: string
  }

  // 피드백
  decompositionFeedback: string
  easyKoreanFeedback: string
  englishFeedback: string
  whyHardToTranslate: string

  // 패턴
  extractedPatterns: Pattern[]

  completedAt: string
  stepsCompleted: number  // 어디까지 진행했는지
}

interface Pattern {
  id: string
  template: string         // "I'm not saying A. I just think B."
  category: string
  tags: string[]
  exampleOriginal: string  // 원래 한국어
  exampleEnglish: string   // 영어 활용 예시
  savedAt: string
  reviewCount: number
  lastReviewedAt: string | null
}

// ReviewItem은 MVP에서 불필요 — Pattern과 LearningRecord에서 직접 목록 조회
// Spaced Repetition 도입 시 추가 예정
```

---

## 7. Claude API 프롬프트 설계

### 호출 #1: 의미 분해 + 피드백

```
시스템 프롬프트:
당신은 한국어 사고를 영어 발화 가능한 구조로 바꾸는 훈련을 돕는 코치입니다.
사용자가 한국어 원문과 자신의 의미 분해 시도를 제출합니다.

1. 원문을 영어로 말하기 쉬운 2~3개의 뜻 단위로 분해하세요.
2. 사용자의 시도와 비교하여 구체적 피드백을 주세요.
   - 잘한 점은 무엇인지
   - 개선할 점은 무엇인지
   - 왜 이렇게 나누는 것이 영어로 말하기에 유리한지
3. 이 문장이 영어로 바로 옮기기 어려운 이유를 간단히 설명하세요.

JSON으로 응답하세요:
{
  "decomposition": ["뜻 단위 1", "뜻 단위 2", ...],
  "feedback": "피드백 텍스트",
  "whyHard": "왜 어려운지 설명"
}
```

### 호출 #2: 쉬운 한국어 + 피드백

```
시스템 프롬프트:
사용자가 의미 분해된 뜻 단위를 영어 친화적인 쉬운 한국어로 바꾸려 합니다.

1. 각 뜻 단위를 영어로 직접 옮기기 쉬운 쉬운 한국어로 재구성하세요.
2. 사용자의 시도와 비교하여 피드백을 주세요.
   - 어떤 부분이 영어로 옮기기 쉬워졌는지
   - 아직 영어로 옮기기 어려운 표현이 남아있는지

JSON으로 응답:
{
  "easyKorean": ["쉬운 한국어 1", "쉬운 한국어 2", ...],
  "feedback": "피드백 텍스트"
}
```

### 호출 #3: 단계별 영어 + 피드백

```
시스템 프롬프트:
사용자가 쉬운 한국어를 보고 영어로 시도했습니다.

1. 3단계 영어를 제시하세요:
   - safe: 가장 짧고 안전한 영어 (초급자도 말할 수 있는 수준)
   - natural: 자연스러운 영어 (일상 대화 수준)
   - refined: 더 정교한 영어 (뉘앙스와 톤까지 고려)
2. 사용자의 영어 시도에 대해 피드백하세요:
   - 문법적으로 맞는지
   - 의미가 잘 전달되는지
   - 더 자연스럽게 바꿀 수 있는 부분

JSON으로 응답:
{
  "english": {
    "safe": "...",
    "natural": "...",
    "refined": "..."
  },
  "feedback": "피드백 텍스트"
}
```

### 호출 #4: 패턴 추출

```
시스템 프롬프트:
이 학습 세션에서 나온 영어 표현들을 분석하여 재사용 가능한 말하기 패턴을 추출하세요.

1. 다른 상황에서도 재사용할 수 있는 패턴 1~2개를 추출하세요.
2. 패턴의 구조를 A, B 등의 변수로 일반화하세요.
3. 활용 예시를 1~2개 제시하세요.

JSON으로 응답:
{
  "patterns": [
    {
      "template": "I'm not saying A. I just think B.",
      "category": "완곡한 반대",
      "tags": ["의견", "완곡"],
      "exampleOriginal": "네가 틀렸다고 말하려는 건 아닌데, 시간이 더 필요한 것 같아.",
      "exampleEnglish": "I'm not saying you're wrong. I just think we need more time."
    }
  ]
}
```

---

## 8. 시나리오 카드 배치 생성

초기에 Claude API로 시나리오 50~100개를 배치 생성하여 LocalStorage에 저장.
매일 2~3개씩 노출, 소진 시 추가 생성.

### 배치 생성 프롬프트

```
다음 카테고리별로 현실적이고 공감 가능한 시나리오를 생성하세요.

카테고리:
- 감정/관계: 서운함, 오해 해소, 위로, 선 긋기
- 의견/생각: 완곡한 반대, 우려 제시, 판단 유보
- 묘사/인상: 분위기, 사람 인상, 장소, 콘텐츠 감상
- 경험/서사: 경험 요약, 변화, 예상과 실제의 차이
- 상황 대응: 직장, 친구, 가족, 공식적 상황

각 시나리오는:
- situation: 구체적인 상황 (2~3문장)
- originalKorean: 사용자가 실제 하고 싶을 법한 한국어 문장 (자연스럽고 약간 복잡한)
- purpose: 이 말의 커뮤니케이션 목적
- emotionalTone: 감정 톤
- difficulty: beginner/intermediate/advanced
- category: 카테고리명

JSON 배열로 10개 생성하세요.
```

---

## 9. 프로젝트 구조

```
eng-ception/
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── home/
│   │   │   ├── ScenarioCard.tsx
│   │   │   └── RecentLearning.tsx
│   │   ├── learning/
│   │   │   ├── LearningFlow.tsx
│   │   │   ├── StepDecompose.tsx
│   │   │   ├── StepEasyKorean.tsx
│   │   │   ├── StepEnglish.tsx
│   │   │   └── StepPattern.tsx
│   │   ├── patterns/
│   │   │   └── PatternLibrary.tsx
│   │   ├── review/
│   │   │   └── ReviewList.tsx
│   │   └── common/
│   │       ├── Navigation.tsx
│   │       ├── StepIndicator.tsx
│   │       └── FeedbackCard.tsx
│   ├── services/
│   │   ├── claude.ts          // Claude API 호출
│   │   └── prompts.ts         // 프롬프트 템플릿
│   ├── store/
│   │   ├── dataStore.ts       // Data Layer 추상화
│   │   ├── localStorage.ts    // LocalStorage 구현
│   │   └── learningStore.ts   // Zustand 상태
│   ├── types/
│   │   └── index.ts           // TypeScript 타입 정의
│   └── utils/
│       └── scenarioGenerator.ts  // 배치 시나리오 생성
├── api/
│   └── chat.ts                // Vercel Edge Function (API 프록시)
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 10. MVP 범위 명확화

### 포함

- 사전 생성된 시나리오 카드 (50개 초기 배치)
- 내 문장 직접 입력
- 8단계 인터랙티브 학습 플로우 (사용자 시도 → AI 피드백)
- 패턴 추출 및 저장
- 패턴 라이브러리 (카테고리 필터)
- 기본 복습 (저장한 문장/패턴 다시 풀기)
- PWA (홈 화면 추가)

### 제외 (향후)

- OPIc 트랙
- TTS / 음성 녹음 / 발화 연습
- Spaced Repetition 알고리즘
- 사용자 사고 패턴 분석 (인사이트)
- Supabase 마이그레이션
- 소셜 기능
- 실시간 시나리오 생성 (배치 소진 전까지)

---

## 11. 추가 정책

### 에러 처리
- Claude API 호출 실패 시 1회 자동 재시도, 실패 시 "잠시 후 다시 시도해주세요" 메시지
- JSON 파싱 실패 시 동일 처리 (Claude가 가끔 불완전한 JSON 반환 가능)

### 라우팅
- `/` — 홈
- `/learn/:id` — 시나리오 기반 학습 (id = scenarioId)
- `/learn/custom` — 직접 입력 학습
- `/patterns` — 패턴 라이브러리
- `/review` — 복습

### 오늘의 시나리오 선택
- 저장된 시나리오 중 아직 학습하지 않은 것을 순서대로 2개 노출
- 모두 학습 완료 시 "새 시나리오 생성" 버튼 노출

### API 프록시 구조
- 단일 엔드포인트: `POST /api/chat`
- body에 `step` 파라미터로 구분: `decompose`, `easy-korean`, `english`, `pattern`
- 각 step에 맞는 시스템 프롬프트를 서버에서 조합

### 학습 중단 처리
- 중간 이탈 시 저장 안 함 (MVP)
- Step 8까지 완료해야 학습 기록 저장

### 복습 구조 (MVP)
- 저장한 패턴/문장을 단순 목록으로 노출
- "다시 풀기" 클릭 시 동일 학습 플로우 재진입
- Spaced Repetition 알고리즘은 향후 추가

### LocalStorage 관리
- 학습 기록 100건 초과 시 오래된 것부터 자동 삭제 (패턴은 유지)

---

## 12. MVP에서 제외하는 이유

| 기능 | 제외 이유 |
|------|----------|
| OPIc 트랙 | 코어 학습 플로우 검증이 우선 |
| TTS/음성 | 텍스트 기반 사고 재구성이 핵심, 음성은 이후 |
| Spaced Repetition | 단순 목록 복습으로 충분, 알고리즘은 데이터 축적 후 |
| 사고 패턴 분석 | 학습 데이터가 쌓여야 의미 있음 |
| Supabase | 기능 검증 단계에서 불필요한 복잡도 |
