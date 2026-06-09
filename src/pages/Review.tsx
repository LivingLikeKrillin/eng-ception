import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../store/db'
import { dueQueue, nextDueDate } from '../services/srsView'
import { masterySummary, formatRelativeDay } from '../services/progress'
import { N_BYPASS, type Grade } from '../services/srs'
import { applyReview } from '../services/applyReview'
import { PATTERN_LABEL } from '../data/patternLabels'
import CircuitDiagnostic from '../components/review/CircuitDiagnostic'
import RecallCard from '../components/review/RecallCard'
import type { LearningRecord, Pattern } from '../types'

export default function Review() {
  const [records, setRecords] = useState<LearningRecord[]>([])
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [recallCard, setRecallCard] = useState<Pattern | null>(null)
  const navigate = useNavigate()

  const now = useMemo(() => new Date(), [])

  useEffect(() => {
    db.getLearningRecords().then((r) => setRecords(r.reverse()))
    db.getPatterns().then(setPatterns)
  }, [])

  const due = useMemo(() => dueQueue(patterns, now), [patterns, now])
  const nextDue = useMemo(() => nextDueDate(patterns, now), [patterns, now])
  const summary = useMemo(() => masterySummary(patterns), [patterns])

  // Offline recall: self-rate advances the FSRS schedule (no API, no LearningRecord).
  const handleRecallGrade = async (grade: Grade) => {
    const card = recallCard
    if (!card) return
    setRecallCard(null) // close first → buttons unmount, so a rapid double-tap can't double-grade
    await applyReview(card.patternId, card.triggerVerb, grade, new Date())
    setPatterns(await db.getPatterns()) // refresh due queue / summary
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 pt-5 pb-4">
        <p className="text-[11px] font-semibold text-t3 mb-2 tracking-wider uppercase font-en">
          Review
        </p>
        <h1 className="text-[24px] font-bold tracking-tight text-t1">복습</h1>
        {patterns.length > 0 && (
          <p className="text-[13px] text-t2 mt-1.5">
            회로 <span className="font-en font-semibold text-t1">{summary.circuits}</span>
            {' · '}숙련 <span className="font-en font-semibold text-accent">{summary.mastered}</span>
          </p>
        )}
      </div>

      <div className="flex-1 px-6 pb-6 space-y-8">
        {/* Due queue — SRS re-practice (all-caught-up state when empty) */}
        {patterns.length > 0 && (
          <section>
            <p className="text-[11px] font-semibold text-t3 mb-3 tracking-wider uppercase font-en">
              오늘 복습{due.length > 0 ? ` ${due.length}` : ''}
            </p>
            {due.length > 0 ? (
            <div className="space-y-2">
              {due.map((c) => (
                <div key={c.id} className="bg-c border border-line rounded-[14px] px-4 py-3 space-y-2">
                  <p className="text-sm text-t2 leading-relaxed">{c.exampleOriginal}</p>
                  <div className="flex justify-between items-center">
                    <span className="inline-block text-[11px] font-medium text-accent bg-accent/[0.08] px-2 py-0.5 rounded">
                      {PATTERN_LABEL[c.patternId]} · <span className="font-en">{c.triggerVerb}</span>
                      {c.bypassedCount >= N_BYPASS && <span className="ml-1 text-warn">· 회피 중</span>}
                    </span>
                    <button
                      onClick={() => setRecallCard(c)}
                      className="text-[11px] text-accent font-semibold hover:opacity-80 transition"
                    >
                      복습 →
                    </button>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="bg-c border border-line rounded-[14px] px-4 py-5 text-center">
                <p className="text-sm text-t2">오늘 복습 다 끝났어요 ✓</p>
                {nextDue && (
                  <p className="text-[11px] text-t3 mt-1">
                    다음 복습: {formatRelativeDay(nextDue, now) === '오늘' ? '곧' : formatRelativeDay(nextDue, now)}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Circuit Diagnostic — 2-layer mastery view */}
        {patterns.length > 0 && (
          <CircuitDiagnostic patterns={patterns} now={now} />
        )}

        {/* Saved Patterns */}
        {patterns.length > 0 && (
          <section>
            <p className="text-[11px] font-semibold text-t3 mb-3 tracking-wider uppercase font-en">
              Saved Patterns
            </p>
            <div className="space-y-2">
              {patterns.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="bg-c border border-line rounded-[14px] px-4 py-3"
                >
                  <p className="text-sm font-semibold text-accent font-en leading-relaxed">
                    {p.template}
                  </p>
                  <p className="text-[11px] text-t3 mt-1">{p.category}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <p className="text-[11px] font-semibold text-t3 mb-3 tracking-wider uppercase font-en">
            Sentences
          </p>
          {records.length === 0 ? (
            <p className="text-sm text-t3 text-center py-12">
              아직 학습 기록이 없어요.
            </p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="bg-c border border-line rounded-[14px] px-4 py-3 space-y-2"
                >
                  <p className="text-sm text-t2 leading-relaxed">{r.originalKorean}</p>
                  <span className="inline-block text-[11px] font-medium text-accent bg-accent/[0.08] px-2 py-0.5 rounded">
                    {PATTERN_LABEL[r.pattern5hId]} · <span className="font-en">{r.triggerVerb}</span>
                  </span>
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] text-t3 font-en">
                      {new Date(r.completedAt).toLocaleDateString('ko-KR')}
                    </p>
                    <button
                      onClick={() => {
                        if (r.scenarioId) navigate(`/learn/${r.scenarioId}`)
                        // Custom records ARE the core 복기 case — seed the Korean so the
                        // user re-practices instead of facing an empty input screen.
                        else navigate('/learn/custom', { state: { input: r.originalKorean } })
                      }}
                      className="text-[11px] text-accent font-semibold hover:opacity-80 transition"
                    >
                      다시 풀기 →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {recallCard && (
        <RecallCard card={recallCard} onGrade={handleRecallGrade} onClose={() => setRecallCard(null)} />
      )}
    </div>
  )
}
