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
