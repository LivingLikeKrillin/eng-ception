import type { SessionPayload } from '../types/v9'

/**
 * Static fixtures for design-review / offline iteration.
 * Toggled via VITE_USE_MOCK=true in .env.local — bypasses /api/chat entirely.
 *
 * Three fixtures cover the most-likely-to-surface speaking patterns and the
 * three otherwise-underrepresented ones (spec §7). Selected deterministically
 * by a length-based hash so the same input always yields the same fixture.
 */
export function mockSessionPayload(korean: string): Promise<SessionPayload> {
  const idx = hashIndex(korean, FIXTURES.length)
  const fixture = FIXTURES[idx]
  return new Promise((resolve) => setTimeout(() => resolve(fixture), 600))
}

function hashIndex(s: string, mod: number): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h) % mod
}

const FIX_CAUSATIVE_BARE: SessionPayload = {
  structureType: { id: 'cause-result', label: '원인 + 결과', category: '감정/관계' },
  pattern5h: {
    id: 'causative-bare',
    label: '사역 (make/have/let)',
    verbs: ['make', 'have', 'let'],
    structure: '주어 + 동사 + 목적어 + 동사원형/형용사',
    triggerVerb: 'make',
  },
  recognition: {
    isFiveHMoment: true,
    cue: '목적어의 결과/상태(화난 상태)까지 한 번에 말할 때 → 사역 5형식',
  },
  empathy: {
    echo: '그가 화내게 만들었어...',
    message: '말 한마디로 분위기 확 바뀌었지',
  },
  precheck: {
    question: '이걸 영어로 말한다면 뭐부터 꺼낼 것 같아?',
    choices: [
      { id: 'first', label: '내가 한 일부터', preview: '내가 뭔가 해서…' },
      { id: 'second', label: '그의 반응부터', preview: '그가 화났어…' },
    ],
    correctChoiceId: 'first',
  },
  structure: {
    parts: [
      { text: '그가 ', role: 'second' },
      { text: '화내게 ', role: 'pivot' },
      { text: '만들었어', role: 'first' },
    ],
    coreStructure: ['주체', '대상', '결과'],
    explanation: "한국어는 '그가' 먼저 나오지만, 영어에선 '내가 만들었다'가 앞으로 와.",
    comparison: {
      show: true,
      label: '5형식이 나은가, 간결형이 나은가',
      fiveH: {
        en: 'I made him angry.',
        note: "사역동사 'make'로 사건과 결과를 한 문장에 평평하게. 영어가 좋아하는 구조.",
      },
      simpler: {
        en: 'I caused his anger.',
        note: '단어 단위 직역. 사건과 결과가 분리돼 어색해.',
      },
      betterChoice: 'fiveH',
    },
    patternQuiz: {
      question: '이 문장에서 5형식 트리거 동사는?',
      options: [
        { id: 'a', text: 'made', hint: '~를 ~하게 만들다 (5형식 사역)', isCorrect: true },
        { id: 'b', text: 'caused', hint: '~를 야기시키다 (3형식)', isCorrect: false },
        { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false },
      ],
      feedback: "'made'야. make + 목적어 + 형용사로 결과를 직접 붙여.",
    },
  },
  assembly: {
    blocks: [
      { id: 'b1', en: 'I', order: 1 },
      { id: 'b2', en: 'made him', order: 2 },
      { id: 'b3', en: 'angry', order: 3 },
    ],
    blockRoles: ['subject', 'verb', 'complement'],
    connectors: [
      { id: 'period', label: '.', meaning: '한 문장으로 마무리', isCorrect: true },
      { id: 'so', label: 'so', meaning: '결과 강조용', isCorrect: false },
    ],
    finalSentence: 'I made him angry.',
  },
  feedback: {
    correctTitle: '맞았어',
    correctSub: '주어+사역동사+목적어+형용사 — 5형식 그대로',
    wrongTitle: '아쉬워',
    wrongSub: '여기는 made가 주인공이야',
    explanation: "'made + him + angry' 세 덩어리로 결과까지 한 번에. 'caused his anger'는 문법은 맞지만 영어 화자가 잘 안 써.",
    wordOrder: {
      korean: [
        { label: '그가', role: 'second' },
        { label: '화내게', role: 'pivot' },
        { label: '만들었어', role: 'first' },
      ],
      english: [
        { label: 'I', role: 'first' },
        { label: 'made', role: 'pivot' },
        { label: 'him angry', role: 'second' },
      ],
      reversed: true,
      keyInsight: "한국어는 '그가 → 결과' 순, 영어는 '내가 → made him → angry'. 사역동사가 어순까지 뒤집어.",
    },
    patternNote: "이 문장에서 핵심은 'made + 목적어 + 형용사'. '~를 ~하게 만들었다' 의미면 이 틀부터 떠올려.",
  },
  pattern: {
    template: 'I made him ~',
    patternId: 'causative-bare',
    tags: ['감정 표현', '사역', '결과 만들기'],
  },
}

