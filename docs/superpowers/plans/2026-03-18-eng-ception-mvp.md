# Eng-ception MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA that trains users to restructure complex Korean thoughts into speakable English through an interactive 8-step learning flow.

**Architecture:** Vite + React + TypeScript frontend with Tailwind CSS, Zustand for state, LocalStorage via abstracted DataStore, Vercel Edge Functions as Claude API proxy. 4 Claude API calls per learning session (decompose → easy Korean → English → pattern extraction).

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, Zustand, vite-plugin-pwa, Vercel Edge Functions, Claude API (Anthropic SDK)

**Spec:** `docs/superpowers/specs/2026-03-18-eng-ception-mvp-design.md`

---

## Chunk 1: Project Scaffolding & Core Infrastructure

### Task 1: Initialize Vite + React + TypeScript project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`

- [ ] **Step 1: Scaffold the project**

```bash
cd /c/Users/Eisen/Desktop/Labs/eng-ception
npm create vite@latest . -- --template react-ts
```

If directory is not empty, accept overwrite prompts.

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install react-router-dom zustand
npm install -D vite-plugin-pwa
```

- [ ] **Step 3: Configure Tailwind CSS**

Replace `src/index.css` with:

```css
@import "tailwindcss";
```

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Eng-ception',
        short_name: 'Eng-ception',
        description: '한국어 사고를 영어 발화 구조로 재구성하는 훈련 앱',
        theme_color: '#4a9ebb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
```

- [ ] **Step 4: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server running on localhost.

- [ ] **Step 5: Commit**

```bash
git init
echo "node_modules\ndist\n.env\n.env.local\n.superpowers/" > .gitignore
git add .
git commit -m "chore: scaffold Vite + React + TS + Tailwind + PWA project"
```

---

### Task 2: TypeScript types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create type definitions**

```typescript
// src/types/index.ts

export interface Scenario {
  id: string
  situation: string
  originalKorean: string
  purpose: string
  emotionalTone: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: string
  isDaily: boolean
  createdAt: string
}

export interface LearningRecord {
  id: string
  scenarioId: string | null
  originalKorean: string
  userDecomposition: string[]
  userEasyKorean: string[]
  userEnglish: string
  aiDecomposition: string[]
  aiEasyKorean: string[]
  aiEnglishLayers: {
    safe: string
    natural: string
    refined: string
  }
  decompositionFeedback: string
  easyKoreanFeedback: string
  englishFeedback: string
  whyHardToTranslate: string
  extractedPatterns: Pattern[]
  completedAt: string
  stepsCompleted: number
}

export interface Pattern {
  id: string
  template: string
  category: string
  tags: string[]
  exampleOriginal: string
  exampleEnglish: string
  savedAt: string
  reviewCount: number
  lastReviewedAt: string | null
}

export type LearningStep =
  | 'original'
  | 'decompose'
  | 'ai-decompose'
  | 'easy-korean'
  | 'ai-easy-korean'
  | 'english'
  | 'ai-english'
  | 'pattern'

export interface DecomposeResponse {
  decomposition: string[]
  feedback: string
  whyHard: string
}

export interface EasyKoreanResponse {
  easyKorean: string[]
  feedback: string
}

export interface EnglishResponse {
  english: {
    safe: string
    natural: string
    refined: string
  }
  feedback: string
}

export interface PatternResponse {
  patterns: {
    template: string
    category: string
    tags: string[]
    exampleOriginal: string
    exampleEnglish: string
  }[]
}

export type ChatStep = 'decompose' | 'easy-korean' | 'english' | 'pattern'
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions for all data models"
```

---

### Task 3: Data Layer (LocalStorage implementation)

**Files:**
- Create: `src/store/dataStore.ts`
- Create: `src/store/localStorage.ts`

- [ ] **Step 1: Create DataStore interface**

```typescript
// src/store/dataStore.ts
import type { Scenario, LearningRecord, Pattern } from '../types'

export interface DataStore {
  getScenarios(): Promise<Scenario[]>
  getScenario(id: string): Promise<Scenario | null>
  getUnlearnedScenarios(limit: number): Promise<Scenario[]>
  saveScenarios(scenarios: Scenario[]): Promise<void>
  saveLearningRecord(record: LearningRecord): Promise<void>
  getLearningRecords(): Promise<LearningRecord[]>
  deleteLearningRecord(id: string): Promise<void>
  savePattern(pattern: Pattern): Promise<void>
  getPatterns(): Promise<Pattern[]>
  deletePattern(id: string): Promise<void>
}

export type { DataStore as default }
```

- [ ] **Step 2: Implement LocalStorage adapter**

```typescript
// src/store/localStorage.ts
import type { DataStore } from './dataStore'
import type { Scenario, LearningRecord, Pattern } from '../types'

const KEYS = {
  scenarios: 'eng-ception:scenarios',
  records: 'eng-ception:records',
  patterns: 'eng-ception:patterns',
} as const

const MAX_RECORDS = 100

function getItem<T>(key: string): T[] {
  const raw = localStorage.getItem(key)
  return raw ? JSON.parse(raw) : []
}

function setItem<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data))
}

export const localStorageAdapter: DataStore = {
  async getScenarios() {
    return getItem<Scenario>(KEYS.scenarios)
  },

  async getScenario(id) {
    const all = getItem<Scenario>(KEYS.scenarios)
    return all.find((s) => s.id === id) ?? null
  },

  async getUnlearnedScenarios(limit) {
    const scenarios = getItem<Scenario>(KEYS.scenarios)
    const records = getItem<LearningRecord>(KEYS.records)
    const learnedIds = new Set(records.map((r) => r.scenarioId))
    return scenarios.filter((s) => !learnedIds.has(s.id)).slice(0, limit)
  },

  async saveScenarios(scenarios) {
    const existing = getItem<Scenario>(KEYS.scenarios)
    const existingIds = new Set(existing.map((s) => s.id))
    const newOnes = scenarios.filter((s) => !existingIds.has(s.id))
    setItem(KEYS.scenarios, [...existing, ...newOnes])
  },

  async saveLearningRecord(record) {
    const records = getItem<LearningRecord>(KEYS.records)
    records.push(record)
    // Auto-prune: keep latest MAX_RECORDS
    if (records.length > MAX_RECORDS) {
      records.splice(0, records.length - MAX_RECORDS)
    }
    setItem(KEYS.records, records)
  },

  async getLearningRecords() {
    return getItem<LearningRecord>(KEYS.records)
  },

  async deleteLearningRecord(id) {
    const records = getItem<LearningRecord>(KEYS.records)
    setItem(KEYS.records, records.filter((r) => r.id !== id))
  },

  async savePattern(pattern) {
    const patterns = getItem<Pattern>(KEYS.patterns)
    patterns.push(pattern)
    setItem(KEYS.patterns, patterns)
  },

  async getPatterns() {
    return getItem<Pattern>(KEYS.patterns)
  },

  async deletePattern(id) {
    const patterns = getItem<Pattern>(KEYS.patterns)
    setItem(KEYS.patterns, patterns.filter((p) => p.id !== id))
  },
}
```

