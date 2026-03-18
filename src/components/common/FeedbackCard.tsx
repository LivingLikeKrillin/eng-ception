interface FeedbackCardProps {
  title: string
  items: { label: string; content: string | string[] }[]
}

export default function FeedbackCard({ title, items }: FeedbackCardProps) {
  return (
    <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-3">
      <h3 className="font-bold text-sky-800">{title}</h3>
      {items.map((item, i) => (
        <div key={i}>
          <p className="text-xs font-semibold text-sky-600 mb-1">{item.label}</p>
          {Array.isArray(item.content) ? (
            <ul className="space-y-1">
              {item.content.map((c, j) => (
                <li key={j} className="text-sm text-gray-700 bg-white rounded-lg px-3 py-2">
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-700">{item.content}</p>
          )}
        </div>
      ))}
    </div>
  )
}
