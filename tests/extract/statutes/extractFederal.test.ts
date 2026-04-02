import { describe, it, expect } from 'vitest'
import { extractFederal } from '@/extract/statutes/extractFederal'
import type { Token } from '@/tokenize'
import { createIdentityMap } from '../../helpers/transformationMap'

describe('extractFederal', () => {
  const map = createIdentityMap()

  const makeToken = (text: string, patternId: string): Token => ({
    text,
    span: { cleanStart: 0, cleanEnd: text.length },
    type: 'statute',
    patternId,
  })

  describe('USC extraction', () => {
    it('should extract basic USC citation', () => {
      const c = extractFederal(makeToken('42 U.S.C. § 1983', 'usc'), map)
      expect(c.type).toBe('statute')
      expect(c.title).toBe(42)
      expect(c.code).toBe('U.S.C.')
      expect(c.section).toBe('1983')
      expect(c.jurisdiction).toBe('US')
      expect(c.confidence).toBeGreaterThanOrEqual(0.95)
    })

    it('should extract USC without periods', () => {
      const c = extractFederal(makeToken('15 USC § 78j', 'usc'), map)
      expect(c.title).toBe(15)
      expect(c.code).toBe('USC')
      expect(c.section).toBe('78j')
      expect(c.jurisdiction).toBe('US')
    })

    it('should extract subsections', () => {
      const c = extractFederal(makeToken('42 U.S.C. § 1983(a)(1)', 'usc'), map)
      expect(c.section).toBe('1983')
      expect(c.subsection).toBe('(a)(1)')
      expect(c.pincite).toBe('(a)(1)')
    })

    it('should extract deep subsection chains', () => {
      const c = extractFederal(makeToken('26 U.S.C. § 501(c)(3)(A)(i)', 'usc'), map)
      expect(c.section).toBe('501')
      expect(c.subsection).toBe('(c)(3)(A)(i)')
    })

    it('should detect et seq.', () => {
      const c = extractFederal(makeToken('42 U.S.C. § 1983 et seq.', 'usc'), map)
      expect(c.section).toBe('1983')
      expect(c.hasEtSeq).toBe(true)
      expect(c.subsection).toBeUndefined()
    })

    it('should detect et seq without period', () => {
      const c = extractFederal(makeToken('42 U.S.C. § 1983 et seq', 'usc'), map)
      expect(c.hasEtSeq).toBe(true)
    })

    it('should handle subsection + et seq', () => {
      const c = extractFederal(makeToken('42 U.S.C. § 1983(a) et seq.', 'usc'), map)
      expect(c.section).toBe('1983')
      expect(c.subsection).toBe('(a)')
      expect(c.hasEtSeq).toBe(true)
    })

    it('should handle section ranges with §§', () => {
      const c = extractFederal(makeToken('42 U.S.C. §§ 1983-1988', 'usc'), map)
      expect(c.section).toBe('1983-1988')
    })

    it('should handle alphanumeric sections', () => {
      const c = extractFederal(makeToken('18 U.S.C. § 1028A', 'usc'), map)
      expect(c.section).toBe('1028A')
    })

    it('should set confidence with subsection bonus', () => {
      const c = extractFederal(makeToken('42 U.S.C. § 1983(a)', 'usc'), map)
      expect(c.confidence).toBe(1.0)
    })
  })

  describe('CFR extraction', () => {
    it('should extract basic CFR citation', () => {
      const c = extractFederal(makeToken('40 C.F.R. § 122', 'cfr'), map)
      expect(c.title).toBe(40)
      expect(c.code).toBe('C.F.R.')
      expect(c.section).toBe('122')
      expect(c.jurisdiction).toBe('US')
    })

    it('should extract CFR with dotted section', () => {
      const c = extractFederal(makeToken('12 C.F.R. § 226.1', 'cfr'), map)
      expect(c.section).toBe('226.1')
    })

    it('should extract CFR Part reference', () => {
      const c = extractFederal(makeToken('12 C.F.R. Part 226', 'cfr'), map)
      expect(c.section).toBe('226')
      expect(c.code).toBe('C.F.R.')
    })

    it('should extract CFR with subsections', () => {
      const c = extractFederal(makeToken('40 C.F.R. § 122.26(b)(14)', 'cfr'), map)
      expect(c.section).toBe('122.26')
      expect(c.subsection).toBe('(b)(14)')
    })

    it('should handle CFR without periods', () => {
      const c = extractFederal(makeToken('40 CFR § 122', 'cfr'), map)
      expect(c.title).toBe(40)
      expect(c.code).toBe('CFR')
      expect(c.section).toBe('122')
    })
  })

  describe('position translation', () => {
    it('should translate clean to original positions', () => {
      const offsetMap: TransformationMap = {
        cleanToOriginal: new Map(Array.from({ length: 100 }, (_, i) => [i, i + 5])),
        originalToClean: new Map(Array.from({ length: 100 }, (_, i) => [i + 5, i])),
      }
      const token = makeToken('42 U.S.C. § 1983', 'usc')
      token.span = { cleanStart: 10, cleanEnd: 26 }

      const c = extractFederal(token, offsetMap)
      expect(c.span.originalStart).toBe(15)
      expect(c.span.originalEnd).toBe(31)
    })
  })

  describe('fallback parsing', () => {
    it('should use fallback code for unparseable USC token', () => {
      // Token text that doesn't match FEDERAL_SECTION_RE or FEDERAL_PART_RE
      const c = extractFederal(makeToken('malformed text', 'usc'), map)
      expect(c.code).toBe('U.S.C.')
      expect(c.type).toBe('statute')
    })

    it('should use C.F.R. fallback for unparseable CFR token', () => {
      const c = extractFederal(makeToken('malformed text', 'cfr'), map)
      expect(c.code).toBe('C.F.R.')
    })
  })
})
