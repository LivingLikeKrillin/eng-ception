interface OriginalCardProps {
  korean: string
  compact?: boolean
}

export default function OriginalCard({ korean, compact = false }: OriginalCardProps) {
  return (
    <div
      className={`bg-c rounded-[16px] border-l-[3px] border-accent ${
        compact ? 'p-4' : 'p-[18px]'
      }`}
    >
      <p
        className={`font-medium leading-relaxed text-t1 ${
          compact ? 'text-sm' : 'text-base'
        }`}
      >
        {korean}
      </p>
    </div>
  )
}
