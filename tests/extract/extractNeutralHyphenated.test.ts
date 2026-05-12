import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { NeutralCitation } from "@/types/citation"

/**
 * Hyphenated neutral citations (#233) — public-domain "vendor-neutral" formats
 * used by New Mexico (NMSC, NMCA, NMCERT), Ohio (Ohio-N), North Carolina
 * (NCSC, NCCOA), and Mississippi (year-CT-NNNNN-track).
 *
 * The existing `state-vendor-neutral` pattern is whitespace-separated only.
 * These tests pin down that hyphenated formats — which represent a sizeable
 * share of public-domain state caselaw — extract as neutral citations with
 * year, court, and documentNumber populated.
 */
describe("hyphenated neutral citations (#233)", () => {
  describe("New Mexico — NMSC / NMCA / NMCERT", () => {
    it("extracts '2010-NMSC-007' (NM Supreme Court)", () => {
      const cits = extractCitations("The court held in 2010-NMSC-007 that the rule applies.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2010)
      expect(neutrals[0].court).toBe("NMSC")
      expect(neutrals[0].documentNumber).toBe("007")
    })

    it("extracts '2012-NMCA-004' (NM Court of Appeals)", () => {
      const cits = extractCitations("State v. Dickert, 2012-NMCA-004.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2012)
      expect(neutrals[0].court).toBe("NMCA")
      expect(neutrals[0].documentNumber).toBe("004")
    })

    it("extracts '2015-NMCERT-009' (NM cert. granted record)", () => {
      const cits = extractCitations("See 2015-NMCERT-009.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2015)
      expect(neutrals[0].court).toBe("NMCERT")
      expect(neutrals[0].documentNumber).toBe("009")
    })
  })

  describe("Ohio (mixed-case court token)", () => {
    it("extracts '2024-Ohio-764'", () => {
      const cits = extractCitations("Smith v. Ohio State Univ., 2024-Ohio-764.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2024)
      expect(neutrals[0].court).toBe("Ohio")
      expect(neutrals[0].documentNumber).toBe("764")
    })

    it("extracts '2010-Ohio-5012'", () => {
      const cits = extractCitations("In State ex rel. Doe, 2010-Ohio-5012.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2010)
      expect(neutrals[0].court).toBe("Ohio")
      expect(neutrals[0].documentNumber).toBe("5012")
    })
  })

  describe("North Carolina — NCSC / NCCOA", () => {
    it("extracts '2020-NCSC-118'", () => {
      const cits = extractCitations("Doe v. Roe, 2020-NCSC-118.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2020)
      expect(neutrals[0].court).toBe("NCSC")
      expect(neutrals[0].documentNumber).toBe("118")
    })

    it("extracts '2023-NCCOA-450' (NC Court of Appeals)", () => {
      const cits = extractCitations("See 2023-NCCOA-450.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2023)
      expect(neutrals[0].court).toBe("NCCOA")
      expect(neutrals[0].documentNumber).toBe("450")
    })
  })

  describe("Mississippi — 4-segment year-case-number-track", () => {
    it("extracts '2010-CT-01234-SCT' (Supreme Court track)", () => {
      const cits = extractCitations("State v. Smith, 2010-CT-01234-SCT.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2010)
      // Court combines the case-type token with the appellate track so the
      // single `court` field preserves the full sovereign identifier.
      expect(neutrals[0].court).toBe("CT-SCT")
      expect(neutrals[0].documentNumber).toBe("01234")
    })

    it("extracts '2015-CA-00567-COA' (Court of Appeals track)", () => {
      const cits = extractCitations("Doe v. Roe, 2015-CA-00567-COA.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2015)
      expect(neutrals[0].court).toBe("CA-COA")
      expect(neutrals[0].documentNumber).toBe("00567")
    })
  })

  describe("regression — whitespace-separated neutrals still work", () => {
    it("extracts '2007 UT 49'", () => {
      const cits = extractCitations("Brown v. Bd. of Educ., 2007 UT 49.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2007)
      expect(neutrals[0].court).toBe("UT")
      expect(neutrals[0].documentNumber).toBe("49")
    })

    it("extracts '2017 WI 17'", () => {
      const cits = extractCitations("State v. Avila, 2017 WI 17.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2017)
      expect(neutrals[0].court).toBe("WI")
      expect(neutrals[0].documentNumber).toBe("17")
    })

    it("extracts '2013 IL 112116' (large IL document number)", () => {
      const cits = extractCitations("People v. Smith, 2013 IL 112116.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2013)
      expect(neutrals[0].court).toBe("IL")
      expect(neutrals[0].documentNumber).toBe("112116")
    })

    it("extracts '2020 WL 123456' (Westlaw)", () => {
      const cits = extractCitations("In re X, 2020 WL 123456.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      // WL is a database identifier, not a court (#294)
      expect(neutrals[0].database).toBe("WL")
      expect(neutrals[0].court).toBeUndefined()
    })
  })

  describe("database identifier routing + trailing court paren (#294)", () => {
    it("routes WL to database and recovers court+date from trailing paren", () => {
      const cits = extractCitations(
        "See Smith, 2001 WL 1077846 (N.D. Cal. Sept. 4, 2001).",
      )
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].database).toBe("WL")
      expect(neutrals[0].court).toBe("N.D. Cal.")
      expect(neutrals[0].year).toBe(2001)
      expect(neutrals[0].date?.iso).toBe("2001-09-04")
    })

    it("routes LEXIS variants to database and recovers trailing court", () => {
      const cits = extractCitations("2001 U.S. LEXIS 456 (1st Cir. Aug. 30, 2001)")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].database).toBe("U.S. LEXIS")
      expect(neutrals[0].court).toBe("1st Cir.")
      expect(neutrals[0].date?.iso).toBe("2001-08-30")
    })

    it("bare WL cite (no paren) — database set, court undefined, no date", () => {
      const cits = extractCitations("See Smith, 2001 WL 1077846.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].database).toBe("WL")
      expect(neutrals[0].court).toBeUndefined()
      expect(neutrals[0].date).toBeUndefined()
    })

    it("Tex. App. with full date in paren", () => {
      const cits = extractCitations("2014 WL 1924465 (Tex. App. May 8, 2014)")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].database).toBe("WL")
      expect(neutrals[0].court).toBe("Tex. App.")
      expect(neutrals[0].date?.iso).toBe("2014-05-08")
    })

    it("real jurisdictional neutrals (Ohio, IL) stay in court, not database", () => {
      const cits = extractCitations("State v. X, 2008-Ohio-4571. And People v. Y, 2013 IL 112116.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(2)
      expect(neutrals[0].court).toBe("Ohio")
      expect(neutrals[0].database).toBeUndefined()
      expect(neutrals[1].court).toBe("IL")
      expect(neutrals[1].database).toBeUndefined()
    })
  })

  describe("paragraph pincite on neutral cites (#311)", () => {
    it("captures `2015-NMCA-072, ¶ 2` paragraph pincite", () => {
      const cits = extractCitations("State v. Flores, 2015-NMCA-072, ¶ 2")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].pincite).toBe(2)
      expect(neutrals[0].pinciteInfo?.paragraph).toBe(2)
    })

    it("captures `, ¶¶ 14-16` paragraph range pincite", () => {
      const cits = extractCitations("See 2015-NMCA-072, ¶¶ 14-16")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].pincite).toBe(14)
      expect(neutrals[0].pinciteInfo?.paragraph).toBe(14)
      expect(neutrals[0].pinciteInfo?.endParagraph).toBe(16)
      expect(neutrals[0].pinciteInfo?.isRange).toBe(true)
    })

    it("regression: page-style pincite `, at *3` still works on database cites", () => {
      const cits = extractCitations("2020 WL 123456, at *3")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].pincite).toBe(3)
    })
  })
})
