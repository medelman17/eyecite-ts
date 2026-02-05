/**
 * Short-form Citation Pattern Validation Tests
 *
 * Validates short-form citation patterns (Id., Ibid., supra, short-form case)
 * for correct matching, false positive prevention, and ReDoS safety.
 */

import { describe, it, expect } from 'vitest'
import {
  ID_PATTERN,
  IBID_PATTERN,
  SUPRA_PATTERN,
  SHORT_FORM_CASE_PATTERN,
  SHORT_FORM_PATTERNS,
} from '@/patterns/shortForm'

describe('ID_PATTERN', () => {
  it('should match basic Id. citation', () => {
    const text = 'See Id. for more details.'
    const match = ID_PATTERN.exec(text)
    expect(match).not.toBeNull()
    expect(match?.[0]).toBe('Id.')
  })

  it('should match Id. at [page] with pincite', () => {
    ID_PATTERN.lastIndex = 0 // Reset regex state
    const text = 'Id. at 253'
    const match = ID_PATTERN.exec(text)
    expect(match).not.toBeNull()
    expect(match?.[0]).toBe('Id. at 253')
    expect(match?.[1]).toBe('253') // Capture group for pincite
  })

  it('should match lowercase id.', () => {
    ID_PATTERN.lastIndex = 0
    const text = 'See also id. at 125.'
    const match = ID_PATTERN.exec(text)
    expect(match).not.toBeNull()
    expect(match?.[0]).toBe('id. at 125')
  })

  it('should NOT match Idaho (word boundary protection)', () => {
    ID_PATTERN.lastIndex = 0
    const text = 'The state of Idaho has...'
    const match = ID_PATTERN.exec(text)
    expect(match).toBeNull()
  })

  it('should NOT match Idea', () => {
    ID_PATTERN.lastIndex = 0
    const text = 'This is a great idea.'
    const match = ID_PATTERN.exec(text)
    expect(match).toBeNull()
  })

  it('should NOT match Id without period', () => {
    ID_PATTERN.lastIndex = 0
    const text = 'Id number 12345'
    const match = ID_PATTERN.exec(text)
    expect(match).toBeNull()
  })
})

describe('IBID_PATTERN', () => {
  it('should match basic Ibid. citation', () => {
    const text = 'Ibid.'
    const match = IBID_PATTERN.exec(text)
    expect(match).not.toBeNull()
    expect(match?.[0]).toBe('Ibid.')
  })

  it('should match Ibid. at [page] with pincite', () => {
    IBID_PATTERN.lastIndex = 0
    const text = 'Ibid. at 125'
    const match = IBID_PATTERN.exec(text)
    expect(match).not.toBeNull()
    expect(match?.[0]).toBe('Ibid. at 125')
    expect(match?.[1]).toBe('125')
  })

  it('should match lowercase ibid.', () => {
    IBID_PATTERN.lastIndex = 0
    const text = 'See ibid. for details.'
    const match = IBID_PATTERN.exec(text)
    expect(match).not.toBeNull()
  })
})

describe('SUPRA_PATTERN', () => {
  it('should match basic supra citation with party name', () => {
    const text = 'Smith, supra'
    const match = SUPRA_PATTERN.exec(text)
    expect(match).not.toBeNull()
    expect(match?.[0]).toBe('Smith, supra')
    expect(match?.[1]).toBe('Smith') // Capture group for party name
  })

  it('should match supra with pincite', () => {
    SUPRA_PATTERN.lastIndex = 0
    const text = 'Smith, supra, at 460'
    const match = SUPRA_PATTERN.exec(text)
    expect(match).not.toBeNull()
    expect(match?.[0]).toBe('Smith, supra, at 460')
    expect(match?.[1]).toBe('Smith')
    expect(match?.[2]).toBe('460') // Capture group for pincite
  })

  it('should match supra without comma before at', () => {
    SUPRA_PATTERN.lastIndex = 0
    const text = 'Jones, supra at 125'
    const match = SUPRA_PATTERN.exec(text)
    expect(match).not.toBeNull()
    expect(match?.[1]).toBe('Jones')
    expect(match?.[2]).toBe('125')
  })

  it('should match multi-word party name', () => {
    SUPRA_PATTERN.lastIndex = 0
    const text = 'United States, supra, at 200'
    const match = SUPRA_PATTERN.exec(text)
    expect(match).not.toBeNull()
    expect(match?.[1]).toBe('United States')
    expect(match?.[2]).toBe('200')
  })

  it('should match supra without comma after party name', () => {
    SUPRA_PATTERN.lastIndex = 0
    const text = 'Brown supra at 50'
    const match = SUPRA_PATTERN.exec(text)
    expect(match).not.toBeNull()
    expect(match?.[1]).toBe('Brown')
    expect(match?.[2]).toBe('50')
  })

  it('should NOT match lowercase party name (requires capitalization)', () => {
    SUPRA_PATTERN.lastIndex = 0
    const text = 'smith, supra'
    const match = SUPRA_PATTERN.exec(text)
    expect(match).toBeNull()
  })
})

