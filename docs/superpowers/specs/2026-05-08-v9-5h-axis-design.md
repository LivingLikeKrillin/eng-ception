# Eng-ception v9 — 5형식 축 (5H Axis) Design

> **Revision (2026-06-07):** Listening mode dropped (moves to the separate `engul` product; podcast copyright risk). eng-ception is **text-only speaking & English-thinking training**, shipped as a **web PWA** (RN deferred). No in-app audio/TTS. §10 and the cross-mode parts of §12 are obsolete; under-represented patterns are covered by curated scenarios (§12.4).
>
> **Status**: Design (pending review + user approval)
> **Date**: 2026-05-08
> **Author**: collaborative (Eisen + Claude)
> **Scope**: Redesign the speaking training flow with the 5형식 (English syntactic patterns) axis as a first-class dimension, replacing the v8 implementation. ~~Aligns with the parallel listening training spec (Mode B).~~ (listening dropped — see revision above)
> **Supersedes**: `2026-04-14-v8-learning-journey-port-design.md`

---

## 1. Context & problem

### 1.1 What v8 got right

The v8 seven-step journey (Empathy → Pre-check → Step 0..4) validated:
- **Scaffolded discovery beats free-form composition** — users assemble English blocks instead of typing prose
- **Single-call SessionPayload architecture** — zero-loading transitions, mock-friendly, RN-portable
- **Discourse structure labeling** ("양보 + 주장", "경험 + 반전") gives users a meta-frame for the sentence

### 1.2 What v8 missed

v8's `structureType` describes **what the sentence is doing** (rhetorical/discourse layer):
- 양보 + 주장 / 경험 + 반전 / 묘사 + 여운 / etc.

But it never directly addressed **how the sentence is built** (syntactic layer):
- 사역동사 (make/have/let + O + V)
- 지각동사 (see/hear + O + V/V-ing)
- 수여동사 (give/tell + IO + DO)
- etc.

This omission is decisive for Korean learners. **The single biggest lever for natural English expression is mastery of 5형식 syntactic patterns** — especially 사역, 지각, and 5형식 with object complement. Without explicit training on this axis, learners stay stuck in 3형식 prose ("I caused his anger") even after extensive vocabulary and discourse training.

### 1.3 Product positioning shift

v8: "한국어 사고를 영어 발화 구조로 재구성"
v9: **"한국어 사고를 자연스러운 영어 구문으로 재배치 — 5형식 표현력을 회로에 박는 훈련"**

The shift isn't cosmetic. v8 was structurally a "translate the meaning" tool. v9 is structurally a "rewire the syntactic circuit" tool. The block-assembly UI and 7-step flow survive, but their content is reorganized around 5형식 patterns.

### 1.4 Strategic context

- ~~**Sister spec** / **Cross-mode loop** (listening Mode B)~~ — **Listening dropped (2026-06-07).** Audio/listening moved to the separate `engul` product; the listening spec is deprecated. Under-represented patterns are covered by curated scenarios (§12.4); a future post-v9 SRS soft-bias adds coverage. The cross-mode loop is obsolete.
- **PR #3 (v8 implementation) is closed**. v9 starts fresh from master.

---

## 2. Goals and non-goals

### Goals

- Bake the 5형식 axis into `SessionPayload` as a first-class field with 7 internal pattern IDs and curated verbs
- Surface the 5형식 contrast explicitly in Step 0 (compare 3형식 vs 5형식 versions of the same intent)
- Use the 5형식 axis to categorize saved Patterns and shape Patterns library navigation
- Track per-pattern proficiency in `LearningRecord` for future diagnostic dashboards
- Keep the 7-step v8 flow shape (Empathy → Pre-check → Step 0..4) but reflow Step 0 and Step 2 around the syntactic comparison
- Maintain platform-agnostic TS layers (types, store, services, prompts, mocks, validate) for future reuse (web PWA is the current target; eases an RN port if ever pursued)

### Non-goals

- **Discourse structure removal**: `structureType` (양보+주장 etc.) is kept as a secondary tag. The 5형식 axis is primary, but discourse context still helps users understand *when* to use a pattern.
- **Comprehensive verb coverage**: We curate 17 verbs across 7 patterns. Edge-case verbs (deem, perceive, regard) are intentionally excluded — mastery beats coverage.
- **State change copulas (become/get/turn + Adj)**: Belongs to a separate "어휘 nuance" axis, not 5형식. Out of scope for v9.
- **Voice / phonology training**: Future scope.
- **Stall classification**: Out of scope (was a listening-mode concept — listening dropped). Speaking mode tracks `assemblyCorrect` per pattern.

