import { useLearningStore } from '../../store/learningStore'
import StepIndicator from '../common/StepIndicator'
import StepRestructure from './StepRestructure'
import StepEnglish from './StepEnglish'
import StepPattern from './StepPattern'

export default function LearningFlow() {
  const { currentStep, error } = useLearningStore()

  const renderStep = () => {
    switch (currentStep) {
      case 'restructure':
        return <StepRestructure />
      case 'english':
        return <StepEnglish />
      case 'pattern':
        return <StepPattern />
      default:
        return null
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <StepIndicator current={currentStep} />
      {error && (
        <div className="mx-6 mt-4 bg-warn/[0.04] border border-warn/10 rounded-[10px] px-4 py-3 text-sm text-warn">
          {error}
        </div>
      )}
      <div key={currentStep} className="flex-1 px-6 py-6 overflow-y-auto sfr">
        {renderStep()}
      </div>
    </div>
  )
}
