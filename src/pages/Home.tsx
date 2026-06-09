import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../store/db'
import { dueQueue } from '../services/srsView'
import { seedScenarios } from '../data/seed-scenarios'
import type { Scenario } from '../types'
import ScenarioCard from '../components/home/ScenarioCard'
import RecentLearning from '../components/home/RecentLearning'
import AuthControl from '../components/common/AuthControl'
import InstallBanner from '../components/common/InstallBanner'

export default function Home() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [quickInput, setQuickInput] = useState('')
  const [hasCompletedSession, setHasCompletedSession] = useState(false)
  const [dueCount, setDueCount] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const existing = await db.getScenarios()
      if (existing.length === 0) {
        await db.saveScenarios(seedScenarios)
      }
      const unlearned = await db.getUnlearnedScenarios(3)
      setScenarios(unlearned)
      const records = await db.getLearningRecords()
      setHasCompletedSession(records.length > 0)
      const patterns = await db.getPatterns()
      setDueCount(dueQueue(patterns, new Date()).length)
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
        <div className="flex items-center gap-2">
          <AuthControl />
          <div className="fi flex items-center gap-1.5 bg-c rounded-full px-3 py-1.5 border border-line/60">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" stroke="var(--color-accent)" strokeWidth="2" />
              <path d="M12 6v6l4 2" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="text-[13px] font-bold font-en text-accent tabular-nums num-in">4</span>
            <span className="text-xs text-t2">일째</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col px-6 pt-8 pb-10">
        {/* Hero — brand moment: diagonal slash + blinking cursor echo the logo */}
        <div className="relative fu mb-10">
          <p className="text-[15px] text-t2 mb-3 leading-relaxed">
            오늘도 말하고 싶었는데<br />입 안에서만 맴돌았지?
          </p>
          <h1 className="text-[34px] font-bold leading-[1.3] tracking-tight">
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
            className="w-full bg-transparent border-none text-t1 text-base leading-relaxed resize-none outline-none font-ko placeholder:text-t3"
          />
          <div className="flex justify-between items-center mt-3.5">
            <div className="flex items-center gap-2">
              <div className="w-[42px] h-[42px] rounded-[14px] bg-c2 flex items-center justify-center">
                <svg width="18" height="18" fill="none" stroke="var(--color-t2)" strokeWidth="1.7" viewBox="0 0 24 24">
                  <path d="M19 11a7 7 0 01-14 0M12 19v3m-4-3h8M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xs text-t3">또는 말해봐</span>
            </div>
            <button
              onClick={handleQuickStart}
              disabled={!canGo}
              className={`pressable h-[42px] px-5 rounded-[14px] text-sm font-semibold transition-all ${
                canGo
                  ? 'bg-accent text-white shadow-[0_4px_20px_rgba(139,139,245,0.25)]'
                  : 'bg-c2 text-t3 cursor-default'
              }`}
            >
              풀어보기
            </button>
          </div>
        </div>

        {/* SRS nudge — due count */}
        {dueCount > 0 && (
          <button
            onClick={() => navigate('/review')}
            className="fu2 mt-6 text-left text-sm text-accent font-semibold"
          >
            복습할 회로 {dueCount}개 →
          </button>
        )}

        {/* Try these — scenarios */}
        {scenarios.length > 0 && (
          <div className="fu2 mt-8">
            <p className="text-xs font-semibold text-t3 mb-3.5 tracking-wider uppercase font-en">
              Try these
            </p>
            <div className="flex flex-col gap-1.5">
              {scenarios.map((s) => (
                <ScenarioCard key={s.id} scenario={s} />
              ))}
            </div>
          </div>
        )}

        {/* Install prompt — after the user has completed at least one session */}
        <div className="mt-8">
          <InstallBanner hasCompletedSession={hasCompletedSession} />
        </div>

        {/* Recent */}
        <div className="fu3 mt-8">
          <RecentLearning />
        </div>
      </div>
    </div>
  )
}