- [ ] **Step 3: Commit**

```bash
git add src/store/dataStore.ts src/store/localStorage.ts
git commit -m "feat: add DataStore interface and LocalStorage adapter"
```

---

### Task 4: Claude API service & prompts

**Files:**
- Create: `src/services/prompts.ts`
- Create: `src/services/claude.ts`

- [ ] **Step 1: Create prompt templates**

```typescript
// src/services/prompts.ts
export const SYSTEM_PROMPTS = {
  decompose: `당신은 한국어 사고를 영어 발화 가능한 구조로 바꾸는 훈련을 돕는 코치입니다.
사용자가 한국어 원문과 자신의 의미 분해 시도를 제출합니다.

1. 원문을 영어로 말하기 쉬운 2~3개의 뜻 단위로 분해하세요.
2. 사용자의 시도와 비교하여 구체적 피드백을 주세요.
   - 잘한 점은 무엇인지
   - 개선할 점은 무엇인지
   - 왜 이렇게 나누는 것이 영어로 말하기에 유리한지
3. 이 문장이 영어로 바로 옮기기 어려운 이유를 간단히 설명하세요.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트를 포함하지 마세요:
{"decomposition": ["뜻 단위 1", "뜻 단위 2"], "feedback": "피드백", "whyHard": "이유"}`,

  easyKorean: `당신은 한국어 사고를 영어 발화 가능한 구조로 바꾸는 훈련을 돕는 코치입니다.
사용자가 의미 분해된 뜻 단위를 영어 친화적인 쉬운 한국어로 바꾸려 합니다.

1. 각 뜻 단위를 영어로 직접 옮기기 쉬운 쉬운 한국어로 재구성하세요.
2. 사용자의 시도와 비교하여 피드백을 주세요.
   - 어떤 부분이 영어로 옮기기 쉬워졌는지
   - 아직 영어로 옮기기 어려운 표현이 남아있는지

반드시 아래 JSON 형식으로만 응답하세요:
{"easyKorean": ["쉬운 한국어 1", "쉬운 한국어 2"], "feedback": "피드백"}`,

  english: `당신은 한국어 사고를 영어 발화 가능한 구조로 바꾸는 훈련을 돕는 코치입니다.
사용자가 쉬운 한국어를 보고 영어로 시도했습니다.

1. 3단계 영어를 제시하세요:
   - safe: 가장 짧고 안전한 영어 (초급자도 말할 수 있는 수준)
   - natural: 자연스러운 영어 (일상 대화 수준)
   - refined: 더 정교한 영어 (뉘앙스와 톤까지 고려)
2. 사용자의 영어 시도에 대해 피드백하세요:
   - 문법적으로 맞는지
   - 의미가 잘 전달되는지
   - 더 자연스럽게 바꿀 수 있는 부분

반드시 아래 JSON 형식으로만 응답하세요:
{"english": {"safe": "...", "natural": "...", "refined": "..."}, "feedback": "피드백"}`,

  pattern: `당신은 한국어 사고를 영어 발화 가능한 구조로 바꾸는 훈련을 돕는 코치입니다.
이 학습 세션에서 나온 영어 표현들을 분석하여 재사용 가능한 말하기 패턴을 추출하세요.

1. 다른 상황에서도 재사용할 수 있는 패턴 1~2개를 추출하세요.
2. 패턴의 구조를 A, B 등의 변수로 일반화하세요.
3. 한국어 원문 예시와 영어 활용 예시를 각각 제시하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{"patterns": [{"template": "패턴", "category": "카테고리", "tags": ["태그"], "exampleOriginal": "한국어 예시", "exampleEnglish": "영어 예시"}]}`,
} as const

export function buildUserMessage(
  step: string,
  data: Record<string, unknown>,
): string {
  switch (step) {
    case 'decompose':
      return `원문: "${data.original}"
사용자의 의미 분해 시도: ${JSON.stringify(data.userDecomposition)}`

    case 'easy-korean':
      return `원문: "${data.original}"
AI 의미 분해: ${JSON.stringify(data.aiDecomposition)}
사용자의 쉬운 한국어 시도: ${JSON.stringify(data.userEasyKorean)}`

    case 'english':
      return `원문: "${data.original}"
쉬운 한국어: ${JSON.stringify(data.aiEasyKorean)}
사용자의 영어 시도: "${data.userEnglish}"`

    case 'pattern':
      return `원문: "${data.original}"
단계별 영어:
- safe: "${(data.aiEnglishLayers as Record<string, string>).safe}"
- natural: "${(data.aiEnglishLayers as Record<string, string>).natural}"
- refined: "${(data.aiEnglishLayers as Record<string, string>).refined}"`

    default:
      throw new Error(`Unknown step: ${step}`)
  }
}
```

- [ ] **Step 2: Create Claude API service**

```typescript
// src/services/claude.ts
import type {
  ChatStep,
  DecomposeResponse,
  EasyKoreanResponse,
  EnglishResponse,
  PatternResponse,
} from '../types'
import { SYSTEM_PROMPTS, buildUserMessage } from './prompts'

const API_URL = '/api/chat'
const MAX_RETRIES = 1

type StepResponseMap = {
  decompose: DecomposeResponse
  'easy-korean': EasyKoreanResponse
  english: EnglishResponse
  pattern: PatternResponse
}

export async function callClaude<T extends ChatStep>(
  step: T,
  data: Record<string, unknown>,
): Promise<StepResponseMap[T]> {
  const systemPrompt = SYSTEM_PROMPTS[step === 'easy-korean' ? 'easyKorean' : step]
  const userMessage = buildUserMessage(step, data)

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, systemPrompt, userMessage }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const json = await response.json()
      return json as StepResponseMap[T]
    } catch (error) {
      lastError = error as Error
      if (attempt < MAX_RETRIES) continue
    }
  }

  throw lastError ?? new Error('Unknown error')
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/prompts.ts src/services/claude.ts
git commit -m "feat: add Claude API service with prompt templates and retry logic"
```

