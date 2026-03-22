<div align="center">

# `Eng-ception`

**번역하지 말고, 말할 수 있게 바꾸자.**

한국어로 떠오른 복잡한 생각을 영어로 **실제 말할 수 있는 구조**로 바꿔주는 훈련 앱

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Claude](https://img.shields.io/badge/Claude_API-Anthropic-D97706?style=flat-square)](https://docs.anthropic.com)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## The Problem

영어를 못해서 말을 못하는 게 아니다.

**머릿속에 떠오른 한국어가 너무 정교해서**, 영어로 바로 옮기려다 말문이 막히는 거다.

기존 영어 앱들은 "문장 외워라", "많이 말해라"에 집중한다. 하지만 진짜 병목은 그 이전 단계다.

> **사고를 영어 친화적으로 재구성하는 능력** — 이걸 훈련하는 앱은 시장에 없다.

Eng-ception은 이 문제를 정면으로 다룬다.

---

## How It Works

```
  한국어 원문          의미 분해          쉬운 한국어         짧은 영어          자연스러운 영어
 ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
 │ 복잡하고   │ ─→ │ 핵심 의미  │ ─→ │ 영어로    │ ─→ │ 일단     │ ─→ │ 뉘앙스    │
 │ 긴 한국어  │    │ 2~3개로   │    │ 옮기기    │    │ 말할 수   │    │ 까지      │
 │ 사고      │    │ 쪼개기    │    │ 쉬운 형태  │    │ 있는 영어  │    │ 살린 영어  │
 └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                     ▲                ▲                ▲
                  내가 시도          내가 시도          내가 시도
                  AI가 비교          AI가 비교          AI가 비교
```

핵심은 **내가 먼저 시도하고, AI가 비교 피드백을 주는 것**. 보기만 하면 학습이 아니다.

---

## 8-Step Learning Flow

<table>
<tr><th>단계</th><th>누가</th><th>뭘 하는가</th></tr>
<tr><td><code>01</code></td><td>앱</td><td>시나리오 제시 또는 직접 입력</td></tr>
<tr><td><code>02</code></td><td><b>나</b></td><td>문장을 2~3개 뜻 단위로 쪼개본다</td></tr>
<tr><td><code>03</code></td><td>AI</td><td>의미 분해 제안 + 내 시도와 비교 피드백 + 왜 이 문장이 영어로 어려운지 설명</td></tr>
<tr><td><code>04</code></td><td><b>나</b></td><td>쉬운 한국어로 바꿔본다</td></tr>
<tr><td><code>05</code></td><td>AI</td><td>쉬운 한국어 제안 + 비교 피드백</td></tr>
<tr><td><code>06</code></td><td><b>나</b></td><td>영어로 말해본다</td></tr>
<tr><td><code>07</code></td><td>AI</td><td>3단계 영어 제시 — <code>Safe → Natural → Refined</code> + 피드백</td></tr>
<tr><td><code>08</code></td><td>AI</td><td>재사용 가능한 말하기 패턴 추출</td></tr>
</table>

---

## Example

<table>
<tr>
<td width="50%">

**입력**

> **상황:** 연인과 사소한 일로 다툰 뒤
>
> **원문:** "네가 틀렸다고 말하려는 건 아닌데, 그 말은 좀 서운했어."

**의미 분해**
1. 네가 틀렸다는 게 아니다
2. 그 말이 나를 서운하게 했다

</td>
<td width="50%">

**3단계 영어**

🟢 **Safe**
`I'm not saying you're wrong. But that hurt a little.`

🟡 **Natural**
`I'm not trying to say you're wrong — I just felt a bit hurt by what you said.`

🔴 **Refined**
`I don't mean to say you're wrong. It's just that what you said stung a little.`

**추출 패턴**
`I'm not saying A. I just felt B.`

</td>
</tr>
</table>

---

## Features

| | 기능 | 설명 |
|---|---|---|
| 📋 | **오늘의 시나리오** | 매일 현실적인 상황 기반 문장 제공 |
| ✏️ | **내 문장 입력** | 실제 하고 싶었던 말을 직접 훈련 |
| 🔪 | **의미 분해** | 긴 문장을 말하기 쉬운 단위로 쪼개기 |
| 🔄 | **쉬운 한국어** | 영어로 옮기기 쉬운 중간 단계 **(핵심 차별점)** |
| 📊 | **단계별 영어** | Safe → Natural → Refined 3단계 |
| 🧩 | **패턴 추출** | `I'm not saying A. I just think B.` 같은 재사용 구조 |
| 📚 | **패턴 라이브러리** | 카테고리별 저장 · 검색 · 관리 |
| 🔁 | **복습** | 저장한 문장/패턴 다시 풀기 |

---

## Tech Stack

<table>
<tr>
<td align="center" width="96"><br><img src="https://cdn.simpleicons.org/react/61DAFB" width="36" height="36"><br><sub><b>React 18</b></sub><br></td>
<td align="center" width="96"><br><img src="https://cdn.simpleicons.org/typescript/3178C6" width="36" height="36"><br><sub><b>TypeScript</b></sub><br></td>
<td align="center" width="96"><br><img src="https://cdn.simpleicons.org/vite/646CFF" width="36" height="36"><br><sub><b>Vite 6</b></sub><br></td>
<td align="center" width="96"><br><img src="https://cdn.simpleicons.org/tailwindcss/06B6D4" width="36" height="36"><br><sub><b>Tailwind 4</b></sub><br></td>
<td align="center" width="96"><br><img src="https://cdn.simpleicons.org/vercel/000000" width="36" height="36"><br><sub><b>Vercel</b></sub><br></td>
</tr>
</table>

| 레이어 | 기술 | 비고 |
|--------|------|------|
| **Frontend** | Vite + React 18 + TypeScript | SPA, PWA 지원 |
| **Styling** | Tailwind CSS v4 | `@tailwindcss/vite` 플러그인 |
| **State** | Zustand | 가벼운 전역 상태 관리 |
| **AI** | Claude API (Anthropic) | 학습 1회당 4회 호출 |
| **Storage** | LocalStorage | Data Layer 추상화 → Supabase 전환 가능 |
| **API Proxy** | Vercel Edge Functions | API 키 보호 |
| **PWA** | vite-plugin-pwa + Workbox | 오프라인 캐시, 홈 화면 설치 |

---

## Getting Started

```bash
# 1. 클론
git clone https://github.com/LivingLikeKrillin/eng-ception.git
cd eng-ception

# 2. 의존성 설치
npm install

# 3. API 키 설정
cp .env.local.example .env.local
# .env.local 파일에 Anthropic API 키 입력
# 키 발급: https://console.anthropic.com → API Keys

# 4. 실행 (터미널 2개)
npm run dev          # 프론트엔드  → http://localhost:5173
npm run dev:api      # API 프록시  → http://localhost:3001
```

---

## Project Structure

```
eng-ception/
├── api/                    # Vercel Edge Functions
│   └── chat.ts             # Claude API 프록시
├── src/
│   ├── components/
│   │   ├── common/         # Navigation, StepIndicator, FeedbackCard
│   │   ├── home/           # ScenarioCard, RecentLearning
│   │   └── learning/       # 8단계 학습 플로우 컴포넌트
│   ├── data/               # 시드 시나리오 데이터
│   ├── pages/              # Home, Learn, Patterns, Review
│   ├── services/           # Claude API 호출, 프롬프트 템플릿
│   ├── store/              # Zustand 스토어, DataStore 추상화
│   └── types/              # TypeScript 타입 정의
├── dev-server.js           # 로컬 개발용 API 프록시
└── vite.config.ts
```

---

## Roadmap

- [x] 8단계 인터랙티브 학습 플로우
- [x] 시나리오 카드 시스템 (10개 시드)
- [x] 패턴 추출 및 라이브러리
- [x] PWA 지원
- [ ] Supabase 마이그레이션
- [ ] 시나리오 배치 자동 생성 (50~100개)
- [ ] TTS + 음성 녹음 + 발화 비교
- [ ] Spaced Repetition 복습 알고리즘
- [ ] 사고 패턴 분석 (개인화 인사이트)
- [ ] OPIc 트랙

---

## Philosophy

| 기존 영어 앱 | Eng-ception |
|---|---|
| 정답 문장 제공 | **사고 재구성 훈련** |
| 단어/표현 암기 | **발화 구조 패턴 축적** |
| 번역 결과 제시 | **왜 어렵고 어떻게 쪼개는지 설명** |
| AI가 다 해줌 | **내가 먼저 시도, AI가 피드백** |

---

## License

MIT

---

<div align="center">

**정답을 주는 앱이 아니라, 말문을 여는 앱.**

*Built with Claude API + React + Vite*

</div>
