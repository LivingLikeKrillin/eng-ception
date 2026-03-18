import { useState } from 'react'
import { useLearningStore } from '../../store/learningStore'

export default function StepEasyKorean() {
  const { aiDecompose, submitEasyKorean, isLoading } = useLearningStore()
  const decomposition = aiDecompose?.decomposition ?? []
  const [parts, setParts] = useState<string[]>(decomposition.map(() => ''))

  const updatePart = (i: number, value: string) => {
    const next = [...parts]
    next[i] = value
    setParts(next)
  }

  const canSubmit = parts.every((p) => p.trim().length > 0)

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-2">AI 의미 분해 결과</p>
        <ul className="space-y-1">
          {decomposition.map((d, i) => (
            <li key={i} className="text-sm text-gray-700">{i + 1}. {d}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          각 항목을 영어로 옮기기 쉬운 한국어로 바꿔보세요:
        </p>
        <div className="space-y-2">
          {decomposition.map((d, i) => (
            <div key={i}>
              <p className="text-xs text-gray-400 mb-1">"{d}" →</p>
              <input
                type="text"
                value={parts[i]}
                onChange={(e) => updatePart(i, e.target.value)}
                placeholder="쉬운 한국어로..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => submitEasyKorean(parts)}
        disabled={!canSubmit || isLoading}
        className="w-full bg-sky-500 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40 hover:bg-sky-600 transition"
      >
        {isLoading ? '분석 중...' : '제출하기'}
      </button>
    </div>
  )
}
