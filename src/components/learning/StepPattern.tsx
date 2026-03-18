import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLearningStore } from '../../store/learningStore'

export default function StepPattern() {
  const { aiPattern, savePattern, saveRecord, reset } = useLearningStore()
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set())
  const navigate = useNavigate()

  if (!aiPattern) return null

  const handleSave = async (index: number) => {
    await savePattern(index)
    setSavedIndexes((prev) => new Set([...prev, index]))
  }

  const handleComplete = async () => {
    await saveRecord()
    reset()
    navigate('/')
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-700">추출된 패턴</h3>

      {aiPattern.patterns.map((p, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          <p className="text-base font-bold text-sky-700">{p.template}</p>
          <p className="text-xs text-gray-400">{p.category} · {p.tags.join(', ')}</p>
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-gray-500">한국어: {p.exampleOriginal}</p>
            <p className="text-xs text-gray-500">영어: {p.exampleEnglish}</p>
          </div>
          <button
            onClick={() => handleSave(i)}
            disabled={savedIndexes.has(i)}
            className={`w-full rounded-lg py-2 text-sm font-medium transition ${
              savedIndexes.has(i)
                ? 'bg-green-100 text-green-600'
                : 'bg-sky-100 text-sky-600 hover:bg-sky-200'
            }`}
          >
            {savedIndexes.has(i) ? '저장됨' : '패턴 저장하기'}
          </button>
        </div>
      ))}

      <button
        onClick={handleComplete}
        className="w-full bg-sky-500 text-white rounded-lg py-3 text-sm font-medium hover:bg-sky-600 transition"
      >
        학습 완료
      </button>
    </div>
  )
}
