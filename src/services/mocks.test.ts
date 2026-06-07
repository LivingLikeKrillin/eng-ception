import { describe, it, expect } from 'vitest'
import { mockSessionPayload } from './mocks'
import { assertSessionPayload } from './validate'

describe('mockSessionPayload', () => {
  it('returns a fixture that passes assertSessionPayload', async () => {
    const payload = await mockSessionPayload('아무 입력')
    expect(() => assertSessionPayload(payload)).not.toThrow()
  })

  it('resolves after a small delay (simulated network)', async () => {
    const start = Date.now()
    await mockSessionPayload('x')
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(500)
  })

  it('returns the same fixture for the same input (deterministic)', async () => {
    const a = await mockSessionPayload('동일 입력')
    const b = await mockSessionPayload('동일 입력')
    expect(a).toEqual(b)
  })

  it('rotates across three different patterns based on input', async () => {
    // Probe enough inputs to hit each bucket of the hash mod 3 rotation.
    // Run in parallel — 30 sequential 600ms awaits would exceed the default timeout.
    const results = await Promise.all(
      Array.from({ length: 30 }, (_, i) => mockSessionPayload(`input-${i}`)),
    )
    const ids = new Set(results.map((p) => p.pattern5h.id))
    expect(ids.has('causative-bare')).toBe(true)
    expect(ids.has('perception')).toBe(true)
    expect(ids.has('ditransitive')).toBe(true)
  })
})