---

### Task 5: Zustand learning store

**Files:**
- Create: `src/store/learningStore.ts`

- [ ] **Step 1: Create the learning session store**

```typescript
// src/store/learningStore.ts
import { create } from 'zustand'
import type {
  LearningStep,
  Scenario,
  DecomposeResponse,
  EasyKoreanResponse,
  EnglishResponse,
  PatternResponse,
  LearningRecord,
  Pattern,
} from '../types'
import { localStorageAdapter as db } from './localStorage'
import { callClaude } from '../services/claude'

interface LearningState {
  // Session state
  currentStep: LearningStep
  scenario: Scenario | null
  originalKorean: string
  isCustomInput: boolean
  isLoading: boolean
  error: string | null

  // User attempts
  userDecomposition: string[]
  userEasyKorean: string[]
  userEnglish: string

  // AI responses
  aiDecompose: DecomposeResponse | null
  aiEasyKorean: EasyKoreanResponse | null
  aiEnglish: EnglishResponse | null
  aiPattern: PatternResponse | null

  // Actions
  startScenario: (scenario: Scenario) => void
  startCustom: (korean: string) => void
  submitDecomposition: (parts: string[]) => Promise<void>
  submitEasyKorean: (parts: string[]) => Promise<void>
  submitEnglish: (text: string) => Promise<void>
  extractPatterns: () => Promise<void>
  savePattern: (index: number) => Promise<void>
  saveRecord: () => Promise<void>
  reset: () => void
  goToNextStep: () => void
}

const initialState = {
  currentStep: 'original' as LearningStep,
  scenario: null as Scenario | null,
  originalKorean: '',
  isCustomInput: false,
  isLoading: false,
  error: null as string | null,
  userDecomposition: [] as string[],
  userEasyKorean: [] as string[],
  userEnglish: '',
  aiDecompose: null as DecomposeResponse | null,
  aiEasyKorean: null as EasyKoreanResponse | null,
  aiEnglish: null as EnglishResponse | null,
  aiPattern: null as PatternResponse | null,
}

export const useLearningStore = create<LearningState>((set, get) => ({
  ...initialState,

  startScenario(scenario) {
    set({
      ...initialState,
      scenario,
      originalKorean: scenario.originalKorean,
      currentStep: 'decompose',
    })
  },

  startCustom(korean) {
    set({
      ...initialState,
      isCustomInput: true,
      originalKorean: korean,
      currentStep: 'decompose',
    })
  },

  async submitDecomposition(parts) {
    set({ userDecomposition: parts, isLoading: true, error: null })
    try {
      const result = await callClaude('decompose', {
        original: get().originalKorean,
        userDecomposition: parts,
      })
      set({ aiDecompose: result, isLoading: false, currentStep: 'ai-decompose' })
    } catch {
      set({ error: '잠시 후 다시 시도해주세요.', isLoading: false })
    }
  },

  async submitEasyKorean(parts) {
    set({ userEasyKorean: parts, isLoading: true, error: null })
    try {
      const result = await callClaude('easy-korean', {
        original: get().originalKorean,
        aiDecomposition: get().aiDecompose!.decomposition,
        userEasyKorean: parts,
      })
      set({ aiEasyKorean: result, isLoading: false, currentStep: 'ai-easy-korean' })
    } catch {
      set({ error: '잠시 후 다시 시도해주세요.', isLoading: false })
    }
  },

  async submitEnglish(text) {
    set({ userEnglish: text, isLoading: true, error: null })
    try {
      const result = await callClaude('english', {
        original: get().originalKorean,
        aiEasyKorean: get().aiEasyKorean!.easyKorean,
        userEnglish: text,
      })
      set({ aiEnglish: result, isLoading: false, currentStep: 'ai-english' })
    } catch {
      set({ error: '잠시 후 다시 시도해주세요.', isLoading: false })
    }
  },

  async extractPatterns() {
    set({ isLoading: true, error: null })
    try {
      const result = await callClaude('pattern', {
        original: get().originalKorean,
        aiEnglishLayers: get().aiEnglish!.english,
      })
      set({ aiPattern: result, isLoading: false, currentStep: 'pattern' })
    } catch {
      set({ error: '잠시 후 다시 시도해주세요.', isLoading: false })
    }
  },

  async savePattern(index) {
    const state = get()
    const p = state.aiPattern!.patterns[index]
    const pattern: Pattern = {
      id: crypto.randomUUID(),
      template: p.template,
      category: p.category,
      tags: p.tags,
      exampleOriginal: p.exampleOriginal,
      exampleEnglish: p.exampleEnglish,
      savedAt: new Date().toISOString(),
      reviewCount: 0,
      lastReviewedAt: null,
    }
    await db.savePattern(pattern)
  },

  async saveRecord() {
    const state = get()
    const record: LearningRecord = {
      id: crypto.randomUUID(),
      scenarioId: state.scenario?.id ?? null,
      originalKorean: state.originalKorean,
      userDecomposition: state.userDecomposition,
      userEasyKorean: state.userEasyKorean,
      userEnglish: state.userEnglish,
      aiDecomposition: state.aiDecompose?.decomposition ?? [],
      aiEasyKorean: state.aiEasyKorean?.easyKorean ?? [],
      aiEnglishLayers: state.aiEnglish?.english ?? { safe: '', natural: '', refined: '' },
      decompositionFeedback: state.aiDecompose?.feedback ?? '',
      easyKoreanFeedback: state.aiEasyKorean?.feedback ?? '',
      englishFeedback: state.aiEnglish?.feedback ?? '',
      whyHardToTranslate: state.aiDecompose?.whyHard ?? '',
      extractedPatterns: (state.aiPattern?.patterns ?? []).map((p) => ({
        id: crypto.randomUUID(),
        template: p.template,
        category: p.category,
        tags: p.tags,
        exampleOriginal: p.exampleOriginal,
        exampleEnglish: p.exampleEnglish,
        savedAt: new Date().toISOString(),
        reviewCount: 0,
        lastReviewedAt: null,
      })),
      completedAt: new Date().toISOString(),
      stepsCompleted: 8,
    }
    await db.saveLearningRecord(record)
  },

  reset() {
    set(initialState)
  },

  goToNextStep() {
    const stepOrder: LearningStep[] = [
      'original', 'decompose', 'ai-decompose',
      'easy-korean', 'ai-easy-korean',
      'english', 'ai-english', 'pattern',
    ]
    const current = get().currentStep
    const idx = stepOrder.indexOf(current)
    if (idx < stepOrder.length - 1) {
      set({ currentStep: stepOrder[idx + 1] })
    }
  },
}))
```

