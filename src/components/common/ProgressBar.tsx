import { useNavigate } from 'react-router-dom'
import type { V8Step } from '../../types/v8'

const STEP_ORDER: V8Step[] = ['step0', 'step1', 'step2', 'step3', 'step4']

interface ProgressBarProps {
  current: V8Step
  showBack?: boolean
}

export default function ProgressBar({ current, showBack = true }: ProgressBarProps) {
  const navigate = useNavigate()
  const idx = STEP_ORDER.indexOf(current)
  const total = STEP_ORDER.length
  const progress = idx >= 0 ? ((idx + 1) / total) * 100 : 0
  const isComplete = current === 'step4'

  return (
    <div className="px-6 pt-4 flex items-center gap-5">
      {showBack && !isComplete ? (
        <button
          onClick={() => navigate('/')}
          className="text-t2 hover:text-t1 transition"
          aria-label="뒤로"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <div className="w-5" />
      )}
      <div className="flex-1 h-[3px] bg-c2 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full bar-grow shadow-[0_0_12px_rgba(139,139,245,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs font-en text-t3 tabular-nums">
        {isComplete ? '✓' : `${idx + 1}/${total}`}
      </span>
    </div>
  )
}