---

## 3. The 5형식 axis: 7 patterns + 17 verbs

Internal taxonomy (used in `SessionPayload`, prompts, diagnostics):

| ID | 메타 라벨 (사용자 노출) | 핵심 동사 | 구조 | 예시 |
|---|---|---|---|---|
| `causative-bare` | 사역 (make/have/let) | **make, have, let** | + O + 동사원형 | "Let me know" / "Made me laugh" / "Have him call you" |
| `causative-toV` | 사역 (get + to V) | **get** | + O + to V | "Got him to apologize" |
| `causative-result` | 사역 결과 (get/have + 과거분사) | **get, have** | + O + pp | "Got it fixed" / "Have it done by Friday" |
| `perception` | 지각동사 | **see, hear, watch** | + O + V / V-ing | "Saw her cry" / "Heard him singing" |
| `want-toV` | 요청/희망 + to V | **want, ask, tell, need** | + O + to V | "Want you to come" / "Need you to listen" |
| `judgment` | 판단·명명 | **find, call** | + O + 형용사/명사 | "Find it strange" / "Call it a day" |
| `ditransitive` | 수여동사 (4형식) | **give, tell, show, send, bring** | + IO + DO | "Give me a chance" / "Bring me water" |

**Total: 7 patterns, 17 verbs (deliberately narrow).**

### 3.1 Why this taxonomy

- **Causative is split into 3 patterns** (bare / to V / result) because the surface structures differ and Korean learners conflate them. Splitting makes drilling unambiguous.
- **`get` appears in 3 patterns** with different complements (to V / pp / IO+DO). The system surfaces this multiplicity as a feature, not a bug.
- **Each pattern has ≤5 verbs.** This caps cognitive load; the user can build automaticity on a fixed core rather than vaguely "knowing" 20 verbs.
- **Korean grammar terminology is kept** (사역 / 지각 / 판단 / 수여). Reason: users need to *understand the differences between patterns* to chunk them mentally. Friendly paraphrases ("이게 자연스러운 영어") would blur the conceptual boundaries.

### 3.2 What's deliberately excluded

| Excluded pattern | Why |
|---|---|
| 1형식 자동사 (S + V) | No syntactic challenge for Korean learners. |
| 2형식 (S + V + Adj/N) | Trained implicitly via every pattern. No standalone drill needed. |
| 3형식 (S + V + O) | The "default" pattern Korean learners overuse. v9 explicitly shows when it's the wrong choice. |
| Linking verbs + Adj (become/get/turn + Adj) | Different axis (어휘 nuance), not syntactic. |
| Formal 5형식 with `to be` (believe/know + O + to be + Adj) | Rarely spoken; defer to advanced scope. |
| `seem / look / sound + Adj/like + N` | Belongs with linking verbs. Deferred. |

---

## 4. Updated SessionPayload schema

The v8 schema is rewritten. Key additions: `pattern5h` (the 5형식 axis), `comparison` (3형식 vs 5형식 contrast at Step 0), and `pattern.patternId` (links saved patterns to the taxonomy).

