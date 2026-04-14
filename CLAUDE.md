# Eng-ception

> 한국어 사고를 영어 발화 구조로 재구성하는 훈련 플랫폼
> "정답을 주는 앱이 아니라, 말문을 여는 앱"

## 프로젝트 개요

Eng-ception은 한국인이 영어로 말할 때 겪는 핵심 병목 — "머릿속 한국어를 영어로 옮기기 쉬운 구조로 재구성하는 능력" — 을 훈련하는 앱이다. 번역기는 정답을 주지만 Eng-ception은 근육을 만든다.

### 핵심 컨셉: "발화 실패 복기 도구"

실생활에서 말문이 막힌 순간을 캡처해서 훈련하는 방식. 사용자의 실제 삶이 콘텐츠가 된다.

## 기술 스택

- **프론트엔드:** React 19 + TypeScript + Vite 6
- **스타일링:** Tailwind CSS 4
- **상태 관리:** Zustand 5
- **라우팅:** React Router 7
- **AI:** Claude API (Anthropic) — Vercel Edge Function 또는 dev-server.js 프록시
- **저장소:** LocalStorage (현재) → Firebase 마이그레이션 예정
- **배포:** Vercel (api/ 폴더 Edge Functions) + PWA (vite-plugin-pwa)
- **개발 체제:** 1인 풀스택

## 프로젝트 구조

```
eng-ception/
├── api/
│   └── chat.ts                   # Vercel Edge Function (Claude API 프록시)
├── src/
│   ├── main.tsx                  # 앱 엔트리포인트
│   ├── App.tsx                   # 라우터 설정
│   ├── index.css                 # Tailwind 임포트
│   ├── types/index.ts            # 전역 타입 정의
│   ├── data/
│   │   └── seed-scenarios.ts     # 시드 시나리오 10개
│   ├── services/
│   │   ├── claude.ts             # Claude API 호출 클라이언트
│   │   └── prompts.ts            # 단계별 시스템 프롬프트 + 유저 메시지 빌더
│   ├── store/
│   │   ├── dataStore.ts          # DataStore 인터페이스 (추상화 레이어)
│   │   ├── localStorage.ts       # LocalStorage 어댑터 (DataStore 구현체)
│   │   └── learningStore.ts      # Zustand 학습 상태 관리
│   ├── pages/
│   │   ├── Home.tsx              # 홈 (빠른 입력 + 시나리오 + 최근 학습)
│   │   ├── Learn.tsx             # 학습 페이지 (LearningFlow 호스트)
│   │   ├── Patterns.tsx          # 패턴 라이브러리 (카테고리 필터)
│   │   └── Review.tsx            # 복습 (학습 기록 + 저장 패턴)
│   └── components/
│       ├── common/
│       │   ├── Navigation.tsx    # 하단 탭 네비게이션
│       │   ├── StepIndicator.tsx # 3단계 진행률 표시
│       │   └── FeedbackCard.tsx  # AI 피드백 카드 (재사용)
│       ├── home/
│       │   ├── ScenarioCard.tsx  # 시나리오 카드
│       │   └── RecentLearning.tsx # 최근 학습 목록
│       └── learning/
│           ├── LearningFlow.tsx      # 학습 플로우 컨트롤러
│           ├── StepRestructure.tsx    # Step 1: 사고 재구성 + AI 피드백 (인라인)
│           ├── StepEnglish.tsx       # Step 2: 영작 시도 + AI 3단계 영어 (인라인)
│           └── StepPattern.tsx       # Step 3: 패턴 추출 + 저장
├── dev-server.js                 # 로컬 개발용 Express API 프록시
├── vite.config.ts                # Vite + PWA + Tailwind 설정
└── tsconfig.json                 # TypeScript 설정
```

## 학습 플로우 (4단계)

```
Step 1: 한국어 입력 (Home 빠른 입력 또는 시나리오 선택)
Step 2: 사고 재구성 — 사용자가 쉬운 한국어로 재구성 시도 → AI 피드백 (같은 화면 인라인)
Step 3: 영작 시도 — 사용자가 영어로 시도 → AI 3단계 영어 + 피드백 (같은 화면 인라인)
Step 4: 패턴 정리 — 추출된 패턴 확인 + 저장
```

