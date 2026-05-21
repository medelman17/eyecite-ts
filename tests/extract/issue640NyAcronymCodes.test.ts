import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { StatuteCitation } from "@/types/citation"

const statutesOf = (text: string): StatuteCitation[] =>
  extractCitations(text).filter((c): c is StatuteCitation => c.type === "statute")

describe("#640 NY acronymized code citations", () => {
  describe("RPAPL (Real Property Actions and Proceedings Law)", () => {
    it("recognizes bracket-subdivision form (`RPAPL 711 [5]`)", () => {
      const cs = statutesOf("RPAPL 711 [5]")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("711")
      expect(cs[0].subsection).toBe("[5]")
      expect(cs[0].code).toMatch(/RPAPL/)
    })

    it("recognizes paren-subdivision form (`RPAPL 711(5)`)", () => {
      const cs = statutesOf("RPAPL 711(5)")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("711")
      expect(cs[0].subsection).toBe("(5)")
    })

    it("recognizes second bracket form (`RPAPL 741 [4]`)", () => {
      const cs = statutesOf("RPAPL 741 [4]")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("741")
      expect(cs[0].subsection).toBe("[4]")
    })

    it("recognizes N.Y. prefix (`N.Y. RPAPL 711 [5]`)", () => {
      const cs = statutesOf("N.Y. RPAPL 711 [5]")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("711")
      expect(cs[0].subsection).toBe("[5]")
    })

    it("recognizes §-prefixed form (`RPAPL § 711(5)`)", () => {
      const cs = statutesOf("RPAPL § 711(5)")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("711")
      expect(cs[0].subsection).toBe("(5)")
    })

    it("recognizes bare section without subdivision (`RPAPL 1304`)", () => {
      const cs = statutesOf("RPAPL 1304")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("1304")
      expect(cs[0].subsection).toBeUndefined()
    })

    it("recognizes chained bracket+paren subdivisions (`RPAPL 711 [5] (a)`)", () => {
      const cs = statutesOf("RPAPL 711 [5] (a)")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("711")
      expect(cs[0].subsection).toBe("[5](a)")
    })
  })

  describe("Other NY acronymized codes", () => {
    it("EPTL (Estates Powers and Trusts Law)", () => {
      const cs = statutesOf("EPTL § 5-1.1")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("5-1.1")
      expect(cs[0].code).toMatch(/EPTL/)
    })

    it("BCL (Business Corporation Law)", () => {
      const cs = statutesOf("BCL § 1104-a")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("1104-a")
      expect(cs[0].code).toMatch(/BCL/)
    })

    it("SCPA (Surrogate's Court Procedure Act)", () => {
      const cs = statutesOf("SCPA 1410")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("1410")
      expect(cs[0].code).toMatch(/SCPA/)
    })

    it("DRL (Domestic Relations Law)", () => {
      const cs = statutesOf("DRL § 240")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("240")
      expect(cs[0].code).toMatch(/DRL/)
    })

    it("LLCL (Limited Liability Company Law)", () => {
      const cs = statutesOf("LLCL § 702")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("702")
      expect(cs[0].code).toMatch(/LLCL/)
    })

    it("VTL (Vehicle and Traffic Law)", () => {
      const cs = statutesOf("VTL § 1192")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("1192")
      expect(cs[0].code).toMatch(/VTL/)
    })

    it("RPL (Real Property Law) — distinct from RPAPL", () => {
      const cs = statutesOf("RPL § 5-703")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("5-703")
      expect(cs[0].code).toMatch(/^RPL$|N\.Y\. RPL/)
    })

    it("RPL is not confused with RPAPL", () => {
      const cs = statutesOf("RPL § 5-703 and RPAPL 711")
      expect(cs).toHaveLength(2)
      const rpl = cs.find((c) => c.section === "5-703")
      const rpapl = cs.find((c) => c.section === "711")
      expect(rpl?.code).toMatch(/RPL/)
      expect(rpapl?.code).toMatch(/RPAPL/)
    })
  })

  describe("In running prose", () => {
    it("extracts mid-sentence (`The court relied on RPAPL 711 [5] to dismiss.`)", () => {
      const cs = statutesOf("The court relied on RPAPL 711 [5] to dismiss.")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("711")
      expect(cs[0].subsection).toBe("[5]")
    })

    it("extracts both in a parallel cite list", () => {
      const cs = statutesOf("See RPAPL 711 [5]; RPAPL 741 [4].")
      expect(cs).toHaveLength(2)
    })

    it("does NOT match bare acronym in prose (`The RPAPL governs.`)", () => {
      const cs = statutesOf("The RPAPL governs.")
      expect(cs).toHaveLength(0)
    })

    it("does NOT false-positive on `RPL` as prose word", () => {
      const cs = statutesOf("Plaintiff cited RPL during the hearing but no section.")
      expect(cs).toHaveLength(0)
    })
  })

  describe("Existing CPLR coverage still works (regression guard)", () => {
    it("CPLR 3211 (a) (4)", () => {
      const cs = statutesOf("CPLR 3211 (a) (4)")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("3211")
      expect(cs[0].subsection).toBe("(a)(4)")
    })

    it("N.Y. C.P.L.R. § 211", () => {
      const cs = statutesOf("N.Y. C.P.L.R. § 211")
      expect(cs).toHaveLength(1)
      expect(cs[0].section).toBe("211")
    })
  })
})
