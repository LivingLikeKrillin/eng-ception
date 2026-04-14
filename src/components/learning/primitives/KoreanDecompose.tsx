import type { StructurePart, PartRole } from '../../../types/v8'

interface KoreanDecomposeProps {
  parts: StructurePart[]
}

const ROLE_CLASS: Record<PartRole, string> = {
  first: 'text-ok font-semibold',
  pivot: 'text-accent font-semibold',
  second: 'text-warn font-semibold',
  neutral: 'text-t2',
}

export default function KoreanDecompose({ parts }: KoreanDecomposeProps) {
  return (
    <p className="text-[14px] leading-[1.8] text-t2">
      {parts.map((part, i) => (
        <span key={i} className={ROLE_CLASS[part.role]}>
          {part.text}
        </span>
      ))}
    </p>
  )
}
