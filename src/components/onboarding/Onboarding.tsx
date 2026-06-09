import { useState } from 'react'

interface Props {
  // startSeed=true → jump into a curated first session; false → just close to Home.
  onFinish: (startSeed: boolean) => void
}

const CARDS = [
  {
    title: '말문 막힌 순간,\n여기다 풀어봐.',
    body: '하고 싶었는데 입에서만 맴돈 그 한국어. 그냥 적으면, 영어로 옮기기 쉬운 구조로 같이 재배치해줄게.',
  },
  {
    title: '5형식이\n늘 정답은 아냐.',
    body: '“그 말 서운했어 → That made me feel hurt”처럼 끌어올릴 때도, 그냥 간결하게 가는 게 나을 때도 있어. 언제 쓰는지 그 감을 키우는 게 목표야.',
  },
] as const

export default function Onboarding({ onFinish }: Props) {
  const [card, setCard] = useState(0)
  const isLast = card === CARDS.length // CARDS.length index = the CTA card

  return (
    <div data-testid="onboarding" className="fixed inset-0 z-50 bg-bg flex flex-col px-6 pt-5 pb-8">
      <div className="flex justify-end">
        <button
          onClick={() => onFinish(false)}
          className="text-[13px] text-t3 hover:text-t2 transition px-2"
        >
          건너뛰기
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {!isLast ? (
          <div className="fu">
            <h1 className="text-[30px] font-bold leading-[1.35] tracking-tight whitespace-pre-line mb-5">
              {CARDS[card].title}
            </h1>
            <p className="text-[15px] text-t2 leading-relaxed">{CARDS[card].body}</p>
          </div>
        ) : (
          <div className="fu text-center">
            <h1 className="text-[28px] font-bold leading-[1.4] tracking-tight mb-4">
              예시 하나로<br /><span className="text-accent">바로 시작</span>해볼까?
            </h1>
            <p className="text-[14px] text-t3 leading-relaxed">3분이면 한 문장 끝나.</p>
          </div>
        )}
      </div>

      {/* dots */}
      <div className="flex justify-center gap-1.5 mb-5">
        {Array.from({ length: CARDS.length + 1 }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === card ? 'w-5 bg-accent' : 'w-1.5 bg-line'}`}
          />
        ))}
      </div>

      {!isLast ? (
        <button
          onClick={() => setCard((c) => c + 1)}
          className="pressable w-full h-[52px] rounded-[14px] bg-accent text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(139,139,245,0.25)] transition-all"
        >
          다음
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onFinish(true)}
            className="pressable w-full h-[52px] rounded-[14px] bg-accent text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(139,139,245,0.25)] transition-all"
          >
            시작하기
          </button>
          <button
            onClick={() => onFinish(false)}
            className="pressable w-full h-[48px] rounded-[14px] bg-c2 text-t2 text-[14px] font-medium active:opacity-70 transition"
          >
            둘러보기
          </button>
        </div>
      )}
    </div>
  )
}
