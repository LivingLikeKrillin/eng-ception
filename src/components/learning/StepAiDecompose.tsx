import { useLearningStore } from '../../store/learningStore'
import FeedbackCard from '../common/FeedbackCard'

export default function StepAiDecompose() {
  const { aiDecompose, userDecomposition, goToNextStep } = useLearningStore()
  if (!aiDecompose) return null

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-600 mb-2">나의 시도</p>
        <ul className="space-y-1">
          {userDecomposition.map((d, i) => (
            <li key={i} className="text-sm text-gray-700">{i + 1}. {d}</li>
          ))}
        </ul>
      </div>

      <FeedbackCard
        title="AI 의미 분해"
        items={[
          { label: '분해 결과', content: aiDecompose.decomposition },
          { label: '피드백', content: aiDecompose.feedback },
          { label: '왜 이 문장이 영어로 어려운가', content: aiDecompose.whyHard },
        ]}
      />

      <button
        onClick={goToNextStep}
        className="w-full bg-sky-500 text-white rounded-lg py-3 text-sm font-medium hover:bg-sky-600 transition"
      >
        다음 단계로
      </button>
    </div>
  )
}
