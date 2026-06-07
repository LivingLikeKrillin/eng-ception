import { useLearningStore } from '../../store/learningStore'
import OriginalCard from './primitives/OriginalCard'

export default function StepPrecheck() {
  const { payload, originalKorean, precheckChoice, submitPrecheck } = useLearningStore()
  if (!payload) return null

  return (
    <div className="space-y-8 fu">
      <OriginalCard korean={originalKorean} />

      <div className="fu1">
        <h2 className="text-[22px] font-bold leading-snug tracking-tight text-t1 mb-1">
          이걸 영어로 말한다면
        </h2>
        <p className="text-[15px] text-t2 leading-relaxed">
          {payload.precheck.question.replace('이걸 영어로 말한다면 ', '')}
        </p>
      </div>

      <div className="fu2 flex gap-2">
        {payload.precheck.choices.map((choice) => {
          const selected = precheckChoice === choice.id
          return (
            <button
              key={choice.id}
              onClick={() => submitPrecheck(choice.id)}
              className={`pressable flex-1 p-5 rounded-[14px] text-left transition-all ${
                selected
                  ? 'bg-accent/[0.10] border-[1.5px] border-accent text-t1'
                  : 'bg-c border-[1.5px] border-line text-t1'
              }`}
            >
              <p className="text-[15px] font-semibold mb-1">{choice.label}</p>
              <p className="text-[12px] text-t3 leading-snug">{choice.preview}</p>
            </button>
          )
        })}
      </div>

      <p className="fu3 text-center text-xs text-t3">정답은 없어. 지금 직감대로 골라봐.</p>
    </div>
  )
}
