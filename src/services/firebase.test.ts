import { describe, it, expect, afterEach, vi } from 'vitest'
import { isFirebaseConfigured } from './firebase'

afterEach(() => vi.unstubAllEnvs())

describe('isFirebaseConfigured', () => {
  it('is false when env vars are absent', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '')
    vi.stubEnv('VITE_FIREBASE_APP_ID', '')
    expect(isFirebaseConfigured()).toBe(false)
  })

  it('is true when api key, project id, and app id are all present', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'k')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'p')
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'a')
    expect(isFirebaseConfigured()).toBe(true)
  })

  it('is false when only some config is present (AND semantics)', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'k')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '')
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'a')
    expect(isFirebaseConfigured()).toBe(false)
  })
})
