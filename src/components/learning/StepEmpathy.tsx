import { useEffect } from 'react'
import { useLearningStore } from '../../store/learningStore'

// Floor before auto-advancing to precheck. Only bites when the payload is already
// ready (content pack / mock load instantly) — a live API session waits for 'ready'
// regardless, so this never shortens the latency mask. Kept just long enough to read
// the warm one-liner; 2.5s felt like dead time once the pack made loads instant.
const MIN_EMPATHY_MS = 1200

export default function StepEmpathy() {
  const { payload, payloadStatus, advanceFromEmpathy } = useLearningStore()

  useEffect(() => {
    let advanced = false
    let timerDone = false

    const tryAdvance = () => {
      if (advanced) return
      const status = useLearningStore.getState().payloadStatus
      if (timerDone && status === 'ready') {
        advanced = true
        advanceFromEmpathy()
      }
    }

    const minTimer = setTimeout(() => {
      timerDone = true
      tryAdvance()
    }, MIN_EMPATHY_MS)

    // No local hard timeout here: real generation runs ~19s while this old timer
    // force-errored at 10s, breaking every live session. The actual backstop is
    // claude.ts FETCH_TIMEOUT_MS (60s) → runFetch sets payloadStatus:'error', which
    // LearningFlow renders. We only wait here for 'ready'.
    const unsub = useLearningStore.subscribe((state) => {
      if (state.payloadStatus === 'ready') tryAdvance()
    })

    return () => {
      clearTimeout(minTimer)
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
      {/* Subtitle only when a real message is shown above — otherwise the message
          falls back to '같이 풀어보자' and this would duplicate it. */}
      {payload?.empathy.message && (
        <p className="fu2 text-[15px] text-t3 mt-4">같이 풀어보자</p>
      )}
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
