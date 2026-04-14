import { useState } from 'react'
import { useLearningStore } from '../../store/learningStore'
import FeedbackCard from '../common/FeedbackCard'

export default function StepRestructure() {
  const {
    originalKorean,
    scenario,
    aiRestructure,
    submitRestructure,
    isLoading,
  } = useLearningStore()

  const [parts, setParts] = useState<string[]>([''])
  const [submitted, setSubmitted] = useState(false)

  const addField = () => {
    if (parts.length < 3) setParts([...parts, ''])
  }

  const updatePart = (i: number, value: string) => {
    const next = [...parts]
    next[i] = value
    setParts(next)
  }

  const removePart = (i: number) => {
    if (parts.length > 1) {
      setParts(parts.filter((_, idx) => idx !== i))
    }
  }

  const canSubmit = parts.some((p) => p.trim().length > 0)

  const handleSubmit = async () => {
    await submitRestructure(parts.filter((p) => p.trim()))
    setSubmitted(true)
  }

  const handleNext = () => {
    useLearningStore.setState({ currentStep: 'english' })
  }

  return (
    <div className="space-y-6 fu">
      {/* 원문 */}
      <div>
        {scenario && (
          <p className="text-[11px] text-t4 mb-2 font-semibold tracking-wide uppercase font-en">
            {scenario.situation}
          </p>
        )}
        <div className="bg-c rounded-[16px] p-[18px] border-l-[3px] border-accent">
          <p className="text-base font-medium leading-relaxed text-t1">
            {originalKorean}
          </p>
        </div>
      </div>

      {!submitted ? (
        <div className="space-y-4 fu1">
          <div>
            <p className="text-[22px] font-bold leading-snug tracking-tight text-t1 mb-2">
              쉬운 한국어로<br />
              <span className="text-accent">쪼개봐.</span>
            </p>
            <p className="text-[13px] text-t3 leading-relaxed">
              영어로 옮기기 쉬운 문장 1~3개로 분해해보세요
            </p>
          </div>

          <div className="space-y-2">
            {parts.map((part, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-semibold font-en text-t4 w-4 shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={part}
                  onChange={(e) => updatePart(i, e.target.value)}
                  placeholder="쉬운 한국어로..."
                  className="flex-1 bg-c border border-transparent focus:border-accent/40 rounded-[14px] px-4 py-3.5 text-sm text-t1 placeholder:text-t4 outline-none transition-all"
                />
                {parts.length > 1 && (
                  <button
                    onClick={() => removePart(i)}
                    className="text-t4 hover:text-t2 text-lg shrink-0 transition"
                    aria-label="삭제"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {parts.length < 3 && (
            <button
              onClick={addField}
              className="text-sm text-accent hover:opacity-80 font-medium transition"
            >
              + 문장 추가
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
            className={`w-full h-[52px] rounded-[14px] text-[15px] font-semibold transition-all ${
              canSubmit && !isLoading
                ? 'bg-accent text-white shadow-[0_4px_20px_rgba(139,139,245,0.2)] active:scale-[0.97]'
                : 'bg-c2 text-t4 cursor-default'
            }`}
          >
            {isLoading ? '분석 중...' : '제출하기'}
          </button>
        </div>
      ) : (
        aiRestructure && (
          <div className="space-y-4 fu1">
            <div>
              <p className="text-[11px] font-semibold text-t4 mb-2 tracking-wider uppercase font-en">
                나의 시도
              </p>
              <div className="bg-c2 rounded-[14px] p-4 space-y-1">
                {parts
                  .filter((p) => p.trim())
                  .map((p, i) => (
                    <p key={i} className="text-sm text-t2">
                      <span className="text-t4 font-en mr-2">{i + 1}</span>
                      {p}
                    </p>
                  ))}
              </div>
            </div>

            <FeedbackCard
              title="AI 코치 피드백"
              items={[
                { label: '왜 이 문장이 영어로 어려운가', content: aiRestructure.whyHard },
                { label: '영어 친화적 재구성', content: aiRestructure.restructured },
                { label: '피드백', content: aiRestructure.feedback },
                { label: '영작 힌트', content: aiRestructure.hints },
              ]}
            />

            <button
              onClick={handleNext}
              className="w-full h-[52px] rounded-[14px] bg-accent text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(139,139,245,0.2)] active:scale-[0.97] transition-all"
            >
              영작 시도하기 →
            </button>
          </div>
        )
      )}
    </div>
  )
}
