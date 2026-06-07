interface PatternNoteCardProps {
  patternLabel: string  // "사역 (make/have/let)"
  triggerVerb: string   // "made"
  note: string          // payload.feedback.patternNote
}

export default function PatternNoteCard({ patternLabel, triggerVerb, note }: PatternNoteCardProps) {
  return (
    <div className="relative bg-accent/[0.06] border border-accent/[0.15] rounded-[16px] p-5 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-accent/60 to-transparent" />
      <p className="text-[10px] font-bold font-en text-accent tracking-wider uppercase mb-2">
        다음에 떠올릴 틀
      </p>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[13px] font-semibold text-t1">{patternLabel}</span>
        <span className="text-[12px] font-en text-t3">·</span>
        <span className="text-[13px] font-en font-bold text-accent">{triggerVerb}</span>
      </div>
      <p className="text-[13px] text-t2 leading-[1.7]">{note}</p>
    </div>
  )
}
