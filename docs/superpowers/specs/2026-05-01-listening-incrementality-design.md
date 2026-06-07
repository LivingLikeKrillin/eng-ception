# Eng-ception Listening Incrementality Training — Design

> **⛔ DEPRECATED / DROPPED (2026-06-07).** Listening mode is no longer part of eng-ception. Audio / listening / dictation training moves to a separate product (`engul`); curated podcasts (Hidden Brain, Radiolab) also carry copyright risk. eng-ception is now a **text-only speaking & English-thinking trainer**, shipped as a web PWA. This document is retained for history only — **do NOT implement**. The under-represented 5형식 patterns this mode was meant to surface (perception / ditransitive / causative-toV / causative-result) are instead covered in speaking via curated seed scenarios (see v9 spec §12.4). The §12 v9 amendment below is likewise obsolete.
>
> **Status**: ~~Design (pending spec review + user approval)~~ — **Dropped**
> **Date**: 2026-05-01
> **Author**: collaborative (Eisen + Claude)
> **Scope**: ~~Add a second training mode ("Mode B: Listening") to Eng-ception...~~ (dropped — see banner above)

---

## 1. Context & problem

### 1.1 The unified problem

Eng-ception and the Incrementality Trainer plan target the same root cause: **Korean L1 speakers process English through an SOV batch-processing circuit** — they wait to collect all information before processing, instead of streaming incrementally in English word order.

This manifests as two symptoms:
- **Speaking failure**: "I have to construct the full sentence in Korean first, then translate" → Eng-ception v8 addresses this
- **Listening failure**: "I have to hear the whole sentence before I understand anything" → this spec addresses this

Both are the same circuit. Training one side accelerates the other. The Incrementality Trainer plan (§1.2) states: "listening incrementality and speaking automaticity are two sides of the same circuit — training them together creates synergy."

### 1.2 Why listening training belongs in Eng-ception

The Incrementality Trainer was originally designed as a standalone desktop app (yt-dlp + local Whisper + SQLite). A strategic analysis identified a better architecture:

- **Server curates content** (audio extraction, Whisper transcription, chunk splitting, LLM quiz generation)
- **Mobile client consumes** (audio playback, stall marking, prediction quizzes, pattern harvesting)

This makes listening training a natural second mode within Eng-ception, not a separate product. The two modes share: the same user, the same pipeline model (segmentation → prediction → integration → resources), the same pattern storage, and the same diagnostic dashboard.

### 1.3 Content strategy

**Phase 1 (MVP):** Operator-curated episodes only. The operator (Eisen) selects episodes from narrative-rich podcasts (Hidden Brain, Radiolab), processes them through the server pipeline, and uploads the resulting JSON + audio clips.

Content selection criteria:
- Multi-speaker (host + interviewee + narration) — natural chunk boundaries
- Speed variation — slow explanation vs fast debate sections
- Technical vocabulary + plain language alternation — natural prediction difficulty gradient
- Narrative hooks — drives "80% understanding is fine" principle

**Phase 2:** User-submitted URLs → server processes → results returned. Popular submissions join the curated pool.

Copyright approach: Phase 1 is private use. Public release triggers switch to CC-licensed content or short-clip (10-30s) quotation model.

---

## 2. Goals and non-goals

### Goals

- Add a "Listening Training" mode accessible from Home alongside existing "Speaking Training"
- Implement a 3-phase session flow: Streaming Listen → Prediction Drill → Pattern Harvest
- Enforce streaming-first principles at the UX level: no pause button, no transcript during playback, stall marking without interruption
- Connect listening patterns to speaking training: system suggests speaking sessions based on structures encountered in listening
- Track stall data alongside existing speaking diagnostics for unified pipeline diagnosis
- Keep all non-UI layers platform-agnostic (types, store, services) for RN portability

### Non-goals (deliberately deferred)

- **Integration training (Chunking Sight Translation)**: Could be Phase 2 addition. Prediction training is the priority.
- **Shadowing mode**: Different interaction modality. Separate spec if needed.
- **On-demand URL processing**: MVP is curated-only. Server pipeline for user submissions is a separate effort.
- **Stall auto-classification**: MVP records stall timestamps. Automatic prediction/integration/segmentation classification comes after data accumulates.
- **Real-time streaming from podcast feeds**: Audio is pre-processed and served as static files.

