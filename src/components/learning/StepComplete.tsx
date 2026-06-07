import { useNavigate } from 'react-router-dom'
import { useLearningStore } from '../../store/learningStore'

export default function StepComplete() {
  const { complete } = useLearningStore()
  const navigate = useNavigate()

  const handleFinish = async () => {
    await complete()
    navigate('/')
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <p className="fu text-[32px] font-bold leading-tight tracking-tight mb-2">
        하나 풀었다
      </p>
      <p className="fu1 text-[15px] text-t3 mb-10 leading-relaxed">
        다음에 비슷한 상황 오면 떠올려봐
      </p>
      <button
        onClick={() => void handleFinish()}
        className="pressable w-full max-w-[280px] h-[52px] rounded-[14px] bg-accent text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(139,139,245,0.25)] transition-all fu2"
      >
        다음 문장으로
      </button>
    </div>
  )
}
