import { useLearningStore } from '../../store/learningStore'
import FeedbackCard from '../common/FeedbackCard'

export default function StepAiEasyKorean() {
  const { aiEasyKorean, userEasyKorean, goToNextStep } = useLearningStore()
  if (!aiEasyKorean) return null

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-600 mb-2">나의 시도</p>
        <ul className="space-y-1">
          {userEasyKorean.map((d, i) => (
            <li key={i} className="text-sm text-gray-700">{i + 1}. {d}</li>
          ))}
        </ul>
      </div>

      <FeedbackCard
        title="AI 쉬운 한국어"
        items={[
          { label: '쉬운 한국어', content: aiEasyKorean.easyKorean },
          { label: '피드백', content: aiEasyKorean.feedback },
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
