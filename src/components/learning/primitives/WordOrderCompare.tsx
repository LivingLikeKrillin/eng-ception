import type { WordOrder, WordOrderToken, PartRole } from '../../../types/v8'

interface WordOrderCompareProps {
  wordOrder: WordOrder
}

const ROLE_CHIP: Record<PartRole, string> = {
  first: 'bg-ok/[0.06] border border-ok/[0.12] text-ok',
  pivot: 'text-accent font-bold',
  second: 'bg-warn/[0.06] border border-warn/[0.12] text-warn',
  neutral: 'text-t3',
}

function RoleChip({ token }: { token: WordOrderToken }) {
  if (token.role === 'pivot') {
    return (
      <span className="px-2 py-1.5 text-[13px] font-bold font-en text-accent">
        {token.connectorLabel ?? token.label}
      </span>
    )
  }
  return (
    <span
      className={`px-3 py-1.5 rounded-[8px] text-[13px] font-semibold ${ROLE_CHIP[token.role]}`}
    >
      {token.label}
    </span>
  )
}

export default function WordOrderCompare({ wordOrder }: WordOrderCompareProps) {
  return (
    <div className="bg-c rounded-[16px] p-5 border border-line">
      <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-3">
        한국어
      </p>
      <div className="flex gap-1.5 items-center flex-wrap">
        {wordOrder.korean.map((t, i) => (
          <RoleChip key={`k-${i}`} token={t} />
        ))}
      </div>

      <div className="flex items-center gap-2 mt-5 mb-3">
        <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase">
          English
        </p>
        {wordOrder.reversed && (
          <span className="text-[9px] font-bold font-en text-accent bg-accent/[0.08] px-1.5 py-0.5 rounded tracking-wider">
            REVERSED
          </span>
        )}
      </div>
      <div className="flex gap-1.5 items-center flex-wrap">
        {wordOrder.english.map((t, i) => (
          <RoleChip key={`e-${i}`} token={t} />
        ))}
      </div>

      <div className="mt-5 p-3.5 bg-accent/[0.03] border border-accent/[0.06] rounded-[10px]">
        <p className="text-xs text-t2 leading-relaxed">
          <span className="font-semibold text-accent">핵심:</span> {wordOrder.keyInsight}
        </p>
      </div>
    </div>
  )
}
