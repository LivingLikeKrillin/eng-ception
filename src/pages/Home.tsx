import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { localStorageAdapter as db } from '../store/localStorage'
import { seedScenarios } from '../data/seed-scenarios'
import type { Scenario } from '../types'
import ScenarioCard from '../components/home/ScenarioCard'
import RecentLearning from '../components/home/RecentLearning'

export default function Home() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const existing = await db.getScenarios()
      if (existing.length === 0) {
        await db.saveScenarios(seedScenarios)
      }
      const unlearned = await db.getUnlearnedScenarios(2)
      setScenarios(unlearned)
    }
    load()
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Eng-ception</h1>
      <p className="text-sm text-gray-500">번역하지 말고, 말할 수 있게 바꾸자.</p>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-600">오늘의 시나리오</h2>
        {scenarios.length > 0 ? (
          scenarios.map((s) => <ScenarioCard key={s.id} scenario={s} />)
        ) : (
          <p className="text-sm text-gray-400">모든 시나리오를 완료했습니다!</p>
        )}
      </div>

      <button
        onClick={() => navigate('/learn/custom')}
        className="w-full bg-white border-2 border-dashed border-gray-300 rounded-xl py-4 text-sm text-gray-500 hover:border-sky-400 hover:text-sky-500 transition"
      >
        내 문장 직접 입력하기
      </button>

      <RecentLearning />
    </div>
  )
}
