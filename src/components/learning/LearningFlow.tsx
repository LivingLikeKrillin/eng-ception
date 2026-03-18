import { useLearningStore } from '../../store/learningStore'
import StepIndicator from '../common/StepIndicator'
import StepDecompose from './StepDecompose'
import StepAiDecompose from './StepAiDecompose'
import StepEasyKorean from './StepEasyKorean'
import StepAiEasyKorean from './StepAiEasyKorean'
import StepEnglish from './StepEnglish'
import StepAiEnglish from './StepAiEnglish'
import StepPattern from './StepPattern'

const stepComponents: Record<string, React.FC> = {
  decompose: StepDecompose,
  'ai-decompose': StepAiDecompose,
  'easy-korean': StepEasyKorean,
  'ai-easy-korean': StepAiEasyKorean,
  english: StepEnglish,
  'ai-english': StepAiEnglish,
  pattern: StepPattern,
}

export default function LearningFlow() {
  const { currentStep, error } = useLearningStore()
  const StepComponent = stepComponents[currentStep]

  if (!StepComponent) return null

  return (
    <div className="space-y-4">
      <StepIndicator current={currentStep} />
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="px-4">
        <StepComponent />
      </div>
    </div>
  )
}