- [ ] **Step 2: Commit**

```bash
git add src/store/learningStore.ts
git commit -m "feat: add Zustand learning session store with all actions"
```

---

### Task 6: Vercel Edge Function (API proxy)

**Files:**
- Create: `api/chat.ts`

- [ ] **Step 1: Create the API proxy**

```typescript
// api/chat.ts
export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { systemPrompt, userMessage } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(JSON.stringify({ error: errorText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const text = data.content[0].text

    // Parse JSON from Claude's response
    const parsed = JSON.parse(text)
    return new Response(JSON.stringify(parsed), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
```

- [ ] **Step 2: Create .env.local template**

```bash
echo "ANTHROPIC_API_KEY=your-key-here" > .env.local.example
```

- [ ] **Step 3: Commit**

```bash
git add api/chat.ts .env.local.example
git commit -m "feat: add Vercel Edge Function for Claude API proxy"
```

---

## Chunk 2: UI Components — Common & Home

### Task 7: Router setup and common components

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/common/Navigation.tsx`
- Create: `src/components/common/StepIndicator.tsx`
- Create: `src/components/common/FeedbackCard.tsx`

- [ ] **Step 1: Set up React Router in App.tsx**

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navigation from './components/common/Navigation'
import Home from './pages/Home'
import Learn from './pages/Learn'
import Patterns from './pages/Patterns'
import Review from './pages/Review'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 pb-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/learn/:id" element={<Learn />} />
          <Route path="/learn/custom" element={<Learn />} />
          <Route path="/patterns" element={<Patterns />} />
          <Route path="/review" element={<Review />} />
        </Routes>
        <Navigation />
      </div>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Create Navigation component**

```typescript
// src/components/common/Navigation.tsx
import { NavLink } from 'react-router-dom'

export default function Navigation() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-1 text-xs ${isActive ? 'text-sky-600 font-bold' : 'text-gray-400'}`

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-around max-w-lg mx-auto">
      <NavLink to="/" className={linkClass} end>
        <span className="text-lg">🏠</span>
        <span>홈</span>
      </NavLink>
      <NavLink to="/patterns" className={linkClass}>
        <span className="text-lg">📚</span>
        <span>패턴</span>
      </NavLink>
      <NavLink to="/review" className={linkClass}>
        <span className="text-lg">🔄</span>
        <span>복습</span>
      </NavLink>
    </nav>
  )
}
```

- [ ] **Step 3: Create StepIndicator component**

