import { describe, it, expect } from 'vitest'
import { statutePatterns } from '@/patterns'

describe('statutePatterns', () => {
  const getPattern = (id: string) => {
    const p = statutePatterns.find(p => p.id === id)
    if (!p) throw new Error(`Pattern ${id} not found`)
    return p
  }

  describe('usc pattern', () => {
    const getMatches = (text: string) => {
      const p = getPattern('usc')
      p.regex.lastIndex = 0
      return [...text.matchAll(p.regex)]
    }

    it('should match basic USC citation', () => {
      const matches = getMatches('42 U.S.C. § 1983')
      expect(matches).toHaveLength(1)
    })

    it('should match USC without periods', () => {
      const matches = getMatches('15 USC § 78j')
      expect(matches).toHaveLength(1)
    })

    it('should match USC with subsections', () => {
      const matches = getMatches('42 U.S.C. § 1983(a)(1)')
      expect(matches).toHaveLength(1)
      expect(matches[0][0]).toContain('(a)(1)')
    })

    it('should match USC with et seq.', () => {
      const matches = getMatches('42 U.S.C. § 1983 et seq.')
      expect(matches).toHaveLength(1)
      expect(matches[0][0]).toContain('et seq.')
    })

    it('should match USC with double section symbol', () => {
      const matches = getMatches('42 U.S.C. §§ 1983-1988')
      expect(matches).toHaveLength(1)
    })

    it('should match subsection + et seq combined', () => {
      const matches = getMatches('42 U.S.C. § 1983(a) et seq.')
      expect(matches).toHaveLength(1)
      expect(matches[0][0]).toContain('(a)')
      expect(matches[0][0]).toContain('et seq.')
    })

    it('should not match non-USC text', () => {
      const matches = getMatches('The United States Code is a compilation')
      expect(matches).toHaveLength(0)
    })
  })

  describe('cfr pattern', () => {
    const getMatches = (text: string) => {
      const p = getPattern('cfr')
      p.regex.lastIndex = 0
      return [...text.matchAll(p.regex)]
    }

    it('should match basic CFR citation', () => {
      const matches = getMatches('40 C.F.R. § 122')
      expect(matches).toHaveLength(1)
    })

    it('should match CFR without trailing period', () => {
      const matches = getMatches('40 C.F.R § 122')
      expect(matches).toHaveLength(1)
    })

    it('should match CFR with dotted section', () => {
      const matches = getMatches('12 C.F.R. § 226.1')
      expect(matches).toHaveLength(1)
    })

    it('should match CFR Part reference', () => {
      const matches = getMatches('12 C.F.R. Part 226')
      expect(matches).toHaveLength(1)
    })

    it('should match CFR with subsections', () => {
      const matches = getMatches('40 C.F.R. § 122.26(b)(14)')
      expect(matches).toHaveLength(1)
      expect(matches[0][0]).toContain('(b)(14)')
    })

    it('should match CFR with et seq.', () => {
      const matches = getMatches('40 C.F.R. § 122 et seq.')
      expect(matches).toHaveLength(1)
    })
  })

  describe('prose pattern', () => {
    const getMatches = (text: string) => {
      const p = getPattern('prose')
      p.regex.lastIndex = 0
      return [...text.matchAll(p.regex)]
    }

    it('should match "section X of title Y"', () => {
      const matches = getMatches('section 1983 of title 42')
      expect(matches).toHaveLength(1)
    })

    it('should match with capital S', () => {
      const matches = getMatches('Section 1983 of title 42')
      expect(matches).toHaveLength(1)
    })

    it('should match section with subsections', () => {
      const matches = getMatches('section 1983(a)(1) of title 42')
      expect(matches).toHaveLength(1)
    })

    it('should not match partial prose', () => {
      const matches = getMatches('section 1983 of the report')
      expect(matches).toHaveLength(0)
    })
  })

  describe('state-code pattern (backward compat)', () => {
    const getMatches = (text: string) => {
      const p = getPattern('state-code')
      p.regex.lastIndex = 0
      return [...text.matchAll(p.regex)]
    }

    it('should still match Cal. Penal Code § 187', () => {
      const matches = getMatches('Cal. Penal Code § 187')
      expect(matches).toHaveLength(1)
    })
  })
})