---

## 3. Key decisions from brainstorming

| # | Decision | Rationale |
|---|---|---|
| D1 | **Session unit = 3-5 min segment**, not full episode | Matches speaking session length (~2-3 min). Mobile attention span. One episode = multiple segments for repeat visits. |
| D2 | **Audio never pauses during Phase 1.** User taps to mark stalls; playback continues. | Core UX enforcement of streaming-first principle. Pausing = batch mode = defeats the purpose. The Incrementality Trainer plan (§2.1) demands this. |
| D3 | **Prediction training is the primary interaction** in Phase 2 | Prediction is the "future direction" of incrementality. Integration and segmentation can be inferred from stall patterns but prediction is directly trainable via cloze exercises. |
| D4 | **System bridges listening → speaking**, not manual | When listening surfaces a useful pattern, system generates a Korean bridge sentence and offers to start a speaking session. The loop should feel automatic. |
| D5 | **Server pre-generates prediction quizzes** at high-value positions only | Not every chunk gets a quiz. Server marks positions where prediction training is effective (post-verb, post-preposition, clause boundaries). Client intersects these with user's actual stall points. |
| D6 | **No transcript during Phase 1, revealed only in Phase 2** | Seeing text converts streaming to batch. Text appears only after the user has already processed the audio. |

---

## 4. Listening session flow

### Overview

```
Episode Select (Home)
     ↓
Phase 1: Streaming Listen (3-5 min, no pause)
  - Continuous audio playback
  - Tap anywhere = stall mark at current timestamp
  - Stall map builds in real time
  - Session ends when segment finishes
     ↓
Phase 2: Prediction Drill (stall points only)
  - For each stall point that has a prediction quiz:
    - Play audio up to context boundary → stop
    - Show 3 choices: "What comes next?"
    - User picks → play correct continuation → feedback
  - Skip stall points without quizzes (show transcript only)
     ↓
Phase 3: Pattern Harvest
  - Show key structures from this segment
  - Each pattern has a Korean bridge sentence
  - "Start speaking training with this pattern" → launches v8 flow
     ↓
Session Complete
```

### Phase 1: Streaming Listen

**Screen layout:**
- Top: episode info + segment progress (e.g., "Segment 2 of 6 · 3:42")
- Middle: waveform or simple progress bar + elapsed time
- Center: large tap zone (80% of screen) — "tap when you can't follow"
- Bottom: real-time stall map — dots appearing at tap timestamps

**Interaction:**
- Audio starts automatically on entry (no play button)
- Tap anywhere on the large zone → record `{ timestamp, segmentTime }` → brief haptic/visual feedback (dot appears on stall map) → audio continues uninterrupted
- No pause, no rewind, no transcript. If user leaves, session is abandoned
- When segment ends → transition to stall summary screen

**Stall summary screen:**
- Total stall count
- Stall map visualization (timeline with dots)
- Brief AI-generated observation (e.g., "stalls concentrated in second half — may indicate prediction breakdown at higher speed")
- CTA: "Start prediction drill" or "Listen to next segment"

### Phase 2: Prediction Drill

**Entry logic:** System takes user's stall timestamps and finds the nearest chunk that has a `prediction` quiz prepared. If a stall point has no nearby quiz, show the transcript of that chunk with a "replay" button instead.

**Per-quiz screen:**
- Audio plays from chunk start to `contextEndTime` (the prediction boundary)
- Audio stops. Question appears: "What comes next?"
- 3 choices (1 correct + 2 plausible distractors), generated by LLM at curation time
- User taps a choice
- Correct continuation audio plays
- Feedback card appears:
  - Correct/wrong indicator
  - Full transcript of the chunk
  - `stallReason`: why this chunk was hard to hear (e.g., "reduction of 'overestimate' to [ˌoʊvɚˈɛstɪmeɪt]", "clause boundary with no pause", "unexpected topic shift")
- "Replay this chunk" button (now that training is done, replay is allowed)
- "Next →" to proceed

**Completion:** After all stall points are addressed → transition to Phase 3.

