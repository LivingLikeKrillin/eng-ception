import type { SessionPayload } from '../types/v8'

/**
 * Static fixture for design-review / offline iteration.
 * Toggled via VITE_USE_MOCK=true in .env.local — bypasses /api/chat entirely.
 */
export function mockSessionPayload(korean: string): Promise<SessionPayload> {
  void korean
  return new Promise((resolve) => setTimeout(() => resolve(FIXTURE), 600))
}

const FIXTURE: SessionPayload = {
  structureType: {
    id: 'concession-claim',
    label: '양보 + 주장',
    category: '업무/논리',
  },
  empathy: {
    echo: '좋은 아이디어인 건 맞는데, 리소스가 부족...',
    message: '아, 이거 진짜 답답하지',
  },
  precheck: {
    question: '이걸 영어로 말한다면 뭐부터 꺼낼 것 같아?',
    choices: [
      { id: 'first', label: '인정부터', preview: '좋은 아이디어인 건 맞는데…' },
      { id: 'second', label: '걱정부터', preview: '리소스가 부족하지 않을까…' },
    ],
    correctChoiceId: 'first',
  },
  structure: {
    parts: [
      { text: '좋은 아이디어인 건 맞는데, ', role: 'first' },
      { text: '현실적으로 ', role: 'neutral' },
      { text: '리소스가 부족하지 않을까요?', role: 'second' },
    ],
    coreStructure: ['인정', '전환', '걱정'],
    explanation:
      "앞에서 '좋은 아이디어'라고 인정하고 나서, 뒤에서 '리소스가 부족하지 않을까'라고 걱정을 꺼내고 있어.",
    pivotQuiz: {
      question: '이 문장의 전환점은?',
      options: [
        { id: 'a', text: '맞는데', hint: "'좋긴 한데…' 하고 꺾는 지점", isCorrect: true },
        { id: 'b', text: '부족하지 않을까', hint: '걱정을 꺼내는 지점', isCorrect: false },
      ],
      feedback:
        "'맞는데'가 전환점이야. 앞의 인정을 뒤의 걱정으로 꺾어주는 역할을 해.",
    },
  },
  assembly: {
    blocks: [
      { id: 'b1', en: "That's a great idea", order: 1 },
      { id: 'b2', en: "I'm a bit concerned", order: 2 },
      { id: 'b3', en: 'we might not have enough resources', order: 3 },
    ],
    connectors: [
      { id: 'but', label: 'but', meaning: '강하고 직접적인 반대', isCorrect: true },
      { id: 'although', label: 'although', meaning: '살짝 부드러운 반대', isCorrect: false },
      { id: 'though', label: 'though', meaning: '문장 끝에 덧붙이는 식', isCorrect: false },
    ],
    finalSentence:
      "That's a great idea, but I'm a bit concerned we might not have enough resources.",
  },
  feedback: {
    correctTitle: '맞았어',
    correctSub: '어순이랑 연결어 둘 다 잘 잡았어',
    wrongTitle: '아쉬워',
    wrongSub: '여기는 이렇게 가는 게 맞아',
    explanation:
      '상대 의견을 먼저 인정하고 "but"으로 우려를 연결하면 공격적이지 않으면서 명확하게 전달돼. 회의에서 자주 쓰이는 순서야.',
    wordOrder: {
      korean: [
        { label: '인정', role: 'first' },
        { label: '걱정', role: 'second' },
      ],
      english: [
        { label: '인정', role: 'first' },
        { label: 'but', role: 'pivot', connectorLabel: 'but' },
        { label: '걱정', role: 'second' },
      ],
      reversed: false,
      keyInsight:
        '영어는 하고 싶은 말을 먼저 꺼내. 이 문장에서는 인정이 먼저, 걱정이 뒤 — 한국어와 같은 순서야. 다만 "but"이 전환점을 명확하게 찍어줘.',
    },
  },
  pattern: {
    template: "That's a great idea, but I'm a bit concerned ~",
    tags: ['회의 반대', '제안 거절', '피드백'],
  },
}
