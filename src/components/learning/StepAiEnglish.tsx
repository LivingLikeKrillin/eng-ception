import { useLearningStore } from '../../store/learningStore'
import FeedbackCard from '../common/FeedbackCard'

export default function StepAiEnglish() {
  const { aiEnglish, userEnglish, extractPatterns, isLoading } = useLearningStore()
  if (!aiEnglish) return null

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-600 mb-2">나의 영어 시도</p>
        <p className="text-sm text-gray-700">{userEnglish}</p>
      </div>

      <FeedbackCard
        title="AI 단계별 영어"
        items={[
          { label: '짧고 안전한 영어', content: aiEnglish.english.safe },
          { label: '자연스러운 영어', content: aiEnglish.english.natural },
          { label: '더 정교한 영어', content: aiEnglish.english.refined },
          { label: '피드백', content: aiEnglish.feedback },
        ]}
      />

      <button
        onClick={extractPatterns}
        disabled={isLoading}
        className="w-full bg-sky-500 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40 hover:bg-sky-600 transition"
      >
        {isLoading ? '패턴 추출 중...' : '패턴 추출하기'}
      </button>
    </div>
  )
}