const FIX_PERCEPTION: SessionPayload = {
  structureType: { id: 'observation', label: '목격 + 묘사', category: '경험/서사' },
  pattern5h: {
    id: 'perception',
    label: '지각동사',
    verbs: ['see', 'hear', 'watch'],
    structure: '주어 + 지각동사 + 목적어 + 동사원형/V-ing',
    triggerVerb: 'see',
  },
  recognition: {
    isFiveHMoment: true,
    cue: '본 장면(누가 무엇을 하는지)을 그대로 전할 때 → 지각동사 5형식',
  },
  empathy: {
    echo: '그녀가 우는 걸 봤어...',
    message: '말로 표현하기 묘한 장면이지',
  },
  precheck: {
    question: '이걸 영어로 말한다면 뭐부터 꺼낼 것 같아?',
    choices: [
      { id: 'first', label: '내가 봤다는 사실', preview: 'I saw…' },
      { id: 'second', label: '그녀의 행동', preview: 'She was crying…' },
    ],
    correctChoiceId: 'first',
  },
  structure: {
    parts: [
      { text: '그녀가 ', role: 'second' },
      { text: '우는 걸 ', role: 'pivot' },
      { text: '봤어', role: 'first' },
    ],
    coreStructure: ['주체', '장면', '관찰'],
    explanation: "한국어는 '우는 걸 봤어'로 명사화하지만 영어는 'saw her cry'로 동사를 그대로.",
    comparison: {
      show: true,
      label: '5형식이 나은가, 간결형이 나은가',
      fiveH: {
        en: 'I saw her cry.',
        note: '지각동사+목적어+동사원형. 장면을 한 호흡에 담는 영어식 압축.',
      },
      simpler: {
        en: 'I saw that she was crying.',
        note: 'that절은 문어체. 회화에선 무겁고 늘어져.',
      },
      betterChoice: 'fiveH',
    },
    patternQuiz: {
      question: '이 문장에서 5형식 트리거 동사는?',
      options: [
        { id: 'a', text: 'saw', hint: '지각동사 — 다음에 목적어+동사원형', isCorrect: true },
        { id: 'b', text: 'looked', hint: 'look은 자동사라 다른 패턴', isCorrect: false },
        { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false },
      ],
      feedback: "'saw'야. see/hear/watch는 다음에 'her cry' 같은 덩어리를 그대로 받아.",
    },
  },
  assembly: {
    blocks: [
      { id: 'b1', en: 'I', order: 1 },
      { id: 'b2', en: 'saw her', order: 2 },
      { id: 'b3', en: 'cry', order: 3 },
    ],
    blockRoles: ['subject', 'verb', 'complement'],
    connectors: [
      { id: 'period', label: '.', meaning: '문장 종결', isCorrect: true },
      { id: 'and', label: 'and', meaning: '뒤에 묘사 추가용', isCorrect: false },
    ],
    finalSentence: 'I saw her cry.',
  },
  feedback: {
    correctTitle: '맞았어',
    correctSub: 'saw + 목적어 + 동사원형 — 지각동사 5형식 그대로',
    wrongTitle: '아쉬워',
    wrongSub: '여기서는 cry를 동사 그대로 쓰는 게 핵심',
    explanation: "지각동사 see/hear/watch는 뒤에 '목적어 + 동사원형'을 그대로 받아. 'cry'를 'crying'으로 바꾸면 진행 중 장면을 강조하는 뉘앙스가 더해져.",
    wordOrder: {
      korean: [
        { label: '그녀가', role: 'second' },
        { label: '우는 걸', role: 'pivot' },
        { label: '봤어', role: 'first' },
      ],
      english: [
        { label: 'I', role: 'first' },
        { label: 'saw', role: 'pivot' },
        { label: 'her cry', role: 'second' },
      ],
      reversed: true,
      keyInsight: '한국어는 본 행위가 맨 뒤, 영어는 본 행위(saw)가 앞. 지각동사가 어순을 뒤집어.',
    },
    patternNote: "지각동사 saw/heard/watched + 목적어 + 동사원형. '~가 ~하는 걸 봤어' 의미면 이 틀.",
  },
  pattern: {
    template: 'I saw ~ cry',
    patternId: 'perception',
    tags: ['목격', '장면 묘사'],
  },
}

