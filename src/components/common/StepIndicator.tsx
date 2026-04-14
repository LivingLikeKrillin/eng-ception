import { useNavigate } from 'react-router-dom'
import type { LearningStep } from '../../types'

const ORDER: LearningStep[] = ['restructure', 'english', 'pattern']

export default function StepIndicator({ current }: { current: LearningStep }) {
  const navigate = useNavigate()
  const idx = ORDER.indexOf(current)
  const total = ORDER.length
  const progress = ((idx + 1) / total) * 100

  return (
    <div className="px-6 pt-4 flex items-center gap-5">
      <button
        onClick={() => navigate('/')}
        className="text-t4 hover:text-t2 transition"
        aria-label="뒤로"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
          <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="flex-1 h-[3px] bg-c2 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs font-en text-t4 tabular-nums">
        {idx + 1}/{total}
      </span>
    </div>
  )
}
