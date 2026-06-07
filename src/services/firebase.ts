import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore'

function readConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }
}

export function isFirebaseConfigured(): boolean {
  const c = readConfig()
  return Boolean(c.apiKey && c.projectId && c.appId)
}

let app: FirebaseApp | undefined
let authInstance: Auth | undefined
let firestoreInstance: Firestore | undefined

function ensureInit(): void {
  if (app) return
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured (VITE_FIREBASE_* missing)')
  }
  const config = readConfig()
  app = initializeApp(config)
  firestoreInstance =
    typeof indexedDB !== 'undefined'
      ? initializeFirestore(app, { localCache: persistentLocalCache() })
      : initializeFirestore(app, {})
  authInstance = getAuth(app)

  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(firestoreInstance, '127.0.0.1', 8080)
  }
}

export function getFirebaseAuth(): Auth {
  ensureInit()
  return authInstance!
}

export function getFirestoreDb(): Firestore {
  ensureInit()
  return firestoreInstance!
}