const FIX_DITRANSITIVE: SessionPayload = {
  structureType: { id: 'request-direct', label: '직접 부탁', category: '상황 대응' },
  pattern5h: {
    id: 'ditransitive',
    label: '수여동사 (4형식)',
    verbs: ['give', 'tell', 'show', 'send', 'bring'],
    structure: '주어 + 동사 + 간접목적어 + 직접목적어',
    triggerVerb: 'tell',
  },
  recognition: {
    isFiveHMoment: true,
    cue: '사람에게 무엇을 주거나 말해줄 때 → 수여동사 4형식',
  },
  empathy: {
    echo: '그 사실을 알려줘...',
    message: '솔직히 듣고 싶을 때가 있지',
  },
  precheck: {
    question: '이걸 영어로 말한다면 뭐부터 꺼낼 것 같아?',
    choices: [
      { id: 'first', label: '동사부터', preview: 'Tell me…' },
      { id: 'second', label: '대상부터', preview: 'The truth…' },
    ],
    correctChoiceId: 'first',
  },
  structure: {
    parts: [
      { text: '그 사실을 ', role: 'second' },
      { text: '알려', role: 'pivot' },
      { text: '줘', role: 'first' },
    ],
    coreStructure: ['청자', '내용', '요청'],
    explanation: "한국어는 '~을 ~해 줘'로 끝나지만, 영어는 'tell me the truth'처럼 동사부터 간접목적어, 직접목적어.",
    comparison: {
      show: true,
      label: '4형식이 나은가, 풀어 쓰는 게 나은가',
      fiveH: {
        en: 'Tell me the truth.',
        note: '수여동사 + 간접목적어(me) + 직접목적어(the truth). 두 목적어를 그대로 붙여.',
      },
      simpler: {
        en: 'Give the truth to me.',
        note: '문법은 맞지만, 일상 영어에선 더 짧은 4형식이 압도적으로 자연스러워.',
      },
      betterChoice: 'fiveH',
    },
    patternQuiz: {
      question: '이 문장에서 4형식 동사로 가장 자연스러운 건?',
      options: [
        { id: 'a', text: 'tell', hint: '사람에게 직접 말해주는 동사 (4형식)', isCorrect: true },
        { id: 'b', text: 'say', hint: 'say는 4형식으로 안 써', isCorrect: false },
        { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false },
      ],
      feedback: "'tell'이야. say/tell이 헷갈리는데, 'say'는 사람을 직접 받지 못해.",
    },
  },
  assembly: {
    blocks: [
      { id: 'b1', en: 'Tell', order: 1 },
      { id: 'b2', en: 'me', order: 2 },
      { id: 'b3', en: 'the truth', order: 3 },
    ],
    blockRoles: ['verb', 'object', 'object'],   // 4형식: IO(me)+DO(the truth) 모두 목적어 — BlockRole 에 IO/DO 구분 없음
    connectors: [
      { id: 'period', label: '.', meaning: '명령문 종결', isCorrect: true },
      { id: 'please', label: 'please', meaning: '예의 톤', isCorrect: false },
    ],
    finalSentence: 'Tell me the truth.',
  },
  feedback: {
    correctTitle: '맞았어',
    correctSub: 'tell + me + the truth — 4형식 그대로',
    wrongTitle: '아쉬워',
    wrongSub: '여기는 두 목적어를 그대로 붙이는 게 자연',
    explanation: '4형식 (수여동사) 패턴은 to/for 없이 사람과 내용을 차례로 붙여. give me a chance, send me a message — 같은 틀.',
    wordOrder: {
      korean: [
        { label: '그 사실을', role: 'second' },
        { label: '알려줘', role: 'first' },
      ],
      english: [
        { label: 'Tell', role: 'first' },
        { label: 'me', role: 'pivot' },
        { label: 'the truth', role: 'second' },
      ],
      reversed: true,
      keyInsight: '한국어는 내용 → 동사, 영어는 동사 → 사람 → 내용. 4형식 동사가 두 목적어를 끌고 와.',
    },
    patternNote: "수여동사 tell/give/show + 사람 + 내용. '~에게 ~을 ~해 줘' 의미면 이 틀.",
  },
  pattern: {
    template: 'Tell me ~',
    patternId: 'ditransitive',
    tags: ['부탁', '솔직 요청'],
  },
}