```typescript
export type Pattern5HId =
  | 'causative-bare'
  | 'causative-toV'
  | 'causative-result'
  | 'perception'
  | 'want-toV'
  | 'judgment'
  | 'ditransitive'

export interface Pattern5HMeta {
  id: Pattern5HId
  label: string                   // "사역 (make/have/let)"
  verbs: string[]                 // ["make", "have", "let"]
  structure: string               // "주어 + 동사 + 목적어 + 동사원형"
}

export interface SessionPayload {
  // === Existing v8 fields (kept) ===
  structureType: {
    id: string                    // discourse-level (concession-claim, etc.)
    label: string                 // "양보 + 주장"
    category: string              // "업무/논리"
  }
  empathy: {
    echo: string
    message: string
  }
  precheck: {
    question: string
    choices: PrecheckChoice[]     // exactly 2
    correctChoiceId: string
  }

  // === NEW: 5형식 axis ===
  pattern5h: Pattern5HMeta        // which 5형식 pattern this sentence trains

  // === Updated: Step 0 (구조 분석) ===
  structure: {
    parts: StructurePart[]        // korean decomposition (unchanged)
    coreStructure: string[]       // discourse beats (unchanged)
    explanation: string

    // NEW: 5형식 contrast
    comparison: {
      label: string               // "왜 5형식이 자연스러운가"
      sansPattern: {              // 3형식 시도 (어색함)
        en: string                // "I caused his anger."
        whyAwkward: string        // "한국어를 단어 단위로 번역하면 이렇게 됨. 어색해."
      }
      withPattern: {              // 5형식 자연스러운 버전
        en: string                // "I made him angry."
        whyNatural: string        // "사역동사로 사건과 결과를 한 문장에 평평하게."
      }
    }

    // Renamed from pivotQuiz to patternQuiz: tests recognition of the 5형식 trigger verb
    patternQuiz: {
      question: string            // "이 문장에서 5형식 트리거 동사는?"
      options: PatternQuizOption[]
      feedback: string
    }
  }

  // === Updated: Step 1 (블록 조립) ===
  assembly: {
    blocks: Block[]               // 3 blocks, but now aligned to 5형식 slots
    blockRoles: BlockRole[]       // NEW: which slot each block fills
    connectors: Connector[]       // unchanged
    finalSentence: string
  }

  // === Updated: Step 2 (피드백) ===
  feedback: {
    correctTitle: string
    correctSub: string
    wrongTitle: string
    wrongSub: string
    explanation: string
    wordOrder: WordOrder          // unchanged

    // NEW: 5형식 자동성 노트
    patternNote: string           // "이 문장에서 핵심은 'made + 목적어 + 형용사'. 다음에 비슷한 상황이면 이 틀을 떠올려."
  }

  // === Updated: Step 3 (패턴 저장) ===
  pattern: {
    template: string              // "make + O + Adj" or "I made him ~"
    patternId: Pattern5HId        // NEW: links to taxonomy
    tags: string[]                // discourse tags ("회의 반대", "감정 표현")
  }
}

// Patterns aligned to the 5형식 slot they fill
export type BlockRole =
  | 'subject'     // I, She, They
  | 'verb'        // made, let, got
  | 'object'      // him, it, you
  | 'complement'  // angry, laugh, fixed, to come

export interface Block {
  id: string                      // 'b1' | 'b2' | 'b3'
  en: string
  order: number                   // 1 | 2 | 3
}

export interface PatternQuizOption {
  id: string
  text: string                    // verb option (e.g., "made", "caused", "did")
  hint: string
  isCorrect: boolean
}

// (other types unchanged: PrecheckChoice, StructurePart, Connector, WordOrder, WordOrderToken)
```

### 4.1 Migration impact

- `pattern5h` is **required** — every session targets exactly one 5형식 pattern
- `pivotQuiz` is renamed to `patternQuiz` — content shifts from "전환점은?" to "5형식 동사는?"
- `structure.comparison` is **new and core** — Step 0's punchline
- `feedback.patternNote` is **new** — Step 2's takeaway sentence
- `pattern.patternId` is **new** — required for Patterns page filtering

---

## 5. Updated learning flow

The 7-step shape survives. Content reflows around the 5형식 axis at Step 0, Step 1, and Step 2.

### Step 0 (구조 분석) — Major changes

Old (v8):
1. Show original Korean
2. Show structureType chip ("양보 + 주장")
3. Show Korean decomposition (role-colored)
4. Show coreStructure ("인정 → 전환 → 걱정")
5. Pivot quiz ("이 문장의 전환점은?")

New (v9):
1. Show original Korean
2. Show **두 칩 나란히**: structureType ("양보 + 주장") AND pattern5h ("사역 (make/have/let)")
3. Show Korean decomposition (role-colored) — unchanged
4. **NEW: Comparison card** — 3형식 시도(어색) vs 5형식 자연 버전, 나란히
5. **Pattern quiz** ("이 문장에서 5형식 트리거 동사는?") — replaces pivot quiz

Comparison card mockup:

```
┌─ 왜 5형식이 자연스러운가 ────────────────────┐
│                                              │
│  3형식 시도          → I caused his anger.   │  ← text-warn 배경
│  한국어를 단어 단위로 번역하면 이렇게 됨.     │
│  사건과 결과가 분리돼서 어색해.               │
│                                              │
│  ─────────────                               │
│                                              │
│  5형식 자연          → I made him angry.    │  ← text-ok 배경
│  사역동사 'make'로 사건과 결과를 한 문장에   │
│  평평하게. 영어가 좋아하는 구조.              │
│                                              │
└──────────────────────────────────────────────┘
```

