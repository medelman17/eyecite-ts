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

  describe('abbreviated-code pattern', () => {
    const getMatches = (text: string) => {
      const p = statutePatterns.find(p => p.id === 'abbreviated-code')
      if (!p) throw new Error('abbreviated-code pattern not found')
      p.regex.lastIndex = 0
      return [...text.matchAll(p.regex)]
    }

    it('should match Fla. Stat. § 768.81', () => {
      const m = getMatches('Fla. Stat. § 768.81')
      expect(m).toHaveLength(1)
    })
    it('should match F.S. 768.81', () => {
      const m = getMatches('F.S. 768.81')
      expect(m).toHaveLength(1)
    })
    it('should match R.C. 2305.01', () => {
      const m = getMatches('R.C. 2305.01')
      expect(m).toHaveLength(1)
    })
    it('should match Ohio Rev. Code § 2305.01', () => {
      const m = getMatches('Ohio Rev. Code § 2305.01')
      expect(m).toHaveLength(1)
    })
    it('should match MCL 750.81', () => {
      const m = getMatches('MCL 750.81')
      expect(m).toHaveLength(1)
    })
    it('should match Utah Code § 76-5-302', () => {
      const m = getMatches('Utah Code § 76-5-302')
      expect(m).toHaveLength(1)
    })
    it('should match U.C.A. § 76-5-302', () => {
      const m = getMatches('U.C.A. § 76-5-302')
      expect(m).toHaveLength(1)
    })
    it('should match C.R.S. § 13-1-101', () => {
      const m = getMatches('C.R.S. § 13-1-101')
      expect(m).toHaveLength(1)
    })
    it('should match RCW 26.09.191', () => {
      const m = getMatches('RCW 26.09.191')
      expect(m).toHaveLength(1)
    })
    it('should match G.S. 20-138.1', () => {
      const m = getMatches('G.S. 20-138.1')
      expect(m).toHaveLength(1)
    })
    it('should match N.C. Gen. Stat. § 20-138.1', () => {
      const m = getMatches('N.C. Gen. Stat. § 20-138.1')
      expect(m).toHaveLength(1)
    })
    it('should match O.C.G.A. § 16-5-1', () => {
      const m = getMatches('O.C.G.A. § 16-5-1')
      expect(m).toHaveLength(1)
    })
    it('should match 42 Pa.C.S. § 5524', () => {
      const m = getMatches('42 Pa.C.S. § 5524')
      expect(m).toHaveLength(1)
    })
    it('should match 43 P.S. § 951', () => {
      const m = getMatches('43 P.S. § 951')
      expect(m).toHaveLength(1)
    })
    it('should match Ind. Code § 35-42-1-1', () => {
      const m = getMatches('Ind. Code § 35-42-1-1')
      expect(m).toHaveLength(1)
    })
    it('should match IC 35-42-1-1', () => {
      const m = getMatches('IC 35-42-1-1')
      expect(m).toHaveLength(1)
    })
    it('should match N.J.S.A. 2A:10-1', () => {
      const m = getMatches('N.J.S.A. 2A:10-1')
      expect(m).toHaveLength(1)
    })
    it('should match 8 Del. C. § 141', () => {
      const m = getMatches('8 Del. C. § 141')
      expect(m).toHaveLength(1)
    })
    it('should capture subsections', () => {
      const m = getMatches('Fla. Stat. § 768.81(1)(a)')
      expect(m).toHaveLength(1)
      expect(m[0][0]).toContain('(1)(a)')
    })
    it('should capture et seq.', () => {
      const m = getMatches('R.C. 2305.01 et seq.')
      expect(m).toHaveLength(1)
      expect(m[0][0]).toContain('et seq.')
    })
    it('should not match bare numbers', () => {
      const m = getMatches('Section 768.81 of the statute')
      expect(m).toHaveLength(0)
    })
  })
})
