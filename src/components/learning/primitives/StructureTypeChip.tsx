interface StructureTypeChipProps {
  label: string
  category: string
}

export default function StructureTypeChip({ label, category }: StructureTypeChipProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-accent/[0.06] border border-accent/[0.12]">
      <span className="text-[11px] font-semibold font-en text-accent tracking-wider uppercase">
        유형
      </span>
      <span className="text-[13px] font-semibold text-t1">{label}</span>
      <span className="text-[11px] text-t3 bg-c2 px-2 py-0.5 rounded">{category}</span>
    </div>
  )
}
