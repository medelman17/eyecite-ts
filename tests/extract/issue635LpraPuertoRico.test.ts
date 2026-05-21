import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { StatuteCitation } from "@/types/citation"

const lpra = (text: string): StatuteCitation[] =>
  extractCitations(text).filter((c): c is StatuteCitation => c.type === "statute")

describe("#635 Puerto Rico LPRA / L.P.R.A. statute citations", () => {
  describe("Bare LPRA (no periods)", () => {
    it("23 LPRA §72", () => {
      const cs = lpra("23 LPRA §72")
      expect(cs).toHaveLength(1)
      expect(cs[0].title).toBe(23)
      expect(cs[0].code).toMatch(/L\.?P\.?R\.?A\.?/)
      expect(cs[0].section).toBe("72")
    })

    it("23 LPRA §72(a) with subsection", () => {
      const cs = lpra("23 LPRA §72(a)")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("72")
      expect(cs[0].subsection).toBe("(a)")
    })

    it("23 LPRA § 72 — space before §", () => {
      const cs = lpra("23 LPRA § 72")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("72")
    })

    it("21 LPRA § 4615", () => {
      const cs = lpra("21 LPRA § 4615")
      expect(cs).toHaveLength(1)
      expect(cs[0].title).toBe(21)
      expect(cs[0].section).toBe("4615")
    })

    it("multi-digit title", () => {
      const cs = lpra("31 LPRA § 9651")
      expect(cs).toHaveLength(1)
      expect(cs[0].title).toBe(31)
    })

    it("hyphenated section (`§ 3651-c`)", () => {
      const cs = lpra("32 LPRA § 3651-c")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("3651-c")
    })
  })

  describe("Periodized L.P.R.A.", () => {
    it("23 L.P.R.A. § 72", () => {
      const cs = lpra("23 L.P.R.A. § 72")
      expect(cs).toHaveLength(1)
      expect(cs[0].title).toBe(23)
      expect(cs[0].code).toMatch(/L\.P\.R\.A\./)
      expect(cs[0].section).toBe("72")
    })

    it("21 L.P.R.A. § 4615(a)(1)", () => {
      const cs = lpra("21 L.P.R.A. § 4615(a)(1)")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("4615")
      expect(cs[0].subsection).toBe("(a)(1)")
    })
  })

  describe("Jurisdiction", () => {
    it("emits jurisdiction=PR", () => {
      const cs = lpra("23 LPRA § 72")
      expect(cs[0].jurisdiction).toBe("PR")
    })
  })

  describe("In running prose", () => {
    it("extracts mid-sentence", () => {
      const cs = lpra("The court applied 23 LPRA § 72(a) to dismiss.")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("72")
      expect(cs[0].subsection).toBe("(a)")
    })

    it("extracts in parallel cite list", () => {
      const cs = lpra("See 23 LPRA § 72 and 21 LPRA § 4615.")
      expect(cs).toHaveLength(2)
    })
  })

  describe("False-positive guards", () => {
    it("does NOT match bare `LPRA` in prose (no title/section)", () => {
      const cs = lpra("The LPRA includes many regulatory provisions.")
      expect(cs).toHaveLength(0)
    })

    it("does NOT confuse with CPLR", () => {
      // CPLR is NY; LPRA is PR. Both end in `R.` but the alternation is closed.
      const cs = lpra("CPLR 3211")
      expect(cs.filter((c) => c.code?.match(/LPRA|L\.P\.R\.A\./))).toHaveLength(0)
    })
  })
})
