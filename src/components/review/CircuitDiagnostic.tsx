import { useMemo, useState } from 'react'
import { rollupByPattern, masteryLabel } from '../../services/srsView'
import { N_BYPASS } from '../../services/srs'
import { PATTERN_LABEL } from '../../data/patternLabels'
import type { Pattern } from '../../types'
import type { Pattern5HId } from '../../types/v9'

interface Props {
  patterns: Pattern[]
  now: Date
}

export default function CircuitDiagnostic({ patterns, now }: Props) {
  const rollup = useMemo(() => rollupByPattern(patterns, now), [patterns, now])
  const [expanded, setExpanded] = useState<Set<Pattern5HId>>(new Set())

  if (rollup.length === 0) return null

  function toggle(id: Pattern5HId) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section>
      <p className="text-[11px] font-semibold text-t3 mb-3 tracking-wider uppercase font-en">
        회로 진단
      </p>
      <div className="space-y-2">
        {rollup.map((r) => (
          <div key={r.id} className="bg-c border border-line rounded-[14px] overflow-hidden">
            {/* Pattern row header */}
            <button
              onClick={() => toggle(r.id)}
              aria-expanded={expanded.has(r.id)}
              aria-label={`${PATTERN_LABEL[r.id]} ${expanded.has(r.id) ? '접기' : '펼치기'}`}
              className="pressable w-full flex justify-between items-center px-4 py-3 text-left active:opacity-70 transition"
            >
              <span className="text-sm font-semibold text-t1">
                {PATTERN_LABEL[r.id]}
              </span>
              <div className="flex items-center gap-2">
                {r.escalatedCount > 0 && (
                  <span className="text-[11px] font-semibold text-warn bg-warn/[0.08] px-2 py-0.5 rounded">
                    {r.escalatedCount} 회피 중
                  </span>
                )}
                {r.dueCount > 0 && (
                  <span className="text-[11px] font-semibold text-accent bg-accent/[0.08] px-2 py-0.5 rounded">
                    {r.dueCount}개 복습
                  </span>
                )}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`text-t3 transition-transform ${expanded.has(r.id) ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>

            {/* Expanded verb cards */}
            {expanded.has(r.id) && (
              <div className="border-t border-line divide-y divide-line/50">
                {r.cards.map((card) => {
                  const label = masteryLabel(card)
                  const labelColor =
                    label === '숙련' ? 'text-green-500' :
                    label === '학습중' ? 'text-accent' :
                    'text-t3'
                  const dueDate = card.nextDueAt
                    ? new Date(card.nextDueAt).toLocaleDateString('ko-KR')
                    : null
                  return (
                    <div key={card.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold font-en text-t1 shrink-0">
                          {card.triggerVerb}
                        </span>
                        <span className={`text-[11px] font-medium ${labelColor}`}>
                          {label}
                        </span>
                        {card.bypassedCount >= N_BYPASS && (
                          <span className="text-[11px] text-warn font-medium">· 회피 중</span>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-t3 shrink-0">
                        <span className="font-en">{card.reps}회</span>
                        {' · '}
                        <span>{dueDate ?? '새 카드'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
