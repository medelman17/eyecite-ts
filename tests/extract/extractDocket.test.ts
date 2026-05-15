/**
 * Docket-Number Citation Extraction (#215)
 *
 * Tests the new "docket" citation type added for cases identified by
 * docket / slip-opinion number rather than a traditional reporter.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { DocketCitation } from "@/types/citation"

describe("Docket citation extraction (#215)", () => {
  describe("NY Court of Appeals slip opinions", () => {
    it("extracts 'Party v. Party, No. 51 (N.Y. 2023)' shape (the issue repro)", () => {
      const text =
        'enforcement of the bargain, the parties should also proceed under a contract theory." ' +
        "IKB Int'l, S.A. v. Wells Fargo Bank, N.A., No. 51 (N.Y. 2023)."
      const citations = extractCitations(text)

      const docket = citations.find((c) => c.type === "docket") as DocketCitation | undefined
      expect(docket).toBeDefined()
      expect(docket!.docketNumber).toBe("51")
      expect(docket!.year).toBe(2023)
      expect(docket!.caseName).toBe("IKB Int'l, S.A. v. Wells Fargo Bank, N.A.")
      expect(docket!.plaintiff).toBe("IKB Int'l, S.A.")
      expect(docket!.defendant).toBe("Wells Fargo Bank, N.A.")
      expect(docket!.normalizedCourt).toBe("N.Y.")
    })
  })

  describe("Federal district-court pre-reporter shapes", () => {
    it("extracts a hyphenated docket number with court abbreviation", () => {
      const text =
        "The court denied summary judgment. Smith v. Jones, No. 19-cv-12345 (S.D.N.Y. 2024)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as DocketCitation | undefined
      expect(docket).toBeDefined()
      expect(docket!.docketNumber).toBe("19-cv-12345")
      expect(docket!.year).toBe(2024)
      expect(docket!.normalizedCourt).toBe("S.D.N.Y.")
      expect(docket!.caseName).toBe("Smith v. Jones")
    })

    it("extracts a docket cite with month/day in the parenthetical", () => {
      const text = "See Smith v. Jones, No. 19-cv-12345 (S.D.N.Y. filed Jan. 5, 2019)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as DocketCitation | undefined
      expect(docket).toBeDefined()
      expect(docket!.docketNumber).toBe("19-cv-12345")
      expect(docket!.year).toBe(2019)
      // Date should be parsed as Jan 5, 2019
      expect(docket!.date?.parsed.year).toBe(2019)
    })
  })

  describe("Procedural-prefix cases", () => {
    it("extracts 'In re' shape with docket number", () => {
      const text = "In re Smith, No. 22-bk-1234 (Bankr. S.D.N.Y. 2024)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as DocketCitation | undefined
      expect(docket).toBeDefined()
      expect(docket!.docketNumber).toBe("22-bk-1234")
      expect(docket!.year).toBe(2024)
      expect(docket!.proceduralPrefix?.toLowerCase()).toContain("in re")
    })
  })

  describe("Disambiguation guards", () => {
    it("does NOT extract a bare 'No. 51 (some text 2023)' without a case-name anchor", () => {
      const text = "The form must include a case number. No. 51 (some random text 2023)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket")
      expect(docket).toBeUndefined()
    })

    it("does NOT extract when the parenthetical lacks a year", () => {
      const text = "Smith v. Jones, No. 51 (N.Y. only some text)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket")
      expect(docket).toBeUndefined()
    })
  })

  describe("Span coverage", () => {
    it("fullSpan covers case name through closing paren", () => {
      const text = "See Smith v. Jones, No. 51 (N.Y. 2023). Other text."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as DocketCitation | undefined
      expect(docket).toBeDefined()
      expect(docket!.fullSpan).toBeDefined()
      const slice = text.substring(docket!.fullSpan!.originalStart, docket!.fullSpan!.originalEnd)
      expect(slice).toBe("Smith v. Jones, No. 51 (N.Y. 2023)")
    })
  })

  describe("Coexistence with reporter-based citations", () => {
    it("docket cite and a regular reporter cite extract independently", () => {
      const text =
        "See Smith v. Jones, No. 51 (N.Y. 2023); Doe v. Roe, 100 F.3d 200 (2d Cir. 1996)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket")
      const cases = citations.filter((c) => c.type === "case")
      expect(docket).toBeDefined()
      expect(cases.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe("Docket-number prefixes (`C.A. No.`, `Civ. No.`, `Case No.`)", () => {
    it("`C.A. No.` — Delaware Chancery Action docket", () => {
      const text =
        "See IMG Holding LLC v. Dimon, C.A. No. 2023-0522-KSJM (Del. Ch. Apr. 16, 2024)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as
        | DocketCitation
        | undefined
      expect(docket).toBeDefined()
      expect(docket?.docketNumber).toBe("2023-0522-KSJM")
      expect(docket?.caseName).toBe("IMG Holding LLC v. Dimon")
    })

    it("`Civ. No.` — civil-action docket", () => {
      const text = "Smith v. Jones, Civ. No. 22-1234 (D.N.J. 2024)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as
        | DocketCitation
        | undefined
      expect(docket).toBeDefined()
      expect(docket?.docketNumber).toBe("22-1234")
    })

    it("`Case No.` — generic case-number prefix", () => {
      const text = "Doe v. Roe, Case No. 23-cv-9999 (S.D. Tex. 2024)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as
        | DocketCitation
        | undefined
      expect(docket).toBeDefined()
      expect(docket?.docketNumber).toBe("23-cv-9999")
    })

    it("`Civil Action No.` — spelled-out federal form", () => {
      const text =
        "Smith v. Jones, Civil Action No. 22-cv-1234 (D. Del. Apr. 1, 2024)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as
        | DocketCitation
        | undefined
      expect(docket).toBeDefined()
      expect(docket?.docketNumber).toBe("22-cv-1234")
    })

    it("docket inside an explanatory `(cited in ...)` parenthetical", () => {
      const text =
        "Aronson v. Lewis, 473 A.2d 805, 811 (Del. 1984) (cited in IMG Holding LLC v. Dimon, C.A. No. 2023-0522-KSJM (Del. Ch. Apr. 16, 2024))."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as
        | DocketCitation
        | undefined
      expect(docket).toBeDefined()
      expect(docket?.caseName).toBe("IMG Holding LLC v. Dimon")
      // The Aronson full citation should still extract too.
      const aronson = citations.find(
        (c) => c.type === "case" && c.caseName === "Aronson v. Lewis",
      )
      expect(aronson).toBeDefined()
    })

    it("plain `No.` still works (regression)", () => {
      const text = "Smith v. Jones, No. 22-1234 (S.D.N.Y. 2024)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as
        | DocketCitation
        | undefined
      expect(docket).toBeDefined()
      expect(docket?.docketNumber).toBe("22-1234")
    })

    it("`Docket No.` — spelled-out (common in MA, MI, CT, NJ, NV)", () => {
      const text = "Smith v. Jones, Docket No. 286528 (Mass. App. 2024)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as
        | DocketCitation
        | undefined
      expect(docket).toBeDefined()
      expect(docket?.docketNumber).toBe("286528")
    })

    it("`Civil No.` — bare `Civil` (without `Action`)", () => {
      const text = "Smith v. Jones, Civil No. 70-3104 (D. Haw. 1972)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as
        | DocketCitation
        | undefined
      expect(docket).toBeDefined()
      expect(docket?.docketNumber).toBe("70-3104")
    })

    it("CT trial-court docket: `Docket No. CV-01-0508597`", () => {
      const text =
        "Smith v. Jones, Superior Court, judicial district of New Britain, Docket No. CV-01-0508597 (Conn. Super. 2014)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as
        | DocketCitation
        | undefined
      expect(docket).toBeDefined()
      expect(docket?.docketNumber).toBe("CV-01-0508597")
    })

    it("N.D. Ill. space-separated format: `No. 18 C 7039`", () => {
      const text =
        "Carter v. Illinois Gaming Board, No. 18 C 7039 (N.D. Ill. Nov. 25, 2019) (collecting Seventh Circuit cases)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as
        | DocketCitation
        | undefined
      expect(docket).toBeDefined()
      expect(docket?.docketNumber).toBe("18 C 7039")
      expect(docket?.caseName).toBe("Carter v. Illinois Gaming Board")
      expect(docket?.year).toBe(2019)
    })

    it("N.D. Ill. shorter form `No. 18 CV 1234`", () => {
      const text = "Foo v. Bar, No. 18 CV 1234 (N.D. Ill. 2018)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as
        | DocketCitation
        | undefined
      expect(docket).toBeDefined()
      expect(docket?.docketNumber).toBe("18 CV 1234")
    })

    it("hyphen-separated still works (regression)", () => {
      const text = "Foo v. Bar, No. 18-cv-7039 (N.D. Ill. 2018)."
      const citations = extractCitations(text)
      const docket = citations.find((c) => c.type === "docket") as
        | DocketCitation
        | undefined
      expect(docket).toBeDefined()
      expect(docket?.docketNumber).toBe("18-cv-7039")
    })
  })
})
