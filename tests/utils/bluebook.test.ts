import { describe, expect, it } from "vitest"
import { toBluebook } from "../../src/utils"
import type {
  ConstitutionalCitation,
  FederalRegisterCitation,
  FullCaseCitation,
  IdCitation,
  JournalCitation,
  NeutralCitation,
  PublicLawCitation,
  ShortFormCaseCitation,
  StatuteCitation,
  StatutesAtLargeCitation,
  SupraCitation,
} from "../../src/types/citation"

/** Minimal CitationBase fields for test fixtures */
const BASE = {
  text: "",
  matchedText: "",
  span: { cleanStart: 0, cleanEnd: 0, originalStart: 0, originalEnd: 0 },
  confidence: 1,
  processTimeMs: 0,
  patternsChecked: 0,
} as const

describe("toBluebook", () => {
  describe("FullCaseCitation", () => {
    it("formats with case name, reporter, and year", () => {
      const cite: FullCaseCitation = {
        ...BASE,
        type: "case",
        volume: 550,
        reporter: "U.S.",
        page: 544,
        year: 2007,
        caseName: "Bell Atl. Corp. v. Twombly",
      }
      expect(toBluebook(cite)).toBe(
        "Bell Atl. Corp. v. Twombly, 550 U.S. 544 (2007)",
      )
    })

    it("includes pincite when present", () => {
      const cite: FullCaseCitation = {
        ...BASE,
        type: "case",
        volume: 550,
        reporter: "U.S.",
        page: 544,
        pincite: 570,
        year: 2007,
        caseName: "Bell Atl. Corp. v. Twombly",
      }
      expect(toBluebook(cite)).toBe(
        "Bell Atl. Corp. v. Twombly, 550 U.S. 544, 570 (2007)",
      )
    })

    it("omits case name when absent", () => {
      const cite: FullCaseCitation = {
        ...BASE,
        type: "case",
        volume: 550,
        reporter: "U.S.",
        page: 544,
        year: 2007,
      }
      expect(toBluebook(cite)).toBe("550 U.S. 544 (2007)")
    })

    it("omits year when absent", () => {
      const cite: FullCaseCitation = {
        ...BASE,
        type: "case",
        volume: 500,
        reporter: "F.2d",
        page: 123,
      }
      expect(toBluebook(cite)).toBe("500 F.2d 123")
    })

    it("uses normalizedReporter when available", () => {
      const cite: FullCaseCitation = {
        ...BASE,
        type: "case",
        volume: 500,
        reporter: "F. 2d",
        normalizedReporter: "F.2d",
        page: 123,
      }
      expect(toBluebook(cite)).toBe("500 F.2d 123")
    })

    it("handles blank-page citation", () => {
      const cite: FullCaseCitation = {
        ...BASE,
        type: "case",
        volume: 500,
        reporter: "F.2d",
        hasBlankPage: true,
        year: 2020,
      }
      expect(toBluebook(cite)).toBe("500 F.2d ___ (2020)")
    })
  })

  describe("StatuteCitation", () => {
    it("formats federal statute with title and section", () => {
      const cite: StatuteCitation = {
        ...BASE,
        type: "statute",
        title: 42,
        code: "U.S.C.",
        section: "1983",
      }
      expect(toBluebook(cite)).toBe("42 U.S.C. \u00A7 1983")
    })

    it("includes subsection", () => {
      const cite: StatuteCitation = {
        ...BASE,
        type: "statute",
        title: 42,
        code: "U.S.C.",
        section: "1983",
        subsection: "(a)(1)",
      }
      expect(toBluebook(cite)).toBe("42 U.S.C. \u00A7 1983(a)(1)")
    })

    it("includes et seq.", () => {
      const cite: StatuteCitation = {
        ...BASE,
        type: "statute",
        title: 42,
        code: "U.S.C.",
        section: "1983",
        hasEtSeq: true,
      }
      expect(toBluebook(cite)).toBe("42 U.S.C. \u00A7 1983 et seq.")
    })

    it("formats statute without title (state code)", () => {
      const cite: StatuteCitation = {
        ...BASE,
        type: "statute",
        code: "Fla. Stat.",
        section: "768.81",
      }
      expect(toBluebook(cite)).toBe("Fla. Stat. \u00A7 768.81")
    })
  })

  describe("ConstitutionalCitation", () => {
    it("formats U.S. Constitution article", () => {
      const cite: ConstitutionalCitation = {
        ...BASE,
        type: "constitutional",
        jurisdiction: "US",
        article: 3,
        section: "2",
      }
      expect(toBluebook(cite)).toBe("U.S. Const. art. III, \u00A7 2")
    })

    it("formats U.S. Constitution amendment", () => {
      const cite: ConstitutionalCitation = {
        ...BASE,
        type: "constitutional",
        jurisdiction: "US",
        amendment: 14,
        section: "1",
      }
      expect(toBluebook(cite)).toBe("U.S. Const. amend. XIV, \u00A7 1")
    })

    it("formats amendment without section", () => {
      const cite: ConstitutionalCitation = {
        ...BASE,
        type: "constitutional",
        jurisdiction: "US",
        amendment: 5,
      }
      expect(toBluebook(cite)).toBe("U.S. Const. amend. V")
    })

    it("formats state constitution", () => {
      const cite: ConstitutionalCitation = {
        ...BASE,
        type: "constitutional",
        jurisdiction: "CA",
        article: 1,
        section: "7",
      }
      expect(toBluebook(cite)).toBe("CA Const. art. I, \u00A7 7")
    })

    it("includes clause", () => {
      const cite: ConstitutionalCitation = {
        ...BASE,
        type: "constitutional",
        jurisdiction: "US",
        article: 1,
        section: "8",
        clause: 3,
      }
      expect(toBluebook(cite)).toBe("U.S. Const. art. I, \u00A7 8, cl. 3")
    })
  })

  describe("JournalCitation", () => {
    it("formats journal with volume, abbreviation, page, and year", () => {
      const cite: JournalCitation = {
        ...BASE,
        type: "journal",
        volume: 100,
        journal: "Harvard Law Review",
        abbreviation: "Harv. L. Rev.",
        page: 1234,
        year: 1987,
      }
      expect(toBluebook(cite)).toBe("100 Harv. L. Rev. 1234 (1987)")
    })

    it("includes pincite", () => {
      const cite: JournalCitation = {
        ...BASE,
        type: "journal",
        volume: 75,
        journal: "Yale Law Journal",
        abbreviation: "Yale L.J.",
        page: 456,
        pincite: 460,
        year: 2020,
      }
      expect(toBluebook(cite)).toBe("75 Yale L.J. 456, 460 (2020)")
    })

    it("omits year when absent", () => {
      const cite: JournalCitation = {
        ...BASE,
        type: "journal",
        volume: 100,
        journal: "Harvard Law Review",
        abbreviation: "Harv. L. Rev.",
        page: 1234,
      }
      expect(toBluebook(cite)).toBe("100 Harv. L. Rev. 1234")
    })
  })

  describe("NeutralCitation", () => {
    it("formats Westlaw citation", () => {
      const cite: NeutralCitation = {
        ...BASE,
        type: "neutral",
        year: 2020,
        court: "WL",
        documentNumber: "123456",
      }
      expect(toBluebook(cite)).toBe("2020 WL 123456")
    })

    it("formats LEXIS citation", () => {
      const cite: NeutralCitation = {
        ...BASE,
        type: "neutral",
        year: 2020,
        court: "U.S. LEXIS",
        documentNumber: "456",
      }
      expect(toBluebook(cite)).toBe("2020 U.S. LEXIS 456")
    })
  })

  describe("PublicLawCitation", () => {
    it("formats public law", () => {
      const cite: PublicLawCitation = {
        ...BASE,
        type: "publicLaw",
        congress: 116,
        lawNumber: 283,
      }
      expect(toBluebook(cite)).toBe("Pub. L. No. 116-283")
    })
  })

  describe("FederalRegisterCitation", () => {
    it("formats federal register", () => {
      const cite: FederalRegisterCitation = {
        ...BASE,
        type: "federalRegister",
        volume: 85,
        page: 12345,
      }
      expect(toBluebook(cite)).toBe("85 Fed. Reg. 12345")
    })

    it("includes year when present", () => {
      const cite: FederalRegisterCitation = {
        ...BASE,
        type: "federalRegister",
        volume: 86,
        page: 56789,
        year: 2021,
      }
      expect(toBluebook(cite)).toBe("86 Fed. Reg. 56789 (2021)")
    })
  })

  describe("StatutesAtLargeCitation", () => {
    it("formats statutes at large", () => {
      const cite: StatutesAtLargeCitation = {
        ...BASE,
        type: "statutesAtLarge",
        volume: 120,
        page: 1234,
      }
      expect(toBluebook(cite)).toBe("120 Stat. 1234")
    })
  })

  describe("IdCitation", () => {
    it("formats bare Id.", () => {
      const cite: IdCitation = { ...BASE, type: "id" }
      expect(toBluebook(cite)).toBe("Id.")
    })

    it("formats Id. with pincite", () => {
      const cite: IdCitation = { ...BASE, type: "id", pincite: 570 }
      expect(toBluebook(cite)).toBe("Id. at 570")
    })
  })

  describe("SupraCitation", () => {
    it("formats supra without pincite", () => {
      const cite: SupraCitation = {
        ...BASE,
        type: "supra",
        partyName: "Smith",
      }
      expect(toBluebook(cite)).toBe("Smith, supra")
    })

    it("formats supra with pincite", () => {
      const cite: SupraCitation = {
        ...BASE,
        type: "supra",
        partyName: "Smith",
        pincite: 460,
      }
      expect(toBluebook(cite)).toBe("Smith, supra, at 460")
    })
  })

  describe("ShortFormCaseCitation", () => {
    it("formats short form with pincite", () => {
      const cite: ShortFormCaseCitation = {
        ...BASE,
        type: "shortFormCase",
        volume: 500,
        reporter: "F.2d",
        page: 123,
        pincite: 125,
      }
      expect(toBluebook(cite)).toBe("500 F.2d at 125")
    })

    it("formats short form without pincite", () => {
      const cite: ShortFormCaseCitation = {
        ...BASE,
        type: "shortFormCase",
        volume: 500,
        reporter: "F.2d",
        page: 123,
      }
      expect(toBluebook(cite)).toBe("500 F.2d 123")
    })
  })
})