### Phase 3: Pattern Harvest

**Screen layout:**
- Pattern cards extracted from this segment (1-3 patterns max)
- Each card shows:
  - English template with slot: `"The thing about ___ is that we often ___"`
  - Tags: topic area, structure type
  - Korean bridge: "~의 문제는 우리가 자주 ~한다는 거야"
- Two CTAs per pattern:
  - "Start speaking training →" — generates a v8 SessionPayload using the Korean bridge as input, launches speaking flow
  - Save to pattern library (existing Pattern storage)
- Bottom CTAs:
  - "Next segment →"
  - "Home"

---

## 5. Data model

### 5.1 Server-provided payload

```typescript
interface ListeningEpisode {
  id: string
  title: string                   // "The Paradox of Choice"
  source: string                  // "Hidden Brain"
  totalSegments: number
  thumbnailUrl?: string
}

interface ListeningSegment {
  id: string
  episodeId: string
  segmentIndex: number            // 0-based
  duration: number                // seconds
  audioUrl: string                // pre-processed audio clip URL

  chunks: ListeningChunk[]
  patterns: ListeningPattern[]
}

interface ListeningChunk {
  id: string
  startTime: number               // seconds from segment start
  endTime: number
  transcript: string              // revealed in Phase 2 only

  prediction?: PredictionQuiz     // only on high-value positions
}

interface PredictionQuiz {
  contextEndTime: number          // play audio up to here, then stop
  choices: {
    id: string
    text: string
    isCorrect: boolean
  }[]                             // exactly 3: 1 correct + 2 distractors
  stallReason: string             // LLM-generated explanation
}

interface ListeningPattern {
  template: string                // "The thing about ___ is that ___"
  tags: string[]
  koreanBridge: string            // "~의 문제는 우리가 자주 ~한다는 거야"
}
```

### 5.2 Client-side records

```typescript
interface ListeningRecord {
  id: string
  schemaVersion: 3
  segmentId: string
  episodeId: string
  stallTimestamps: number[]       // raw tap times during Phase 1
  stallCount: number
  predictionsAttempted: number
  predictionsCorrect: number
  patternsHarvested: string[]     // pattern template strings
  completedAt: string
}

// Reuses existing Pattern type for saved listening patterns
// with category = source podcast name
```

### 5.3 Listening → Speaking bridge (queue model)

Listening patterns do **not** launch speaking sessions immediately. Instead they enter a queue, and the user encounters them on a subsequent Home visit.

**Phase 3 behavior:**
1. User sees pattern card with "이 패턴으로 말하기 훈련" button
2. Tap → pattern is saved to a `speakingQueue` in localStorage with `koreanBridge` + source metadata
3. Session completes normally. No speaking flow is launched.
4. Optionally, user can tap "지금 바로 하기" to skip the queue and start v8 immediately (power-user path).

**Home behavior (next visit):**
1. If `speakingQueue` is non-empty, Home shows a queue card above the episode section:
   ```
   💬 듣기에서 발견한 패턴
   "The thing about ___ is that ___"
   듣기에서 만남 · 아직 말하기 안 함
   [풀어보기]
   ```
2. Tap → `fetchSessionPayload(koreanBridge)` → v8 LearningFlow with `startCustom(koreanBridge)`
3. On completion, queue entry is removed and `LearningRecord.sourceListeningSegmentId` links the two sessions

**Educational rationale:**
- **Spacing effect**: encountering the pattern again after a time gap improves long-term retention
- **Session burden**: listening session is already 7-8 min (Phase 1-3). Adding a full v8 flow would push past 10 min and exhaust mobile attention
- **Home vitality**: queued cards make Home feel alive — "there's something to do" on return. Drives re-engagement
- **User agency**: queue is a suggestion, not a requirement. User can ignore it and do something else

---

## 6. Navigation & Home integration

### Home screen layout (updated)

Listening is positioned as the **primary entry point**, with speaking available as both a downstream flow (from listening queue) and a direct entry point. This reflects the product thesis: listening encounters feed speaking training, but speaking stands alone too.