```typescript
// src/components/common/StepIndicator.tsx
import type { LearningStep } from '../../types'

const STEPS: { key: LearningStep; label: string }[] = [
  { key: 'decompose', label: '쪼개기' },
  { key: 'ai-decompose', label: 'AI 분해' },
  { key: 'easy-korean', label: '쉬운 한국어' },
  { key: 'ai-easy-korean', label: 'AI 한국어' },
  { key: 'english', label: '영어 시도' },
  { key: 'ai-english', label: 'AI 영어' },
  { key: 'pattern', label: '패턴' },
]

export default function StepIndicator({ current }: { current: LearningStep }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current)

  return (
    <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1 shrink-0">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${i < currentIdx ? 'bg-sky-500 text-white' : i === currentIdx ? 'bg-sky-600 text-white ring-2 ring-sky-300' : 'bg-gray-200 text-gray-400'}`}
          >
            {i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-3 h-0.5 ${i < currentIdx ? 'bg-sky-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create FeedbackCard component**

```typescript
// src/components/common/FeedbackCard.tsx
interface FeedbackCardProps {
  title: string
  items: { label: string; content: string | string[] }[]
}

export default function FeedbackCard({ title, items }: FeedbackCardProps) {
  return (
    <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-3">
      <h3 className="font-bold text-sky-800">{title}</h3>
      {items.map((item, i) => (
        <div key={i}>
          <p className="text-xs font-semibold text-sky-600 mb-1">{item.label}</p>
          {Array.isArray(item.content) ? (
            <ul className="space-y-1">
              {item.content.map((c, j) => (
                <li key={j} className="text-sm text-gray-700 bg-white rounded-lg px-3 py-2">
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-700">{item.content}</p>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create placeholder pages**

```typescript
// src/pages/Home.tsx
export default function Home() {
  return <div className="p-4"><h1 className="text-xl font-bold">Eng-ception</h1></div>
}

// src/pages/Learn.tsx
export default function Learn() {
  return <div className="p-4"><h1>학습</h1></div>
}

// src/pages/Patterns.tsx
export default function Patterns() {
  return <div className="p-4"><h1>패턴 라이브러리</h1></div>
}

// src/pages/Review.tsx
export default function Review() {
  return <div className="p-4"><h1>복습</h1></div>
}
```

- [ ] **Step 6: Verify app renders with routing**

```bash
npm run dev
```

Expected: App renders with bottom navigation, each tab navigates correctly.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: add router, navigation, step indicator, feedback card, and page placeholders"
```

---

### Task 8: Home page with scenario cards

**Files:**
- Modify: `src/pages/Home.tsx`
- Create: `src/components/home/ScenarioCard.tsx`
- Create: `src/components/home/RecentLearning.tsx`
- Create: `src/data/seed-scenarios.ts`

- [ ] **Step 1: Create seed scenario data (10 initial scenarios for dev)**

```typescript
// src/data/seed-scenarios.ts
import type { Scenario } from '../types'

export const seedScenarios: Scenario[] = [
  {
    id: 's1',
    situation: '연인과 사소한 일로 다툰 뒤. 상대의 말에 상처받았지만, 또 싸우고 싶지는 않다.',
    originalKorean: '네가 틀렸다고 말하려는 건 아닌데, 그 말은 좀 서운했어.',
    purpose: '상대를 공격하지 않으면서 내 감정을 전달하기',
    emotionalTone: '서운하지만 차분한',
    difficulty: 'intermediate',
    category: '감정/관계',
    isDaily: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's2',
    situation: '팀 회의에서 동료가 빠듯한 일정을 제안했다. 불가능하다고 직접 말하긴 어렵지만, 현실적으로 무리라는 점을 전달하고 싶다.',
    originalKorean: '불가능하다는 뜻은 아니고, 지금 일정에선 조금 무리인 것 같습니다.',
    purpose: '완곡하게 반대 의사를 전달하기',
    emotionalTone: '조심스럽지만 명확한',
    difficulty: 'intermediate',
    category: '의견/생각',
    isDaily: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's3',
    situation: '친구에게 최근 본 영화를 이야기하고 있다. 엄청 재밌었던 건 아닌데 이상하게 계속 생각나는 영화다.',
    originalKorean: '엄청 재밌었던 건 아닌데 이상하게 계속 기억에 남아.',
    purpose: '미묘한 인상을 정확하게 전달하기',
    emotionalTone: '담담한',
    difficulty: 'beginner',
    category: '묘사/인상',
    isDaily: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's4',
    situation: '오랜만에 만난 친구에게 근황을 말하려는데, 처음에는 별로였던 일이 나중에 꽤 괜찮아진 경험을 이야기하고 싶다.',
    originalKorean: '처음엔 별 생각 없이 시작했는데, 하다 보니까 꽤 재밌더라고.',
    purpose: '시간에 따른 변화를 자연스럽게 이야기하기',
    emotionalTone: '가벼운',
    difficulty: 'beginner',
    category: '경험/서사',
    isDaily: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's5',
    situation: '직장 상사에게 프로젝트 진행 상황을 보고하는데, 문제가 있지만 해결 가능하다는 뉘앙스를 전달하고 싶다.',
    originalKorean: '지금 좀 막혀 있긴 한데, 다음 주까지는 정리할 수 있을 것 같습니다.',
    purpose: '문제를 인정하면서도 안심시키기',
    emotionalTone: '신중한',
    difficulty: 'intermediate',
    category: '상황 대응',
    isDaily: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's6',
    situation: '친구가 고민 상담을 했는데, 섣불리 조언하기보다는 공감하면서 지지해주고 싶다.',
    originalKorean: '내가 뭐 해줄 수 있는 건 없지만, 네 마음은 충분히 이해해.',
    purpose: '공감과 위로를 표현하기',
    emotionalTone: '따뜻한',
    difficulty: 'beginner',
    category: '감정/관계',
    isDaily: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's7',
    situation: '여행 다녀온 장소를 누군가에게 설명하고 싶다. 특별한 관광지가 아니라 분위기 자체가 좋았다.',
    originalKorean: '뭐가 특별히 유명한 건 아닌데, 그냥 거기 앉아서 멍 때리기 좋았어.',
    purpose: '장소의 분위기와 느낌을 전달하기',
    emotionalTone: '여유로운',
    difficulty: 'intermediate',
    category: '묘사/인상',
    isDaily: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's8',
    situation: '회의에서 누군가의 아이디어에 다른 관점을 제시하고 싶지만, 그 사람의 기분을 상하게 하고 싶지 않다.',
    originalKorean: '그 방향도 좋은데, 혹시 다른 쪽으로도 한번 생각해 볼 수 있을까요?',
    purpose: '부드럽게 대안을 제시하기',
    emotionalTone: '조심스러운',
    difficulty: 'intermediate',
    category: '의견/생각',
    isDaily: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's9',
    situation: '약속에 늦게 왔다. 단순한 사과보다는, 기다리게 해서 미안하다는 마음을 좀 더 전달하고 싶다.',
    originalKorean: '진짜 미안, 기다리게 해서. 연락이라도 했어야 했는데.',
    purpose: '진심 어린 사과를 표현하기',
    emotionalTone: '미안한',
    difficulty: 'beginner',
    category: '상황 대응',
    isDaily: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 's10',
    situation: '예전에 살던 동네를 다시 방문했다. 많이 변해서 약간 어색하면서도 추억이 떠오른다.',
    originalKorean: '다 바뀌었는데도 이상하게 그때 느낌이 남아 있더라.',
    purpose: '시간의 흐름과 남아있는 감정을 표현하기',
    emotionalTone: '그리운',
    difficulty: 'advanced',
    category: '경험/서사',
    isDaily: true,
    createdAt: new Date().toISOString(),
  },
]
```

- [ ] **Step 2: Create ScenarioCard component**

```typescript
// src/components/home/ScenarioCard.tsx
import { useNavigate } from 'react-router-dom'
import type { Scenario } from '../../types'

const difficultyColor = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
} as const

const difficultyLabel = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
} as const

export default function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColor[scenario.difficulty]}`}>
          {difficultyLabel[scenario.difficulty]}
        </span>
        <span className="text-xs text-gray-400">{scenario.category}</span>
      </div>
      <p className="text-xs text-gray-500">{scenario.situation}</p>
      <p className="text-base font-medium text-gray-800 leading-relaxed">
        "{scenario.originalKorean}"
      </p>
      <p className="text-xs text-gray-400">목적: {scenario.purpose}</p>
      <button
        onClick={() => navigate(`/learn/${scenario.id}`)}
        className="w-full bg-sky-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-sky-600 transition"
      >
        시작하기
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create RecentLearning component**

```typescript
// src/components/home/RecentLearning.tsx
import { useEffect, useState } from 'react'
import { localStorageAdapter as db } from '../../store/localStorage'
import type { LearningRecord } from '../../types'

export default function RecentLearning() {
  const [records, setRecords] = useState<LearningRecord[]>([])

  useEffect(() => {
    db.getLearningRecords().then((r) => setRecords(r.slice(-5).reverse()))
  }, [])

  if (records.length === 0) return null

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-gray-600">최근 학습</h2>
      {records.map((r) => (
        <div key={r.id} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
          <p className="text-sm text-gray-700 truncate">"{r.originalKorean}"</p>
          <p className="text-xs text-gray-400">
            {new Date(r.completedAt).toLocaleDateString('ko-KR')}
          </p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Build the Home page**

```typescript
// src/pages/Home.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { localStorageAdapter as db } from '../store/localStorage'
import { seedScenarios } from '../data/seed-scenarios'
import type { Scenario } from '../types'
import ScenarioCard from '../components/home/ScenarioCard'
import RecentLearning from '../components/home/RecentLearning'

export default function Home() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      // Seed scenarios on first load
      const existing = await db.getScenarios()
      if (existing.length === 0) {
        await db.saveScenarios(seedScenarios)
      }
      const unlearned = await db.getUnlearnedScenarios(2)
      setScenarios(unlearned)
    }
    load()
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Eng-ception</h1>
      <p className="text-sm text-gray-500">번역하지 말고, 말할 수 있게 바꾸자.</p>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-600">오늘의 시나리오</h2>
        {scenarios.length > 0 ? (
          scenarios.map((s) => <ScenarioCard key={s.id} scenario={s} />)
        ) : (
          <p className="text-sm text-gray-400">모든 시나리오를 완료했습니다!</p>
        )}
      </div>

      <button
        onClick={() => navigate('/learn/custom')}
        className="w-full bg-white border-2 border-dashed border-gray-300 rounded-xl py-4 text-sm text-gray-500 hover:border-sky-400 hover:text-sky-500 transition"
      >
        내 문장 직접 입력하기
      </button>

      <RecentLearning />
    </div>
  )
}
```

- [ ] **Step 5: Verify home page renders with scenario cards**

```bash
npm run dev
```

Expected: Home page shows 2 scenario cards and custom input button.

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: add home page with scenario cards, seed data, and recent learning"
```

