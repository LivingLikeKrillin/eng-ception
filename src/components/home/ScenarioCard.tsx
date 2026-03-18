import { useNavigate } from 'react-router-dom'
import type { Scenario } from '../../types'

const difficultyColor = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
} as const

const difficultyLabel = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
} as const

export default function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColor[scenario.difficulty]}`}>
          {difficultyLabel[scenario.difficulty]}
        </span>
        <span className="text-xs text-gray-400">{scenario.category}</span>
      </div>
      <p className="text-xs text-gray-500">{scenario.situation}</p>
      <p className="text-base font-medium text-gray-800 leading-relaxed">
        "{scenario.originalKorean}"
      </p>
      <p className="text-xs text-gray-400">목적: {scenario.purpose}</p>
      <button
        onClick={() => navigate(`/learn/${scenario.id}`)}
        className="w-full bg-sky-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-sky-600 transition"
      >
        시작하기
      </button>
    </div>
  )
}
