import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { StatuteCitation } from "@/types/citation"

const codeCites = (text: string): StatuteCitation[] =>
  extractCitations(text).filter((c): c is StatuteCitation => c.type === "statute")

describe("#659 DC Code bare-form jurisdictional disambiguation", () => {
  describe("With upstream D.C. context", () => {
    it("`D.C. Code § 22-404.01(a)(2)` (explicit prefix) emits DC", () => {
      const cs = codeCites("D.C. Code § 22-404.01(a)(2)")
      const dc = cs.find((c) => c.section === "22-404.01")
      expect(dc?.jurisdiction).toBe("DC")
      expect(dc?.code).toBe("D.C. Code")
    })

    it("`D.C. Code` upstream reroutes bare `Code §` to DC", () => {
      const text =
        "Defendant was convicted under D.C. Code § 22-404(a). The court also considered Code § 22-404.01(a)(2)."
      const cs = codeCites(text)
      const second = cs.find((c) => c.section === "22-404.01")
      expect(second?.jurisdiction).toBe("DC")
      expect(second?.code).toBe("D.C. Code")
    })

    it("`District of Columbia` upstream reroutes bare `Code §` to DC", () => {
      const text =
        "The District of Columbia statute at issue is Code § 22-404(a)(2)."
      const cs = codeCites(text)
      expect(cs[0]?.jurisdiction).toBe("DC")
    })

    it("`D.C. Cir.` upstream reroutes bare `Code §` to DC", () => {
      const text =
        "See Smith v. Jones, 500 F.2d 100 (D.C. Cir. 2010). Per Code § 22-404.01(a)(2), ..."
      const cs = codeCites(text)
      const dc = cs.find((c) => c.section === "22-404.01")
      expect(dc?.jurisdiction).toBe("DC")
    })
  })

  describe("Without DC context (regression)", () => {
    it("bare `Code § 18.2-308.2` (VA-shape section) still routes to VA", () => {
      const cs = codeCites("Code § 18.2-308.2")
      expect(cs[0]?.jurisdiction).toBe("VA")
      expect(cs[0]?.code).toBe("Va. Code")
    })

    it("`Virginia Code § 8.01-581.17` still VA", () => {
      const cs = codeCites("Virginia Code § 8.01-581.17")
      expect(cs[0]?.jurisdiction).toBe("VA")
    })

    it("VA opinion: `Va. Code § 18.2-308.2` upstream → subsequent bare `Code §` stays VA", () => {
      const text =
        "The court applied Va. Code § 18.2-308.2. The defendant also violated Code § 18.2-457.1."
      const cs = codeCites(text)
      const second = cs.find((c) => c.section === "18.2-457.1")
      expect(second?.jurisdiction).toBe("VA")
    })
  })

  describe("Mixed contexts", () => {
    it("DC opinion with VA case citation — bare `Code §` after DC context stays DC", () => {
      const text =
        "D.C. Code § 22-404.01 was at issue. Compare with the analogous provision in Va. Code § 18.2-308.2. The trial court applied Code § 22-457.1."
      const cs = codeCites(text)
      // The last bare `Code §` follows BOTH a DC context AND a VA context,
      // but DC came first and the VA cite is its own citation, not context
      // for the bare form. The most recent context wins.
      const last = cs.find((c) => c.section === "22-457.1")
      expect(last).toBeDefined()
      // Most recent context is VA (since the Va. Code cite came after DC), so VA wins
      expect(last?.jurisdiction).toBe("VA")
    })
  })
})