```
Home (updated)
├── [💬 듣기에서 발견한 패턴]     ← NEW, speaking queue cards (if non-empty)
│   └── 큐 카드: 패턴 템플릿 + "듣기에서 만남 · 아직 말하기 안 함" + [풀어보기]
├── [🎧 오늘의 에피소드]          ← NEW, listening entry
│   ├── 에피소드 카드 (가로 스크롤)
│   │   └── 각 카드: 썸네일 + 제목 + 진행도 (3/6 segments) + WPM/화자 수/토픽
│   └── "전체 보기 →"
├── [💬 바로 말하기 훈련]         ← existing quick input + scenario cards
│   ├── 빠른 입력 (커스텀 한국어)
│   └── 시나리오 카드
└── [최근 학습]                   ← updated to show both modes (🎧/💬 아이콘 구분)
```

**Information hierarchy rationale:**
1. Speaking queue first — if there's a queued pattern from listening, that's the highest-value action (spacing effect, continuity)
2. Listening episodes second — the primary new content source
3. Direct speaking third — always available, never buried
4. Recent learning last — reference, not primary action

### Route additions

```
/listen                          → Episode list
/listen/:episodeId               → Segment list for episode
/listen/:episodeId/:segmentIndex → Listening session (3 phases)
```

---

## 7. Unified diagnostic dashboard (future)

Not in MVP scope, but the data model is designed for it:

```
내 회로 진단
├── 듣기 stall 추이 (세션별 stall 횟수 감소 곡선)
├── 예측 정확도 추이 (prediction quiz 정답률)
├── 말하기 패턴 (v8 assemblyCorrect, pivotQuizCorrect 추이)
└── 연결 인사이트
    "듣기에서 만난 'concession-claim' 구조를
     말하기에서도 정확히 조립했어"
```

Both `ListeningRecord` and `LearningRecord` feed into the same view. The pipeline stage classification (prediction stall vs integration stall) is deferred — MVP just counts raw stalls.

---

## 8. Server pipeline requirements (from client perspective)

The client does NOT define how the server processes content. It only defines what it needs to receive. The server pipeline (yt-dlp, Whisper, spaCy, LLM) is a separate implementation concern.

**What the client needs:**

1. `GET /api/episodes` → `ListeningEpisode[]`
2. `GET /api/episodes/:id/segments/:index` → `ListeningSegment`
3. Audio files accessible at `segment.audioUrl` (static file hosting)

**Quality requirements for server output:**
- Chunk duration: 5-15 seconds (aligned to clause boundaries)
- Prediction quizzes: placed at 30-50% of chunks (not every chunk)
- Quiz positions: post-verb, post-preposition, clause boundary, topic shift
- Distractors: semantically plausible but grammatically/contextually wrong
- `stallReason`: 1-2 sentences, written in Korean, 반말 tone matching v8
- `koreanBridge`: natural Korean sentence a Korean speaker would actually say in that situation
- Patterns per segment: 1-3 (quality over quantity)

---

## 9. MVP scope

### In scope
- Episode list + segment selection UI
- Phase 1: streaming listen with stall marking
- Phase 2: prediction drill on stall points
- Phase 3: pattern harvest with speaking bridge
- ListeningRecord persistence (localStorage, same adapter)
- Home integration (listening section)
- 3-5 curated episodes (Hidden Brain, Radiolab), ~30 segments total

### Out of scope
- Unified diagnostic dashboard (data model ready, UI deferred)
- Integration training (Chunking Sight Translation)
- On-demand URL submission
- Stall auto-classification (prediction vs integration vs segmentation)
- Offline audio caching
- Server pipeline implementation (separate spec)

---

## 10. Tone & copy guidelines

Listening training uses the **same warm, casual coach tone (따뜻한 반말)** as v8 speaking training. The app should feel like one coach guiding two types of exercise, not two different products bolted together.

### Tone examples by phase

| Moment | Copy |
|---|---|
| Phase 1 end (stalls detected) | "후반부에서 좀 흔들렸어. 같이 봐보자" |
| Phase 1 end (zero stalls) | "stall 0회 — 집중해서 들었다면 좋은 신호야" |
| Phase 2 correct prediction | "맞았어. 이 흐름 잡히고 있네" |
| Phase 2 wrong prediction | "아쉬워. 여기서 'overestimate'가 빠르게 지나가거든" |
| Phase 3 pattern card | "이 패턴 괜찮다. 나중에 말하기로 써먹어봐" |
| Home queue card | "듣기에서 만남 · 아직 말하기 안 함" |

