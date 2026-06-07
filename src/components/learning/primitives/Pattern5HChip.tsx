import type { Pattern5HMeta } from '../../../types/v9'

interface Pattern5HChipProps {
  meta: Pattern5HMeta
  /** When true, render in a more prominent form for Step 0 hero. */
  hero?: boolean
}

export default function Pattern5HChip({ meta, hero = false }: Pattern5HChipProps) {
  if (hero) {
    return (
      <div className="bg-accent/[0.10] border border-accent/[0.20] rounded-[12px] p-3.5">
        <p className="text-[10px] font-semibold font-en text-accent tracking-wider uppercase mb-1.5">
          5형식 패턴
        </p>
        <p className="text-[15px] font-bold text-t1 mb-1">{meta.label}</p>
        <p className="text-[12px] text-t2 font-en leading-snug">{meta.structure}</p>
      </div>
    )
  }
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-accent/[0.10] border border-accent/[0.20]">
      <span className="text-[11px] font-semibold font-en text-accent tracking-wider uppercase">
        5형식
      </span>
      <span className="text-[13px] font-semibold text-t1">{meta.label}</span>
    </div>
  )
}
