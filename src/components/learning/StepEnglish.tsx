import { useState } from 'react'
import { useLearningStore } from '../../store/learningStore'

export default function StepEnglish() {
  const { aiEasyKorean, submitEnglish, isLoading } = useLearningStore()
  const [text, setText] = useState('')

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-2">쉬운 한국어</p>
        <ul className="space-y-1">
          {(aiEasyKorean?.easyKorean ?? []).map((k, i) => (
            <li key={i} className="text-sm text-gray-700">{i + 1}. {k}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          위 내용을 영어로 말해보세요:
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="영어로 작성해보세요..."
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
        />
      </div>

      <button
        onClick={() => submitEnglish(text)}
        disabled={!text.trim() || isLoading}
        className="w-full bg-sky-500 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40 hover:bg-sky-600 transition"
      >
        {isLoading ? '분석 중...' : '제출하기'}
      </button>
    </div>
  )
}
