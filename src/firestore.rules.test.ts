import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { readFileSync } from 'node:fs'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const RUN = process.env.FIREBASE_EMULATOR === '1'

describe.skipIf(!RUN)('firestore security rules', () => {
  let env: RulesTestEnvironment
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-eng-ception',
      firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    })
  })
  afterAll(async () => { await env.cleanup() })
  beforeEach(async () => { await env.clearFirestore() })

  it('lets a user write their own records', async () => {
    const fs = env.authenticatedContext('u1').firestore()
    await assertSucceeds(setDoc(doc(fs, 'users/u1/records/r1'), { ok: true }))
  })

  it('denies reading another user\'s data', async () => {
    const fs = env.authenticatedContext('u1').firestore()
    await assertFails(getDoc(doc(fs, 'users/u2/records/r1')))
  })

  it('denies unauthenticated access', async () => {
    const fs = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(fs, 'users/u1/records/r1')))
  })
})
