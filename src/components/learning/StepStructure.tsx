import { useState } from 'react'
import { useLearningStore } from '../../store/learningStore'
import OriginalCard from './primitives/OriginalCard'
import StructureTypeChip from './primitives/StructureTypeChip'
import KoreanDecompose from './primitives/KoreanDecompose'

export default function StepStructure() {
  const { payload, originalKorean, submitPivotQuiz, advanceToStep1 } = useLearningStore()
  const [answered, setAnswered] = useState<string | null>(null)
  if (!payload) return null

  const { structure } = payload

  const handlePick = (optId: string, isCorrect: boolean) => {
    if (answered) return
    setAnswered(optId)
    submitPivotQuiz(isCorrect ? 'correct' : 'wrong')
  }

  return (
    <div className="space-y-6 fu">
      <OriginalCard korean={originalKorean} />

      <div className="fu1">
        <StructureTypeChip label={payload.structureType.label} category={payload.structureType.category} />
      </div>

      <div className="fu2 bg-c rounded-[16px] p-[18px] border border-line">
        <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-2">
          이 문장이 하는 일
        </p>
        <KoreanDecompose parts={structure.parts} />
        <div className="mt-3.5 pt-3 border-t border-line">
          <p className="text-xs text-t2 leading-relaxed">
            <span className="font-semibold text-t3">핵심 구조:</span>{' '}
            {structure.coreStructure.join(' → ')}
          </p>
        </div>
      </div>

      <div className="fu3">
        <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-3">
          {structure.pivotQuiz.question}
        </p>
        <div className="flex gap-2">
          {structure.pivotQuiz.options.map((opt) => {
            const picked = answered === opt.id
            const reveal = answered !== null
            const correctStyle = reveal && opt.isCorrect
            const wrongStyle = picked && !opt.isCorrect
            return (
              <button
                key={opt.id}
                onClick={() => handlePick(opt.id, opt.isCorrect)}
                disabled={reveal}
                className={`flex-1 p-3.5 rounded-[14px] border-[1.5px] text-left transition-all ${
                  correctStyle
                    ? 'border-ok bg-ok/[0.06]'
                    : wrongStyle
                      ? 'border-warn bg-warn/[0.06]'
                      : 'border-line bg-c'
                }`}
              >
                <p className="text-[13px] font-semibold text-t1 mb-1">{opt.text}</p>
                <p className="text-[11px] text-t3 leading-snug">{opt.hint}</p>
              </button>
            )
          })}
        </div>
        {answered && (
          <div className="mt-3 p-3 rounded-[10px] bg-ok/[0.04] border border-ok/[0.10]">
            <p className="text-xs text-ok leading-relaxed font-medium">
              {structure.pivotQuiz.feedback}
            </p>
          </div>
        )}
      </div>

      {answered && (
        <button
          onClick={advanceToStep1}
          className="pressable w-full h-[52px] rounded-[14px] bg-accent text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(139,139,245,0.25)] transition-all fu4"
        >
          다음 →
        </button>
      )}
    </div>
  )
}
