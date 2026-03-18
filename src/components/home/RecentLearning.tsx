import { useEffect, useState } from 'react'
import { localStorageAdapter as db } from '../../store/localStorage'
import type { LearningRecord } from '../../types'

export default function RecentLearning() {
  const [records, setRecords] = useState<LearningRecord[]>([])

  useEffect(() => {
    db.getLearningRecords().then((r) => setRecords(r.slice(-5).reverse()))
  }, [])

  if (records.length === 0) return null

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-gray-600">최근 학습</h2>
      {records.map((r) => (
        <div key={r.id} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
          <p className="text-sm text-gray-700 truncate">"{r.originalKorean}"</p>
          <p className="text-xs text-gray-400">
            {new Date(r.completedAt).toLocaleDateString('ko-KR')}
          </p>
        </div>
      ))}
    </div>
  )
}
