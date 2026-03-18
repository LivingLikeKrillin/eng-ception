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
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-800">복습</h1>

      {patterns.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-gray-600">저장한 패턴</h2>
          {patterns.slice(0, 5).map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-bold text-sky-700">{p.template}</p>
              <p className="text-xs text-gray-400 mt-1">{p.category}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-gray-600">학습한 문장</h2>
        {records.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            아직 학습 기록이 없습니다.
          </p>
        ) : (
          records.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <p className="text-sm text-gray-700">"{r.originalKorean}"</p>
              <p className="text-xs text-gray-400">
                {new Date(r.completedAt).toLocaleDateString('ko-KR')}
              </p>
              <button
                onClick={() => {
                  if (r.scenarioId) navigate(`/learn/${r.scenarioId}`)
                  else navigate('/learn/custom')
                }}
                className="text-xs text-sky-500 hover:underline"
              >
                다시 풀기
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
