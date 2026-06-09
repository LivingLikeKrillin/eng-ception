import type { SessionPayload } from '../types/v9'

/**
 * Curated content pack (v9.1) — pre-generated SessionPayloads for ALL 15 seed scenarios.
 * Tapping a seed loads instantly: no API, offline, free, consistent (cold-start).
 *
 * v9.1: 5형식 = recognition skill, not mandate. Seeds whose natural English is a 5형식 are
 * authored as moments (isFiveHMoment:true). Seeds whose natural English is simpler (s3/s4/s6/
 * s7/s10) are authored as 간결형 (isFiveHMoment:false, pattern5h/pattern null) — teaching that
 * forcing a 5형식 there is wrong. Keyed by scenario id (data/seed-scenarios.ts).
 *
 * Hand-curated starter. Expand/refine with real Claude via scripts/gen-content-pack.ts.
 */
export const CONTENT_PACK: Record<string, SessionPayload> = {
  // ── s1 — causative-bare (make) ─────────────────────────────────────────────
  s1: {
    structureType: { id: 'cause-result', label: '원인 + 결과', category: '감정/관계' },
    recognition: { isFiveHMoment: true, cue: '원인이 내 감정을 만든 구조 → 사역 5형식' },
    pattern5h: { id: 'causative-bare', label: '사역 (make/have/let)', verbs: ['make', 'have', 'let'], structure: '주어 + 동사 + 목적어 + 동사원형/형용사', triggerVerb: 'make' },
    empathy: { echo: '그 말은 좀 서운했어...', message: '공격 안 하면서 마음 전하기, 어렵지' },
    precheck: { question: '이걸 영어로 말한다면 뭐부터?', choices: [{ id: 'first', label: '그 말이 한 일부터', preview: 'That made me…' }, { id: 'second', label: '내 감정부터', preview: 'I was hurt…' }], correctChoiceId: 'first' },
    structure: {
      parts: [{ text: '그 말은 ', role: 'second' }, { text: '좀 ', role: 'pivot' }, { text: '서운했어', role: 'first' }],
      coreStructure: ['원인', '대상', '감정'],
      explanation: "한국어는 감정만 말하지만, 영어는 'That made me ~'로 원인이 감정을 만든 구조로 자주 가.",
      comparison: { show: true, label: '5형식이 나은가, 간결형이 나은가', fiveH: { en: 'That made me feel hurt.', note: "사역 'make'로 원인→감정을 한 호흡에. 원어민 단골." }, simpler: { en: 'I was hurt by that.', note: '수동태라 원인과 감정이 분리돼 늘어져.' }, betterChoice: 'fiveH' },
      patternQuiz: { question: '5형식 트리거 동사는?', options: [{ id: 'a', text: 'made', hint: '~가 나를 ~하게 만들다', isCorrect: true }, { id: 'b', text: 'hurt', hint: '바로 쓰면 3형식(was hurt)', isCorrect: false }, { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false }], feedback: "'made'야. make + 목적어 + feel ~." },
    },
    assembly: { blocks: [{ id: 'b1', en: 'That', order: 1 }, { id: 'b2', en: 'made me', order: 2 }, { id: 'b3', en: 'feel hurt', order: 3 }], blockRoles: ['subject', 'verb', 'complement'], connectors: [{ id: 'period', label: '.', meaning: '문장 종결', isCorrect: true }, { id: 'but', label: 'but', meaning: '대조용', isCorrect: false }], finalSentence: 'That made me feel hurt.' },
    feedback: { correctTitle: '맞았어', correctSub: 'That + made + me + feel hurt', wrongTitle: '아쉬워', wrongSub: 'made가 주인공', explanation: "'made me feel hurt'로 원인과 감정을 한 번에.", wordOrder: { korean: [{ label: '그 말은', role: 'second' }, { label: '서운했어', role: 'first' }], english: [{ label: 'That', role: 'first' }, { label: 'made me', role: 'pivot' }, { label: 'feel hurt', role: 'second' }], reversed: true, keyInsight: '한국어는 감정이 끝, 영어는 원인(That)이 앞.' }, patternNote: "made + me + feel ~. '~ 때문에 ~한 기분' 의미면 이 틀." },
    pattern: { template: 'That made me ~', patternId: 'causative-bare', tags: ['감정 표현', '완곡'] },
  },

  // ── s2 — judgment (find) ───────────────────────────────────────────────────
  s2: {
    structureType: { id: 'soft-disagree', label: '완곡 반대', category: '의견/생각' },
    recognition: { isFiveHMoment: true, cue: "'내가 보기엔 ~하다'는 판단 → judgment 5형식" },
    pattern5h: { id: 'judgment', label: '판단·명명', verbs: ['find', 'call'], structure: '주어 + 동사 + 목적어 + 형용사/명사', triggerVerb: 'find' },
    empathy: { echo: '지금 일정에선 조금 무리인 것 같아요...', message: '직접 안 된다 하긴 어렵지' },
    precheck: { question: '이걸 영어로 말한다면 뭐부터?', choices: [{ id: 'first', label: '내 판단부터', preview: 'I find it…' }, { id: 'second', label: '일정 얘기부터', preview: 'The timeline…' }], correctChoiceId: 'first' },
    structure: {
      parts: [{ text: '지금 일정에선 ', role: 'second' }, { text: '조금 ', role: 'pivot' }, { text: '무리인 것 같아요', role: 'first' }],
      coreStructure: ['판단 주체', '대상', '평가'],
      explanation: "'무리인 것 같다'는 내 판단. 영어는 'I find it ~'으로 판단을 앞세워 완곡하게.",
      comparison: { show: true, label: '5형식이 나은가, 간결형이 나은가', fiveH: { en: 'I find the timeline a bit tight.', note: "find+O+형용사로 '내 판단'을 드러내 부드럽게." }, simpler: { en: 'The timeline is impossible.', note: '단정적이라 회의에서 공격적으로 들려.' }, betterChoice: 'fiveH' },
      patternQuiz: { question: '5형식 트리거 동사는?', options: [{ id: 'a', text: 'find', hint: '~를 ~하다고 여기다', isCorrect: true }, { id: 'b', text: 'think', hint: 'that절로 가 늘어져', isCorrect: false }, { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false }], feedback: "'find'야. find + it + 형용사." },
    },
    assembly: { blocks: [{ id: 'b1', en: 'I', order: 1 }, { id: 'b2', en: 'find the timeline', order: 2 }, { id: 'b3', en: 'a bit tight', order: 3 }], blockRoles: ['subject', 'verb', 'complement'], connectors: [{ id: 'period', label: '.', meaning: '문장 종결', isCorrect: true }, { id: 'so', label: 'so', meaning: '결론 강조', isCorrect: false }], finalSentence: 'I find the timeline a bit tight.' },
    feedback: { correctTitle: '맞았어', correctSub: 'I + find + the timeline + a bit tight', wrongTitle: '아쉬워', wrongSub: 'find로 내 판단임을 드러내', explanation: "'I find it tight'는 단정 대신 '내가 보기엔'을 담아 완곡.", wordOrder: { korean: [{ label: '일정에선', role: 'second' }, { label: '무리인 것 같아요', role: 'first' }], english: [{ label: 'I', role: 'first' }, { label: 'find', role: 'pivot' }, { label: 'the timeline a bit tight', role: 'second' }], reversed: true, keyInsight: '판단이 끝 → 영어는 I find가 앞.' }, patternNote: "find + 목적어 + 형용사. '~가 ~한 것 같다(내 판단)'면 이 틀." },
    pattern: { template: 'I find it ~', patternId: 'judgment', tags: ['완곡 반대', '업무'] },
  },

  // ── s3 — 간결형 (자연 영어가 구동사) ────────────────────────────────────────
  s3: {
    structureType: { id: 'impression', label: '여운', category: '묘사/인상' },
    recognition: { isFiveHMoment: false, cue: '"계속 남는다"는 자연스러운 구동사(stick with)가 정답 — 5형식 불필요' },
    pattern5h: null,
    empathy: { echo: '이상하게 계속 기억에 남아...', message: '그런 여운, 묘하지' },
    precheck: { question: '이걸 영어로 말한다면 뭐부터?', choices: [{ id: 'first', label: '그게 한 일부터', preview: 'It stuck…' }, { id: 'second', label: '내 느낌부터', preview: 'I keep…' }], correctChoiceId: 'first' },
    structure: {
      parts: [{ text: '이상하게 ', role: 'second' }, { text: '계속 ', role: 'pivot' }, { text: '기억에 남아', role: 'first' }],
      coreStructure: ['대상', '지속', '여운'],
      explanation: "'계속 남다'는 'it stuck with me' 같은 구동사가 자연. 5형식으로 만들 필요 없어.",
      comparison: { show: true, label: '5형식이 나은가, 간결형이 나은가', fiveH: { en: 'I found it strangely memorable.', note: 'find+O+형용사로 만들 순 있지만 다소 격식·과해.' }, simpler: { en: "It stuck with me.", note: '구동사가 여운을 가장 자연스럽게. 여긴 이게 정답.' }, betterChoice: 'simpler' },
      patternQuiz: { question: '이 상황, 5형식이 필요할까?', options: [{ id: 'a', text: '5형식으로 끌어올려', hint: 'find 억지로 쓰면 과해', isCorrect: false }, { id: 'b', text: '간결하게 그대로', hint: '여운엔 구동사가 정답', isCorrect: true }, { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false }], feedback: '간결형이 정답. 여운은 stick with me로 가볍게.' },
    },
    assembly: { blocks: [{ id: 'b1', en: 'It', order: 1 }, { id: 'b2', en: 'stuck with me', order: 2 }], blockRoles: ['subject', 'verb'], connectors: [{ id: 'period', label: '.', meaning: '문장 종결', isCorrect: true }, { id: 'and', label: 'and', meaning: '추가용', isCorrect: false }], finalSentence: 'It stuck with me.' },
    feedback: { correctTitle: '맞았어', correctSub: '간결형이 정답', wrongTitle: '아쉬워', wrongSub: '여긴 구동사로', explanation: "여운·인상은 'stick with me' 같은 구동사가 native. 5형식은 과해.", wordOrder: { korean: [{ label: '계속', role: 'second' }, { label: '기억에 남아', role: 'first' }], english: [{ label: 'It', role: 'first' }, { label: 'stuck with me', role: 'second' }], reversed: false, keyInsight: '간결형은 어순도 단순.' }, patternNote: "여운엔 'It stuck with me'. 5형식은 결과/상태 말할 때 아껴." },
    pattern: null,
  },

  // ── s4 — 간결형 (turn out) ─────────────────────────────────────────────────
  s4: {
    structureType: { id: 'turnaround', label: '반전', category: '경험/서사' },
    recognition: { isFiveHMoment: false, cue: '"하다 보니 ~더라"는 turn out이 자연 — 5형식 불필요' },
    pattern5h: null,
    empathy: { echo: '하다 보니까 꽤 재밌더라...', message: '예상 밖 반전, 좋은 얘깃거리지' },
    precheck: { question: '이걸 영어로 말한다면 뭐부터?', choices: [{ id: 'first', label: '결과 반전부터', preview: 'It turned out…' }, { id: 'second', label: '내 느낌부터', preview: 'I enjoyed…' }], correctChoiceId: 'first' },
    structure: {
      parts: [{ text: '하다 보니까 ', role: 'second' }, { text: '꽤 ', role: 'pivot' }, { text: '재밌더라', role: 'first' }],
      coreStructure: ['과정', '정도', '반전'],
      explanation: "'알고 보니/하다 보니'는 'turn out'이 자연. 5형식 불필요.",
      comparison: { show: true, label: '5형식이 나은가, 간결형이 나은가', fiveH: { en: 'I found it pretty fun.', note: 'find+O+형용사도 되지만 반전 뉘앙스가 약해.' }, simpler: { en: 'It turned out to be pretty fun.', note: "'turn out'이 '예상과 달리'를 담아 가장 자연. 정답." }, betterChoice: 'simpler' },
      patternQuiz: { question: '이 상황, 5형식이 필요할까?', options: [{ id: 'a', text: '5형식으로 끌어올려', hint: 'find는 반전이 안 살아', isCorrect: false }, { id: 'b', text: '간결하게 그대로', hint: '반전엔 turn out', isCorrect: true }, { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false }], feedback: '간결형이 정답. 반전은 turn out으로.' },
    },
    assembly: { blocks: [{ id: 'b1', en: 'It turned out', order: 1 }, { id: 'b2', en: 'to be pretty fun', order: 2 }], blockRoles: ['subject', 'complement'], connectors: [{ id: 'period', label: '.', meaning: '문장 종결', isCorrect: true }, { id: 'so', label: 'so', meaning: '결과 강조', isCorrect: false }], finalSentence: 'It turned out to be pretty fun.' },
    feedback: { correctTitle: '맞았어', correctSub: '간결형이 정답', wrongTitle: '아쉬워', wrongSub: '반전엔 turn out', explanation: "'예상과 달리'는 turn out이 native. 5형식은 여기 안 맞아.", wordOrder: { korean: [{ label: '하다 보니까', role: 'second' }, { label: '재밌더라', role: 'first' }], english: [{ label: 'It turned out', role: 'first' }, { label: 'to be pretty fun', role: 'second' }], reversed: false, keyInsight: '반전 표현은 구문 자체가 정해져 있어.' }, patternNote: "반전엔 'It turned out ~'. 5형식 욱여넣지 마." },
    pattern: null,
  },

  // ── s5 — causative-result (get + pp) ───────────────────────────────────────
  s5: {
    structureType: { id: 'reassure', label: '문제 인정 + 안심', category: '상황 대응' },
    recognition: { isFiveHMoment: true, cue: '목적어를 ~된 상태(정리된)로 만든다 → get + pp' },
    pattern5h: { id: 'causative-result', label: '사역 결과 (get + pp)', verbs: ['get', 'have'], structure: '주어 + 동사 + 목적어 + 과거분사', triggerVerb: 'get' },
    empathy: { echo: '다음 주까지는 정리할 수 있을 것 같습니다...', message: '문제는 인정하되 안심시키기' },
    precheck: { question: '이걸 영어로 말한다면 뭐부터?', choices: [{ id: 'first', label: '내가 해결한다부터', preview: 'I can get it…' }, { id: 'second', label: '문제 상황부터', preview: "It's stuck…" }], correctChoiceId: 'first' },
    structure: {
      parts: [{ text: '다음 주까지는 ', role: 'second' }, { text: '정리할 수 ', role: 'pivot' }, { text: '있을 것 같습니다', role: 'first' }],
      coreStructure: ['해결 주체', '대상', '완료 상태'],
      explanation: "'정리하다'를 영어는 'get it sorted'로 — 목적어를 '정리된 상태(pp)'로.",
      comparison: { show: true, label: '5형식이 나은가, 간결형이 나은가', fiveH: { en: 'I can get it sorted by next week.', note: "get + 목적어 + pp로 '정리된 결과'를 또렷이. native 단골." }, simpler: { en: 'I will organize it by next week.', note: '틀리진 않지만 결과(정리된 상태)가 덜 드러나.' }, betterChoice: 'fiveH' },
      patternQuiz: { question: '5형식 트리거 동사는?', options: [{ id: 'a', text: 'get', hint: '~를 ~된 상태로 만들다', isCorrect: true }, { id: 'b', text: 'organize', hint: '행위 강조 (3형식)', isCorrect: false }, { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false }], feedback: "'get'이야. get + it + sorted." },
    },
    assembly: { blocks: [{ id: 'b1', en: 'I can', order: 1 }, { id: 'b2', en: 'get it', order: 2 }, { id: 'b3', en: 'sorted by next week', order: 3 }], blockRoles: ['subject', 'verb', 'complement'], connectors: [{ id: 'period', label: '.', meaning: '문장 종결', isCorrect: true }, { id: 'and', label: 'and', meaning: '추가용', isCorrect: false }], finalSentence: 'I can get it sorted by next week.' },
    feedback: { correctTitle: '맞았어', correctSub: 'I can + get + it + sorted', wrongTitle: '아쉬워', wrongSub: 'get + pp로 결과 상태', explanation: "'get it sorted/done/fixed'는 원어민 단골. 결과를 압축해.", wordOrder: { korean: [{ label: '다음 주까지', role: 'second' }, { label: '정리할 수 있을 것 같습니다', role: 'first' }], english: [{ label: 'I can', role: 'first' }, { label: 'get it', role: 'pivot' }, { label: 'sorted by next week', role: 'second' }], reversed: true, keyInsight: "'정리하다'가 끝 → 영어는 get it이 앞 + 결과가 뒤." }, patternNote: "get + 목적어 + pp. '~를 ~된 상태로 해놓다'면 이 틀." },
    pattern: { template: 'I can get it ~', patternId: 'causative-result', tags: ['업무', '안심'] },
  },

  // ── s6 — 간결형 (5형식 맞추면 뜻 왜곡) ──────────────────────────────────────
  s6: {
    structureType: { id: 'empathy-support', label: '공감 + 지지', category: '감정/관계' },
    recognition: { isFiveHMoment: false, cue: '"이해해"는 그냥 understand가 정답 — 5형식 맞추려면 뜻이 바뀜' },
    pattern5h: null,
    empathy: { echo: '네 마음은 충분히 이해해...', message: '섣부른 조언보다 공감, 좋은 선택이야' },
    precheck: { question: '이걸 영어로 말한다면 뭐부터?', choices: [{ id: 'first', label: '내 이해부터', preview: 'I understand…' }, { id: 'second', label: '네 상황부터', preview: 'What you…' }], correctChoiceId: 'first' },
    structure: {
      parts: [{ text: '네 마음은 ', role: 'second' }, { text: '충분히 ', role: 'pivot' }, { text: '이해해', role: 'first' }],
      coreStructure: ['주체', '대상', '공감'],
      explanation: "'이해하다'는 'I understand how you feel'이 자연. 굳이 5형식으로 비틀면 뜻이 달라져.",
      comparison: { show: true, label: '5형식이 나은가, 간결형이 나은가', fiveH: { en: 'I want you to know I get it.', note: "5형식(want+to V)으로 만들면 '알려주고 싶다'로 의미가 옮겨가 — 원문과 달라져." }, simpler: { en: 'I understand how you feel.', note: '공감은 understand가 가장 정직하고 자연. 정답.' }, betterChoice: 'simpler' },
      patternQuiz: { question: '이 상황, 5형식이 필요할까?', options: [{ id: 'a', text: '5형식으로 끌어올려', hint: '비틀면 뜻이 바뀜', isCorrect: false }, { id: 'b', text: '간결하게 그대로', hint: '공감엔 understand', isCorrect: true }, { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false }], feedback: '간결형이 정답. 5형식 맞추려다 뜻 왜곡하지 마.' },
    },
    assembly: { blocks: [{ id: 'b1', en: 'I understand', order: 1 }, { id: 'b2', en: 'how you feel', order: 2 }], blockRoles: ['subject', 'object'], connectors: [{ id: 'period', label: '.', meaning: '문장 종결', isCorrect: true }, { id: 'but', label: 'but', meaning: '대조용', isCorrect: false }], finalSentence: 'I understand how you feel.' },
    feedback: { correctTitle: '맞았어', correctSub: '간결형이 정답', wrongTitle: '아쉬워', wrongSub: 'understand로 충분', explanation: '공감은 understand가 native. 5형식으로 비틀면 의미가 달라져 — 강제 금지의 대표 케이스.', wordOrder: { korean: [{ label: '네 마음은', role: 'second' }, { label: '이해해', role: 'first' }], english: [{ label: 'I understand', role: 'first' }, { label: 'how you feel', role: 'second' }], reversed: true, keyInsight: '한국어는 대상이 앞, 영어는 understand가 앞.' }, patternNote: "공감은 'I understand ~'. 뜻 바뀌면 5형식 쓰지 마." },
    pattern: null,
  },

  // ── s7 — 간결형 (place to ~) ───────────────────────────────────────────────
  s7: {
    structureType: { id: 'impression', label: '분위기 인상', category: '묘사/인상' },
    recognition: { isFiveHMoment: false, cue: '단순한 장소 인상은 간결형이 정답 — 5형식은 과함' },
    pattern5h: null,
    empathy: { echo: '거기 앉아서 멍 때리기 좋았어...', message: '그 분위기, 꾸밈없이 말해도 충분해' },
    precheck: { question: '이걸 영어로 말한다면 뭐부터?', choices: [{ id: 'first', label: '장소 느낌부터', preview: 'It was a great…' }, { id: 'second', label: '내 행동부터', preview: 'I just sat…' }], correctChoiceId: 'first' },
    structure: {
      parts: [{ text: '거기 앉아서 ', role: 'second' }, { text: '멍 때리기 ', role: 'pivot' }, { text: '좋았어', role: 'first' }],
      coreStructure: ['장소', '행위', '느낌'],
      explanation: "'~하기 좋은 곳'은 'a great place to ~'가 자연. 5형식 불필요.",
      comparison: { show: true, label: '5형식이 나은가, 간결형이 나은가', fiveH: { en: 'I found it a great spot to chill.', note: 'find+O+보어도 되지만 거추장스럽고 과해.' }, simpler: { en: 'It was a great place to just zone out.', note: '간결한 형태가 더 가볍고 자연. 정답.' }, betterChoice: 'simpler' },
      patternQuiz: { question: '이 상황, 5형식이 필요할까?', options: [{ id: 'a', text: '5형식으로 끌어올려', hint: 'find는 과해', isCorrect: false }, { id: 'b', text: '간결하게 그대로', hint: '장소 인상은 간결형', isCorrect: true }, { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false }], feedback: '간결형이 정답. place to ~로 가볍게.' },
    },
    assembly: { blocks: [{ id: 'b1', en: 'It was a great place', order: 1 }, { id: 'b2', en: 'to just zone out', order: 2 }], blockRoles: ['subject', 'complement'], connectors: [{ id: 'period', label: '.', meaning: '문장 종결', isCorrect: true }, { id: 'and', label: 'and', meaning: '추가용', isCorrect: false }], finalSentence: 'It was a great place to just zone out.' },
    feedback: { correctTitle: '맞았어', correctSub: '간결형이 정답', wrongTitle: '아쉬워', wrongSub: '여긴 간결하게', explanation: '장소 인상은 a great place to ~가 native. 5형식은 과해.', wordOrder: { korean: [{ label: '거기', role: 'second' }, { label: '좋았어', role: 'first' }], english: [{ label: 'It was a great place', role: 'first' }, { label: 'to just zone out', role: 'second' }], reversed: false, keyInsight: '간결형은 구문이 단순.' }, patternNote: "장소 인상은 'a great place to ~'. 5형식 아껴." },
    pattern: null,
  },

  // ── s8 — want-toV (ask) ────────────────────────────────────────────────────
  s8: {
    structureType: { id: 'soft-alternative', label: '부드러운 대안', category: '의견/생각' },
    recognition: { isFiveHMoment: true, cue: '상대에게 행동을 정중히 요청 → ask + to V' },
    pattern5h: { id: 'want-toV', label: '요청/희망 + to V', verbs: ['want', 'ask', 'tell', 'need'], structure: '주어 + 동사 + 목적어 + to V', triggerVerb: 'ask' },
    empathy: { echo: '다른 쪽으로도 생각해 볼 수 있을까요?...', message: '기분 안 상하게 대안 꺼내기, 섬세하지' },
    precheck: { question: '이걸 영어로 말한다면 뭐부터?', choices: [{ id: 'first', label: '요청부터', preview: 'Could I ask you…' }, { id: 'second', label: '대안 내용부터', preview: 'Another angle…' }], correctChoiceId: 'first' },
    structure: {
      parts: [{ text: '다른 쪽으로도 ', role: 'second' }, { text: '한번 ', role: 'pivot' }, { text: '생각해 볼 수 있을까요', role: 'first' }],
      coreStructure: ['요청 주체', '상대', '행동'],
      explanation: "'~해 볼 수 있을까요'는 부탁. 영어는 'ask you to ~'로 부드럽게 요청.",
      comparison: { show: true, label: '5형식이 나은가, 간결형이 나은가', fiveH: { en: 'Could I ask you to consider another angle?', note: "ask + 목적어 + to V로 '부탁드려도 될까요'를 담아 정중." }, simpler: { en: 'Please consider another angle.', note: '명령조라 회의에서 직설적으로 들려.' }, betterChoice: 'fiveH' },
      patternQuiz: { question: '5형식 트리거 동사는?', options: [{ id: 'a', text: 'ask', hint: '~에게 ~해달라 요청', isCorrect: true }, { id: 'b', text: 'say', hint: '사람+to V 못 받아', isCorrect: false }, { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false }], feedback: "'ask'야. ask + you + to consider." },
    },
    assembly: { blocks: [{ id: 'b1', en: 'Could I ask', order: 1 }, { id: 'b2', en: 'you', order: 2 }, { id: 'b3', en: 'to consider another angle', order: 3 }], blockRoles: ['verb', 'object', 'complement'], connectors: [{ id: 'question', label: '?', meaning: '정중한 의문문', isCorrect: true }, { id: 'so', label: 'so', meaning: '결론 강조', isCorrect: false }], finalSentence: 'Could I ask you to consider another angle?' },
    feedback: { correctTitle: '맞았어', correctSub: 'ask + you + to consider', wrongTitle: '아쉬워', wrongSub: 'ask + 사람 + to V', explanation: "'ask you to ~'는 상대를 존중하며 요청하는 틀.", wordOrder: { korean: [{ label: '다른 쪽으로도', role: 'second' }, { label: '생각해 볼 수 있을까요', role: 'first' }], english: [{ label: 'Could I ask', role: 'first' }, { label: 'you', role: 'pivot' }, { label: 'to consider another angle', role: 'second' }], reversed: true, keyInsight: '행동이 끝 → 영어는 ask you가 앞 + to V가 뒤.' }, patternNote: "ask + 사람 + to V. '~에게 ~해 달라(정중)'면 이 틀." },
    pattern: { template: 'ask you to ~', patternId: 'want-toV', tags: ['업무', '정중 요청'] },
  },

  // ── s9 — causative-bare (let) ──────────────────────────────────────────────
  s9: {
    structureType: { id: 'apology', label: '진심 어린 사과', category: '상황 대응' },
    recognition: { isFiveHMoment: true, cue: "'알려주다'는 let you know 관용구 → 사역 5형식" },
    pattern5h: { id: 'causative-bare', label: '사역 (make/have/let)', verbs: ['make', 'have', 'let'], structure: '주어 + 동사 + 목적어 + 동사원형', triggerVerb: 'let' },
    empathy: { echo: '연락이라도 했어야 했는데...', message: '단순 사과보다 마음을 더 전하고 싶지' },
    precheck: { question: '이걸 영어로 말한다면 뭐부터?', choices: [{ id: 'first', label: '내가 했어야 할 일부터', preview: 'I should have let…' }, { id: 'second', label: '연락 얘기부터', preview: 'A text…' }], correctChoiceId: 'first' },
    structure: {
      parts: [{ text: '연락이라도 ', role: 'second' }, { text: '했어야 ', role: 'pivot' }, { text: '했는데', role: 'first' }],
      coreStructure: ['주체', '상대', '알림'],
      explanation: "'알려주다'를 영어는 'let you know'로 — let + 목적어 + 동사원형 관용구.",
      comparison: { show: true, label: '5형식이 나은가, 간결형이 나은가', fiveH: { en: 'I should have let you know.', note: "let + you + know는 '미리 알려줬어야'를 따뜻하게 담는 native 단골." }, simpler: { en: 'I should have contacted you.', note: '딱딱·사무적이라 사과의 온도가 낮아.' }, betterChoice: 'fiveH' },
      patternQuiz: { question: '5형식 트리거 동사는?', options: [{ id: 'a', text: 'let', hint: '~가 ~하게 해주다', isCorrect: true }, { id: 'b', text: 'tell', hint: 'let you know가 더 관용적', isCorrect: false }, { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false }], feedback: "'let'이야. let + you + know." },
    },
    assembly: { blocks: [{ id: 'b1', en: 'I should have', order: 1 }, { id: 'b2', en: 'let you', order: 2 }, { id: 'b3', en: 'know', order: 3 }], blockRoles: ['subject', 'verb', 'complement'], connectors: [{ id: 'period', label: '.', meaning: '문장 종결', isCorrect: true }, { id: 'but', label: 'but', meaning: '대조용', isCorrect: false }], finalSentence: 'I should have let you know.' },
    feedback: { correctTitle: '맞았어', correctSub: 'should have + let + you + know', wrongTitle: '아쉬워', wrongSub: 'let you know 관용구', explanation: "'let you know'는 '미리 알려주다'의 표준 표현.", wordOrder: { korean: [{ label: '연락이라도', role: 'second' }, { label: '했어야 했는데', role: 'first' }], english: [{ label: 'I should have', role: 'first' }, { label: 'let you', role: 'pivot' }, { label: 'know', role: 'second' }], reversed: true, keyInsight: "'했어야'가 끝 → 영어는 let you가 중심." }, patternNote: "let + 사람 + 동사원형. '~가 ~하게 해주다/알려주다'면 이 틀." },
    pattern: { template: 'let you ~', patternId: 'causative-bare', tags: ['사과', '후회'] },
  },

  // ── s10 — 간결형 (still there) ─────────────────────────────────────────────
  s10: {
    structureType: { id: 'nostalgia', label: '추억 + 여운', category: '경험/서사' },
    recognition: { isFiveHMoment: false, cue: '"느낌이 남아 있다"는 still there가 자연 — 5형식 불필요' },
    pattern5h: null,
    empathy: { echo: '다 바뀌었는데도 그때 느낌이 남아 있더라...', message: '변한 곳에서 옛 느낌, 묘하게 그립지' },
    precheck: { question: '이걸 영어로 말한다면 뭐부터?', choices: [{ id: 'first', label: '느낌이 남았다부터', preview: 'The feeling was…' }, { id: 'second', label: '변화부터', preview: 'It all changed…' }], correctChoiceId: 'first' },
    structure: {
      parts: [{ text: '다 바뀌었는데도 ', role: 'second' }, { text: '그때 느낌이 ', role: 'pivot' }, { text: '남아 있더라', role: 'first' }],
      coreStructure: ['변화', '대상', '잔존'],
      explanation: "'남아 있다'는 'was still there'가 자연. 5형식으로 만들 필요 없어.",
      comparison: { show: true, label: '5형식이 나은가, 간결형이 나은가', fiveH: { en: 'I found the old feeling still there.', note: 'find+O+보어로 만들 순 있지만 어색하고 과해.' }, simpler: { en: 'The old feeling was still there.', note: '간결한 형태가 여운을 가장 자연스럽게. 정답.' }, betterChoice: 'simpler' },
      patternQuiz: { question: '이 상황, 5형식이 필요할까?', options: [{ id: 'a', text: '5형식으로 끌어올려', hint: 'find는 어색', isCorrect: false }, { id: 'b', text: '간결하게 그대로', hint: '잔존은 still there', isCorrect: true }, { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false }], feedback: '간결형이 정답. was still there로 가볍게.' },
    },
    assembly: { blocks: [{ id: 'b1', en: 'The old feeling', order: 1 }, { id: 'b2', en: 'was still there', order: 2 }], blockRoles: ['subject', 'verb'], connectors: [{ id: 'period', label: '.', meaning: '문장 종결', isCorrect: true }, { id: 'and', label: 'and', meaning: '추가용', isCorrect: false }], finalSentence: 'The old feeling was still there.' },
    feedback: { correctTitle: '맞았어', correctSub: '간결형이 정답', wrongTitle: '아쉬워', wrongSub: '여긴 still there', explanation: '잔존·여운은 was still there가 native. 5형식은 과해.', wordOrder: { korean: [{ label: '그때 느낌이', role: 'second' }, { label: '남아 있더라', role: 'first' }], english: [{ label: 'The old feeling', role: 'first' }, { label: 'was still there', role: 'second' }], reversed: false, keyInsight: '간결형은 어순도 단순.' }, patternNote: "잔존은 'was still there'. 5형식 욱여넣지 마." },
    pattern: null,
  },

  // ── s11 — ditransitive (show) ──────────────────────────────────────────────
  s11: {
    structureType: { id: 'request-soft', label: '가벼운 부탁', category: '상황 대응' },
    recognition: { isFiveHMoment: true, cue: '사람에게 무엇을 보여달라 → 수여동사 4형식' },
    pattern5h: { id: 'ditransitive', label: '수여동사 (4형식)', verbs: ['give', 'tell', 'show', 'send', 'bring'], structure: '주어 + 동사 + 간접목적어 + 직접목적어', triggerVerb: 'show' },
    empathy: { echo: '그거 한번 보여줄래?...', message: "'빌려줘'보다 부드럽게, 좋은 감각이야" },
    precheck: { question: '이걸 영어로 말한다면 뭐부터?', choices: [{ id: 'first', label: '동사부터', preview: 'Can you show…' }, { id: 'second', label: '대상부터', preview: 'That book…' }], correctChoiceId: 'first' },
    structure: {
      parts: [{ text: '그거 ', role: 'second' }, { text: '한번 ', role: 'pivot' }, { text: '보여줄래', role: 'first' }],
      coreStructure: ['청자', '대상', '요청'],
      explanation: "'~을 보여줘'를 영어는 'show me that'으로 — 동사 + 사람 + 사물.",
      comparison: { show: true, label: '4형식이 나은가, 풀어 쓰는 게 나은가', fiveH: { en: 'Can you show me that?', note: 'show + me + that — 사람과 사물을 to 없이 그대로.' }, simpler: { en: 'Can you show that to me?', note: '회화에선 더 짧은 4형식이 자연스러워.' }, betterChoice: 'fiveH' },
      patternQuiz: { question: '4형식 동사로 자연스러운 건?', options: [{ id: 'a', text: 'show', hint: '사람에게 보여주는 동사', isCorrect: true }, { id: 'b', text: 'see', hint: '내가 보는 거라 부탁엔 안 맞아', isCorrect: false }, { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false }], feedback: "'show'야. show + me + that." },
    },
    assembly: { blocks: [{ id: 'b1', en: 'Can you show', order: 1 }, { id: 'b2', en: 'me', order: 2 }, { id: 'b3', en: 'that', order: 3 }], blockRoles: ['verb', 'object', 'object'], connectors: [{ id: 'question', label: '?', meaning: '부탁 의문문', isCorrect: true }, { id: 'please', label: 'please', meaning: '예의 톤', isCorrect: false }], finalSentence: 'Can you show me that?' },
    feedback: { correctTitle: '맞았어', correctSub: 'show + me + that', wrongTitle: '아쉬워', wrongSub: '사람 + 사물 그대로', explanation: '수여동사는 to/for 없이 사람과 사물을 차례로. show me that, give me a sec.', wordOrder: { korean: [{ label: '그거', role: 'second' }, { label: '보여줄래', role: 'first' }], english: [{ label: 'Can you show', role: 'first' }, { label: 'me', role: 'pivot' }, { label: 'that', role: 'second' }], reversed: true, keyInsight: '대상→동사 → 영어는 동사→사람→사물.' }, patternNote: "show/give/send + 사람 + 사물. '~에게 ~을 ~해 줘'면 이 틀." },
    pattern: { template: 'show me ~', patternId: 'ditransitive', tags: ['부탁', '일상'] },
  },

  // ── s12 — ditransitive (tell) ──────────────────────────────────────────────
  s12: {
    structureType: { id: 'honest-take', label: '솔직한 의견', category: '의견/생각' },
    recognition: { isFiveHMoment: true, cue: '사람에게 내용을 말해주다 → 수여동사 4형식' },
    pattern5h: { id: 'ditransitive', label: '수여동사 (4형식)', verbs: ['give', 'tell', 'show', 'send', 'bring'], structure: '주어 + 동사 + 간접목적어 + 직접목적어', triggerVerb: 'tell' },
    empathy: { echo: '솔직히 말하자면...', message: '부드럽게, 그래도 진심으로' },
    precheck: { question: '이걸 영어로 말한다면 뭐부터?', choices: [{ id: 'first', label: '동사부터', preview: 'Let me tell you…' }, { id: 'second', label: '내용부터', preview: 'The truth is…' }], correctChoiceId: 'first' },
    structure: {
      parts: [{ text: '솔직히 ', role: 'second' }, { text: '말하자면', role: 'first' }],
      coreStructure: ['청자', '내용', '전달'],
      explanation: "'솔직히 말하자면'을 영어는 'let me tell you the truth'로 — tell + 사람 + 내용.",
      comparison: { show: true, label: '4형식이 나은가, 풀어 쓰는 게 나은가', fiveH: { en: 'Let me tell you the truth.', note: 'tell + you + the truth — 사람과 내용을 그대로.' }, simpler: { en: 'I will say the truth honestly.', note: "say는 사람을 직접 못 받아 'say you'가 안 돼 어색." }, betterChoice: 'fiveH' },
      patternQuiz: { question: '4형식 동사로 자연스러운 건?', options: [{ id: 'a', text: 'tell', hint: '사람에게 말해주는 동사', isCorrect: true }, { id: 'b', text: 'say', hint: "'say you the truth'가 안 돼", isCorrect: false }, { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false }], feedback: "'tell'이야. tell + you + the truth." },
    },
    assembly: { blocks: [{ id: 'b1', en: 'Let me tell', order: 1 }, { id: 'b2', en: 'you', order: 2 }, { id: 'b3', en: 'the truth', order: 3 }], blockRoles: ['verb', 'object', 'object'], connectors: [{ id: 'period', label: '.', meaning: '문장 종결', isCorrect: true }, { id: 'but', label: 'but', meaning: '대조용', isCorrect: false }], finalSentence: 'Let me tell you the truth.' },
    feedback: { correctTitle: '맞았어', correctSub: 'tell + you + the truth', wrongTitle: '아쉬워', wrongSub: 'say 아니라 tell', explanation: 'say/tell 헷갈림: 사람을 목적어로 받으면 tell.', wordOrder: { korean: [{ label: '솔직히', role: 'second' }, { label: '말하자면', role: 'first' }], english: [{ label: 'Let me tell', role: 'first' }, { label: 'you', role: 'pivot' }, { label: 'the truth', role: 'second' }], reversed: true, keyInsight: '내용→동사 → 영어는 동사→사람→내용.' }, patternNote: "tell/give/show + 사람 + 내용. '~에게 ~을 말해/줘'면 이 틀." },
    pattern: { template: 'tell you ~', patternId: 'ditransitive', tags: ['업무', '솔직함'] },
  },

  // ── s13 — perception (see) ─────────────────────────────────────────────────
  s13: {
    structureType: { id: 'observation', label: '목격 + 묘사', category: '경험/서사' },
    recognition: { isFiveHMoment: true, cue: '본 장면을 그대로 전할 때 → 지각동사 5형식' },
    pattern5h: { id: 'perception', label: '지각동사', verbs: ['see', 'hear', 'watch'], structure: '주어 + 지각동사 + 목적어 + 동사원형/V-ing', triggerVerb: 'see' },
    empathy: { echo: '그 사람이 우는 걸 처음 봤어...', message: '말로 표현하기 묘한 장면이지' },
    precheck: { question: '이걸 영어로 말한다면 뭐부터?', choices: [{ id: 'first', label: '내가 봤다는 사실', preview: 'I saw…' }, { id: 'second', label: '그의 행동', preview: 'He was crying…' }], correctChoiceId: 'first' },
    structure: {
      parts: [{ text: '그 사람이 ', role: 'second' }, { text: '우는 걸 ', role: 'pivot' }, { text: '처음 봤어', role: 'first' }],
      coreStructure: ['주체', '장면', '관찰'],
      explanation: "'우는 걸 봤어'를 영어는 'saw him cry'로 — 동사를 명사화 않고 그대로.",
      comparison: { show: true, label: '5형식이 나은가, 간결형이 나은가', fiveH: { en: 'I saw him cry.', note: '지각동사+목적어+동사원형. 장면을 한 호흡에.' }, simpler: { en: 'I saw that he was crying.', note: 'that절은 문어체라 회화엔 무거워.' }, betterChoice: 'fiveH' },
      patternQuiz: { question: '5형식 트리거 동사는?', options: [{ id: 'a', text: 'saw', hint: '지각동사 — 목적어+동사원형', isCorrect: true }, { id: 'b', text: 'looked', hint: 'look은 자동사', isCorrect: false }, { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false }], feedback: "'saw'야. see/hear/watch는 'him cry' 덩어리를 그대로." },
    },
    assembly: { blocks: [{ id: 'b1', en: 'I', order: 1 }, { id: 'b2', en: 'saw him', order: 2 }, { id: 'b3', en: 'cry', order: 3 }], blockRoles: ['subject', 'verb', 'complement'], connectors: [{ id: 'period', label: '.', meaning: '문장 종결', isCorrect: true }, { id: 'and', label: 'and', meaning: '묘사 추가', isCorrect: false }], finalSentence: 'I saw him cry.' },
    feedback: { correctTitle: '맞았어', correctSub: 'saw + him + cry', wrongTitle: '아쉬워', wrongSub: 'cry를 동사 그대로', explanation: "지각동사는 '목적어 + 동사원형'을 그대로. crying으로 바꾸면 진행 장면 강조.", wordOrder: { korean: [{ label: '그 사람이', role: 'second' }, { label: '우는 걸', role: 'pivot' }, { label: '봤어', role: 'first' }], english: [{ label: 'I', role: 'first' }, { label: 'saw', role: 'pivot' }, { label: 'him cry', role: 'second' }], reversed: true, keyInsight: '본 행위가 맨 뒤 → 영어는 saw가 앞.' }, patternNote: "saw/heard/watched + 목적어 + 동사원형. '~가 ~하는 걸 봤어'면 이 틀." },
    pattern: { template: 'I saw ~ cry', patternId: 'perception', tags: ['목격', '공감'] },
  },

  // ── s14 — perception (hear) ────────────────────────────────────────────────
  s14: {
    structureType: { id: 'overheard', label: '우연한 관찰', category: '경험/서사' },
    recognition: { isFiveHMoment: true, cue: '우연히 들은 장면을 그대로 → 지각동사 5형식' },
    pattern5h: { id: 'perception', label: '지각동사', verbs: ['see', 'hear', 'watch'], structure: '주어 + 지각동사 + 목적어 + 동사원형/V-ing', triggerVerb: 'hear' },
    empathy: { echo: '옆에서 누가 하는 말을 들었는데...', message: '문득 들은 한마디가 오래 남을 때 있지' },
    precheck: { question: '이걸 영어로 말한다면 뭐부터?', choices: [{ id: 'first', label: '내가 들었다는 사실', preview: 'I heard…' }, { id: 'second', label: '그 말 내용부터', preview: 'Someone said…' }], correctChoiceId: 'first' },
    structure: {
      parts: [{ text: '옆에서 누가 ', role: 'second' }, { text: '하는 말을 ', role: 'pivot' }, { text: '들었어', role: 'first' }],
      coreStructure: ['주체', '발화', '관찰'],
      explanation: "'누가 하는 말을 들었어'를 영어는 'heard someone say'로 — 지각동사 + 목적어 + 동사원형.",
      comparison: { show: true, label: '5형식이 나은가, 간결형이 나은가', fiveH: { en: 'I heard someone say it.', note: 'hear + 목적어 + 동사원형으로 들은 장면을 압축.' }, simpler: { en: 'I heard what someone was saying.', note: '관계절로 풀면 길고 호흡이 끊겨.' }, betterChoice: 'fiveH' },
      patternQuiz: { question: '5형식 트리거 동사는?', options: [{ id: 'a', text: 'heard', hint: '지각동사 — 목적어+동사원형', isCorrect: true }, { id: 'b', text: 'listened', hint: 'listen은 자동사(to)', isCorrect: false }, { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false }], feedback: "'heard'야. hear + someone + say." },
    },
    assembly: { blocks: [{ id: 'b1', en: 'I', order: 1 }, { id: 'b2', en: 'heard someone', order: 2 }, { id: 'b3', en: 'say it', order: 3 }], blockRoles: ['subject', 'verb', 'complement'], connectors: [{ id: 'period', label: '.', meaning: '문장 종결', isCorrect: true }, { id: 'and', label: 'and', meaning: '묘사 추가', isCorrect: false }], finalSentence: 'I heard someone say it.' },
    feedback: { correctTitle: '맞았어', correctSub: 'heard + someone + say', wrongTitle: '아쉬워', wrongSub: 'say를 동사 그대로', explanation: "지각동사 hear는 'someone say'를 그대로. saying으로 바꾸면 말하던 순간 강조.", wordOrder: { korean: [{ label: '누가', role: 'second' }, { label: '하는 말을', role: 'pivot' }, { label: '들었어', role: 'first' }], english: [{ label: 'I', role: 'first' }, { label: 'heard', role: 'pivot' }, { label: 'someone say it', role: 'second' }], reversed: true, keyInsight: '들은 행위가 맨 뒤 → 영어는 heard가 앞.' }, patternNote: "heard/saw/watched + 목적어 + 동사원형. '~가 ~하는 걸 들었어'면 이 틀." },
    pattern: { template: 'I heard ~ say', patternId: 'perception', tags: ['관찰', '여운'] },
  },

  // ── s15 — causative-toV (get + to V) ───────────────────────────────────────
  s15: {
    structureType: { id: 'persuade-result', label: '설득 + 결과', category: '경험/서사' },
    recognition: { isFiveHMoment: true, cue: '설득해서 ~하게 했다 → get + 목적어 + to V' },
    pattern5h: { id: 'causative-toV', label: '사역 (get + to V)', verbs: ['get'], structure: '주어 + get + 목적어 + to V', triggerVerb: 'get' },
    empathy: { echo: '결국 그 친구 설득해서 오게 만들었어...', message: '안 오려던 사람 끌고 온 거, 뿌듯하지' },
    precheck: { question: '이걸 영어로 말한다면 뭐부터?', choices: [{ id: 'first', label: '내가 한 일부터', preview: 'I got him…' }, { id: 'second', label: '친구가 온 결과부터', preview: 'He came…' }], correctChoiceId: 'first' },
    structure: {
      parts: [{ text: '그 친구 ', role: 'second' }, { text: '설득해서 ', role: 'pivot' }, { text: '오게 만들었어', role: 'first' }],
      coreStructure: ['주체', '대상', '유도된 행동'],
      explanation: "'설득해서 오게 만들다'를 영어는 'got him to come'으로 — get + 목적어 + to V.",
      comparison: { show: true, label: '5형식이 나은가, 간결형이 나은가', fiveH: { en: 'I got him to come.', note: 'get + 목적어 + to V로 설득과 결과를 한 문장에.' }, simpler: { en: 'I persuaded him so he came.', note: '설득과 결과가 두 문장으로 갈려 늘어져.' }, betterChoice: 'fiveH' },
      patternQuiz: { question: '5형식 트리거 동사는?', options: [{ id: 'a', text: 'got', hint: '설득해서 ~하게 하다', isCorrect: true }, { id: 'b', text: 'made', hint: 'made him come은 강제 뉘앙스', isCorrect: false }, { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false }], feedback: "'got'이야. get + him + to come." },
    },
    assembly: { blocks: [{ id: 'b1', en: 'I', order: 1 }, { id: 'b2', en: 'got him', order: 2 }, { id: 'b3', en: 'to come', order: 3 }], blockRoles: ['subject', 'verb', 'complement'], connectors: [{ id: 'period', label: '.', meaning: '문장 종결', isCorrect: true }, { id: 'so', label: 'so', meaning: '결과 강조', isCorrect: false }], finalSentence: 'I got him to come.' },
    feedback: { correctTitle: '맞았어', correctSub: 'got + him + to come', wrongTitle: '아쉬워', wrongSub: '설득은 made 아니라 get to V', explanation: "'get + 목적어 + to V'는 '설득/유도해서 ~하게'. make는 강제, get to V는 유도.", wordOrder: { korean: [{ label: '그 친구', role: 'second' }, { label: '설득해서', role: 'pivot' }, { label: '오게 만들었어', role: 'first' }], english: [{ label: 'I', role: 'first' }, { label: 'got him', role: 'pivot' }, { label: 'to come', role: 'second' }], reversed: true, keyInsight: "'오게 만들었어'가 끝 → 영어는 got him이 앞 + to come이 뒤." }, patternNote: "get + 목적어 + to V. '설득해서 ~하게 했다'면 이 틀." },
    pattern: { template: 'I got him to ~', patternId: 'causative-toV', tags: ['설득', '관계'] },
  },
}
