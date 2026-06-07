import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { isFirebaseConfigured } from '../../services/firebase'
import { onUserChanged, signInWithGoogle, signOutUser } from '../../store/auth'

// Firebase auth codes for a user-initiated cancellation — benign, no error shown.
const CANCELLED = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
])

export default function AuthControl() {
  const [user, setUser] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  // block body (not implicit return) so the unsubscribe is the cleanup unambiguously —
  // avoids any no-confusing-void-expression lint edge.
  useEffect(() => {
    return onUserChanged(setUser)
  }, [])

  if (!isFirebaseConfigured()) return null

  const handle = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(false)
    try {
      await fn()
    } catch (err) {
      // Cancelling the popup is expected — stay silent. A real failure (blocked popup,
      // network, misconfig) must surface; otherwise sign-in silently does nothing.
      const code = (err as { code?: string })?.code
      if (!code || !CANCELLED.has(code)) {
        console.error('[auth] sign-in/out failed', err)
        setError(true)
      }
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return (
      <button
        onClick={() => handle(signOutUser)}
        disabled={busy}
        className="pressable flex items-center gap-1.5 bg-c rounded-full pl-1 pr-3 py-1 border border-line/60 text-xs text-t2"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <span className="w-6 h-6 rounded-full bg-c2" />
        )}
        로그아웃
      </button>
    )
  }

  return (
    <button
      onClick={() => handle(signInWithGoogle)}
      disabled={busy}
      className="pressable flex items-center gap-1.5 bg-c rounded-full px-3 py-1.5 border border-line/60 text-xs font-semibold text-t2"
      title={error ? '로그인에 실패했어요. 다시 시도해 주세요.' : undefined}
    >
      {error ? '로그인 실패 · 다시' : 'Google로 로그인'}
    </button>
  )
}