### Step 1 (블록 조립) — Minor refinement

- 블록 3개 구조는 유지하되, 각 블록에 `blockRole` 태그 (subject/verb/object/complement)
- 사용자가 블록을 탭하면 라벨이 같이 표시됨: `[목적격보어] angry`
- 사용자가 5형식 슬롯을 의식하면서 조립하게 됨

### Step 2 (피드백) — Add patternNote

- 기존 정답/오답 배너, 어순 비교, explanation은 유지
- **NEW:** 마지막에 `patternNote` 카드 추가:
  > "이 문장에서 핵심은 `make + O + Adj`. 다음에 '~가 ~하게 만들었다' 의미가 떠오르면 이 틀을 먼저 꺼내."

### Step 3 (패턴 저장) — Categorization update

- 저장된 Pattern은 `patternId`로 분류됨
- Patterns 페이지가 7개 카테고리로 자동 그룹핑

### Empathy, Pre-check, Step 4 — Unchanged

이 세 화면은 v8 그대로 유지.

---

## 6. Prompt strategy

System prompt instructs Claude to:

1. Identify the most natural 5형식 pattern for the input Korean (one of the 7 IDs)
2. Verify the pattern uses one of the curated verbs (no "deem", no "perceive")
3. Generate the awkward 3형식 version for contrast (this is intentional — shows the user *why* 5형식 wins)
4. Build assembly blocks aligned to subject/verb/object/complement slots
5. Write the patternNote in 반말 tone, ≤80 chars

If no 5형식 pattern fits naturally, the prompt instructs Claude to **fall back** to the most appropriate of the 7 (typically `judgment` or `ditransitive`) rather than fabricate a forced 5형식 sentence.

---

## 7. Mock fixture strategy

For mock mode (`VITE_USE_MOCK=true`), we ship **3 fixtures** covering different patterns:

1. **`causative-bare`** — "그가 화내게 만들었어" → "I made him angry."
2. **`perception`** — "그녀가 우는 걸 봤어" → "I saw her cry."
3. **`ditransitive`** — "그 사실을 알려줘" → "Tell me the truth."

Rotation: client picks fixture based on `originalKorean` length hash modulo 3. Same input always returns same fixture (deterministic for testing).

---

## 8. Patterns library updates

`/patterns` page restructure:

```
내 구조 패턴
└── 5형식 패턴 (Primary navigation)
    ├── 사역 (make/have/let)         [12]
    ├── 사역 (get + to V)             [3]
    ├── 사역 결과 (get/have + pp)     [5]
    ├── 지각동사                       [8]
    ├── 요청/희망 + to V               [15]
    ├── 판단·명명                       [4]
    └── 수여동사 (4형식)               [9]
└── 담화 유형 (Secondary navigation)
    ├── 업무/논리                      [22]
    ├── 감정/관계                      [18]
    └── ...
```

Primary navigation is 5형식 — this is the user's mental model of "what kind of English they can now produce". Discourse type is secondary because it's about *when to use*, not *what to build*.

---

## 9. Diagnostic data model

`LearningRecord` adds two fields for future diagnostics:

```typescript
export interface LearningRecord {
  // ... existing v8 fields ...
  pattern5hId: Pattern5HId        // NEW: which 5형식 pattern this session trained
  patternQuizCorrect: boolean     // NEW: did user identify the trigger verb?
}
```

Future "내 회로 진단" view can show per-pattern progress:

```
사역 (make/have/let)    ████████░░  80% (12/15)
사역 (get + to V)       ███░░░░░░░  30% (3/10)
지각동사                █████░░░░░  50% (5/10)
...
```

This becomes the speaking diagnostic ("내 회로 진단"), per pattern. (Originally framed as cross-mode with listening — listening dropped 2026-06-07, so it is speaking-only.)

---

## 10. Listening spec alignment — OBSOLETE (listening dropped 2026-06-07)

Listening mode has been dropped from eng-ception (audio/listening moves to the separate `engul` product; podcasts also carry copyright risk). `Pattern5HId` is now **owned and used by speaking only**. The former alignment items (`PredictionQuiz.patternId`, `ListeningPattern.template.patternId`, the Phase 3 speaking bridge) no longer apply. The listening spec is retained for history only — see its deprecation banner.

---