// v9.1 — a NON-5형식 moment: the natural English is simpler, and forcing a 5형식 would be
// overkill. Exported for tests; kept OUT of the random FIXTURES rotation so the e2e (which
// hashes over the 3 moment fixtures) stays deterministic.
export const FIX_SIMPLER: SessionPayload = {
  structureType: { id: 'impression', label: '분위기 인상', category: '묘사/인상' },
  recognition: {
    isFiveHMoment: false,
    cue: '단순한 인상/상태 전달은 5형식이 과해 — 간결형이 자연',
  },
  pattern5h: null,
  empathy: { echo: '그냥 거기 앉아 있기 좋았어...', message: '그 느낌, 꾸밈없이 말해도 충분해' },
  precheck: {
    question: '이걸 영어로 말한다면 뭐부터 꺼낼 것 같아?',
    choices: [
      { id: 'first', label: '느낌부터', preview: 'It was nice…' },
      { id: 'second', label: '장소부터', preview: 'That place…' },
    ],
    correctChoiceId: 'first',
  },
  structure: {
    parts: [
      { text: '그냥 거기 ', role: 'second' },
      { text: '앉아 있기 ', role: 'pivot' },
      { text: '좋았어', role: 'first' },
    ],
    coreStructure: ['장소', '행위', '느낌'],
    explanation: "단순한 인상은 'It was nice to ~'로 가볍게. 5형식으로 만들 필요가 없어.",
    comparison: {
      show: true,
      label: '5형식이 나은가, 간결형이 나은가',
      fiveH: {
        en: 'I found it a nice place to sit.',
        note: 'find + 목적어 + 보어로 만들 순 있지만 거추장스럽고 과해.',
      },
      simpler: {
        en: 'It was nice to just sit there.',
        note: '간결한 형태가 더 가볍고 자연스러워. 여긴 이게 정답.',
      },
      betterChoice: 'simpler',
    },
    patternQuiz: {
      question: '이 상황, 5형식이 필요할까?',
      options: [
        { id: 'a', text: '5형식으로 끌어올려', hint: '억지로 find/make를 쓰면 과해', isCorrect: false },
        { id: 'b', text: '간결하게 그대로', hint: '단순 인상은 간결형이 정답', isCorrect: true },
        { id: 'unsure', text: '잘 모르겠어', hint: '', isCorrect: false },
      ],
      feedback: '간결형이 정답. 모든 걸 5형식으로 만들 필욘 없어 — 단순 인상은 단순하게.',
    },
  },
  assembly: {
    blocks: [
      { id: 'b1', en: 'It', order: 1 },
      { id: 'b2', en: 'was', order: 2 },
      { id: 'b3', en: 'nice to just sit there', order: 3 },
    ],
    blockRoles: ['subject', 'verb', 'complement'],
    connectors: [
      { id: 'period', label: '.', meaning: '한 문장으로 마무리', isCorrect: true },
      { id: 'and', label: 'and', meaning: '내용 추가용', isCorrect: false },
    ],
    finalSentence: 'It was nice to just sit there.',
  },
  feedback: {
    correctTitle: '맞았어',
    correctSub: '간결형이 정답 — 5형식 안 써도 자연',
    wrongTitle: '아쉬워',
    wrongSub: '여긴 간결하게 가는 게 핵심',
    explanation: '모든 문장을 5형식으로 만들 필요는 없어. 단순 인상엔 간결형이 더 자연스럽고 가벼워.',
    wordOrder: {
      korean: [
        { label: '거기', role: 'second' },
        { label: '앉아 있기', role: 'pivot' },
        { label: '좋았어', role: 'first' },
      ],
      english: [
        { label: 'It was nice', role: 'first' },
        { label: 'to just sit there', role: 'second' },
      ],
      reversed: false,
      keyInsight: '간결형은 어순도 단순 — 굳이 뒤집을 5형식 구조가 없어.',
    },
    patternNote: "단순 인상엔 5형식 X. 'It was nice to ~'로 가볍게. (5형식은 결과·상태 말할 때 아껴)",
  },
  pattern: null,
}

const FIXTURES: SessionPayload[] = [FIX_CAUSATIVE_BARE, FIX_PERCEPTION, FIX_DITRANSITIVE]