핵심 설계: 각 단계에서 사용자 입력 → 제출 → AI 피드백이 **같은 화면에 인라인으로** 표시된다. 별도의 피드백 화면으로 전환하지 않는다.

## Claude API 사용 패턴

- 학습 세션당 Claude API **3회 호출**: restructure, english, pattern
- `services/prompts.ts`에 단계별 시스템 프롬프트 정의
- 응답은 반드시 JSON 형식으로 받음 (프롬프트에서 강제)
- API 호출은 `api/chat.ts` (Vercel Edge) 또는 `dev-server.js` (로컬)를 통해 프록시
- 클라이언트에서 직접 API key를 사용하지 않음

### API 단계별 호출

| 단계 | 엔드포인트 step | 입력 | 응답 타입 |
|---|---|---|---|
| 사고 재구성 | `restructure` | 원문 + 사용자 재구성 시도 | `RestructureResponse` |
| 영작 | `english` | 원문 + AI 재구성 결과 + 사용자 영작 | `EnglishResponse` |
| 패턴 추출 | `pattern` | 원문 + AI 3단계 영어 | `PatternResponse` |

## 주요 데이터 모델 (`types/index.ts`)

- **Scenario:** 시드 시나리오 (상황, 한국어 원문, 목적, 감정 톤, 난이도, 카테고리)
- **LearningRecord:** 학습 세션 전체 기록 (userRestructure, userEnglish, aiRestructure, aiEnglish, extractedPatterns)
- **Pattern:** 재사용 가능한 발화 패턴 (템플릿, 카테고리, 태그, 예시)
- **LearningStep:** `'input' | 'restructure' | 'english' | 'pattern'`
- **ChatStep:** `'restructure' | 'english' | 'pattern'` (API 호출용)

## 상태 관리 (`store/learningStore.ts`)

Zustand 스토어가 학습 세션의 전체 상태를 관리한다.

주요 액션:
- `startScenario(scenario)` / `startCustom(korean)` — 세션 시작
- `submitRestructure(parts)` — 사고 재구성 제출 → API 호출 → aiRestructure 저장
- `submitEnglish(text)` — 영작 제출 → API 호출 → aiEnglish 저장
- `extractPatterns()` — 패턴 추출 API 호출 → pattern 단계로 전환
- `savePattern(index)` / `saveRecord()` — 패턴/기록 저장 → localStorage

**currentStep 전환 방식:** API 호출 후 자동 전환하지 않고, 사용자가 피드백을 확인한 뒤 "다음" 버튼을 누르면 컴포넌트에서 `useLearningStore.setState({ currentStep: '...' })` 직접 호출.

## 개발 컨벤션

- TypeScript strict 모드
- 컴포넌트: 함수형 + 기본 export (`export default function ComponentName()`)
- 상태: Zustand store (전역), React useState/useReducer (로컬)
- 스타일: Tailwind utility 클래스 (인라인), 모바일 퍼스트
- 파일 네이밍: PascalCase (컴포넌트), camelCase (유틸/서비스/스토어)
- import 정렬: React → 외부 라이브러리 → 내부 모듈
- UI: rounded-xl, py-3.5 등 모바일 터치 영역 확보, active: 상태 포함

## 커맨드

```bash
npm run dev        # 프론트엔드 개발 서버 (Vite, port 5173)
npm run dev:api    # API 프록시 서버 (Express, port 3001)
npm run build      # 프로덕션 빌드 (tsc + vite build)
npm run lint       # ESLint 실행
npm run preview    # 빌드 결과 미리보기
```

**개발 시 양쪽 서버 모두 실행 필요:** `npm run dev` + `npm run dev:api`

## 환경 변수

```
ANTHROPIC_API_KEY=  # Claude API 키 (서버 사이드에서만 사용)
```

## 다음 단계 (미완료)

1. **Firebase 마이그레이션:** Auth(카카오+구글) + Firestore + Cloud Functions로 localStorage 교체
2. **선택형 인터랙션:** Step 2(사고 재구성)에서 AI가 선택지를 제시하고 사용자가 고르는 UX 추가
3. **PWA 최적화:** 오프라인 캐싱, 홈 화면 설치 유도
4. **이벤트 트래킹:** 세션 시작/완료, 단계별 소요 시간, 이탈 단계 추적
