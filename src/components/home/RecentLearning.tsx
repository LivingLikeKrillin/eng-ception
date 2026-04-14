import { useEffect, useState } from 'react'
import { localStorageAdapter as db } from '../../store/localStorage'
import type { LearningRecord } from '../../types'

export default function RecentLearning() {
  const [records, setRecords] = useState<LearningRecord[]>([])

  useEffect(() => {
    db.getLearningRecords().then((r) => setRecords(r.slice(-3).reverse()))
  }, [])

  if (records.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold text-t3 mb-3.5 tracking-wider uppercase font-en">
        Recent
      </p>
      <div className="flex flex-col gap-1.5">
        {records.map((r) => (
          <div key={r.id} className="px-4 py-3 bg-c rounded-[14px] border border-transparent">
            <p className="text-sm text-t2 truncate">{r.originalKorean}</p>
            <p className="text-[11px] text-t3 mt-0.5 font-en">
              {new Date(r.completedAt).toLocaleDateString('ko-KR')}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
