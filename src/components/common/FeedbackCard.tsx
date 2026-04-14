interface FeedbackCardProps {
  title: string
  items: { label: string; content: string | string[] }[]
}

export default function FeedbackCard({ title, items }: FeedbackCardProps) {
  return (
    <div className="bg-c rounded-[16px] p-5 border border-line space-y-4">
      <h3 className="text-[13px] font-semibold text-accent tracking-wide">{title}</h3>
      {items.map((item, i) => (
        <div key={i} className="space-y-2">
          <p className="text-[11px] font-semibold text-t3 tracking-wider uppercase font-en">
            {item.label}
          </p>
          {Array.isArray(item.content) ? (
            <ul className="space-y-1.5">
              {item.content.map((c, j) => (
                <li
                  key={j}
                  className="text-sm text-t2 leading-relaxed bg-c2 rounded-[10px] px-3.5 py-2.5"
                >
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-t2 leading-relaxed">{item.content}</p>
          )}
        </div>
      ))}
    </div>
  )
}
