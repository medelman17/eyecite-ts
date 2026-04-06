import { describe, expect, it } from "vitest"
import { statutePatterns } from "@/patterns"

describe("statutePatterns", () => {
  const getPattern = (id: string) => {
    const p = statutePatterns.find((p) => p.id === id)
    if (!p) throw new Error(`Pattern ${id} not found`)
    return p
  }

  describe("usc pattern", () => {
    const getMatches = (text: string) => {
      const p = getPattern("usc")
      p.regex.lastIndex = 0
      return [...text.matchAll(p.regex)]
    }

    it("should match basic USC citation", () => {
      const matches = getMatches("42 U.S.C. § 1983")
      expect(matches).toHaveLength(1)
    })

    it("should match USC without periods", () => {
      const matches = getMatches("15 USC § 78j")
      expect(matches).toHaveLength(1)
    })

    it("should match USC with subsections", () => {
      const matches = getMatches("42 U.S.C. § 1983(a)(1)")
      expect(matches).toHaveLength(1)
      expect(matches[0][0]).toContain("(a)(1)")
    })

    it("should match USC with et seq.", () => {
      const matches = getMatches("42 U.S.C. § 1983 et seq.")
      expect(matches).toHaveLength(1)
      expect(matches[0][0]).toContain("et seq.")
    })

    it("should match USC with double section symbol", () => {
      const matches = getMatches("42 U.S.C. §§ 1983-1988")
      expect(matches).toHaveLength(1)
    })

    it("should match subsection + et seq combined", () => {
      const matches = getMatches("42 U.S.C. § 1983(a) et seq.")
      expect(matches).toHaveLength(1)
      expect(matches[0][0]).toContain("(a)")
      expect(matches[0][0]).toContain("et seq.")
    })

    it("should not match non-USC text", () => {
      const matches = getMatches("The United States Code is a compilation")
      expect(matches).toHaveLength(0)
    })
  })

  describe("cfr pattern", () => {
    const getMatches = (text: string) => {
      const p = getPattern("cfr")
      p.regex.lastIndex = 0
      return [...text.matchAll(p.regex)]
    }

    it("should match basic CFR citation", () => {
      const matches = getMatches("40 C.F.R. § 122")
      expect(matches).toHaveLength(1)
    })

    it("should match CFR without trailing period", () => {
      const matches = getMatches("40 C.F.R § 122")
      expect(matches).toHaveLength(1)
    })

    it("should match CFR with dotted section", () => {
      const matches = getMatches("12 C.F.R. § 226.1")
      expect(matches).toHaveLength(1)
    })

    it("should match CFR Part reference", () => {
      const matches = getMatches("12 C.F.R. Part 226")
      expect(matches).toHaveLength(1)
    })

    it("should match CFR with subsections", () => {
      const matches = getMatches("40 C.F.R. § 122.26(b)(14)")
      expect(matches).toHaveLength(1)
      expect(matches[0][0]).toContain("(b)(14)")
    })

    it("should match CFR with et seq.", () => {
      const matches = getMatches("40 C.F.R. § 122 et seq.")
      expect(matches).toHaveLength(1)
    })
  })

  describe("prose pattern", () => {
    const getMatches = (text: string) => {
      const p = getPattern("prose")
      p.regex.lastIndex = 0
      return [...text.matchAll(p.regex)]
    }

    it('should match "section X of title Y"', () => {
      const matches = getMatches("section 1983 of title 42")
      expect(matches).toHaveLength(1)
    })

    it("should match with capital S", () => {
      const matches = getMatches("Section 1983 of title 42")
      expect(matches).toHaveLength(1)
    })

    it("should match section with subsections", () => {
      const matches = getMatches("section 1983(a)(1) of title 42")
      expect(matches).toHaveLength(1)
    })

    it("should not match partial prose", () => {
      const matches = getMatches("section 1983 of the report")
      expect(matches).toHaveLength(0)
    })
  })

  describe("abbreviated-code pattern", () => {
    const getMatches = (text: string) => {
      const p = statutePatterns.find((p) => p.id === "abbreviated-code")
      if (!p) throw new Error("abbreviated-code pattern not found")
      p.regex.lastIndex = 0
      return [...text.matchAll(p.regex)]
    }

    it("should match Fla. Stat. § 768.81", () => {
      const m = getMatches("Fla. Stat. § 768.81")
      expect(m).toHaveLength(1)
    })
    it("should match F.S. 768.81", () => {
      const m = getMatches("F.S. 768.81")
      expect(m).toHaveLength(1)
    })
    it("should match R.C. 2305.01", () => {
      const m = getMatches("R.C. 2305.01")
      expect(m).toHaveLength(1)
    })
    it("should match Ohio Rev. Code § 2305.01", () => {
      const m = getMatches("Ohio Rev. Code § 2305.01")
      expect(m).toHaveLength(1)
    })
    it("should match MCL 750.81", () => {
      const m = getMatches("MCL 750.81")
      expect(m).toHaveLength(1)
    })
    it("should match Utah Code § 76-5-302", () => {
      const m = getMatches("Utah Code § 76-5-302")
      expect(m).toHaveLength(1)
    })
    it("should match U.C.A. § 76-5-302", () => {
      const m = getMatches("U.C.A. § 76-5-302")
      expect(m).toHaveLength(1)
    })
    it("should match C.R.S. § 13-1-101", () => {
      const m = getMatches("C.R.S. § 13-1-101")
      expect(m).toHaveLength(1)
    })
    it("should match RCW 26.09.191", () => {
      const m = getMatches("RCW 26.09.191")
      expect(m).toHaveLength(1)
    })
    it("should match G.S. 20-138.1", () => {
      const m = getMatches("G.S. 20-138.1")
      expect(m).toHaveLength(1)
    })
    it("should match N.C. Gen. Stat. § 20-138.1", () => {
      const m = getMatches("N.C. Gen. Stat. § 20-138.1")
      expect(m).toHaveLength(1)
    })
    it("should match O.C.G.A. § 16-5-1", () => {
      const m = getMatches("O.C.G.A. § 16-5-1")
      expect(m).toHaveLength(1)
    })
    it("should match 42 Pa.C.S. § 5524", () => {
      const m = getMatches("42 Pa.C.S. § 5524")
      expect(m).toHaveLength(1)
    })
    it("should match 43 P.S. § 951", () => {
      const m = getMatches("43 P.S. § 951")
      expect(m).toHaveLength(1)
    })
    it("should match Ind. Code § 35-42-1-1", () => {
      const m = getMatches("Ind. Code § 35-42-1-1")
      expect(m).toHaveLength(1)
    })
    it("should match IC 35-42-1-1", () => {
      const m = getMatches("IC 35-42-1-1")
      expect(m).toHaveLength(1)
    })
    it("should match N.J.S.A. 2A:10-1", () => {
      const m = getMatches("N.J.S.A. 2A:10-1")
      expect(m).toHaveLength(1)
    })
    it("should match 8 Del. C. § 141", () => {
      const m = getMatches("8 Del. C. § 141")
      expect(m).toHaveLength(1)
    })
    it("should capture subsections", () => {
      const m = getMatches("Fla. Stat. § 768.81(1)(a)")
      expect(m).toHaveLength(1)
      expect(m[0][0]).toContain("(1)(a)")
    })
    it("should capture et seq.", () => {
      const m = getMatches("R.C. 2305.01 et seq.")
      expect(m).toHaveLength(1)
      expect(m[0][0]).toContain("et seq.")
    })
    it("should not match bare numbers", () => {
      const m = getMatches("Section 768.81 of the statute")
      expect(m).toHaveLength(0)
    })
  })

  describe("named-code pattern", () => {
    const getMatches = (text: string) => {
      const p = statutePatterns.find((p) => p.id === "named-code")
      if (!p) throw new Error("named-code pattern not found")
      p.regex.lastIndex = 0
      return [...text.matchAll(p.regex)]
    }

    it("should match N.Y. Penal Law § 125.25", () => {
      expect(getMatches("N.Y. Penal Law § 125.25")).toHaveLength(1)
    })
    it("should match N.Y. C.P.L.R. § 211", () => {
      expect(getMatches("N.Y. C.P.L.R. § 211")).toHaveLength(1)
    })
    it("should match Cal. Penal Code § 187", () => {
      expect(getMatches("Cal. Penal Code § 187")).toHaveLength(1)
    })
    it("should match Cal. Civ. Proc. Code § 425.16", () => {
      expect(getMatches("Cal. Civ. Proc. Code § 425.16")).toHaveLength(1)
    })
    it("should match Tex. Penal Code § 19.02", () => {
      expect(getMatches("Tex. Penal Code § 19.02")).toHaveLength(1)
    })
    it("should match Tex. Fam. Code § 1.01", () => {
      expect(getMatches("Tex. Fam. Code § 1.01")).toHaveLength(1)
    })
    it("should match Md. Code Ann., Crim. Law § 3-202", () => {
      expect(getMatches("Md. Code Ann., Crim. Law § 3-202")).toHaveLength(1)
    })
    it("should match Md. Code, Ins. § 27-101", () => {
      expect(getMatches("Md. Code, Ins. § 27-101")).toHaveLength(1)
    })
    it("should match Va. Code § 8.01-243", () => {
      expect(getMatches("Va. Code § 8.01-243")).toHaveLength(1)
    })
    it("should match Va. Code Ann. § 54.1-2400", () => {
      expect(getMatches("Va. Code Ann. § 54.1-2400")).toHaveLength(1)
    })
    it("should match Ala. Code § 13A-6-61", () => {
      expect(getMatches("Ala. Code § 13A-6-61")).toHaveLength(1)
    })
    it("should capture subsections", () => {
      const m = getMatches("N.Y. Penal Law § 125.25(1)(a)")
      expect(m).toHaveLength(1)
      expect(m[0][0]).toContain("(1)(a)")
    })
    it("should capture et seq.", () => {
      const m = getMatches("Cal. Penal Code § 187 et seq.")
      expect(m).toHaveLength(1)
      expect(m[0][0]).toContain("et seq.")
    })
    it("should not match text without §", () => {
      expect(getMatches("The N.Y. Penal Law was enacted in 1965")).toHaveLength(0)
    })
    it("should not match W. Va. Code (handled by abbreviated-code)", () => {
      expect(getMatches("W. Va. Code § 61-2-9")).toHaveLength(0)
    })
    it("should not match W.Va. Code (handled by abbreviated-code)", () => {
      expect(getMatches("W.Va. Code § 61-2-9")).toHaveLength(0)
    })
  })

  describe("mass-chapter pattern", () => {
    const getMatches = (text: string) => {
      const p = statutePatterns.find((p) => p.id === "mass-chapter")
      if (!p) throw new Error("mass-chapter pattern not found")
      p.regex.lastIndex = 0
      return [...text.matchAll(p.regex)]
    }

    it("should match Mass. Gen. Laws ch. 93A, § 2", () => {
      expect(getMatches("Mass. Gen. Laws ch. 93A, § 2")).toHaveLength(1)
    })
    it("should match M.G.L.A. c. 93, § 14", () => {
      expect(getMatches("M.G.L.A. c. 93, § 14")).toHaveLength(1)
    })
    it("should match G.L. c. 231, § 6", () => {
      expect(getMatches("G.L. c. 231, § 6")).toHaveLength(1)
    })
    it("should match A.L.M. c. 93A, § 9", () => {
      expect(getMatches("A.L.M. c. 93A, § 9")).toHaveLength(1)
    })
  })

  describe("chapter-act pattern", () => {
    const getMatches = (text: string) => {
      const p = statutePatterns.find((p) => p.id === "chapter-act")
      if (!p) throw new Error("chapter-act pattern not found")
      p.regex.lastIndex = 0
      return [...text.matchAll(p.regex)]
    }

    it("should match 735 ILCS 5/2-1001", () => {
      expect(getMatches("735 ILCS 5/2-1001")).toHaveLength(1)
    })
    it("should match 720 ILCS 5/12-3.05", () => {
      expect(getMatches("720 ILCS 5/12-3.05")).toHaveLength(1)
    })
    it("should match 735 Ill. Comp. Stat. 5/2-1001", () => {
      expect(getMatches("735 Ill. Comp. Stat. 5/2-1001")).toHaveLength(1)
    })
    it("should match ILCS Ann.", () => {
      expect(getMatches("735 ILCS Ann. 5/2-1001")).toHaveLength(1)
    })
    it("should capture subsections", () => {
      const m = getMatches("735 ILCS 5/2-1001(a)")
      expect(m).toHaveLength(1)
      expect(m[0][0]).toContain("(a)")
    })
    it("should capture et seq.", () => {
      const m = getMatches("735 ILCS 5/2-1001 et seq.")
      expect(m).toHaveLength(1)
      expect(m[0][0]).toContain("et seq.")
    })
  })
})
