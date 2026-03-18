import { useEffect, useState } from 'react'
import { localStorageAdapter as db } from '../store/localStorage'
import type { Pattern } from '../types'

const CATEGORIES = ['전체', '감정/관계', '의견/생각', '묘사/인상', '경험/서사', '상황 대응']

export default function Patterns() {
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [activeCategory, setActiveCategory] = useState('전체')

  useEffect(() => {
    db.getPatterns().then(setPatterns)
  }, [])

  const filtered = activeCategory === '전체'
    ? patterns
    : patterns.filter((p) => p.category === activeCategory)

  const handleDelete = async (id: string) => {
    await db.deletePattern(id)
    setPatterns((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">내 패턴 라이브러리</h1>

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
              activeCategory === cat
                ? 'bg-sky-500 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          저장된 패턴이 없습니다. 학습을 완료하면 패턴이 쌓여요.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
              <p className="text-base font-bold text-sky-700">{p.template}</p>
              <div className="flex gap-1 flex-wrap">
                {p.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="text-xs text-gray-500">{p.exampleOriginal}</p>
                <p className="text-xs text-gray-600 font-medium">{p.exampleEnglish}</p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">
                  {new Date(p.savedAt).toLocaleDateString('ko-KR')}
                </span>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