---

## Chunk 3: Learning Flow UI (Core Feature)

### Task 9: Learning page with step-based flow

**Files:**
- Modify: `src/pages/Learn.tsx`
- Create: `src/components/learning/LearningFlow.tsx`
- Create: `src/components/learning/StepOriginal.tsx`
- Create: `src/components/learning/StepDecompose.tsx`
- Create: `src/components/learning/StepAiDecompose.tsx`
- Create: `src/components/learning/StepEasyKorean.tsx`
- Create: `src/components/learning/StepAiEasyKorean.tsx`
- Create: `src/components/learning/StepEnglish.tsx`
- Create: `src/components/learning/StepAiEnglish.tsx`
- Create: `src/components/learning/StepPattern.tsx`

- [ ] **Step 1: Create StepDecompose (user attempt)**

```typescript
// src/components/learning/StepDecompose.tsx
import { useState } from 'react'
import { useLearningStore } from '../../store/learningStore'

export default function StepDecompose() {
  const { originalKorean, submitDecomposition, isLoading } = useLearningStore()
  const [parts, setParts] = useState<string[]>(['', ''])

  const addField = () => {
    if (parts.length < 4) setParts([...parts, ''])
  }

  const updatePart = (i: number, value: string) => {
    const next = [...parts]
    next[i] = value
    setParts(next)
  }

  const canSubmit = parts.filter((p) => p.trim()).length >= 2

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-1">원문</p>
        <p className="text-base font-medium text-gray-800">"{originalKorean}"</p>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          이 문장의 핵심 의미를 2~3개로 나눠보세요:
        </p>
        <div className="space-y-2">
          {parts.map((part, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 w-6">{i + 1}.</span>
              <input
                type="text"
                value={part}
                onChange={(e) => updatePart(i, e.target.value)}
                placeholder={`뜻 단위 ${i + 1}`}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
          ))}
        </div>
        {parts.length < 4 && (
          <button onClick={addField} className="text-sm text-sky-500 mt-2 hover:underline">
            + 하나 더 추가
          </button>
        )}
      </div>

      <button
        onClick={() => submitDecomposition(parts.filter((p) => p.trim()))}
        disabled={!canSubmit || isLoading}
        className="w-full bg-sky-500 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40 hover:bg-sky-600 transition"
      >
        {isLoading ? '분석 중...' : '제출하기'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create StepAiDecompose (AI feedback)**

```typescript
// src/components/learning/StepAiDecompose.tsx
import { useLearningStore } from '../../store/learningStore'
import FeedbackCard from '../common/FeedbackCard'

