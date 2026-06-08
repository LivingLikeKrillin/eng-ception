import { useEffect, useState } from 'react'
import {
  getInstallState,
  subscribeInstall,
  promptInstall,
  dismissInstall,
} from '../../services/pwa/installPrompt'

export default function InstallBanner({ hasCompletedSession }: { hasCompletedSession: boolean }) {
  const [state, setState] = useState(getInstallState)

  useEffect(() => {
    const update = () => setState(getInstallState())
    update()
    return subscribeInstall(update)
  }, [])

  const visible =
    hasCompletedSession &&
    !state.isStandalone &&
    !state.dismissed &&
    (state.canInstall || state.isIosSafari)

  if (!visible) return null

  return (
    <div className="fu bg-c rounded-[18px] p-4 border border-line/60 flex items-start gap-3">
      <div className="w-9 h-9 rounded-[12px] bg-c2 flex items-center justify-center shrink-0">
        <img src="/pwa-192x192.png" alt="" className="w-6 h-6 rounded-md" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-t1">홈 화면에 추가</p>
        {state.isIosSafari ? (
          <p className="text-xs text-t3 mt-1 leading-relaxed inline-flex flex-wrap items-center gap-1">
            공유
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="inline -mt-0.5" aria-hidden="true">
              <path d="M12 3v12M12 3l-4 4M12 3l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            버튼 → "홈 화면에 추가"를 누르면 앱처럼 쓸 수 있어요.
          </p>
        ) : (
          <p className="text-xs text-t3 mt-1 leading-relaxed">앱처럼 한 번에 열어서 더 빠르게 연습해요.</p>
        )}
        {!state.isIosSafari && (
          <button
            onClick={() => { void promptInstall() }}
            className="pressable mt-3 h-9 px-4 rounded-[12px] bg-accent text-white text-xs font-semibold shadow-[0_4px_20px_rgba(139,139,245,0.25)]"
          >
            홈 화면에 추가
          </button>
        )}
      </div>
      <button
        onClick={() => dismissInstall()}
        aria-label="닫기"
        className="pressable shrink-0 w-7 h-7 rounded-full bg-c2 text-t3 flex items-center justify-center text-sm"
      >
        ✕
      </button>
    </div>
  )
}
