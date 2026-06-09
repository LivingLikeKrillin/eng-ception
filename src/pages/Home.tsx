import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../store/db'
import { dueQueue, nextDueDate } from '../services/srsView'
import { computeStreak, reviewedToday, pickScenariosForHome, formatRelativeDay } from '../services/progress'
import { parseShareText } from '../services/shareTarget'
import { seedScenarios } from '../data/seed-scenarios'
import type { Scenario, Capture } from '../types'
import ScenarioCard from '../components/home/ScenarioCard'
import RecentLearning from '../components/home/RecentLearning'
import AuthControl from '../components/common/AuthControl'
import InstallBanner from '../components/common/InstallBanner'

export default function Home() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [quickInput, setQuickInput] = useState('')
  const [hasCompletedSession, setHasCompletedSession] = useState(false)
  const [dueCount, setDueCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [completedToday, setCompletedToday] = useState(false)
  const [nextDueLabel, setNextDueLabel] = useState<string | null>(null)
  const [captures, setCaptures] = useState<Capture[]>([])
  const shareConsumed = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      let scenarios = await db.getScenarios()
      if (scenarios.length === 0) {
        await db.saveScenarios(seedScenarios)
        scenarios = seedScenarios
      }
      const records = await db.getLearningRecords()
      const patterns = await db.getPatterns()
      const now = new Date()
      setScenarios(pickScenariosForHome(scenarios, records, 3))
      setHasCompletedSession(records.length > 0)
      setDueCount(dueQueue(patterns, now).length)
      setStreak(computeStreak(records, patterns, now))
      setCompletedToday(reviewedToday(records, patterns, now))
      setCaptures(await db.getCaptures())
      const nd = nextDueDate(patterns, now)
      const rel = nd ? formatRelativeDay(nd, now) : null
      setNextDueLabel(rel === '오늘' ? '곧' : rel)
    }
    load()
  }, [])

  // Web Share Target (GET): the OS opens the PWA at /?text=… Strip the query
  // SYNCHRONOUSLY (history.replaceState, not async router navigate) + a consumed ref so
  // StrictMode's double-mount can't create two captures before the URL clears.
  useEffect(() => {
    const text = parseShareText(window.location.search)
    if (!text || shareConsumed.current) return
    shareConsumed.current = true
    window.history.replaceState({}, '', '/')
    void (async () => {
      await db.saveCapture({ id: crypto.randomUUID(), korean: text, createdAt: new Date().toISOString(), source: 'share' })
      setCaptures(await db.getCaptures())
    })()
  }, [])

  const refreshCaptures = async () => setCaptures(await db.getCaptures())
  const handleSaveLater = async () => {
    const korean = quickInput.trim()
    if (!korean) return
    setQuickInput('') // clear synchronously so a fast double-tap can't capture the same text twice
    await db.saveCapture({ id: crypto.randomUUID(), korean, createdAt: new Date().toISOString(), source: 'manual' })
    await refreshCaptures()
  }
  const drillCapture = async (c: Capture) => {
    await db.deleteCapture(c.id)
    navigate('/learn/custom', { state: { input: c.korean } })
  }
  const discardCapture = async (id: string) => {
    await db.deleteCapture(id)
    await refreshCaptures()
  }

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
          {streak > 0 && (
            <div
              className={`fi flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${completedToday ? 'bg-accent/[0.10] border-accent/[0.30]' : 'bg-c border-line/60'}`}
              aria-label={`연속 학습 ${streak}일째${completedToday ? ', 오늘 완료' : ', 오늘 아직'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" stroke="var(--color-accent)" strokeWidth="2" />
                <path d="M12 6v6l4 2" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-[13px] font-bold font-en text-accent tabular-nums num-in">{streak}</span>
              <span className="text-xs text-t2">일째</span>
            </div>
          )}
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
          <div className="flex justify-end items-center gap-2 mt-3.5">
            <button
              onClick={() => void handleSaveLater()}
              disabled={!canGo}
              className={`pressable h-[42px] px-4 rounded-[14px] text-sm font-medium transition-all ${
                canGo ? 'bg-c2 text-t2 active:opacity-70' : 'bg-c2 text-t3 cursor-default'
              }`}
            >
              나중에
            </button>
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

        {/* SRS nudge — due count, or next-due fallback so the first run isn't dead */}
        {dueCount > 0 ? (
          <button
            onClick={() => navigate('/review')}
            className="fu2 mt-6 text-left text-sm text-accent font-semibold pressable active:opacity-70 transition"
          >
            복습할 회로 {dueCount}개 →
          </button>
        ) : nextDueLabel ? (
          <button
            onClick={() => navigate('/review')}
            className="fu2 mt-6 text-left text-sm text-t2 font-medium pressable active:opacity-70 transition"
          >
            다음 복습: {nextDueLabel} →
          </button>
        ) : null}

        {/* Capture inbox — stashed Korean to drill later */}
        {captures.length > 0 && (
          <div className="fu2 mt-8">
            <p className="text-xs font-semibold text-t3 mb-3.5 tracking-wider uppercase font-en">
              나중에 풀 거 {captures.length}
            </p>
            <div className="flex flex-col gap-1.5">
              {[...captures]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-2 px-4 py-3 bg-c rounded-[14px] border border-line">
                    <p className="flex-1 text-sm text-t2 truncate">{c.korean}</p>
                    <button
                      onClick={() => void drillCapture(c)}
                      className="text-[12px] text-accent font-semibold pressable active:opacity-70 shrink-0"
                    >
                      풀기
                    </button>
                    <button
                      onClick={() => void discardCapture(c.id)}
                      aria-label="삭제"
                      className="text-t3 hover:text-t2 transition shrink-0 px-1 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>
          </div>
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