export default function StepAiDecompose() {
  const { aiDecompose, userDecomposition, goToNextStep } = useLearningStore()
  if (!aiDecompose) return null

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-600 mb-2">나의 시도</p>
        <ul className="space-y-1">
          {userDecomposition.map((d, i) => (
            <li key={i} className="text-sm text-gray-700">{i + 1}. {d}</li>
          ))}
        </ul>
      </div>

      <FeedbackCard
        title="AI 의미 분해"
        items={[
          { label: '분해 결과', content: aiDecompose.decomposition },
          { label: '피드백', content: aiDecompose.feedback },
          { label: '왜 이 문장이 영어로 어려운가', content: aiDecompose.whyHard },
        ]}
      />

      <button
        onClick={goToNextStep}
        className="w-full bg-sky-500 text-white rounded-lg py-3 text-sm font-medium hover:bg-sky-600 transition"
      >
        다음 단계로
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create StepEasyKorean (user attempt)**

```typescript
// src/components/learning/StepEasyKorean.tsx
import { useState } from 'react'
import { useLearningStore } from '../../store/learningStore'

export default function StepEasyKorean() {
  const { aiDecompose, submitEasyKorean, isLoading } = useLearningStore()
  const decomposition = aiDecompose?.decomposition ?? []
  const [parts, setParts] = useState<string[]>(decomposition.map(() => ''))

  const updatePart = (i: number, value: string) => {
    const next = [...parts]
    next[i] = value
    setParts(next)
  }

  const canSubmit = parts.every((p) => p.trim().length > 0)

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-2">AI 의미 분해 결과</p>
        <ul className="space-y-1">
          {decomposition.map((d, i) => (
            <li key={i} className="text-sm text-gray-700">{i + 1}. {d}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          각 항목을 영어로 옮기기 쉬운 한국어로 바꿔보세요:
        </p>
        <div className="space-y-2">
          {decomposition.map((d, i) => (
            <div key={i}>
              <p className="text-xs text-gray-400 mb-1">"{d}" →</p>
              <input
                type="text"
                value={parts[i]}
                onChange={(e) => updatePart(i, e.target.value)}
                placeholder="쉬운 한국어로..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => submitEasyKorean(parts)}
        disabled={!canSubmit || isLoading}
        className="w-full bg-sky-500 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40 hover:bg-sky-600 transition"
      >
        {isLoading ? '분석 중...' : '제출하기'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Create StepAiEasyKorean (AI feedback)**

```typescript
// src/components/learning/StepAiEasyKorean.tsx
import { useLearningStore } from '../../store/learningStore'
import FeedbackCard from '../common/FeedbackCard'

export default function StepAiEasyKorean() {
  const { aiEasyKorean, userEasyKorean, goToNextStep } = useLearningStore()
  if (!aiEasyKorean) return null

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-600 mb-2">나의 시도</p>
        <ul className="space-y-1">
          {userEasyKorean.map((d, i) => (
            <li key={i} className="text-sm text-gray-700">{i + 1}. {d}</li>
          ))}
        </ul>
      </div>

      <FeedbackCard
        title="AI 쉬운 한국어"
        items={[
          { label: '쉬운 한국어', content: aiEasyKorean.easyKorean },
          { label: '피드백', content: aiEasyKorean.feedback },
        ]}
      />

      <button
        onClick={goToNextStep}
        className="w-full bg-sky-500 text-white rounded-lg py-3 text-sm font-medium hover:bg-sky-600 transition"
      >
        다음 단계로
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Create StepEnglish (user attempt)**

```typescript
// src/components/learning/StepEnglish.tsx
import { useState } from 'react'
import { useLearningStore } from '../../store/learningStore'

export default function StepEnglish() {
  const { aiEasyKorean, submitEnglish, isLoading } = useLearningStore()
  const [text, setText] = useState('')

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-2">쉬운 한국어</p>
        <ul className="space-y-1">
          {(aiEasyKorean?.easyKorean ?? []).map((k, i) => (
            <li key={i} className="text-sm text-gray-700">{i + 1}. {k}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          위 내용을 영어로 말해보세요:
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="영어로 작성해보세요..."
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
        />
      </div>

      <button
        onClick={() => submitEnglish(text)}
        disabled={!text.trim() || isLoading}
        className="w-full bg-sky-500 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40 hover:bg-sky-600 transition"
      >
        {isLoading ? '분석 중...' : '제출하기'}
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Create StepAiEnglish (AI feedback)**

```typescript
// src/components/learning/StepAiEnglish.tsx
import { useLearningStore } from '../../store/learningStore'
import FeedbackCard from '../common/FeedbackCard'

export default function StepAiEnglish() {
  const { aiEnglish, userEnglish, extractPatterns, isLoading } = useLearningStore()
  if (!aiEnglish) return null

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-600 mb-2">나의 영어 시도</p>
        <p className="text-sm text-gray-700">{userEnglish}</p>
      </div>

      <FeedbackCard
        title="AI 단계별 영어"
        items={[
          { label: '짧고 안전한 영어', content: aiEnglish.english.safe },
          { label: '자연스러운 영어', content: aiEnglish.english.natural },
          { label: '더 정교한 영어', content: aiEnglish.english.refined },
          { label: '피드백', content: aiEnglish.feedback },
        ]}
      />

      <button
        onClick={extractPatterns}
        disabled={isLoading}
        className="w-full bg-sky-500 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40 hover:bg-sky-600 transition"
      >
        {isLoading ? '패턴 추출 중...' : '패턴 추출하기'}
      </button>
    </div>
  )
}
```

- [ ] **Step 7: Create StepPattern (pattern extraction + save)**

```typescript
// src/components/learning/StepPattern.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLearningStore } from '../../store/learningStore'

export default function StepPattern() {
  const { aiPattern, savePattern, saveRecord, reset } = useLearningStore()
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set())
  const navigate = useNavigate()

  if (!aiPattern) return null

  const handleSave = async (index: number) => {
    await savePattern(index)
    setSavedIndexes((prev) => new Set([...prev, index]))
  }

  const handleComplete = async () => {
    await saveRecord()
    reset()
    navigate('/')
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-700">추출된 패턴</h3>

      {aiPattern.patterns.map((p, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          <p className="text-base font-bold text-sky-700">{p.template}</p>
          <p className="text-xs text-gray-400">{p.category} · {p.tags.join(', ')}</p>
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-gray-500">한국어: {p.exampleOriginal}</p>
            <p className="text-xs text-gray-500">영어: {p.exampleEnglish}</p>
          </div>
          <button
            onClick={() => handleSave(i)}
            disabled={savedIndexes.has(i)}
            className={`w-full rounded-lg py-2 text-sm font-medium transition ${
              savedIndexes.has(i)
                ? 'bg-green-100 text-green-600'
                : 'bg-sky-100 text-sky-600 hover:bg-sky-200'
            }`}
          >
            {savedIndexes.has(i) ? '저장됨' : '패턴 저장하기'}
          </button>
        </div>
      ))}

      <button
        onClick={handleComplete}
        className="w-full bg-sky-500 text-white rounded-lg py-3 text-sm font-medium hover:bg-sky-600 transition"
      >
        학습 완료
      </button>
    </div>
  )
}
```

- [ ] **Step 8: Create LearningFlow orchestrator**

```typescript
// src/components/learning/LearningFlow.tsx
import { useLearningStore } from '../../store/learningStore'
import StepIndicator from '../common/StepIndicator'
import StepDecompose from './StepDecompose'
import StepAiDecompose from './StepAiDecompose'
import StepEasyKorean from './StepEasyKorean'
import StepAiEasyKorean from './StepAiEasyKorean'
import StepEnglish from './StepEnglish'
import StepAiEnglish from './StepAiEnglish'
import StepPattern from './StepPattern'

const stepComponents: Record<string, React.FC> = {
  decompose: StepDecompose,
  'ai-decompose': StepAiDecompose,
  'easy-korean': StepEasyKorean,
  'ai-easy-korean': StepAiEasyKorean,
  english: StepEnglish,
  'ai-english': StepAiEnglish,
  pattern: StepPattern,
}

