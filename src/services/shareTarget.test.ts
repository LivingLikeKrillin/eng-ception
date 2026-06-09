import { describe, it, expect } from 'vitest'
import { parseShareText } from './shareTarget'

describe('parseShareText', () => {
  it('reads the text param', () => {
    expect(parseShareText('?text=hello')).toBe('hello')
  })
  it('falls back to title when text absent', () => {
    expect(parseShareText('?title=hi')).toBe('hi')
  })
  it('prefers text over title', () => {
    expect(parseShareText('?title=t&text=x')).toBe('x')
  })
  it('trims whitespace', () => {
    expect(parseShareText('?text=%20%20hi%20%20')).toBe('hi')
  })
  it('returns null for empty / whitespace-only / missing', () => {
    expect(parseShareText('?text=%20%20')).toBeNull()
    expect(parseShareText('')).toBeNull()
    expect(parseShareText('?foo=bar')).toBeNull()
  })
})