describe('SHORT_FORM_CASE_PATTERN', () => {
  it('should match short-form case citation', () => {
    const text = '500 F.2d at 125'
    const match = SHORT_FORM_CASE_PATTERN.exec(text)
    expect(match).not.toBeNull()
    expect(match?.[0]).toBe('500 F.2d at 125')
    expect(match?.[1]).toBe('500') // Volume
    expect(match?.[2]).toBe('F.2d') // Reporter
    expect(match?.[3]).toBe('125') // Page
  })

  it('should match U.S. short-form', () => {
    SHORT_FORM_CASE_PATTERN.lastIndex = 0
    const text = '410 U.S. at 113'
    const match = SHORT_FORM_CASE_PATTERN.exec(text)
    expect(match).not.toBeNull()
    expect(match?.[1]).toBe('410')
    expect(match?.[2]).toBe('U.S.')
    expect(match?.[3]).toBe('113')
  })

  it('should match state reporter short-form', () => {
    SHORT_FORM_CASE_PATTERN.lastIndex = 0
    const text = '123 Cal.Rptr. at 456'
    const match = SHORT_FORM_CASE_PATTERN.exec(text)
    expect(match).not.toBeNull()
    expect(match?.[1]).toBe('123')
    expect(match?.[2]).toBe('Cal.Rptr.')
    expect(match?.[3]).toBe('456')
  })
})

describe('SHORT_FORM_PATTERNS array', () => {
  it('should export all four patterns', () => {
    expect(SHORT_FORM_PATTERNS).toHaveLength(4)
    expect(SHORT_FORM_PATTERNS).toContain(ID_PATTERN)
    expect(SHORT_FORM_PATTERNS).toContain(IBID_PATTERN)
    expect(SHORT_FORM_PATTERNS).toContain(SUPRA_PATTERN)
    expect(SHORT_FORM_PATTERNS).toContain(SHORT_FORM_CASE_PATTERN)
  })
})

describe('ReDoS protection', () => {
  const patterns = [
    { name: 'ID_PATTERN', pattern: ID_PATTERN },
    { name: 'IBID_PATTERN', pattern: IBID_PATTERN },
    { name: 'SUPRA_PATTERN', pattern: SUPRA_PATTERN },
    { name: 'SHORT_FORM_CASE_PATTERN', pattern: SHORT_FORM_CASE_PATTERN },
  ]

  // Pathological inputs that could trigger catastrophic backtracking
  const pathologicalInputs = [
    'Id. '.repeat(1000), // Repeated Id.
    'Ibid. '.repeat(1000), // Repeated Ibid.
    'Smith, supra, '.repeat(500), // Repeated supra
    '500 F.2d at 125 '.repeat(500), // Repeated short-form
    'a'.repeat(10000), // Long non-matching text
    `${'Id. at '.repeat(500)}123`, // Incomplete patterns
  ]

  for (const { name, pattern } of patterns) {
    it(`should complete in <100ms on pathological input: ${name}`, { timeout: 500 }, () => {
      const startTime = Date.now()

      for (const input of pathologicalInputs) {
        pattern.lastIndex = 0 // Reset regex state
        // matchAll returns an iterator - spread to array to force execution
        const _matches = [...input.matchAll(pattern)]
        // We don't care about results, just that it completes quickly
      }

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(100) // <100ms per pattern
    })
  }
})

describe('Multiple matches', () => {
  it('should find multiple Id. citations in text', () => {
    const text = 'Id. See also Id. at 253. Compare Id. at 300.'
    ID_PATTERN.lastIndex = 0
    const matches = [...text.matchAll(ID_PATTERN)]
    expect(matches).toHaveLength(3)
    expect(matches[0][0]).toBe('Id.')
    expect(matches[1][0]).toBe('Id. at 253')
    expect(matches[2][0]).toBe('Id. at 300')
  })

  it('should find multiple supra citations with different party names', () => {
    const text = 'Smith, supra, at 10. Jones, supra, at 20. Brown, supra.'
    SUPRA_PATTERN.lastIndex = 0
    const matches = [...text.matchAll(SUPRA_PATTERN)]
    expect(matches).toHaveLength(3)
    expect(matches[0][1]).toBe('Smith')
    expect(matches[1][1]).toBe('Jones')
    expect(matches[2][1]).toBe('Brown')
  })
})
