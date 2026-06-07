import { useEffect, useState } from 'react'
import { localStorageAdapter as db } from '../store/localStorage'
import type { Pattern } from '../types'
import type { Pattern5HId } from '../types/v9'

const GROUPS_5H: { id: Pattern5HId; label: string }[] = [
  { id: 'causative-bare',   label: '사역 (make/have/let)' },
  { id: 'causative-toV',    label: '사역 (get + to V)' },
  { id: 'causative-result', label: '사역 결과 (get/have + pp)' },
  { id: 'perception',       label: '지각동사' },
  { id: 'want-toV',         label: '요청/희망 + to V' },
  { id: 'judgment',         label: '판단·명명' },
  { id: 'ditransitive',     label: '수여동사 (4형식)' },
]

const CATEGORIES = ['전체', '감정/관계', '의견/생각', '묘사/인상', '경험/서사', '상황 대응']

function PatternCard({ p, onDelete }: { p: Pattern; onDelete: (id: string) => void }) {
  return (
    <div className="bg-c border border-line rounded-[16px] p-5 space-y-3">
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className="text-base font-semibold text-accent font-en leading-relaxed">{p.template}</p>
        {/* triggerVerb shown next to template — templates are verb-specific (Q5) */}
        <span className="text-[12px] font-en font-bold text-accent bg-accent/[0.10] px-2 py-0.5 rounded">
          {p.triggerVerb}
        </span>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        <span className="text-[11px] bg-accent/[0.08] text-accent px-2 py-1 rounded-md font-medium">
          {p.category}
        </span>
        {p.tags.map((tag) => (
          <span key={tag} className="text-[11px] bg-c2 text-t3 px-2 py-1 rounded-md">
            #{tag}
          </span>
        ))}
      </div>
      <div className="bg-c2 rounded-[10px] p-3 space-y-1">
        <p className="text-xs text-t2 leading-relaxed">{p.exampleOriginal}</p>
        <p className="text-xs text-t2 font-medium font-en leading-relaxed">{p.exampleEnglish}</p>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-t3 font-en">
          {new Date(p.savedAt).toLocaleDateString('ko-KR')}
        </span>
        <button
          onClick={() => onDelete(p.id)}
          className="text-[11px] text-t2 hover:text-warn transition"
        >
          삭제
        </button>
      </div>
    </div>
  )
}

export default function Patterns() {
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [activeCategory, setActiveCategory] = useState('전체')

  useEffect(() => {
    db.getPatterns().then(setPatterns)
  }, [])

  const handleDelete = async (id: string) => {
    await db.deletePattern(id)
    setPatterns((prev) => prev.filter((p) => p.id !== id))
  }

  const filtered = activeCategory === '전체'
    ? patterns
    : patterns.filter((p) => p.category === activeCategory)

  // Primary nav: only render 5형식 groups that actually have saved patterns.
  const activeGroups = GROUPS_5H.filter((g) => patterns.some((p) => p.patternId === g.id))

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 pt-5 pb-4">
        <p className="text-[11px] font-semibold text-t3 mb-2 tracking-wider uppercase font-en">
          Library
        </p>
        <h1 className="text-[24px] font-bold tracking-tight text-t1">내 구조 패턴</h1>
      </div>

      {patterns.length === 0 ? (
        <p className="text-sm text-t3 text-center py-16">
          저장된 패턴이 없어요.<br />학습을 완료하면 패턴이 쌓여요.
        </p>
      ) : (
        <div className="flex-1 px-6 pb-6 space-y-10">
          {/* === Primary: 5형식 패턴 === */}
          <section>
            <p className="text-[11px] font-semibold text-t3 mb-4 tracking-wider uppercase font-en">
              5형식 패턴
            </p>
            <div className="space-y-6">
              {activeGroups.map((group) => (
                <div key={group.id}>
                  <h3 className="text-[13px] font-semibold text-t1 mb-2.5">{group.label}</h3>
                  <div className="space-y-2.5">
                    {patterns
                      .filter((p) => p.patternId === group.id)
                      .map((p) => (
                        <PatternCard key={p.id} p={p} onDelete={handleDelete} />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* === Secondary: 담화 유형 (category filter) === */}
          <section>
            <p className="text-[11px] font-semibold text-t3 mb-3 tracking-wider uppercase font-en">
              담화 유형
            </p>
            <div className="pb-4 flex gap-1.5 flex-wrap">
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
            <div className="space-y-2.5">
              {filtered.map((p) => (
                <PatternCard key={p.id} p={p} onDelete={handleDelete} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
