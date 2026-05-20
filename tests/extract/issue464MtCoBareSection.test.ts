import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, StatuteCitation } from "@/types/citation"

const statutes = (cites: Citation[]): StatuteCitation[] =>
  cites.filter((c): c is StatuteCitation => c.type === "statute")

describe("issue #464 — MT/CO bare-section context routing", () => {
  describe("Montana — trailing `, MCA` postfix on bare-section list", () => {
    it("`§§ 49-2-205 and -303, MCA` — head cite inherits MCA from trailing postfix", () => {
      const text = "We held in §§ 49-2-205 and -303, MCA, that..."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts.length).toBeGreaterThanOrEqual(1)
      expect(sts[0].section).toBe("49-2-205")
      expect(sts[0].code).toBe("MCA")
      expect(sts[0].jurisdiction).toBe("MT")
    })

    it("`§ N-N-N, MCA` standalone already works (regression sentinel)", () => {
      const text = "see § 45-5-201, MCA"
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(1)
      expect(sts[0].jurisdiction).toBe("MT")
    })

    it("`§ 53-21-102(9)` in same paragraph as `MCA` postfix (not directly attached) still routes to MT", () => {
      const text = "Under § 53-21-102(9), MCA, the commitment standard requires..."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts.length).toBeGreaterThanOrEqual(1)
      expect(sts[0].jurisdiction).toBe("MT")
    })
  })

  describe("Colorado — `C.R.S.` context propagates to follow-on bare-sections", () => {
    it("`C.R.S. § 13-25-126; § 13-25-130` — both Colorado", () => {
      const text = "See C.R.S. § 13-25-126; § 13-25-130 also applies."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(2)
      expect(sts[0].jurisdiction).toBe("CO")
      expect(sts[1].jurisdiction).toBe("CO")
      expect(sts[1].code).toBe("C.R.S.")
    })

    it("`Colo. Rev. Stat. § 13-25-126. ... § 13-25-130` — both Colorado", () => {
      const text =
        "Colo. Rev. Stat. § 13-25-126 establishes the rule. The court applied § 13-25-130 to decide."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(2)
      expect(sts[0].jurisdiction).toBe("CO")
      expect(sts[1].jurisdiction).toBe("CO")
    })

    it("bare `§ 13-25-130` with NO Colorado context is left untagged (#531)", () => {
      const text = "§ 13-25-130 alone."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(1)
      // Per #531, the bare 3-hyphen shape is too generic to default to NM
      // without an explicit signal. The cite is still extracted, just
      // jurisdiction-less.
      expect(sts[0].jurisdiction).toBeUndefined()
    })
  })

  describe("WV (#432) regression preserved", () => {
    it("`W.Va. Code § 55-7B-1. § 55-7B-7` still routes both to WV", () => {
      const text =
        "W.Va. Code § 55-7B-1 establishes the rule. § 55-7B-7 mandates that..."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(2)
      for (const cite of sts) expect(cite.jurisdiction).toBe("WV")
    })
  })

  describe("NM default preserved when no other context", () => {
    it("`NMSA 1978, § 32A-2-1. § 32A-2-7(A)` stays NM (regression)", () => {
      const text =
        "NMSA 1978, § 32A-2-1 provides. Section 32A-2-7(A) further states..."
      const cites = extractCitations(text)
      const sts = statutes(cites)
      expect(sts).toHaveLength(2)
      for (const cite of sts) expect(cite.jurisdiction).toBe("NM")
    })
  })
})
