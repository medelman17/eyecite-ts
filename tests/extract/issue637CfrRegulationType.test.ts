import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { RegulationCitation, StatuteCitation } from "@/types/citation"

const cfrCites = (text: string): RegulationCitation[] =>
  extractCitations(text).filter((c): c is RegulationCitation => c.type === "regulation")

const statuteCites = (text: string): StatuteCitation[] =>
  extractCitations(text).filter((c): c is StatuteCitation => c.type === "statute")

describe("#637 CFR citations have type=regulation, not type=statute", () => {
  describe("Bare CFR forms", () => {
    it("42 C.F.R. § 100.3", () => {
      const cs = cfrCites("42 C.F.R. § 100.3")
      expect(cs).toHaveLength(1)
      expect(cs[0].title).toBe(42)
      expect(cs[0].code).toBe("C.F.R.")
      expect(cs[0].section).toBe("100.3")
    })

    it("29 C.F.R. § 779.238", () => {
      const cs = cfrCites("29 C.F.R. § 779.238")
      expect(cs).toHaveLength(1)
      expect(cs[0].title).toBe(29)
      expect(cs[0].section).toBe("779.238")
    })

    it("19 C.F.R. § 351.412(e) — with subsection", () => {
      const cs = cfrCites("19 C.F.R. § 351.412(e)")
      expect(cs).toHaveLength(1)
      expect(cs[0].title).toBe(19)
      expect(cs[0].subsection).toBe("(e)")
    })

    it("19 C.F.R. § 351.403", () => {
      const cs = cfrCites("19 C.F.R. § 351.403")
      expect(cs).toHaveLength(1)
      expect(cs[0].title).toBe(19)
    })

    it("42 CFR 447 — no §, no periods", () => {
      const cs = cfrCites("42 CFR 447")
      expect(cs).toHaveLength(1)
      expect(cs[0].title).toBe(42)
      expect(cs[0].section).toBe("447")
    })

    it("12 C.F.R., § 226 — comma form (#587 carry-forward)", () => {
      const cs = cfrCites("12 C.F.R., § 226")
      expect(cs).toHaveLength(1)
      expect(cs[0].title).toBe(12)
      expect(cs[0].section).toBe("226")
    })
  })

  describe("CFR with Part / Section connectors", () => {
    it("42 C.F.R. Part 100", () => {
      const cs = cfrCites("42 C.F.R. Part 100")
      expect(cs).toHaveLength(1)
      expect(cs[0].title).toBe(42)
      expect(cs[0].section).toBe("100")
    })

    it("42 C.F.R. Section 100.3", () => {
      const cs = cfrCites("42 C.F.R. Section 100.3")
      expect(cs).toHaveLength(1)
    })
  })

  describe("USC remains type=statute (regression guard)", () => {
    it("42 U.S.C. § 1983 is statute, not regulation", () => {
      const stats = statuteCites("42 U.S.C. § 1983")
      const regs = cfrCites("42 U.S.C. § 1983")
      expect(stats).toHaveLength(1)
      expect(regs).toHaveLength(0)
      expect(stats[0].code).toBe("U.S.C.")
    })

    it("11 U.S.C. § 547 (bankruptcy) is statute", () => {
      const stats = statuteCites("11 U.S.C. § 547")
      expect(stats).toHaveLength(1)
    })
  })

  describe("RegulationCitation shape preserves StatuteCitation fields", () => {
    it("carries title, code, section, subsection, jurisdiction", () => {
      const cs = cfrCites("42 C.F.R. § 100.3(c)(2)")
      expect(cs).toHaveLength(1)
      const c = cs[0]
      expect(c.type).toBe("regulation")
      expect(c.title).toBe(42)
      expect(c.code).toBe("C.F.R.")
      expect(c.section).toBe("100.3")
      expect(c.subsection).toBe("(c)(2)")
      expect(c.jurisdiction).toBe("US")
      expect(c.pincite).toBe("(c)(2)")
    })

    it("preserves spans field for granular positions", () => {
      const cs = cfrCites("42 C.F.R. § 100.3")
      expect(cs[0].spans?.section).toBeDefined()
    })

    it("preserves year/publisher binding (`19 C.F.R. § 351.403 (2018)`)", () => {
      const cs = cfrCites("19 C.F.R. § 351.403 (2018)")
      expect(cs[0].year).toBe(2018)
    })
  })

  describe("Mixed citation lists", () => {
    it("USC + CFR in the same sentence produce statute + regulation", () => {
      const text = "See 42 U.S.C. § 1983 and 42 C.F.R. § 100.3."
      const stats = statuteCites(text)
      const regs = cfrCites(text)
      expect(stats).toHaveLength(1)
      expect(regs).toHaveLength(1)
      expect(stats[0].code).toBe("U.S.C.")
      expect(regs[0].code).toBe("C.F.R.")
    })
  })
})
