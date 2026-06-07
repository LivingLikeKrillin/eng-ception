import type { SessionPayload } from '../../../types/v9'

interface ComparisonCardProps {
  comparison: SessionPayload['structure']['comparison']
}

export default function ComparisonCard({ comparison }: ComparisonCardProps) {
  if (!comparison.show) return null

  return (
    <div className="bg-c rounded-[16px] p-5 border border-line">
      <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-4">
        {comparison.label}
      </p>

      {/* 3형식 시도 (어색) */}
      <div className="p-3.5 rounded-[10px] bg-warn/[0.04] border border-warn/[0.10] mb-3">
        <p className="text-[10px] font-bold font-en text-warn tracking-wider uppercase mb-1.5">
          3형식 시도
        </p>
        <p className="text-[14px] font-en text-t1 leading-snug mb-2">
          {comparison.sansPattern.en}
        </p>
        <p className="text-[12px] text-t2 leading-relaxed">{comparison.sansPattern.whyAwkward}</p>
      </div>

      <div className="text-center text-[10px] text-t3 font-en tracking-wider mb-3">VS</div>

      {/* 5형식 자연 */}
      <div className="p-3.5 rounded-[10px] bg-ok/[0.04] border border-ok/[0.10]">
        <p className="text-[10px] font-bold font-en text-ok tracking-wider uppercase mb-1.5">
          5형식 자연
        </p>
        <p className="text-[14px] font-en text-t1 leading-snug mb-2">
          {comparison.withPattern.en}
        </p>
        <p className="text-[12px] text-t2 leading-relaxed">{comparison.withPattern.whyNatural}</p>
      </div>
    </div>
  )
}
