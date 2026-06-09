import { useState } from 'react'
import { useLearningStore } from '../../store/learningStore'
import OriginalCard from './primitives/OriginalCard'
import StructureTypeChip from './primitives/StructureTypeChip'
import Pattern5HChip from './primitives/Pattern5HChip'
import KoreanDecompose from './primitives/KoreanDecompose'
import ComparisonCard from './primitives/ComparisonCard'

export default function StepStructure() {
  const { payload, originalKorean, submitPatternQuiz, advanceToStep1 } = useLearningStore()
  const [answered, setAnswered] = useState<string | null>(null)
  const [hinted, setHinted] = useState(false)
  if (!payload) return null

  const { structure, pattern5h, structureType } = payload
  const correctOption = structure.patternQuiz.options.find((o) => o.isCorrect)

  // Verb pick finalizes the quiz. `unsure` records whether the hint scaffold was used first.
  const handlePick = (optId: string, isCorrect: boolean) => {
    if (answered) return
    setAnswered(optId)
    submitPatternQuiz({ correct: isCorrect, unsure: hinted })
  }

  // "잘 모르겠어" no longer reveals the answer (expert review 2026-05-18) — it surfaces a
  // hint and keeps the quiz open, forcing a second retrieval attempt (desirable difficulty).
  const handleHint = () => {
    if (answered || hinted) return
    setHinted(true)
  }

  return (
    <div className="space-y-6 fu">
      <OriginalCard korean={originalKorean} />

      {/* Two-chip header: 5형식 axis is primary (hero), 담화 type is secondary */}
      <div className="fu1 space-y-2.5">
        <Pattern5HChip meta={pattern5h} hero />
        <StructureTypeChip label={structureType.label} category={structureType.category} />
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

      {/* Conditional: ComparisonCard only when comparison.show === true */}
      <div className="fu3">
        <ComparisonCard comparison={structure.comparison} />
      </div>

      {/* patternQuiz — 3 options: 2 verbs + "잘 모르겠어" (de-emphasized) */}
      <div className="fu4">
        <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-3">
          {structure.patternQuiz.question}
        </p>
        <div className="space-y-2">
          {structure.patternQuiz.options
            .filter((o) => o.id !== 'unsure')
            .map((opt) => {
              const picked = answered === opt.id
              const reveal = answered !== null
              const correctStyle = reveal && opt.isCorrect
              const wrongStyle = picked && !opt.isCorrect
              return (
                <button
                  key={opt.id}
                  data-testid="quiz-verb"
                  onClick={() => handlePick(opt.id, opt.isCorrect)}
                  disabled={reveal}
                  className={`w-full p-3.5 rounded-[14px] border-[1.5px] text-left transition-all ${
                    correctStyle
                      ? 'border-ok bg-ok/[0.06]'
                      : wrongStyle
                        ? 'border-warn bg-warn/[0.06]'
                        : 'border-line bg-c'
                  }`}
                >
                  <p className="text-[14px] font-semibold font-en text-t1 mb-1">{opt.text}</p>
                  <p className="text-[11px] text-t3 leading-snug">{opt.hint}</p>
                </button>
              )
            })}
          {/* "잘 모르겠어" — de-emphasized; reveals a hint, does NOT end the quiz (Q3 + expert review) */}
          {structure.patternQuiz.options
            .filter((o) => o.id === 'unsure')
            .map((opt) => (
              <button
                key={opt.id}
                onClick={handleHint}
                disabled={hinted || answered !== null}
                className={`w-full p-2.5 rounded-[12px] border text-center transition-all ${
                  hinted
                    ? 'border-t3 bg-c2 text-t2'
                    : 'border-line/60 bg-transparent text-t3 hover:text-t2'
                }`}
              >
                <p className="text-[12px]">{hinted ? '힌트를 보고 다시 골라봐' : opt.text}</p>
              </button>
            ))}
        </div>

        {/* Hint scaffold: shown after "잘 모르겠어", before a verb is picked. Does not reveal which button is correct. */}
        {hinted && !answered && correctOption && (
          <div className="mt-3 p-3 rounded-[10px] bg-c2 border border-line" aria-live="polite">
            <p className="text-[11px] font-semibold text-t3 mb-1">힌트</p>
            <p className="text-xs text-t2 leading-relaxed">{correctOption.hint}</p>
          </div>
        )}

        {/* Answer feedback: only after a verb is picked */}
        {answered && (
          <div className="mt-3 p-3 rounded-[10px] bg-ok/[0.04] border border-ok/[0.10]" aria-live="polite">
            <p className="text-xs text-ok leading-relaxed font-medium">
              {structure.patternQuiz.feedback}
            </p>
          </div>
        )}
      </div>

      {/* Advance only after a verb pick — using the hint alone does not unlock "다음" */}
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
