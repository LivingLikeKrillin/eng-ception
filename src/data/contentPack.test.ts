import { describe, it, expect, vi, afterEach } from 'vitest'
import { CONTENT_PACK } from './contentPack'
import { seedScenarios } from './seed-scenarios'
import { assertSessionPayload } from '../services/validate'
import { fetchSessionPayload } from '../services/claude'

afterEach(() => { vi.restoreAllMocks() })

describe('CONTENT_PACK', () => {
  const entries = Object.entries(CONTENT_PACK)
  const seedIds = new Set(seedScenarios.map((s) => s.id))

  it('covers all 15 seed scenarios', () => {
    expect(entries.length).toBe(15)
  })

  it('every key is a real seed scenario id', () => {
    for (const [id] of entries) expect(seedIds.has(id), id).toBe(true)
  })

  it('every entry passes assertSessionPayload', () => {
    for (const [id, payload] of entries) {
      expect(() => assertSessionPayload(payload), id).not.toThrow()
    }
  })

  it('moment entries carry pattern5h+pattern (id match); 간결형 entries null both', () => {
    for (const [id, p] of entries) {
      if (p.recognition.isFiveHMoment) {
        expect(p.pattern5h, id).not.toBeNull()
        expect(p.pattern, id).not.toBeNull()
        expect(p.pattern!.patternId).toBe(p.pattern5h!.id)
      } else {
        expect(p.pattern5h, id).toBeNull()
        expect(p.pattern, id).toBeNull()
      }
    }
  })

  it('includes both moments and 간결형 (the s3/s4/s6/s7/s10 simpler set)', () => {
    const simpler = entries.filter(([, p]) => !p.recognition.isFiveHMoment).map(([id]) => id).sort()
    expect(simpler).toEqual(['s10', 's3', 's4', 's6', 's7'])
  })
})

describe('fetchSessionPayload pack-first', () => {
  it('returns the pack entry for a seed id without hitting the network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const payload = await fetchSessionPayload('아무 입력', 's1')
    expect(payload).toBe(CONTENT_PACK.s1)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
