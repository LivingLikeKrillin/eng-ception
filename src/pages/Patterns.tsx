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
    <div className="flex-1 flex flex-col">
      <div className="px-6 pt-5 pb-4">
        <p className="text-[11px] font-semibold text-t4 mb-2 tracking-wider uppercase font-en">
          Library
        </p>
        <h1 className="text-[24px] font-bold tracking-tight text-t1">내 구조 패턴</h1>
      </div>

      <div className="px-6 pb-4 flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition ${
                active
                  ? 'bg-accent text-white'
                  : 'bg-c text-t3 hover:text-t2 border border-line'
              }`}
            >
              {cat}
            </button>
          )
        })}
      </div>

      <div className="flex-1 px-6 pb-6">
        {filtered.length === 0 ? (
          <p className="text-sm text-t4 text-center py-16">
            저장된 패턴이 없어요.<br />학습을 완료하면 패턴이 쌓여요.
          </p>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="bg-c border border-line rounded-[16px] p-5 space-y-3"
              >
                <p className="text-base font-semibold text-accent font-en leading-relaxed">
                  {p.template}
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="text-[11px] bg-accent/[0.08] text-accent px-2 py-1 rounded-md font-medium">
                    {p.category}
                  </span>
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] bg-c2 text-t3 px-2 py-1 rounded-md"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="bg-c2 rounded-[10px] p-3 space-y-1">
                  <p className="text-xs text-t4 leading-relaxed">{p.exampleOriginal}</p>
                  <p className="text-xs text-t2 font-medium font-en leading-relaxed">
                    {p.exampleEnglish}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-t4 font-en">
                    {new Date(p.savedAt).toLocaleDateString('ko-KR')}
                  </span>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-[11px] text-t4 hover:text-warn transition"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
