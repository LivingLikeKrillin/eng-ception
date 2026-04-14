import { useEffect } from 'react'
import { useLearningStore } from '../../store/learningStore'

const MIN_EMPATHY_MS = 2500
const MAX_WAIT_MS = 10_000

export default function StepEmpathy() {
  const { payload, payloadStatus, advanceFromEmpathy } = useLearningStore()

  useEffect(() => {
    let advanced = false
    let timerDone = false
    let maxWaitTimer: ReturnType<typeof setTimeout> | null = null

    const minTimer = setTimeout(() => {
      timerDone = true
      tryAdvance()
    }, MIN_EMPATHY_MS)

    maxWaitTimer = setTimeout(() => {
      if (!advanced) {
        useLearningStore.setState({
          payloadStatus: 'error',
          error: '응답이 너무 오래 걸려요. 다시 시도해주세요.',
        })
      }
    }, MAX_WAIT_MS)

    const tryAdvance = () => {
      if (advanced) return
      const status = useLearningStore.getState().payloadStatus
      if (timerDone && status === 'ready') {
        advanced = true
        advanceFromEmpathy()
      }
    }

    const unsub = useLearningStore.subscribe((state) => {
      if (state.payloadStatus === 'ready') tryAdvance()
    })

    return () => {
      clearTimeout(minTimer)
      if (maxWaitTimer) clearTimeout(maxWaitTimer)
      unsub()
    }
  }, [advanceFromEmpathy])

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      {payload?.empathy.echo && (
        <p className="fu text-[13px] text-t3 mb-6 max-w-[280px] leading-relaxed">
          {payload.empathy.echo}
        </p>
      )}
      <p className="sfr text-[26px] font-bold leading-[1.5] tracking-tight">
        {payload?.empathy.message ?? '같이 풀어보자'}
      </p>
      <p className="fu2 text-[15px] text-t3 mt-4">같이 풀어보자</p>
      <div
        className="fu3 mt-6 w-7 h-[3px] rounded-full bg-accent"
        style={{ animation: 'pulse 1.4s ease-in-out infinite' }}
      />
      {payloadStatus === 'loading' && (
        <p className="fu4 mt-8 text-[11px] text-t3 font-en tracking-wider">PREPARING…</p>
      )}
    </div>
  )
}
