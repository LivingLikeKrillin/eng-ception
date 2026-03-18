import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLearningStore } from '../store/learningStore'
import { localStorageAdapter as db } from '../store/localStorage'
import LearningFlow from '../components/learning/LearningFlow'

export default function Learn() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentStep, startScenario, startCustom, originalKorean } = useLearningStore()
  const [customInput, setCustomInput] = useState('')
  const isCustom = id === 'custom' || !id

  useEffect(() => {
    if (!isCustom && id) {
      db.getScenario(id).then((scenario) => {
        if (scenario) startScenario(scenario)
        else navigate('/')
      })
    }
  }, [id, isCustom, startScenario, navigate])

  if (isCustom && currentStep === 'original') {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <button onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-gray-600">
          ← 뒤로
        </button>
        <h1 className="text-xl font-bold text-gray-800">내 문장 입력</h1>
        <p className="text-sm text-gray-500">영어로 말하고 싶은 한국어 문장을 입력하세요.</p>
        <textarea
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="예: 그 말이 틀렸다는 건 아닌데, 지금 상황에선 좀 안 맞는 것 같아."
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
        />
        <button
          onClick={() => startCustom(customInput)}
          disabled={!customInput.trim()}
          className="w-full bg-sky-500 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-40 hover:bg-sky-600 transition"
        >
          학습 시작
        </button>
      </div>
    )
  }

  if (!originalKorean && !isCustom) {
    return <div className="p-4 text-center text-gray-400">로딩 중...</div>
  }

  return (
    <div className="max-w-lg mx-auto py-6">
      <div className="px-4 mb-4">
        <button onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-gray-600">
          ← 뒤로
        </button>
      </div>
      <LearningFlow />
    </div>
  )
}
