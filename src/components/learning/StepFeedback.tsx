import { useLearningStore, isAssemblyCorrect } from '../../store/learningStore'
import WordOrderCompare from './primitives/WordOrderCompare'

export default function StepFeedback() {
  const state = useLearningStore()
  const { payload, advanceToStep3 } = state
  if (!payload) return null

  const correct = isAssemblyCorrect(state)
  const title = correct ? payload.feedback.correctTitle : payload.feedback.wrongTitle
  const sub = correct ? payload.feedback.correctSub : payload.feedback.wrongSub

  return (
    <div className="space-y-5 fu">
      <div className="bg-c rounded-[16px] p-5 border border-line">
        <p className={`text-[20px] font-bold mb-3 ${correct ? 'text-ok' : 'text-warn'}`}>
          {title}
        </p>
        <p className="text-[14px] font-en text-t2 leading-relaxed mb-4">
          {payload.assembly.finalSentence}
        </p>
        <p className="text-[13px] text-t3 leading-relaxed">{sub}</p>
      </div>

      <div className="fu1 bg-c rounded-[16px] p-5 border border-line">
        <p className="text-[13px] text-t2 leading-[1.7]">{payload.feedback.explanation}</p>
      </div>

      <div className="fu2">
        <WordOrderCompare wordOrder={payload.feedback.wordOrder} />
      </div>

      <button
        onClick={() => void advanceToStep3()}
        className="pressable w-full h-[52px] rounded-[14px] bg-accent text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(139,139,245,0.25)] transition-all fu3"
      >
        이 패턴 내 걸로 만들기
      </button>
    </div>
  )
}