## 11. Implementation order

v9 is a fresh build on master. Suggested chunk order (formalize in a plan document later):

1. **Foundation** — Types (`SessionPayload`, `Pattern5HId`, etc.), validator, mocks (3 fixtures), prompts, claude.ts
2. **State** — `learningStore` rewrite, `localStorage` schema v4 (was v3), `LearningRecord` migration
3. **UI primitives** — `OriginalCard`, `StructureTypeChip`, `Pattern5HChip` (NEW), `KoreanDecompose`, `ComparisonCard` (NEW), `WordOrderCompare`, `PatternNoteCard` (NEW)
4. **Step components** — Empathy, Precheck (unchanged), StepStructure (rewritten with comparison + patternQuiz), StepAssemble (with blockRole labels), StepFeedback (with patternNote), StepReflect, StepComplete
5. **Pages** — Home (unchanged), Patterns (5형식 navigation), Review (with patternId display)
6. **Verification** — Vitest suite (~35 tests), tsc clean, lint clean, mock smoke, real API smoke

---

## 12. Mode-specific pattern emphasis

> **Revision (2026-06-07):** Listening mode was dropped (audio/listening moves to the separate `engul` product; podcasts also carry copyright risk). eng-ception is text-only speaking & English-thinking training, shipped as a **web PWA** (RN deferred). The cross-mode (listening↔speaking) coverage mechanism below is obsolete; under-represented patterns are covered by curated scenarios (§12.4). §12.1 and §12.4 remain valid.

The 7-pattern taxonomy was originally intended to be shared between speaking and listening, but with listening dropped, **speaking owns the full taxonomy**. The natural speaking distribution still skews toward reflective patterns (§12.1), which curated scenarios (§12.4) deliberately counterbalance.

### 12.1 Speaking mode bias: reflective patterns

User-initiated speaking sessions (custom input + reflective scenarios) naturally lean toward:
- `causative-bare` (made me feel, let me know) — Korean compresses cause+effect into one clause
- `judgment` (find it strange, call it a day) — reflection on experiences
- `causative-result` (have it sorted, get it fixed) — talking about plans/outcomes
- `want-toV` (need you to listen, ask you to consider) — interpersonal requests

These 4 patterns will dominate speaking session distribution. **This is acceptable** because users come to the app to express the language they're already thinking in — and Korean reflective speech compresses naturally into these patterns.

### 12.2 Under-represented patterns: covered by curated scenarios

The 3 patterns that rarely appear in reflective self-talk — `perception` (saw him cry), `ditransitive` (tell me the truth), `causative-toV` (got him to admit) — were originally meant to surface through listening content. **Listening was dropped (2026-06-07);** these patterns are now covered entirely by **curated seed scenarios** deliberately authored for them (§12.4), so speaking-only still trains all 7 patterns.

### 12.3 Reinforcement without a cross-mode loop — OBSOLETE

The original cross-mode loop (listening surfaces a pattern → queues into speaking) is dropped along with listening mode. Speaking-only coverage now relies on (a) curated scenarios spanning all 7 patterns (§12.4), and (b) a future SRS soft-bias that hints due `(patternId, verb)` cards into Claude's session generation (post-v9; see plan "Deferred to post-v9"). There is no listening dependency.

### 12.4 Scenario seed expansion

Speaking seed scenarios are expanded from 10 → 15:
- s1~s10: original reflective scenarios (4-pattern emphasis)
- s11~s12: `ditransitive` scenarios (가벼운 부탁, 솔직한 의견)
- s13~s14: `perception` scenarios (목격, 우연한 청취)
- s15: `causative-toV` scenario (설득의 결과)

This ensures speaking sessions train all 7 patterns with no listening mode, and seeds the future SRS library with all categories represented.

---

## 13. Resolved questions