export default function LearningFlow() {
  const { currentStep, error } = useLearningStore()
  const StepComponent = stepComponents[currentStep]

  if (!StepComponent) return null

  return (
    <div className="space-y-4">
      <StepIndicator current={currentStep} />
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="px-4">
        <StepComponent />
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Build Learn page**

```typescript
// src/pages/Learn.tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLearningStore } from '../store/learningStore'
import { localStorageAdapter as db } from '../store/localStorage'
import LearningFlow from '../components/learning/LearningFlow'

export default function Learn() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentStep, startScenario, startCustom, originalKorean } = useLearningStore()
  const [customInput, setCustomInput] = useState('')
  const isCustom = id === 'custom' || !id

  useEffect(() => {
    if (!isCustom && id) {
      db.getScenario(id).then((scenario) => {
        if (scenario) startScenario(scenario)
        else navigate('/')
      })
    }
  }, [id, isCustom, startScenario, navigate])

  // Custom input view
  if (isCustom && currentStep === 'original') {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <button onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-gray-600">
          ← 뒤로
        </button>
        <h1 className="text-xl font-bold text-gray-800">내 문장 입력</h1>
        <p className="text-sm text-gray-500">영어로 말하고 싶은 한국어 문장을 입력하세요.</p>
        <textarea
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="예: 그 말이 틀렸다는 건 아닌데, 지금 상황에선 좀 안 맞는 것 같아."
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
        />
        <button
          onClick={() => startCustom(customInput)}
          disabled={!customInput.trim()}
          className="w-full bg-sky-500 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40 hover:bg-sky-600 transition"
        >
          학습 시작
        </button>
      </div>
    )
  }

  if (!originalKorean && !isCustom) {
    return <div className="p-4 text-center text-gray-400">로딩 중...</div>
  }

  return (
    <div className="max-w-lg mx-auto py-6">
      <div className="px-4 mb-4">
        <button onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-gray-600">
          ← 뒤로
        </button>
      </div>
      <LearningFlow />
    </div>
  )
}
```

- [ ] **Step 10: Verify full learning flow compiles**

```bash
npm run dev
```

Expected: Navigate through home → scenario → learning steps.

- [ ] **Step 11: Commit**

```bash
git add src/
git commit -m "feat: add complete 8-step learning flow with all step components"
```

---

## Chunk 4: Patterns, Review, and Polish

### Task 10: Patterns page

**Files:**
- Modify: `src/pages/Patterns.tsx`

- [ ] **Step 1: Build Patterns page with category filter**

```typescript
// src/pages/Patterns.tsx
import { useEffect, useState } from 'react'
import { localStorageAdapter as db } from '../store/localStorage'
import type { Pattern } from '../types'

const CATEGORIES = ['전체', '감정/관계', '의견/생각', '묘사/인상', '경험/서사', '상황 대응']

export default function Patterns() {
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [activeCategory, setActiveCategory] = useState('전체')

  useEffect(() => {
    db.getPatterns().then(setPatterns)
  }, [])

  const filtered = activeCategory === '전체'
    ? patterns
    : patterns.filter((p) => p.category === activeCategory)

  const handleDelete = async (id: string) => {
    await db.deletePattern(id)
    setPatterns((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">내 패턴 라이브러리</h1>

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
              activeCategory === cat
                ? 'bg-sky-500 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          저장된 패턴이 없습니다. 학습을 완료하면 패턴이 쌓여요.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <p className="text-base font-bold text-sky-700">{p.template}</p>
              <div className="flex gap-1 flex-wrap">
                {p.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="text-xs text-gray-500">{p.exampleOriginal}</p>
                <p className="text-xs text-gray-600 font-medium">{p.exampleEnglish}</p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">
                  {new Date(p.savedAt).toLocaleDateString('ko-KR')}
                </span>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Patterns.tsx
git commit -m "feat: add patterns library page with category filter"
```

---

### Task 11: Review page

**Files:**
- Modify: `src/pages/Review.tsx`

- [ ] **Step 1: Build Review page**

```typescript
// src/pages/Review.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { localStorageAdapter as db } from '../store/localStorage'
import type { LearningRecord, Pattern } from '../types'

export default function Review() {
  const [records, setRecords] = useState<LearningRecord[]>([])
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    db.getLearningRecords().then((r) => setRecords(r.reverse()))
    db.getPatterns().then(setPatterns)
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-800">복습</h1>

      {patterns.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-gray-600">저장한 패턴</h2>
          {patterns.slice(0, 5).map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-bold text-sky-700">{p.template}</p>
              <p className="text-xs text-gray-400 mt-1">{p.category}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-gray-600">학습한 문장</h2>
        {records.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            아직 학습 기록이 없습니다.
          </p>
        ) : (
          records.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <p className="text-sm text-gray-700">"{r.originalKorean}"</p>
              <p className="text-xs text-gray-400">
                {new Date(r.completedAt).toLocaleDateString('ko-KR')}
              </p>
              <button
                onClick={() => {
                  if (r.scenarioId) navigate(`/learn/${r.scenarioId}`)
                  else navigate('/learn/custom')
                }}
                className="text-xs text-sky-500 hover:underline"
              >
                다시 풀기
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Review.tsx
git commit -m "feat: add review page with saved patterns and learning history"
```

---

### Task 12: PWA icons and final polish

**Files:**
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`

- [ ] **Step 1: Generate simple placeholder icons**

Create a simple SVG-based favicon and PNG icons. For MVP, use a simple colored square with "E" text:

```bash
# We'll use a simple approach - create a minimal SVG and convert
# For now, just create placeholder files that won't break the PWA manifest
```

Create `public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#4a9ebb"/>
  <text x="50" y="68" font-size="60" font-weight="bold" fill="white" text-anchor="middle" font-family="sans-serif">E</text>
</svg>
```

Update `index.html` to include favicon:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

- [ ] **Step 2: Build and check for errors**

```bash
npm run build
```

Expected: Clean build with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add PWA icons and finalize MVP build"
```

---

### Task 13: Local dev proxy for API

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Add dev proxy so /api/chat works locally**

For local development without Vercel, add a proxy to vite.config.ts and create a simple local dev server:

Create `dev-server.js`:
```javascript
// dev-server.js — simple Express proxy for local dev
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'

const app = express()
app.use(express.json())

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Set ANTHROPIC_API_KEY env var' })
  }

  try {
    const { systemPrompt, userMessage } = req.body
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    const text = data.content[0].text
    const parsed = JSON.parse(text)
    res.json(parsed)
  } catch (error) {
    res.status(500).json({ error: 'Failed to process' })
  }
})

app.listen(3001, () => console.log('API proxy on http://localhost:3001'))
```

Update `vite.config.ts` to add proxy:
```typescript
// Add to defineConfig:
server: {
  proxy: {
    '/api': 'http://localhost:3001',
  },
},
```

Add scripts to `package.json`:
```json
"scripts": {
  "dev": "vite",
  "dev:api": "node dev-server.js",
  "build": "tsc -b && vite build",
  "preview": "vite preview"
}
```

Install express:
```bash
npm install express
```

- [ ] **Step 2: Add .env.local with API key**

```bash
# User needs to create .env.local with their key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
```

- [ ] **Step 3: Test full flow locally**

```bash
# Terminal 1:
npm run dev

# Terminal 2:
ANTHROPIC_API_KEY=your-key npm run dev:api
```

Expected: Full learning flow works end-to-end.

- [ ] **Step 4: Commit**

```bash
git add dev-server.js vite.config.ts package.json package-lock.json
git commit -m "feat: add local dev API proxy for Claude API calls"
```

---

## Summary

| Chunk | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-6 | Project scaffolding, types, data layer, API service, store, edge function |
| 2 | 7-8 | Router, common components, home page with scenario cards |
| 3 | 9 | Complete 8-step learning flow (core feature) |
| 4 | 10-13 | Patterns page, review page, PWA polish, local dev proxy |

Total: 13 tasks, ~65 steps.
