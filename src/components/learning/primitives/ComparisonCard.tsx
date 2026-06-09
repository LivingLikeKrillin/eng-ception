import type { SessionPayload } from '../../../types/v9'

interface ComparisonCardProps {
  comparison: SessionPayload['structure']['comparison']
}

function Side({ label, en, note, win }: { label: string; en: string; note: string; win: boolean }) {
  return (
    <div
      className={`p-3.5 rounded-[10px] border ${
        win ? 'bg-ok/[0.04] border-ok/[0.10]' : 'bg-warn/[0.04] border-warn/[0.10]'
      }`}
    >
      <p
        className={`text-[10px] font-bold font-en tracking-wider uppercase mb-1.5 ${
          win ? 'text-ok' : 'text-warn'
        }`}
      >
        {label}
        {win ? ' ✓' : ''}
      </p>
      <p className="text-[14px] font-en text-t1 leading-snug mb-2">{en}</p>
      <p className="text-[12px] text-t2 leading-relaxed">{note}</p>
    </div>
  )
}

// v9.1 — direction-agnostic. Shows both renderings; the winner (betterChoice) sits last
// (climax) with the ✓ / ok styling. Teaches *when* 5형식 is the better choice, not always.
export default function ComparisonCard({ comparison }: ComparisonCardProps) {
  if (!comparison.show) return null
  const fiveHWins = comparison.betterChoice === 'fiveH'

  const fiveH = <Side label="5형식" en={comparison.fiveH.en} note={comparison.fiveH.note} win={fiveHWins} />
  const simpler = (
    <Side label="간결형" en={comparison.simpler.en} note={comparison.simpler.note} win={!fiveHWins} />
  )

  return (
    <div className="bg-c rounded-[16px] p-5 border border-line">
      <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-4">
        {comparison.label}
      </p>
      {fiveHWins ? simpler : fiveH}
      <div className="text-center text-[10px] text-t3 font-en tracking-wider my-3">VS</div>
      {fiveHWins ? fiveH : simpler}
    </div>
  )
}
