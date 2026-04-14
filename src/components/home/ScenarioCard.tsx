import { useNavigate } from 'react-router-dom'
import type { Scenario } from '../../types'

const difficultyLabel = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
} as const

export default function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/learn/${scenario.id}`)}
      className="px-4 py-3 bg-c rounded-[14px] cursor-pointer border border-transparent hover:border-line transition-all active:scale-[0.99]"
    >
      <div className="flex justify-between items-center">
        <p className="text-sm leading-snug text-t2 flex-1 pr-2.5 line-clamp-2">
          {scenario.originalKorean}
        </p>
        <span className="text-[11px] text-t4 bg-c2 px-2 py-0.5 rounded-md whitespace-nowrap">
          {scenario.category || difficultyLabel[scenario.difficulty]}
        </span>
      </div>
    </div>
  )
}
