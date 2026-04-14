import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { localStorageAdapter as db } from '../store/localStorage'
import { seedScenarios } from '../data/seed-scenarios'
import type { Scenario } from '../types'
import ScenarioCard from '../components/home/ScenarioCard'
import RecentLearning from '../components/home/RecentLearning'

export default function Home() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [quickInput, setQuickInput] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const existing = await db.getScenarios()
      if (existing.length === 0) {
        await db.saveScenarios(seedScenarios)
      }
      const unlearned = await db.getUnlearnedScenarios(3)
      setScenarios(unlearned)
    }
    load()
  }, [])

  const handleQuickStart = () => {
    if (quickInput.trim()) {
      navigate('/learn/custom', { state: { input: quickInput } })
    }
  }

  const canGo = quickInput.trim().length > 0

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-6 pt-5 flex justify-between items-center">
        <img src="/logo.png" alt="Eng-ception" className="w-28 h-28 object-contain -ml-3 -my-6" />
        <div className="fi flex items-center gap-1.5 bg-c rounded-full px-3 py-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" stroke="var(--color-accent)" strokeWidth="2" />
            <path d="M12 6v6l4 2" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-semibold font-en text-accent">4</span>
          <span className="text-xs text-t3">일째</span>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col justify-center px-6 py-10">
        {/* Hero */}
        <div className="fu mb-10">
          <p className="text-[15px] text-t3 mb-3 leading-relaxed">
            오늘도 말하고 싶었는데<br />입 안에서만 맴돌았지?
          </p>
          <h1 className="text-[30px] font-bold leading-[1.45] tracking-tight">
            그거, 여기다<br />
            <span className="text-accent">풀어봐.</span>
          </h1>
        </div>

        {/* Input */}
        <div
          className="fu1 bg-c rounded-[20px] p-5 border border-transparent focus-within:border-accent/40 transition-all"
        >
          <textarea
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="한국어로 그냥 적어봐. 맞춤법 신경 쓸 필요 없어."
            rows={3}
            className="w-full bg-transparent border-none text-t1 text-base leading-relaxed resize-none outline-none font-ko placeholder:text-t4"
          />
          <div className="flex justify-between items-center mt-3.5">
            <div className="flex items-center gap-2">
              <div className="w-[42px] h-[42px] rounded-[14px] bg-c2 flex items-center justify-center">
                <svg width="18" height="18" fill="none" stroke="var(--color-t3)" strokeWidth="1.7" viewBox="0 0 24 24">
                  <path d="M19 11a7 7 0 01-14 0M12 19v3m-4-3h8M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xs text-t4">또는 말해봐</span>
            </div>
            <button
              onClick={handleQuickStart}
              disabled={!canGo}
              className={`h-[42px] px-5 rounded-[14px] text-sm font-semibold transition-all ${
                canGo
                  ? 'bg-accent text-white shadow-[0_4px_20px_rgba(139,139,245,0.2)]'
                  : 'bg-c2 text-t4 cursor-default'
              }`}
            >
              풀어보기
            </button>
          </div>
        </div>

        {/* Try these — scenarios */}
        {scenarios.length > 0 && (
          <div className="fu2 mt-8">
            <p className="text-xs font-semibold text-t4 mb-3.5 tracking-wider uppercase font-en">
              Try these
            </p>
            <div className="flex flex-col gap-1.5">
              {scenarios.map((s) => (
                <ScenarioCard key={s.id} scenario={s} />
              ))}
            </div>
          </div>
        )}

        {/* Recent */}
        <div className="fu3 mt-8">
          <RecentLearning />
        </div>
      </div>
    </div>
  )
}
