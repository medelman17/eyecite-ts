import { describe, it, expect } from 'vitest'
import { extractProse } from '@/extract/statutes/extractProse'
import type { Token } from '@/tokenize'
import type { TransformationMap } from '@/types/span'

describe('extractProse', () => {
  const createIdentityMap = (): TransformationMap => {
    const cleanToOriginal = new Map<number, number>()
    const originalToClean = new Map<number, number>()
    for (let i = 0; i < 1000; i++) {
      cleanToOriginal.set(i, i)
      originalToClean.set(i, i)
    }
    return { cleanToOriginal, originalToClean }
  }

  const map = createIdentityMap()

  const makeToken = (text: string): Token => ({
    text,
    span: { cleanStart: 0, cleanEnd: text.length },
    type: 'statute',
    patternId: 'prose',
  })

  it('should extract "section 1983 of title 42"', () => {
    const c = extractProse(makeToken('section 1983 of title 42'), map)
    expect(c.type).toBe('statute')
    expect(c.title).toBe(42)
    expect(c.code).toBe('U.S.C.')
    expect(c.section).toBe('1983')
    expect(c.jurisdiction).toBe('US')
  })

  it('should extract with capital S', () => {
    const c = extractProse(makeToken('Section 1983 of title 42'), map)
    expect(c.title).toBe(42)
    expect(c.section).toBe('1983')
  })

  it('should extract subsections from prose', () => {
    const c = extractProse(makeToken('section 1983(a)(1) of title 42'), map)
    expect(c.section).toBe('1983')
    expect(c.subsection).toBe('(a)(1)')
  })

  it('should extract alphanumeric section', () => {
    const c = extractProse(makeToken('section 1028A of title 18'), map)
    expect(c.section).toBe('1028A')
    expect(c.title).toBe(18)
  })

  it('should have high confidence for prose with title', () => {
    const c = extractProse(makeToken('section 1983 of title 42'), map)
    expect(c.confidence).toBeGreaterThanOrEqual(0.85)
  })
})