### Tone consistency rules
- No exclamation marks in AI feedback (v8 empathy principle)
- 반말 + 담담한 톤, not cheerful/gamified
- Diagnostic framing over score framing: "여기서 놓쳤어" not "70점"
- Same temperature as v8 empathy message ("아, 이거 진짜 답답하지")

---

## 11. Resolved questions

| # | Question | Decision | Rationale |
|---|---|---|---|
| Q1 | Stall map shows transcript snippets on tap? | **No.** No text until Phase 2. | Showing text makes the user wait for text on subsequent chunks, breaking streaming. Pure audio until drill phase. |
| Q2 | Prediction quizzes per session? | **Cap at 5.** Prioritize by proximity to stall center. | 10+ stalls in a 3-5 min segment is realistic. Drilling all of them makes Phase 2 longer than Phase 1. Five is enough to train the pattern without fatigue. |
| Q3 | Difficulty indicator before starting? | **Yes.** Show WPM / speaker count / topic on segment card. | Curated model has limited selection. Users need enough info to self-select appropriate difficulty. Reduces early abandonment. |
| Q4 | Audio format? | **MP3.** | Podcast source audio is already MP3. Speech audio doesn't benefit from AAC quality gains. Maximum browser + RN compatibility. |
| Q5 | Track zero-stall segments as positive signal? | **Yes.** Show "stall 0회 — 집중해서 들었다면 좋은 신호야" | Individual zero-stall sessions may be noise (forgot to tap). But accumulated zero-stall pattern at specific speeds/speakers becomes real progress evidence over time. |

---

## 12. Amendment v9 — 5형식 axis alignment (2026-05-08)

This amendment aligns the listening spec with the v9 speaking spec (`2026-05-08-v9-5h-axis-design.md`). The 5형식 axis (`Pattern5HId`) becomes a shared first-class field across both modes so that:

- Server-curated prediction quizzes target **5형식 trigger verbs** specifically (highest training value)
- Listening patterns carry `patternId` through to the speaking queue, preserving categorization
- Diagnostic dashboards can aggregate proficiency across both modes by `Pattern5HId`

### 12.1 Why this matters strategically

Listening mode is where users gain exposure to the **3 patterns underrepresented in their own reflective speech**: `causative-toV`, `perception`, `ditransitive`. Narrative podcasts (Hidden Brain, Radiolab) naturally produce these in abundance:

- `perception`: "I **saw him hesitate**", "We **heard her admit**"
- `ditransitive`: "Let me **tell you something**", "She **gave us a chance**"
- `causative-toV`: "What **got me to think** about this", "We **tried to get him to talk**"

Without explicit pattern tagging, these training moments would be invisible. With it, the system can:
1. Place Pause-and-Predict quizzes precisely at these verb positions (highest cognitive payoff)
2. Surface "you encountered 3 new `perception` patterns this week" in diagnostics
3. Feed the speaking queue with patterns the user has *just heard* — closing the input→output loop

### 12.2 Updated data model

```typescript
// Imported from v9 speaking spec — single source of truth
import type { Pattern5HId } from '../types/v9'

interface ListeningChunk {
  id: string
  startTime: number
  endTime: number
  transcript: string
  prediction?: PredictionQuiz
}

interface PredictionQuiz {
  contextEndTime: number
  choices: PredictionChoice[]      // exactly 3
  stallReason: string

  // NEW (v9):
  patternId: Pattern5HId           // which 5형식 pattern the quiz targets
  triggerVerb: string              // the exact verb that triggered placement ("made", "saw", etc.)
  slot: 'after-verb' | 'after-object' | 'complement'  // position within the pattern
}

interface ListeningPattern {
  template: string                 // "saw + O + V" or "I saw him hesitate"
  tags: string[]
  koreanBridge: string

  // NEW (v9):
  patternId: Pattern5HId           // which 5형식 pattern
  triggerVerb: string              // the headline verb
}

interface ListeningRecord {
  // ... existing fields ...

  // NEW (v9):
  patternCounts: Partial<Record<Pattern5HId, {
    encountered: number            // how many quizzes for this pattern in this session
    correct: number                // how many user got right
  }>>
}
```

