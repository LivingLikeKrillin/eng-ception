import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { isFirebaseConfigured } from '../../services/firebase'
import { onUserChanged, signInWithGoogle, signOutUser } from '../../store/auth'

export default function AuthControl() {
  const [user, setUser] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)

  // block body (not implicit return) so the unsubscribe is the cleanup unambiguously —
  // avoids any no-confusing-void-expression lint edge.
  useEffect(() => {
    return onUserChanged(setUser)
  }, [])

  if (!isFirebaseConfigured()) return null

  const handle = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } catch {
      // popup closed / blocked — stay as-is
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
    >
      Google로 로그인
    </button>
  )
}
