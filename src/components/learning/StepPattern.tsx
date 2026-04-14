import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLearningStore } from '../../store/learningStore'

export default function StepPattern() {
  const { aiPattern, savePattern, saveRecord, reset } = useLearningStore()
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set())
  const navigate = useNavigate()

  if (!aiPattern) return null

  const handleSave = async (index: number) => {
    await savePattern(index)
    setSavedIndexes((prev) => new Set([...prev, index]))
  }

  const handleComplete = async () => {
    await saveRecord()
    reset()
    navigate('/')
  }

  return (
    <div className="space-y-6 fu">
      <div>
        <h2 className="text-[22px] font-bold leading-snug tracking-tight text-t1 mb-1">
          <span className="text-accent">패턴</span>이 남았어.
        </h2>
        <p className="text-[13px] text-t3 leading-relaxed">
          다른 상황에서도 재사용할 수 있는 발화 구조예요
        </p>
      </div>

      <div className="space-y-3 fu1">
        {aiPattern.patterns.map((p, i) => {
          const saved = savedIndexes.has(i)
          return (
            <div
              key={i}
              className="bg-c border border-line rounded-[16px] p-5 space-y-3"
            >
              <p className="text-base font-semibold text-accent font-en leading-relaxed">
                {p.template}
              </p>
              <div className="flex gap-1.5 flex-wrap">
                <span className="text-[11px] bg-accent/[0.08] text-accent px-2 py-1 rounded-md font-medium">
                  {p.category}
                </span>
                {p.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] bg-c2 text-t3 px-2 py-1 rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="bg-c2 rounded-[10px] p-3 space-y-1">
                <p className="text-xs text-t4 leading-relaxed">{p.exampleOriginal}</p>
                <p className="text-xs text-t2 font-medium font-en leading-relaxed">
                  {p.exampleEnglish}
                </p>
              </div>
              <button
                onClick={() => handleSave(i)}
                disabled={saved}
                className={`w-full rounded-[12px] py-2.5 text-sm font-semibold transition ${
                  saved
                    ? 'bg-ok/[0.08] text-ok'
                    : 'bg-accent/[0.08] text-accent hover:bg-accent/[0.12]'
                }`}
              >
                {saved ? '✓ 저장됨' : '패턴 저장'}
              </button>
            </div>
          )
        })}
      </div>

      <button
        onClick={handleComplete}
        className="w-full h-[52px] rounded-[14px] bg-accent text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(139,139,245,0.2)] active:scale-[0.97] transition-all"
      >
        학습 완료
      </button>
    </div>
  )
}