### 12.3 Server pipeline requirement updates

The server pipeline now needs to:

1. **Identify 5형식 trigger verbs** in transcript — use the curated 17-verb list from v9 §3
2. **Place prediction quizzes preferentially** at positions where:
   - A 5형식 trigger verb just occurred
   - The next chunk completes the pattern (object + complement)
3. **Tag each quiz** with the `patternId` it trains
4. **Extract listening patterns** that fit the 7 5형식 patterns; fall back to "discourse pattern only" if no 5형식 fits
5. **Generate Korean bridges** that, when fed back into v9 speaking flow, will produce the same `patternId`

Quality bar:
- ≥60% of quizzes should target a 5형식 pattern (the other ≤40% can be other prediction types: collocation, idiom, topic shift)
- Each segment should encounter ≥2 distinct `patternId`s
- Across an episode (5-6 segments), all 7 patterns should appear at least once

### 12.4 Speaking queue handoff

When user taps "이 패턴으로 말하기 훈련" in Phase 3:

```typescript
interface SpeakingQueueEntry {
  // Existing
  koreanBridge: string
  sourceListeningSegmentId: string
  sourcePatternTemplate: string
  queuedAt: string

  // NEW (v9):
  patternId: Pattern5HId           // ensures the v9 session targets the same pattern
  triggerVerb: string              // hint for v9's Claude prompt
}
```

When the user later runs the queued speaking session, `fetchSessionPayload` includes the `patternId` as a **prompt hint**:

> "이 한국어를 처리할 때 가능하면 `causative-bare` 패턴 (`make/have/let + O + V`)을 사용한 영어로 만들어줘. 이건 사용자가 듣기에서 막 만난 패턴이라 강화하려는 거야."

This is a soft constraint — if the pattern doesn't fit, Claude falls back to whatever is most natural, and the queue entry just logs "pattern target missed" for analytics.

### 12.5 Phase 2 UX update

Prediction drill screen gets a small addition — the pattern label appears **after** the user answers:

```
┌─────────────────────────────┐
│ ✓ 맞았어                     │
│                             │
│ 🔊 "...saw him hesitate     │
│      for just a moment."    │
│                             │
│ ┌─ 이 패턴 ──────────────┐  │
│ │ 지각동사                │  │  ← NEW: pattern label
│ │ see + 목적어 + 동사원형  │  │     reinforces the pattern name
│ │ "saw him hesitate"      │  │     and shows the user this is
│ └─────────────────────────┘  │     a recognized pattern group
│                             │
│ ┌─ 안 들린 이유 ──────────┐ │
│ │ "hesitate"가 빠르고     │ │  ← existing stallReason
│ │ 짧게 발음돼서...         │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

This is a 3-line addition. Cognitively cheap, pedagogically powerful.

### 12.6 Resolved questions for v9 amendment

| # | Question | Decision | Rationale |
|---|---|---|---|
| A1 | Show patternId label on every Phase 2 quiz, or only first encounter per session? | **(a) Every quiz.** | Same pattern recurring in one session = that pattern is the segment's core. Repetition is the lesson, not noise. Label card is small (3 lines), low visual cost. |
| A2 | If a quiz position has no 5형식 trigger, still place a non-pattern quiz? | **(b) Yes, with `patternId: null`.** Server quality bar: ≥60% quizzes target 5형식, ≤40% non-pattern. | 5형식 is the biggest lever but not the only one — collocation, idiom, topic shift also produce stalls. Without non-pattern quizzes, segments with sparse 5형식 triggers have too few drill points → density drops. `patternId: null` keeps data model clean (excluded from pattern stats). |
| A3 | Pattern5HChip on Phase 3 card: prominent or subtle? | **(a) Prominent.** Same `Pattern5HChip` component as v9 speaking Step 0. | Phase 3 is the takeaway moment — "what did I gain today?". Strong pattern label drives recognition on next encounter. Queue card carries the same chip into Home → consistent visual cue across listening → speaking flow. |
