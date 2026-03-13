import { describe, it, expect } from 'vitest'
import { abbreviatedCodes, findAbbreviatedCode, type CodeEntry } from '@/data/knownCodes'

describe('knownCodes registry', () => {
  describe('abbreviatedCodes', () => {
    it('should have entries for all 12 jurisdictions', () => {
      const jurisdictions = new Set(abbreviatedCodes.map(c => c.jurisdiction))
      expect(jurisdictions).toContain('FL')
      expect(jurisdictions).toContain('OH')
      expect(jurisdictions).toContain('MI')
      expect(jurisdictions).toContain('UT')
      expect(jurisdictions).toContain('CO')
      expect(jurisdictions).toContain('WA')
      expect(jurisdictions).toContain('NC')
      expect(jurisdictions).toContain('GA')
      expect(jurisdictions).toContain('PA')
      expect(jurisdictions).toContain('IN')
      expect(jurisdictions).toContain('NJ')
      expect(jurisdictions).toContain('DE')
      expect(jurisdictions.size).toBe(12)
    })

    it('should have no duplicate abbreviation strings across jurisdictions', () => {
      const seen = new Map<string, string>()
      for (const entry of abbreviatedCodes) {
        for (const pattern of entry.patterns) {
          const lower = pattern.toLowerCase()
          const existing = seen.get(lower)
          if (existing && existing !== entry.jurisdiction) {
            throw new Error(
              `Duplicate pattern "${pattern}" in ${entry.jurisdiction} and ${existing}`
            )
          }
          seen.set(lower, entry.jurisdiction)
        }
      }
    })

    it('should have valid CodeEntry fields on all entries', () => {
      for (const entry of abbreviatedCodes) {
        expect(entry.jurisdiction).toMatch(/^[A-Z]{2}$/)
        expect(entry.abbreviation).toBeTruthy()
        expect(entry.patterns.length).toBeGreaterThan(0)
        expect(entry.family).toBe('abbreviated')
      }
    })

    it('should have at least one pattern per entry', () => {
      for (const entry of abbreviatedCodes) {
        expect(entry.patterns.length).toBeGreaterThanOrEqual(1)
      }
    })
  })

  describe('findAbbreviatedCode', () => {
    it('should find exact match', () => {
      const entry = findAbbreviatedCode('R.C.')
      expect(entry?.jurisdiction).toBe('OH')
    })

    it('should find case-insensitive match', () => {
      const entry = findAbbreviatedCode('mcl')
      expect(entry?.jurisdiction).toBe('MI')
    })

    it('should return undefined for unknown abbreviation', () => {
      const entry = findAbbreviatedCode('UNKNOWN')
      expect(entry).toBeUndefined()
    })

    it('should use prefix fallback for longer text not in exact map', () => {
      // "Fla. Stat. Ann. §" is not an exact pattern entry, but starts with "Fla. Stat."
      const entry = findAbbreviatedCode('Fla. Stat. Ann. §')
      expect(entry?.jurisdiction).toBe('FL')
    })

    it('should prefer longest prefix match', () => {
      // "RCW" should match WA, not OH's "RC" prefix
      const entry = findAbbreviatedCode('RCW')
      expect(entry?.jurisdiction).toBe('WA')
    })
  })
})
