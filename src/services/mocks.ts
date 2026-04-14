import type { ChatStep, StepResponseMap } from '../types'

/**
 * Static fixtures for design-review / offline iteration.
 * Toggled via VITE_USE_MOCK=true in .env.local — bypasses /api/chat entirely.
 * Content is intentionally rich and realistic so every UI surface (pull-quote
 * lead, list rows, ladder variants, pattern cards) has representative data.
 */

const mockRestructure: StepResponseMap['restructure'] = {
  whyHard:
    "이 문장은 '부정' → '한정' → '감정 전달'이라는 세 층이 한 번에 쌓여 있어요. 한국어는 '~는 건 아닌데'로 앞부분을 완곡하게 닫고 바로 감정을 내놓지만, 영어는 이런 중첩을 한 문장에 담기보다 두 문장으로 분리하는 편이 훨씬 자연스럽습니다.",
  restructured: [
    '네가 틀렸다는 뜻은 아니야.',
    '그냥 그 말이 나한테는 조금 아프게 들렸어.',
  ],
  feedback:
    '사용자가 쓴 재구성은 방향이 맞아요. "틀렸다는 말이 아니다"를 먼저 분리해낸 판단이 좋았고, 뒤에 감정만 담는 구조도 영어로 옮기기 쉬운 형태입니다.',
  hints: [
    "첫 문장은 'I\\'m not saying...'로 시작하는 게 가장 안전해요.",
    '두 번째 문장은 감정을 주어가 아닌 상황 탓으로 돌리는 게 덜 공격적입니다.',
  ],
}

const mockEnglish: StepResponseMap['english'] = {
  english: {
    safe: "I'm not saying you're wrong. But that hurt a little.",
    natural:
      "I'm not trying to say you're wrong — I just felt a bit hurt by what you said.",
    refined:
      "I don't mean to say you're wrong. It's just that what you said stung a little.",
  },
  feedback:
    "세 단계 모두 '공격하지 않으면서 감정을 전달한다'는 원래 의도를 지키고 있어요. Safe는 말문이 막혔을 때 바로 꺼낼 수 있는 최소 단위, Natural은 실제 대화에서 가장 자주 쓰이는 형태, Refined는 글로 쓸 때 더 어른스러운 톤이 납니다.",
}

const mockPattern: StepResponseMap['pattern'] = {
  patterns: [
    {
      template: "I'm not saying A. I just felt B.",
      category: '감정/관계',
      tags: ['완곡', '감정 전달'],
      exampleOriginal: '네가 틀렸다고 말하려는 건 아닌데, 그 말은 좀 서운했어.',
      exampleEnglish:
        "I'm not saying you're wrong. I just felt a little hurt by that.",
    },
    {
      template: "I don't mean to A. It's just that B.",
      category: '감정/관계',
      tags: ['해명', '부드러운 반박'],
      exampleOriginal: '반대하려는 건 아니고, 지금은 좀 부담스러워서 그래.',
      exampleEnglish:
        "I don't mean to push back. It's just that I'm feeling a bit overwhelmed right now.",
    },
  ],
}

const FIXTURES: StepResponseMap = {
  restructure: mockRestructure,
  english: mockEnglish,
  pattern: mockPattern,
}

export async function callClaudeMock<T extends ChatStep>(
  step: T,
): Promise<StepResponseMap[T]> {
  await new Promise((r) => setTimeout(r, 600))
  return FIXTURES[step] as StepResponseMap[T]
}
