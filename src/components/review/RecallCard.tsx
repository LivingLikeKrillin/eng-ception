import { useState } from 'react'
import type { Pattern } from '../../types'
import type { Grade } from '../../services/srs'

interface Props {
  card: Pattern
  onGrade: (grade: Grade) => void
  onClose: () => void
}

// Self-rating → FSRS grade. 막힘=Again(1), 애매=Good(3), 정확=Easy(4).
const RATINGS: { label: string; grade: Grade; tone: string }[] = [
  { label: '막힘', grade: 1, tone: 'border-warn text-warn' },
  { label: '애매', grade: 3, tone: 'border-line text-t1' },
  { label: '정확', grade: 4, tone: 'border-ok text-ok' },
]

// Offline, no-API flashcard recall: Korean → (self-produce) → reveal stored English.
// Self-rating advances the FSRS schedule via applyReview (caller-wired).
export default function RecallCard({ card, onGrade, onClose }: Props) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div
      data-testid="recall-card"
      className="fixed inset-0 z-50 bg-bg flex flex-col px-6 pt-5 pb-8"
    >
      <div className="flex justify-end">
        <button onClick={onClose} aria-label="닫기" className="text-t3 hover:text-t1 transition text-2xl leading-none px-2">
          ×
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center text-center">
        <p className="text-[11px] font-semibold text-t3 mb-4 tracking-wider uppercase font-en">영어로 말해봐</p>
        <p className="text-[24px] font-bold leading-snug tracking-tight text-t1 mb-8">{card.exampleOriginal}</p>

        {revealed ? (
          <div className="fu">
            <p className="text-[20px] font-en text-accent font-semibold leading-relaxed">{card.exampleEnglish}</p>
            <p className="text-[13px] text-t3 font-en mt-2">{card.template}</p>
          </div>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="pressable mx-auto h-[48px] px-8 rounded-[14px] bg-c2 text-t1 text-[15px] font-semibold active:opacity-70 transition"
          >
            영어 보기
          </button>
        )}
      </div>

      {revealed && (
        <div className="grid grid-cols-3 gap-2 fu">
          {RATINGS.map((r) => (
            <button
              key={r.grade}
              onClick={() => onGrade(r.grade)}
              className={`pressable h-[52px] rounded-[14px] border-[1.5px] bg-c text-[15px] font-semibold active:opacity-70 transition ${r.tone}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
