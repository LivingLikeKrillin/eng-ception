import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { getFirebaseAuth, getFirestoreDb, isFirebaseConfigured } from '../services/firebase'
import { setDbAdapter } from './db'
import { localStorageAdapter } from './localStorage'
import { createFirestoreDataStore } from './firestoreDataStore'
import { createFirestoreAnalyticsSink } from './firestoreAnalyticsSink'
import { setSink } from '../services/analytics'
import { localAnalyticsSink } from './localAnalyticsSink'
import { migrateToCloud } from '../services/migrateToCloud'

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider())
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth())
}

export function getCurrentUser(): User | null {
  if (!isFirebaseConfigured()) return null
  return getFirebaseAuth().currentUser
}

// UI subscription. Inert (calls back null once) when unconfigured.
export function onUserChanged(cb: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured()) {
    cb(null)
    return () => {}
  }
  return onAuthStateChanged(getFirebaseAuth(), cb)
}

let migratedUid: string | null = null

// Telemetry kill-switch must outrank the swap: when analytics is disabled we still swap
// the *data* adapter (records/patterns must go to Firestore for a signed-in user) but we
// must NOT (re)install any analytics sink — otherwise sign-in would silently re-enable
// telemetry that VITE_DISABLE_ANALYTICS turned off. Only the setSink calls are gated.
const analyticsOn = import.meta.env.VITE_DISABLE_ANALYTICS !== 'true'

// Call once at bootstrap (configured only). Owns the local<->Firestore swap.
export function registerAuthReaction(): () => void {
  return onAuthStateChanged(getFirebaseAuth(), async (user) => {
    if (user) {
      const cloud = createFirestoreDataStore(getFirestoreDb(), user.uid)
      if (migratedUid !== user.uid) {
        try {
          // Only records + patterns are migrated. Analytics events are content-free,
          // append-only, disposable telemetry (spec 4.4/5) — deliberately NOT migrated.
          await migrateToCloud(localStorageAdapter, cloud)
          migratedUid = user.uid
        } catch (err) {
          // merge failed — stay on local; do not swap (no data loss). Log it: the user's
          // auth state still flips to signed-in (AuthControl subscribes independently), so
          // without this a failed sync is an undebuggable split-brain in the field.
          console.error('[auth] cloud merge failed; staying on local store', err)
          return
        }
      }
      setDbAdapter(cloud)
      if (analyticsOn) setSink(createFirestoreAnalyticsSink(getFirestoreDb(), user.uid))
    } else {
      migratedUid = null
      setDbAdapter(localStorageAdapter)
      if (analyticsOn) setSink(localAnalyticsSink)
    }
  })
}