| # | Question | Decision | Rationale |
|---|---|---|---|
| Q1 | Is `pattern5h` required in every session? | **(a) Always required.** Claude must map to one of the 7 patterns. | Optional would let Claude take the easy path too often → 5형식 exposure drops. Weak matches still teach (사용자가 "이건 굳이 5형식 안 써도 되는구나" 인지). Diagnostic consistency. Tone caveat: weak matches must phrase `whyAwkward` honestly ("이건 3형식도 자연스러워. 다만 5형식으로 가면..."). |
| Q2 | Comparison card: always or conditional? | **(b) Conditional via `comparison.show: boolean`.** | Forcing 3형식-awkward content on weak matches breaks trust. When shown, impact is high ("이건 진짜 5형식이 자연스러운 경우구나"). Claude decides per session. |
| Q3 | Add "잘 모르겠어" 3rd option to patternQuiz? | **(b) Add it.** Visually de-emphasized (text-t3, small). | 2-option forces guessing → no learning. "잘 모르겠어" signals "this pattern needs more exposure", feeds diagnostic. De-emphasis prevents abuse as escape hatch. |
| Q4 | Show pattern's other verbs on Step 3? | **(a) Always show.** Main verb bold, others in text-t3. | Step 3 is the strong "what I learned" moment. Showing the pattern family (max 5 verbs) accelerates verb-pattern generalization. Low cognitive cost. |
| Q5 | Saved Pattern template: verb-agnostic or verb-specific? | **(b) Verb-specific.** ("I made him angry") | Concrete recall is what produces speech automaticity. Abstract grouping is provided by Patterns page (auto-groups by patternId). Dedup: same patternId + same triggerVerb increments save count, doesn't create duplicate card. |

---

## Appendix A. Taxonomy validation (2026-05-08)

Before finalizing the 7-pattern taxonomy, we mapped each of the existing 10 seed scenarios to their most natural English form and identified which `Pattern5HId` the result trains.

### A.1 Mapping results

| # | Scenario summary | Natural English | Pattern5H | Fit |
|---|---|---|---|---|
| s1 | 네가 틀렸다고... 그 말은 서운했어 | "What you said made me feel hurt" | `causative-bare` | 🟡 weak |
| s2 | 불가능한 건 아니고 일정이 무리 | "Timeline makes it tough" / "Find it tight" | `causative-bare` / `judgment` | 🟢 good |
| s3 | 엄청 재밌었던 건 아닌데 기억에 남아 | "I find it strange how it stuck" | `judgment` | 🟢 good |
| s4 | 처음엔 별생각 없었는데 재밌더라 | "Found it pretty fun" | `judgment` | 🟡 moderate |
| s5 | 좀 막혀 있는데 정리할 수 있어 | "I'll have it sorted" | `causative-result` | 🟢 perfect |
| s6 | 해줄 건 없지만 마음은 이해해 | "Let me know if anything" | `causative-bare` | 🟡 moderate |
| s7 | 유명한 건 아닌데 분위기 좋았어 | "It just made me feel at ease" | `causative-bare` | 🟢 good |
| s8 | 그 방향도 좋은데 다른 쪽도... | "Could I ask you to consider..." | `want-toV` | 🟡 weak |
| s9 | 진짜 미안, 기다리게 해서 | "Sorry I made you wait" | `causative-bare` | 🟢 perfect |
| s10 | 다 바뀌었는데 그때 느낌이 남아 | "It made me feel like I was back" | `causative-bare` | 🟡 moderate |

### A.2 Distribution (s1~s10 only)

| Pattern | Count | % |
|---|---|---|
| `causative-bare` | 6 | 60% |
| `judgment` | 3 | 30% |
| `causative-result` | 1 | 10% |
| `want-toV` | 1 | 10% |
| `causative-toV` | 0 | 0% |
| `perception` | 0 | 0% |
| `ditransitive` | 0 | 0% |

### A.3 Findings

1. **Taxonomy itself works**: every scenario maps to *some* pattern; the 7 patterns cover the Korean→English transformation space.
2. **`causative-bare` overrepresentation (60%) is real**, not an artifact: Korean compresses cause+effect tightly, and the natural English version compresses back via 사역동사.
3. **3 patterns had zero matches** in the original seed: `causative-toV`, `perception`, `ditransitive`. These patterns naturally appear in *transactional / observational* speech, not the *reflective* speech that the original 10 scenarios capture.
4. **Only 4/10 are 🟢 (strong fit)**. The remaining 6 are 🟡 — 5형식 is possible but not always the most natural choice. The comparison card needs to be honest about this; some sessions will show a less dramatic 3형식-vs-5형식 contrast than others.

### A.4 Decisions taken

- **Keep all 7 patterns** (validated by curated scenario coverage)
- **Add 5 new seed scenarios** (s11~s15) covering the 3 underrepresented patterns
- **Document the mode-specific emphasis** (§12) so the asymmetry is intentional, not a defect
- **Mark the comparison card content quality** (Q2 in open questions) as a key prompt engineering concern
