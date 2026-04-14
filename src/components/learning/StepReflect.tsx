import { useLearningStore } from '../../store/learningStore'

export default function StepReflect() {
  const {
    payload,
    originalKorean,
    precheckChoice,
    afterChoice,
    submitAfterChoice,
    advanceToStep4,
  } = useLearningStore()
  if (!payload) return null

  const directionMatches =
    afterChoice !== null && afterChoice === payload.precheck.correctChoiceId
  const matchedPrecheck = afterChoice !== null && afterChoice === precheckChoice

  return (
    <div className="space-y-5 fu">
      <div className="relative bg-c rounded-[16px] p-5 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-accent to-transparent" />
        <p className="text-[11px] font-semibold text-t3 font-en tracking-wider uppercase mb-3">
          PATTERN SAVED
        </p>
        <p className="text-[18px] font-semibold font-en leading-snug mb-3">
          {payload.pattern.template}
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {payload.pattern.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] text-t3 bg-c2 px-2.5 py-1 rounded-md"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="fu1 bg-c rounded-[16px] p-[18px] border border-line">
        <p className="text-[13px] text-t3 leading-relaxed mb-2">{originalKorean}</p>
        <div className="w-5 h-px bg-line my-2" />
        <p className="text-[14px] font-semibold font-en text-t2 leading-relaxed">
          {payload.assembly.finalSentence}
        </p>
      </div>

      <div className="fu2 p-5 bg-accent/[0.03] border border-accent/[0.08] rounded-[16px]">
        <p className="text-[13px] font-semibold text-t3 tracking-wider uppercase font-en mb-4">
          사고 순서 체크
        </p>

        {precheckChoice && (
          <div className="flex items-center gap-3 mb-4">
            <span className="w-12 text-[10px] font-bold text-t3 font-en tracking-wider">BEFORE</span>
            <div className="flex-1 p-3 bg-c rounded-[10px]">
              <p className="text-[13px] text-t2">
                {payload.precheck.choices.find((c) => c.id === precheckChoice)?.label}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <span className="w-12 mt-3 text-[10px] font-bold text-accent font-en tracking-wider">AFTER</span>
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-t1 mb-2">방금 조립할 때는?</p>
            <div className="flex gap-2">
              {payload.precheck.choices.map((choice) => {
                const selected = afterChoice === choice.id
                return (
                  <button
                    key={choice.id}
                    onClick={() => submitAfterChoice(choice.id)}
                    disabled={afterChoice !== null}
                    className={`flex-1 p-3 rounded-[10px] border-[1.5px] text-[13px] font-medium transition-all ${
                      selected
                        ? 'border-accent bg-accent/[0.08] text-t1'
                        : 'border-line bg-c text-t2'
                    }`}
                  >
                    {choice.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {afterChoice !== null && (
          <div className="mt-4 p-3 rounded-[10px] bg-c">
            <p className="text-xs text-t2 leading-relaxed">
              {matchedPrecheck
                ? '직감 그대로 갔어. 처음 떠오른 순서가 정답이었어.'
                : directionMatches
                  ? '조립하면서 순서를 바로잡았어. 사고가 전환된 순간이야.'
                  : '다음엔 다른 순서로도 시도해봐.'}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={advanceToStep4}
        disabled={afterChoice === null}
        className={`pressable w-full h-[52px] rounded-[14px] text-[15px] font-semibold transition-all ${
          afterChoice !== null
            ? 'bg-accent text-white shadow-[0_4px_20px_rgba(139,139,245,0.25)]'
            : 'bg-c2 text-t3 cursor-default'
        }`}
      >
        다음
      </button>
    </div>
  )
}
