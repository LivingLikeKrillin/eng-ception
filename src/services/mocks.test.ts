import { describe, it, expect } from 'vitest'
import { mockSessionPayload } from './mocks'
import { assertSessionPayload } from './validate'

describe('mockSessionPayload', () => {
  it('returns a fixture that passes assertSessionPayload', async () => {
    const payload = await mockSessionPayload('anything')
    expect(() => assertSessionPayload(payload)).not.toThrow()
  })

  it('resolves after a small delay (simulated network)', async () => {
    const start = Date.now()
    await mockSessionPayload('x')
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(500)
  })

  it('returns the same fixture regardless of input', async () => {
    const a = await mockSessionPayload('input A')
    const b = await mockSessionPayload('input B')
    expect(a).toEqual(b)
  })
})
