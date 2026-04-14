import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { localStorageAdapter as db } from '../store/localStorage'
import type { LearningRecord, Pattern } from '../types'

export default function Review() {
  const [records, setRecords] = useState<LearningRecord[]>([])
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    db.getLearningRecords().then((r) => setRecords(r.reverse()))
    db.getPatterns().then(setPatterns)
  }, [])

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 pt-5 pb-4">
        <p className="text-[11px] font-semibold text-t3 mb-2 tracking-wider uppercase font-en">
          Review
        </p>
        <h1 className="text-[24px] font-bold tracking-tight text-t1">복습</h1>
      </div>

      <div className="flex-1 px-6 pb-6 space-y-8">
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
                  <div className="flex justify-between items-center">
                    <p className="text-[11px] text-t3 font-en">
                      {new Date(r.completedAt).toLocaleDateString('ko-KR')}
                    </p>
                    <button
                      onClick={() => {
                        if (r.scenarioId) navigate(`/learn/${r.scenarioId}`)
                        else navigate('/learn/custom')
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
    </div>
  )
}
