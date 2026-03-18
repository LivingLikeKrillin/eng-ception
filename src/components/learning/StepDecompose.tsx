import { useState } from 'react'
import { useLearningStore } from '../../store/learningStore'

export default function StepDecompose() {
  const { originalKorean, submitDecomposition, isLoading } = useLearningStore()
  const [parts, setParts] = useState<string[]>(['', ''])

  const addField = () => {
    if (parts.length < 4) setParts([...parts, ''])
  }

  const updatePart = (i: number, value: string) => {
    const next = [...parts]
    next[i] = value
    setParts(next)
  }

  const canSubmit = parts.filter((p) => p.trim()).length >= 2

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-1">원문</p>
        <p className="text-base font-medium text-gray-800">"{originalKorean}"</p>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">
          이 문장의 핵심 의미를 2~3개로 나눠보세요:
        </p>
        <div className="space-y-2">
          {parts.map((part, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 w-6">{i + 1}.</span>
              <input
                type="text"
                value={part}
                onChange={(e) => updatePart(i, e.target.value)}
                placeholder={`뜻 단위 ${i + 1}`}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
          ))}
        </div>
        {parts.length < 4 && (
          <button onClick={addField} className="text-sm text-sky-500 mt-2 hover:underline">
            + 하나 더 추가
          </button>
        )}
      </div>

      <button
        onClick={() => submitDecomposition(parts.filter((p) => p.trim()))}
        disabled={!canSubmit || isLoading}
        className="w-full bg-sky-500 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40 hover:bg-sky-600 transition"
      >
        {isLoading ? '분석 중...' : '제출하기'}
      </button>
    </div>
  )
}
