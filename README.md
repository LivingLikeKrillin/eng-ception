# Eng-ception

### 번역하지 말고, 말할 수 있게 바꾸자.

> 한국어로 떠오른 복잡한 생각을 영어로 **실제 말할 수 있는 구조**로 바꿔주는 훈련 앱

---

## 왜 만들었는가

영어를 못해서 말을 못하는 게 아니다.
**머릿속에 떠오른 한국어가 너무 정교해서** 영어로 바로 옮기려다 말문이 막히는 거다.

기존 영어 앱들은 "정답 문장을 외워라", "많이 말해라"에 집중한다.
하지만 진짜 병목은 그 이전 단계 — **사고를 영어 친화적으로 재구성하는 능력**이다.

Eng-ception은 이 문제를 정면으로 다룬다.

---

## 핵심 아이디어

```
한국어 원문 → 의미 분해 → 쉬운 한국어 → 짧은 영어 → 자연스러운 영어
```

이 과정을 **사용자가 직접 해보고**, AI가 비교 피드백을 주는 구조.
정답을 알려주는 앱이 아니라, **말문을 여는 앱**.

---

## 작동 방식

### 8단계 인터랙티브 학습 플로우

| 단계 | 누가 | 뭘 하는가 |
|------|------|-----------|
| 1 | 앱 | 시나리오 제시 또는 직접 입력 |
| 2 | **나** | 문장을 2~3개 뜻 단위로 쪼개본다 |
| 3 | AI | 의미 분해 제안 + 내 시도와 비교 피드백 |
| 4 | **나** | 쉬운 한국어로 바꿔본다 |
| 5 | AI | 쉬운 한국어 제안 + 비교 피드백 |
| 6 | **나** | 영어로 말해본다 |
| 7 | AI | 3단계 영어 제시 (안전한 → 자연스러운 → 정교한) + 피드백 |
| 8 | AI | 재사용 가능한 패턴 추출 |

핵심은 **내가 먼저 시도하고, AI가 비교해주는 것**.
보기만 하면 학습이 아니다.

---

## 기능

- **오늘의 시나리오** — 매일 현실적인 상황 기반 문장 제공
- **내 문장 입력** — 실제 하고 싶었던 말을 직접 훈련
- **의미 분해** — 긴 문장을 말하기 쉬운 단위로 쪼개기
- **쉬운 한국어** — 영어로 옮기기 쉬운 중간 단계 (핵심 차별점)
- **단계별 영어** — 짧고 안전한 영어부터 정교한 영어까지
- **패턴 추출** — `I'm not saying A. I just think B.` 같은 재사용 구조 축적
- **패턴 라이브러리** — 카테고리별 저장/검색
- **복습** — 이전 학습 다시 풀기

---

## 기술 스택

| | |
|---|---|
| Frontend | Vite + React + TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| LLM | Claude API (Anthropic) |
| Storage | LocalStorage (→ Supabase 전환 예정) |
| Deploy | Vercel + Edge Functions |
| PWA | vite-plugin-pwa |

---

## 시작하기

```bash
# 클론
git clone https://github.com/LivingLikeKrillin/eng-ception.git
cd eng-ception

# 설치
npm install

# API 키 설정
cp .env.local.example .env.local
# .env.local에 Anthropic API 키 입력

# 실행 (터미널 2개)
npm run dev          # 프론트엔드 (localhost:5173)
npm run dev:api      # API 프록시 (localhost:3001)
```

---

## 시나리오 예시

> **상황:** 연인과 사소한 일로 다툰 뒤. 상처받았지만 싸우고 싶지는 않다.
>
> **원문:** "네가 틀렸다고 말하려는 건 아닌데, 그 말은 좀 서운했어."
>
> **쉬운 한국어:** "네가 틀렸다는 게 아니다" + "그 말이 나를 서운하게 했다"
>
> **영어:**
> - Safe: `I'm not saying you're wrong. But that hurt a little.`
> - Natural: `I'm not trying to say you're wrong — I just felt a bit hurt by what you said.`
> - Refined: `I don't mean to say you're wrong. It's just that what you said stung a little.`
>
> **패턴:** `I'm not saying A. I just felt B.`

---

## 로드맵

- [x] 8단계 인터랙티브 학습 플로우
- [x] 시나리오 카드 시스템
- [x] 패턴 추출 및 라이브러리
- [x] PWA 지원
- [ ] Supabase 마이그레이션
- [ ] 시나리오 배치 자동 생성
- [ ] TTS / 음성 녹음
- [ ] 사고 패턴 분석 (개인화 인사이트)
- [ ] OPIc 트랙

---

## 라이선스

MIT

---

<p align="center">
  <strong>정답을 주는 앱이 아니라, 말문을 여는 앱.</strong>
</p>
