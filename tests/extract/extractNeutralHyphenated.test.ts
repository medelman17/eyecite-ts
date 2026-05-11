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
      expect(neutrals[0].court).toBe("WL")
    })
  })
})
