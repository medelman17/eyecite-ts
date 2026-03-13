import { describe, it, expect } from 'vitest'
import { abbreviatedCodes, findAbbreviatedCode, namedCodes, findNamedCode, type CodeEntry } from '@/data/knownCodes'

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

  describe('namedCodes', () => {
    it('should have entries for all 7 named-code jurisdictions', () => {
      const jurisdictions = new Set(namedCodes.map(c => c.jurisdiction))
      expect(jurisdictions).toContain('NY')
      expect(jurisdictions).toContain('CA')
      expect(jurisdictions).toContain('TX')
      expect(jurisdictions).toContain('MD')
      expect(jurisdictions).toContain('VA')
      expect(jurisdictions).toContain('AL')
      expect(jurisdictions).toContain('MA')
      expect(jurisdictions.size).toBe(7)
    })

    it('should have valid CodeEntry fields on all entries', () => {
      for (const entry of namedCodes) {
        expect(entry.jurisdiction).toBeTruthy()
        expect(entry.abbreviation).toBeTruthy()
        expect(entry.patterns.length).toBeGreaterThan(0)
        expect(entry.family).toBe('named')
      }
    })

    it('should have 21 NY entries', () => {
      const nyEntries = namedCodes.filter(e => e.jurisdiction === 'NY')
      expect(nyEntries.length).toBe(21)
    })

    it('should have 29 CA entries', () => {
      const caEntries = namedCodes.filter(e => e.jurisdiction === 'CA')
      expect(caEntries.length).toBe(29)
    })

    it('should have 29 TX entries', () => {
      const txEntries = namedCodes.filter(e => e.jurisdiction === 'TX')
      expect(txEntries.length).toBe(29)
    })

    it('should have 36 MD entries', () => {
      const mdEntries = namedCodes.filter(e => e.jurisdiction === 'MD')
      expect(mdEntries.length).toBe(36)
    })

    it('should have key NY entries', () => {
      const penEntry = namedCodes.find(e => e.jurisdiction === 'NY' && e.abbreviation === 'PEN')
      expect(penEntry).toBeDefined()
      expect(penEntry?.patterns).toContain('Penal')

      const cplrEntry = namedCodes.find(e => e.jurisdiction === 'NY' && e.abbreviation === 'CPLR')
      expect(cplrEntry).toBeDefined()
      expect(cplrEntry?.patterns).toContain('C.P.L.R.')
    })

    it('should have key CA entries with CCP before CIV', () => {
      const caEntries = namedCodes.filter(e => e.jurisdiction === 'CA')
      const ccpIdx = caEntries.findIndex(e => e.abbreviation === 'CCP')
      const civIdx = caEntries.findIndex(e => e.abbreviation === 'CIV')
      expect(ccpIdx).toBeGreaterThanOrEqual(0)
      expect(civIdx).toBeGreaterThanOrEqual(0)
      // CCP (specific) must come before CIV (general) for longest-match to work
      expect(ccpIdx).toBeLessThan(civIdx)
    })

    it('should have key TX entries', () => {
      const peEntry = namedCodes.find(e => e.jurisdiction === 'TX' && e.abbreviation === 'PE')
      expect(peEntry).toBeDefined()
      expect(peEntry?.patterns).toContain('Penal')
    })

    it('should have key MD entries', () => {
      const gcrEntry = namedCodes.find(e => e.jurisdiction === 'MD' && e.abbreviation === 'gcr')
      expect(gcrEntry).toBeDefined()
      expect(gcrEntry?.patterns).toContain('Crim. Law')
    })
  })

  describe('findNamedCode', () => {
    it('should find NY Penal → PEN', () => {
      const entry = findNamedCode('NY', 'Penal')
      expect(entry?.jurisdiction).toBe('NY')
      expect(entry?.abbreviation).toBe('PEN')
    })

    it('should find CA Penal → PEN', () => {
      const entry = findNamedCode('CA', 'Penal')
      expect(entry?.jurisdiction).toBe('CA')
      expect(entry?.abbreviation).toBe('PEN')
    })

    it('should find MD Crim. Law → gcr', () => {
      const entry = findNamedCode('MD', 'Crim. Law')
      expect(entry?.jurisdiction).toBe('MD')
      expect(entry?.abbreviation).toBe('gcr')
    })

    it('should prefer longer match: CA Civ. Proc. → CCP (not CIV)', () => {
      const entry = findNamedCode('CA', 'Civ. Proc.')
      expect(entry?.jurisdiction).toBe('CA')
      expect(entry?.abbreviation).toBe('CCP')
    })

    it('should match CA Civ. → CIV when no longer match exists', () => {
      const entry = findNamedCode('CA', 'Civ.')
      expect(entry?.jurisdiction).toBe('CA')
      expect(entry?.abbreviation).toBe('CIV')
    })

    it('should be case-insensitive', () => {
      const entry = findNamedCode('NY', 'penal')
      expect(entry?.jurisdiction).toBe('NY')
      expect(entry?.abbreviation).toBe('PEN')
    })

    it('should return undefined for unknown code name', () => {
      const entry = findNamedCode('NY', 'Unknown Code')
      expect(entry).toBeUndefined()
    })

    it('should return undefined for unknown jurisdiction', () => {
      const entry = findNamedCode('ZZ', 'Penal')
      expect(entry).toBeUndefined()
    })

    it('should match on startsWith for code name with trailing text', () => {
      // "Penal Law" starts with "Penal"
      const entry = findNamedCode('NY', 'Penal Law')
      expect(entry?.jurisdiction).toBe('NY')
      expect(entry?.abbreviation).toBe('PEN')
    })

    it('should find MA Gen. Laws → GL', () => {
      const entry = findNamedCode('MA', 'Gen. Laws')
      expect(entry?.jurisdiction).toBe('MA')
      expect(entry?.abbreviation).toBe('GL')
    })

    it('should handle extra whitespace via normalization', () => {
      const entry = findNamedCode('NY', '  Penal  ')
      expect(entry?.jurisdiction).toBe('NY')
      expect(entry?.abbreviation).toBe('PEN')
    })
  })
})
