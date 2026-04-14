import { useLearningStore } from '../../store/learningStore'
import ProgressBar from '../common/ProgressBar'
import StepEmpathy from './StepEmpathy'
import StepPrecheck from './StepPrecheck'
import StepStructure from './StepStructure'
import StepAssemble from './StepAssemble'
import StepFeedback from './StepFeedback'
import StepReflect from './StepReflect'
import StepComplete from './StepComplete'

const STEPS_WITH_PROGRESS = new Set(['step0', 'step1', 'step2', 'step3', 'step4'])

export default function LearningFlow() {
  const { currentStep, payloadStatus, error, retryFetch } = useLearningStore()

  if (payloadStatus === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-[16px] text-t2 leading-relaxed">{error ?? '문제가 생겼어요.'}</p>
        <button
          onClick={retryFetch}
          className="pressable h-[52px] px-8 rounded-[14px] bg-accent text-white text-[15px] font-semibold shadow-[0_4px_20px_rgba(139,139,245,0.25)] transition-all"
        >
          다시 시도
        </button>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'empathy':  return <StepEmpathy />
      case 'precheck': return <StepPrecheck />
      case 'step0':    return <StepStructure />
      case 'step1':    return <StepAssemble />
      case 'step2':    return <StepFeedback />
      case 'step3':    return <StepReflect />
      case 'step4':    return <StepComplete />
      default:         return null
    }
  }

  const showProgress = STEPS_WITH_PROGRESS.has(currentStep)

  return (
    <div className="flex-1 flex flex-col">
      {showProgress && <ProgressBar current={currentStep} />}
      <div key={currentStep} className="flex-1 px-6 py-6 overflow-y-auto sfr">
        {renderStep()}
      </div>
    </div>
  )
}
