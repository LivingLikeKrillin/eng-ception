import { useNavigate } from 'react-router-dom'
import type { Scenario } from '../../types'

const difficultyLabel = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
} as const

export default function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const navigate = useNavigate()

  const primary = scenario.category || difficultyLabel[scenario.difficulty]
  const extras = scenario.tags ?? []

  return (
    <div
      onClick={() => navigate(`/learn/${scenario.id}`)}
      className="group px-4 py-3.5 bg-c rounded-[14px] cursor-pointer border border-line/40 hover:border-accent/40 transition-all active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-accent bg-accent/[0.10] px-2 py-0.5 rounded-md">
            {primary}
          </span>
          {extras.map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-medium text-t3 bg-c2 px-2 py-0.5 rounded-md"
            >
              {tag}
            </span>
          ))}
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-t3 group-hover:text-accent transition-colors shrink-0"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <p className="text-[15px] leading-relaxed text-t1 font-medium">
        {scenario.originalKorean}
      </p>
    </div>
  )
}
