import { useState } from 'react'
import { useLearningStore } from '../../store/learningStore'
import FeedbackCard from '../common/FeedbackCard'

export default function StepEnglish() {
  const {
    aiRestructure,
    aiEnglish,
    submitEnglish,
    extractPatterns,
    isLoading,
  } = useLearningStore()

  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    await submitEnglish(text)
    setSubmitted(true)
  }

  const handleNext = async () => {
    await extractPatterns()
  }

  return (
    <div className="space-y-6 fu">
      {/* 재구성된 쉬운 한국어 */}
      <div>
        <p className="text-[11px] font-semibold text-t3 mb-2 tracking-wider uppercase font-en">
          영어로 말하기 쉬운 한국어
        </p>
        <div className="bg-c rounded-[16px] p-[18px] border-l-[3px] border-accent">
          <ul className="space-y-1.5">
            {(aiRestructure?.restructured ?? []).map((k, i) => (
              <li key={i} className="text-sm text-t1 font-medium">
                <span className="text-t3 font-en mr-2">{i + 1}</span>
                {k}
              </li>
            ))}
          </ul>
          {aiRestructure?.hints && aiRestructure.hints.length > 0 && (
            <div className="mt-3.5 pt-3 border-t border-line">
              <p className="text-[11px] text-accent font-semibold mb-1 tracking-wide uppercase font-en">
                힌트
              </p>
              {aiRestructure.hints.map((h, i) => (
                <p key={i} className="text-xs text-t3 leading-relaxed">
                  {h}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {!submitted ? (
        <div className="space-y-4 fu1">
          <p className="text-[22px] font-bold leading-snug tracking-tight text-t1">
            이제 <span className="text-accent">영어로</span> 말해봐.
          </p>

          <div className="bg-c rounded-[20px] p-5 border border-transparent focus-within:border-accent/40 transition-all">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="영어로 작성해보세요..."
              rows={4}
              className="w-full bg-transparent border-none text-t1 text-base leading-relaxed resize-none outline-none font-en placeholder:text-t3"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isLoading}
            className={`pressable w-full h-[52px] rounded-[14px] text-[15px] font-semibold transition-all ${
              text.trim() && !isLoading
                ? 'bg-accent text-white shadow-[0_4px_20px_rgba(139,139,245,0.2)] '
                : 'bg-c2 text-t3 cursor-default'
            }`}
          >
            {isLoading ? '분석 중...' : '제출하기'}
          </button>
        </div>
      ) : (
        aiEnglish && (
          <div className="space-y-4 fu1">
            <div>
              <p className="text-[11px] font-semibold text-t3 mb-2 tracking-wider uppercase font-en">
                나의 영어
              </p>
              <div className="bg-c2 rounded-[14px] p-4">
                <p className="text-sm text-t2 font-en leading-relaxed">{text}</p>
              </div>
            </div>

            <FeedbackCard
              title="AI 단계별 영어"
              items={[
                { label: 'Safe — 짧고 안전한 영어', content: aiEnglish.english.safe },
                { label: 'Natural — 자연스러운 영어', content: aiEnglish.english.natural },
                { label: 'Refined — 더 정교한 영어', content: aiEnglish.english.refined },
                { label: '피드백', content: aiEnglish.feedback },
              ]}
            />

            <button
              onClick={handleNext}
              disabled={isLoading}
              className={`pressable w-full h-[52px] rounded-[14px] text-[15px] font-semibold transition-all ${
                !isLoading
                  ? 'bg-accent text-white shadow-[0_4px_20px_rgba(139,139,245,0.2)] '
                  : 'bg-c2 text-t3 cursor-default'
              }`}
            >
              {isLoading ? '패턴 추출 중...' : '패턴 확인하기 →'}
            </button>
          </div>
        )
      )}
    </div>
  )
}
