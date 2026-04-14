import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useLearningStore } from '../store/learningStore'
import { localStorageAdapter as db } from '../store/localStorage'
import LearningFlow from '../components/learning/LearningFlow'

export default function Learn() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { currentStep, startScenario, startCustom, originalKorean } =
    useLearningStore()
  const passedInput = (location.state as { input?: string })?.input ?? ''
  const [customInput, setCustomInput] = useState(passedInput)
  const isCustom = id === 'custom' || !id

  useEffect(() => {
    if (!isCustom && id) {
      db.getScenario(id).then((scenario) => {
        if (scenario) startScenario(scenario)
        else navigate('/')
      })
    }
    if (isCustom && passedInput.trim() && currentStep === 'input') {
      startCustom(passedInput)
    }
  }, [id, isCustom, startScenario, startCustom, navigate, passedInput, currentStep])

  if (isCustom && currentStep === 'input') {
    return (
      <div className="flex-1 flex flex-col">
        <div className="px-6 pt-5">
          <button
            onClick={() => navigate('/')}
            className="text-t2 hover:text-t1 transition"
            aria-label="뒤로"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 pb-10">
          <div className="fu mb-8">
            <p className="text-[15px] text-t3 mb-3 leading-relaxed">말문 막힌 순간</p>
            <h1 className="text-[26px] font-bold leading-snug tracking-tight">
              그거, 여기다<br />
              <span className="text-accent">풀어봐.</span>
            </h1>
          </div>

          <div className="fu1 bg-c rounded-[20px] p-5 border border-transparent focus-within:border-accent/40 transition-all">
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="한국어로 그냥 적어봐. 맞춤법 신경 쓸 필요 없어."
              rows={4}
              className="w-full bg-transparent border-none text-t1 text-base leading-relaxed resize-none outline-none font-ko placeholder:text-t3"
              autoFocus
            />
            <button
              onClick={() => startCustom(customInput)}
              disabled={!customInput.trim()}
              className={`pressable w-full mt-3 h-[52px] rounded-[14px] text-[15px] font-semibold transition-all ${
                customInput.trim()
                  ? 'bg-accent text-white shadow-[0_4px_20px_rgba(139,139,245,0.25)]'
                  : 'bg-c2 text-t3 cursor-default'
              }`}
            >
              풀어보기
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!originalKorean && !isCustom) {
    return <div className="flex-1 flex items-center justify-center text-t3 text-sm">로딩 중...</div>
  }

  return (
    <div className="flex-1 flex flex-col">
      <LearningFlow />
    </div>
  )
}
