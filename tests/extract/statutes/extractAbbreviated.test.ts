import { describe, it, expect } from 'vitest'
import { extractAbbreviated } from '@/extract/statutes/extractAbbreviated'
import type { Token } from '@/tokenize'
import { createIdentityMap } from '../../helpers/transformationMap'

describe('extractAbbreviated', () => {
  const map = createIdentityMap()
  const makeToken = (text: string): Token => ({
    text, span: { cleanStart: 0, cleanEnd: text.length }, type: 'statute', patternId: 'abbreviated-code',
  })

  describe('Florida', () => {
    it('should extract Fla. Stat. § 768.81', () => {
      const c = extractAbbreviated(makeToken('Fla. Stat. § 768.81'), map)
      expect(c.jurisdiction).toBe('FL')
      expect(c.section).toBe('768.81')
      expect(c.confidence).toBeGreaterThanOrEqual(0.95)
    })
    it('should extract F.S. 768.81', () => {
      const c = extractAbbreviated(makeToken('F.S. 768.81'), map)
      expect(c.jurisdiction).toBe('FL')
      expect(c.section).toBe('768.81')
    })
    it('should extract subsections', () => {
      const c = extractAbbreviated(makeToken('Fla. Stat. § 768.81(1)(a)'), map)
      expect(c.section).toBe('768.81')
      expect(c.subsection).toBe('(1)(a)')
    })
  })

  describe('Ohio', () => {
    it('should extract R.C. 2305.01', () => {
      const c = extractAbbreviated(makeToken('R.C. 2305.01'), map)
      expect(c.jurisdiction).toBe('OH')
      expect(c.section).toBe('2305.01')
    })
    it('should extract Ohio Rev. Code § 2305.01', () => {
      const c = extractAbbreviated(makeToken('Ohio Rev. Code § 2305.01'), map)
      expect(c.jurisdiction).toBe('OH')
    })
  })

  describe('Michigan', () => {
    it('should extract MCL 750.81', () => {
      const c = extractAbbreviated(makeToken('MCL 750.81'), map)
      expect(c.jurisdiction).toBe('MI')
      expect(c.section).toBe('750.81')
    })
    it('should extract M.C.L. § 750.81', () => {
      const c = extractAbbreviated(makeToken('M.C.L. § 750.81'), map)
      expect(c.jurisdiction).toBe('MI')
    })
  })

  describe('Utah', () => {
    it('should extract Utah Code § 76-5-302', () => {
      const c = extractAbbreviated(makeToken('Utah Code § 76-5-302'), map)
      expect(c.jurisdiction).toBe('UT')
      expect(c.section).toBe('76-5-302')
    })
    it('should extract U.C.A. § 76-5-302', () => {
      const c = extractAbbreviated(makeToken('U.C.A. § 76-5-302'), map)
      expect(c.jurisdiction).toBe('UT')
    })
  })

  describe('Colorado', () => {
    it('should extract C.R.S. § 13-1-101', () => {
      const c = extractAbbreviated(makeToken('C.R.S. § 13-1-101'), map)
      expect(c.jurisdiction).toBe('CO')
      expect(c.section).toBe('13-1-101')
    })
  })

  describe('Washington', () => {
    it('should extract RCW 26.09.191', () => {
      const c = extractAbbreviated(makeToken('RCW 26.09.191'), map)
      expect(c.jurisdiction).toBe('WA')
      expect(c.section).toBe('26.09.191')
    })
  })

  describe('North Carolina', () => {
    it('should extract G.S. 20-138.1', () => {
      const c = extractAbbreviated(makeToken('G.S. 20-138.1'), map)
      expect(c.jurisdiction).toBe('NC')
      expect(c.section).toBe('20-138.1')
    })
    it('should extract N.C. Gen. Stat. § 20-138.1', () => {
      const c = extractAbbreviated(makeToken('N.C. Gen. Stat. § 20-138.1'), map)
      expect(c.jurisdiction).toBe('NC')
    })
  })

  describe('Georgia', () => {
    it('should extract O.C.G.A. § 16-5-1', () => {
      const c = extractAbbreviated(makeToken('O.C.G.A. § 16-5-1'), map)
      expect(c.jurisdiction).toBe('GA')
      expect(c.section).toBe('16-5-1')
    })
  })

  describe('Pennsylvania', () => {
    it('should extract 42 Pa.C.S. § 5524', () => {
      const c = extractAbbreviated(makeToken('42 Pa.C.S. § 5524'), map)
      expect(c.jurisdiction).toBe('PA')
      expect(c.title).toBe(42)
      expect(c.section).toBe('5524')
    })
    it('should extract 43 P.S. § 951', () => {
      const c = extractAbbreviated(makeToken('43 P.S. § 951'), map)
      expect(c.jurisdiction).toBe('PA')
      expect(c.title).toBe(43)
      expect(c.section).toBe('951')
    })
  })

  describe('Indiana', () => {
    it('should extract Ind. Code § 35-42-1-1', () => {
      const c = extractAbbreviated(makeToken('Ind. Code § 35-42-1-1'), map)
      expect(c.jurisdiction).toBe('IN')
      expect(c.section).toBe('35-42-1-1')
    })
    it('should extract IC 35-42-1-1', () => {
      const c = extractAbbreviated(makeToken('IC 35-42-1-1'), map)
      expect(c.jurisdiction).toBe('IN')
    })
  })

  describe('New Jersey', () => {
    it('should extract N.J.S.A. 2A:10-1', () => {
      const c = extractAbbreviated(makeToken('N.J.S.A. 2A:10-1'), map)
      expect(c.jurisdiction).toBe('NJ')
      expect(c.section).toBe('2A:10-1')
    })
  })

  describe('Delaware', () => {
    it('should extract 8 Del. C. § 141', () => {
      const c = extractAbbreviated(makeToken('8 Del. C. § 141'), map)
      expect(c.jurisdiction).toBe('DE')
      expect(c.title).toBe(8)
      expect(c.section).toBe('141')
    })
  })

  describe('et seq. handling', () => {
    it('should detect et seq.', () => {
      const c = extractAbbreviated(makeToken('R.C. 2305.01 et seq.'), map)
      expect(c.hasEtSeq).toBe(true)
      expect(c.section).toBe('2305.01')
    })
    it('should detect et seq without period', () => {
      const c = extractAbbreviated(makeToken('MCL 750.81 et seq'), map)
      expect(c.hasEtSeq).toBe(true)
    })
  })

  describe('unknown abbreviation', () => {
    it('should return low confidence for unrecognized abbreviation', () => {
      const c = extractAbbreviated(makeToken('Unknown 123.45'), map)
      expect(c.confidence).toBeLessThanOrEqual(0.6)
      expect(c.jurisdiction).toBeUndefined()
    })

    it('should return 0.6 confidence for unknown code with § symbol', () => {
      const c = extractAbbreviated(makeToken('Xyz. § 999'), map)
      expect(c.confidence).toBe(0.6)
      expect(c.jurisdiction).toBeUndefined()
    })
  })

  describe('fallback parsing', () => {
    it('should handle token text that does not match ABBREVIATED_RE', () => {
      // Token with no digits in section position — regex won't match
      const c = extractAbbreviated(makeToken('just text'), map)
      expect(c.type).toBe('statute')
      expect(c.section).toBe('')
      expect(c.confidence).toBeLessThanOrEqual(0.4)
    })
  })
})
