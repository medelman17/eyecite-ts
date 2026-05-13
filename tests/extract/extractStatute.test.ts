import { describe, expect, it } from "vitest"
import { extractCitations, extractStatute } from "@/extract"
import type { Token } from "@/tokenize"
import { createIdentityMap, createOffsetMap } from "../helpers/transformationMap"

describe("extractStatute", () => {
  describe("code-section parsing", () => {
    it("should extract title, code, and section from U.S.C. citation", () => {
      const token: Token = {
        text: "42 U.S.C. § 1983",
        span: { cleanStart: 10, cleanEnd: 26 },
        type: "statute",
        patternId: "usc",
      }
      const transformationMap = createIdentityMap()

      const citation = extractStatute(token, transformationMap)

      expect(citation.type).toBe("statute")
      expect(citation.title).toBe(42)
      expect(citation.code).toBe("U.S.C.")
      expect(citation.section).toBe("1983")
      expect(citation.text).toBe("42 U.S.C. § 1983")
      expect(citation.matchedText).toBe("42 U.S.C. § 1983")
    })

    it("should extract code and section without title", () => {
      const token: Token = {
        text: "Cal. Civ. Code § 1234",
        span: { cleanStart: 0, cleanEnd: 21 },
        type: "statute",
        patternId: "cal-civ-code",
      }
      const transformationMap = createIdentityMap()

      const citation = extractStatute(token, transformationMap)

      expect(citation.title).toBeUndefined()
      expect(citation.code).toBe("Cal. Civ. Code")
      expect(citation.section).toBe("1234")
    })

    it("should handle section with alphanumeric characters", () => {
      const token: Token = {
        text: "42 U.S.C. § 1983a",
        span: { cleanStart: 0, cleanEnd: 17 },
        type: "statute",
        patternId: "usc",
      }
      const transformationMap = createIdentityMap()

      const citation = extractStatute(token, transformationMap)

      expect(citation.section).toBe("1983a")
    })

    it("should handle section with hyphens", () => {
      const token: Token = {
        text: "42 U.S.C. § 1983-1",
        span: { cleanStart: 0, cleanEnd: 18 },
        type: "statute",
        patternId: "usc",
      }
      const transformationMap = createIdentityMap()

      const citation = extractStatute(token, transformationMap)

      expect(citation.section).toBe("1983-1")
    })
  })

  describe("different statutory codes", () => {
    it("should extract C.F.R. citation", () => {
      const token: Token = {
        text: "29 C.F.R. § 1910",
        span: { cleanStart: 0, cleanEnd: 16 },
        type: "statute",
        patternId: "cfr",
      }
      const transformationMap = createIdentityMap()

      const citation = extractStatute(token, transformationMap)

      expect(citation.title).toBe(29)
      expect(citation.code).toBe("C.F.R.")
      expect(citation.section).toBe("1910")
    })

    it("should extract state code citation", () => {
      const token: Token = {
        text: "Cal. Penal Code § 187",
        span: { cleanStart: 0, cleanEnd: 21 },
        type: "statute",
        patternId: "cal-penal",
      }
      const transformationMap = createIdentityMap()

      const citation = extractStatute(token, transformationMap)

      expect(citation.code).toBe("Cal. Penal Code")
      expect(citation.section).toBe("187")
    })
  })

  describe("position translation", () => {
    it("should translate clean positions to original positions", () => {
      const token: Token = {
        text: "42 U.S.C. § 1983",
        span: { cleanStart: 10, cleanEnd: 26 },
        type: "statute",
        patternId: "usc",
      }
      const transformationMap = createOffsetMap(3)

      const citation = extractStatute(token, transformationMap)

      expect(citation.span.cleanStart).toBe(10)
      expect(citation.span.cleanEnd).toBe(26)
      expect(citation.span.originalStart).toBe(13) // 10 + 3
      expect(citation.span.originalEnd).toBe(29) // 26 + 3
    })

    it("should handle identity mapping", () => {
      const token: Token = {
        text: "42 U.S.C. § 1983",
        span: { cleanStart: 10, cleanEnd: 26 },
        type: "statute",
        patternId: "usc",
      }
      const transformationMap = createIdentityMap()

      const citation = extractStatute(token, transformationMap)

      expect(citation.span.originalStart).toBe(citation.span.cleanStart)
      expect(citation.span.originalEnd).toBe(citation.span.cleanEnd)
    })
  })

  describe("confidence scoring", () => {
    it("should have high confidence for known statutory codes", () => {
      const knownCodes = [
        "42 U.S.C. § 1983",
        "29 C.F.R. § 1910",
        "Cal. Civ. Code § 1234",
        "Cal. Penal Code § 187",
      ]
      const transformationMap = createIdentityMap()

      for (const text of knownCodes) {
        const token: Token = {
          text,
          span: { cleanStart: 0, cleanEnd: text.length },
          type: "statute",
          patternId: "test",
        }

        const citation = extractStatute(token, transformationMap)

        expect(citation.confidence).toBeGreaterThanOrEqual(0.8)
      }
    })

    it("should have base confidence for unknown code", () => {
      const token: Token = {
        text: "Unknown Code § 123",
        span: { cleanStart: 0, cleanEnd: 18 },
        type: "statute",
        patternId: "unknown",
      }
      const transformationMap = createIdentityMap()

      const citation = extractStatute(token, transformationMap)

      expect(citation.confidence).toBe(0.5)
    })
  })

  describe("trailing letters via full pipeline", () => {
    it("should extract section with trailing uppercase letter", () => {
      const citations = extractCitations("18 U.S.C. § 1028A")
      expect(citations).toHaveLength(1)
      expect(citations[0].type).toBe("statute")
      if (citations[0].type === "statute") {
        expect(citations[0].section).toBe("1028A")
      }
    })

    it("should extract section with trailing lowercase letter", () => {
      const citations = extractCitations("18 U.S.C. § 2339B")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].section).toBe("2339B")
      }
    })
  })

  describe("sentence-ending period boundary (#283)", () => {
    it("should strip trailing sentence period from abbreviated-code section", () => {
      const citations = extractCitations("The defendant violated 17 P.S. § 91. The court agreed.")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].section).toBe("91")
        expect(citations[0].matchedText).toBe("17 P.S. § 91")
      }
    })

    it("should strip trailing period from hyphenated state section", () => {
      const citations = extractCitations(
        "Failure to comply violates Ariz. Rev. Stat. Ann. § 16-141.",
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].section).toBe("16-141")
      }
    })

    it("should strip trailing period from named-code section", () => {
      const citations = extractCitations("See N. Y. Election Law § 131.")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].section).toBe("131")
      }
    })

    it("should strip trailing period from mass-chapter section", () => {
      const citations = extractCitations("Plaintiffs invoke M.G.L. c. 93A, § 2.")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].section).toBe("2")
      }
    })

    it("should preserve internal decimal period followed by digits", () => {
      const citations = extractCitations("Cal. Civ. Code § 1.5(a). The plaintiff disagreed.")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].section).toBe("1.5")
        expect(citations[0].subsection).toBe("(a)")
      }
    })

    it("should not regress mid-sentence sections (no trailing period)", () => {
      const citations = extractCitations("17 P.S. § 91 governs the action.")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].section).toBe("91")
      }
    })

    it("should not regress decimal section without trailing period", () => {
      const citations = extractCitations("12 C.F.R. § 226.5(b) controls.")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].section).toBe("226.5")
        expect(citations[0].subsection).toBe("(b)")
      }
    })
  })

  describe("spaced code abbreviations (#284)", () => {
    it("should extract fully-spaced U.S.C. statute", () => {
      const citations = extractCitations("Plaintiff sued under 42 U. S. C. § 1983.")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].title).toBe(42)
        expect(citations[0].code).toBe("U.S.C.")
        expect(citations[0].section).toBe("1983")
      }
    })

    it("should extract spaced U.S.C. with subsection", () => {
      const citations = extractCitations("29 U. S. C. § 158(a)(3)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].title).toBe(29)
        expect(citations[0].code).toBe("U.S.C.")
        expect(citations[0].section).toBe("158")
        expect(citations[0].subsection).toBe("(a)(3)")
      }
    })

    it("should extract partially-spaced 'U.S. C.' form", () => {
      const citations = extractCitations("42 U.S. C. § 1983")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].code).toBe("U.S.C.")
        expect(citations[0].section).toBe("1983")
      }
    })

    it("should extract fully-spaced C.F.R. regulation", () => {
      const citations = extractCitations("29 C. F. R. § 1604.11")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].title).toBe(29)
        expect(citations[0].code).toBe("C.F.R.")
        expect(citations[0].section).toBe("1604.11")
      }
    })

    it("should not regress canonical compact form", () => {
      const citations = extractCitations("28 U.S.C. § 1983")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].code).toBe("U.S.C.")
        expect(citations[0].section).toBe("1983")
      }
    })
  })

  describe("California bare codes (#296)", () => {
    it("extracts `Pen. Code § 148`", () => {
      const cits = extractCitations("Defendant violated Pen. Code § 148.")
      expect(cits).toHaveLength(1)
      if (cits[0].type === "statute") {
        expect(cits[0].code).toBe("Pen. Code")
        expect(cits[0].section).toBe("148")
        expect(cits[0].jurisdiction).toBe("CA")
      }
    })

    it("extracts `Code Civ. Proc., § 1021.5` (comma + leading 'Code')", () => {
      const cits = extractCitations("Plaintiff seeks attorney fees under Code Civ. Proc., § 1021.5.")
      expect(cits).toHaveLength(1)
      if (cits[0].type === "statute") {
        expect(cits[0].code).toBe("Code Civ. Proc.")
        expect(cits[0].section).toBe("1021.5")
        expect(cits[0].jurisdiction).toBe("CA")
      }
    })

    it("extracts `Veh. Code § 23550.5` (decimal section)", () => {
      const cits = extractCitations("Veh. Code § 23550.5 governs.")
      expect(cits).toHaveLength(1)
      if (cits[0].type === "statute") {
        expect(cits[0].code).toBe("Veh. Code")
        expect(cits[0].section).toBe("23550.5")
        expect(cits[0].jurisdiction).toBe("CA")
      }
    })

    it("extracts `Bus. & Prof. Code § 17200` (ampersand)", () => {
      const cits = extractCitations("She brought a Bus. & Prof. Code § 17200 claim.")
      expect(cits).toHaveLength(1)
      if (cits[0].type === "statute") {
        expect(cits[0].code).toBe("Bus. & Prof. Code")
        expect(cits[0].section).toBe("17200")
        expect(cits[0].jurisdiction).toBe("CA")
      }
    })

    it("extracts `Welf. & Inst. Code § 5150` (multi-ampersand)", () => {
      const cits = extractCitations("Welf. & Inst. Code § 5150 authorizes detention.")
      expect(cits).toHaveLength(1)
      if (cits[0].type === "statute") {
        expect(cits[0].code).toBe("Welf. & Inst. Code")
        expect(cits[0].section).toBe("5150")
        expect(cits[0].jurisdiction).toBe("CA")
      }
    })

    it("extracts `Health & Safety Code § 11350`", () => {
      const cits = extractCitations("Health & Safety Code § 11350 controls.")
      expect(cits).toHaveLength(1)
      if (cits[0].type === "statute") {
        expect(cits[0].code).toBe("Health & Safety Code")
        expect(cits[0].section).toBe("11350")
        expect(cits[0].jurisdiction).toBe("CA")
      }
    })

    it("extracts `Civ. Code § 1714` (single-word code)", () => {
      const cits = extractCitations("Civ. Code § 1714 codifies the duty of care.")
      expect(cits).toHaveLength(1)
      if (cits[0].type === "statute") {
        expect(cits[0].code).toBe("Civ. Code")
        expect(cits[0].section).toBe("1714")
        expect(cits[0].jurisdiction).toBe("CA")
      }
    })

    it("extracts `Pen. Code § 187(a)` with subsection (span branch)", () => {
      const cits = extractCitations("Charged under Pen. Code § 187(a) for murder.")
      expect(cits).toHaveLength(1)
      if (cits[0].type === "statute") {
        expect(cits[0].code).toBe("Pen. Code")
        expect(cits[0].section).toBe("187")
        expect(cits[0].subsection).toBe("(a)")
        expect(cits[0].spans?.subsection).toBeDefined()
        expect(cits[0].jurisdiction).toBe("CA")
      }
    })

    it("does not regress fully-qualified `Cal. Penal Code § 148`", () => {
      // The fully-qualified form continues to go through extractNamedCode and
      // produces its own `code` shape ("Penal"), so the bare-code extractor
      // should not also fire.
      const cits = extractCitations("violates Cal. Penal Code § 148.")
      expect(cits).toHaveLength(1)
      if (cits[0].type === "statute") {
        expect(cits[0].code).toBe("Penal")
        expect(cits[0].jurisdiction).toBe("CA")
      }
    })

    it("does not regress federal USC citation", () => {
      const cits = extractCitations("Plaintiff sued under 42 U.S.C. § 1983.")
      expect(cits).toHaveLength(1)
      if (cits[0].type === "statute") {
        expect(cits[0].code).toBe("U.S.C.")
        expect(cits[0].section).toBe("1983")
        expect(cits[0].jurisdiction).toBe("US")
      }
    })
  })

  describe("year-of-edition parenthetical (#285)", () => {
    it("attaches year to USC citation with year paren", () => {
      const citations = extractCitations("42 U.S.C. § 1983 (1976)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].section).toBe("1983")
        expect(citations[0].year).toBe(1976)
        expect(citations[0].publisher).toBeUndefined()
      }
    })

    it("attaches year + publisher to USC with (West YYYY)", () => {
      const citations = extractCitations("28 U.S.C. § 1331 (West 2018)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].section).toBe("1331")
        expect(citations[0].year).toBe(2018)
        expect(citations[0].publisher).toBe("West")
      }
    })

    it("attaches year to abbreviated-code (HRS) with subsection + year paren", () => {
      const citations = extractCitations("Petitioner must show prejudice. HRS § 91-14(a) (1985).")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].code).toBe("HRS")
        expect(citations[0].section).toBe("91-14")
        expect(citations[0].subsection).toBe("(a)")
        expect(citations[0].year).toBe(1985)
      }
    })

    it("attaches year to abbreviated-code without subsection", () => {
      const citations = extractCitations("HRS § 91-14 (1985)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].section).toBe("91-14")
        expect(citations[0].subsection).toBeUndefined()
        expect(citations[0].year).toBe(1985)
      }
    })

    it("does not confuse subsection (a) with a year paren", () => {
      const citations = extractCitations("42 U.S.C. § 1983(a)(2)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].subsection).toBe("(a)(2)")
        expect(citations[0].year).toBeUndefined()
      }
    })

    it("leaves year undefined when no trailing paren present", () => {
      const citations = extractCitations("42 U.S.C. § 1983")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        expect(citations[0].year).toBeUndefined()
        expect(citations[0].publisher).toBeUndefined()
      }
    })

    it("only attaches year to the immediately-preceding cite in a string", () => {
      const citations = extractCitations(
        "Plaintiff invokes 42 U.S.C. § 1983; 28 U.S.C. § 1331 (West 2018).",
      )
      const statutes = citations.filter((c) => c.type === "statute")
      expect(statutes).toHaveLength(2)
      if (statutes[0].type === "statute") {
        expect(statutes[0].section).toBe("1983")
        expect(statutes[0].year).toBeUndefined()
      }
      if (statutes[1].type === "statute") {
        expect(statutes[1].section).toBe("1331")
        expect(statutes[1].year).toBe(2018)
        expect(statutes[1].publisher).toBe("West")
      }
    })
  })

  describe("metadata fields", () => {
    it("should include all required CitationBase fields", () => {
      const token: Token = {
        text: "42 U.S.C. § 1983",
        span: { cleanStart: 10, cleanEnd: 26 },
        type: "statute",
        patternId: "usc",
      }
      const transformationMap = createIdentityMap()

      const citation = extractStatute(token, transformationMap)

      expect(citation.text).toBeDefined()
      expect(citation.span).toBeDefined()
      expect(citation.confidence).toBeDefined()
      expect(citation.matchedText).toBeDefined()
      expect(citation.processTimeMs).toBeDefined()
      expect(citation.patternsChecked).toBeDefined()
    })

    it("should set processTimeMs to 0 as placeholder", () => {
      const token: Token = {
        text: "42 U.S.C. § 1983",
        span: { cleanStart: 10, cleanEnd: 26 },
        type: "statute",
        patternId: "usc",
      }
      const transformationMap = createIdentityMap()

      const citation = extractStatute(token, transformationMap)

      expect(citation.processTimeMs).toBe(0)
    })

    it("should set patternsChecked to 1", () => {
      const token: Token = {
        text: "42 U.S.C. § 1983",
        span: { cleanStart: 10, cleanEnd: 26 },
        type: "statute",
        patternId: "usc",
      }
      const transformationMap = createIdentityMap()

      const citation = extractStatute(token, transformationMap)

      expect(citation.patternsChecked).toBe(1)
    })
  })

  // --- NEW: Dispatcher and new field tests ---

  describe("dispatch to family extractors", () => {
    it("should dispatch usc patternId to federal extractor", () => {
      const token: Token = {
        text: "42 U.S.C. § 1983",
        span: { cleanStart: 0, cleanEnd: 17 },
        type: "statute",
        patternId: "usc",
      }
      const citation = extractStatute(token, createIdentityMap())
      expect(citation.jurisdiction).toBe("US")
      expect(citation.title).toBe(42)
      expect(citation.code).toBe("U.S.C.")
      expect(citation.section).toBe("1983")
    })

    it("should dispatch cfr patternId to federal extractor", () => {
      const token: Token = {
        text: "40 C.F.R. § 122",
        span: { cleanStart: 0, cleanEnd: 16 },
        type: "statute",
        patternId: "cfr",
      }
      const citation = extractStatute(token, createIdentityMap())
      expect(citation.jurisdiction).toBe("US")
      expect(citation.title).toBe(40)
    })

    it("should dispatch prose patternId to prose extractor", () => {
      const token: Token = {
        text: "section 1983 of title 42",
        span: { cleanStart: 0, cleanEnd: 24 },
        type: "statute",
        patternId: "prose",
      }
      const citation = extractStatute(token, createIdentityMap())
      expect(citation.jurisdiction).toBe("US")
      expect(citation.title).toBe(42)
      expect(citation.section).toBe("1983")
      expect(citation.code).toBe("U.S.C.")
    })

    it("should use legacy parsing for unknown patternId", () => {
      const token: Token = {
        text: "Cal. Penal Code § 187",
        span: { cleanStart: 0, cleanEnd: 21 },
        type: "statute",
        patternId: "unknown-pattern",
      }
      const citation = extractStatute(token, createIdentityMap())
      expect(citation.code).toBe("Cal. Penal Code")
      expect(citation.section).toBe("187")
    })
  })

  describe("new state jurisdictions — batch 5", () => {
    const cases = [
      { text: "Alaska Stat. § 11.41.100", jurisdiction: "AK", section: "11.41.100" },
      { text: "AS § 11.41.100", jurisdiction: "AK", section: "11.41.100" },
      { text: "Ariz. Rev. Stat. § 13-1105", jurisdiction: "AZ", section: "13-1105" },
      { text: "A.R.S. § 13-1105", jurisdiction: "AZ", section: "13-1105" },
      { text: "Ark. Code Ann. § 5-10-101", jurisdiction: "AR", section: "5-10-101" },
      { text: "A.C.A. § 5-10-101", jurisdiction: "AR", section: "5-10-101" },
      { text: "Conn. Gen. Stat. § 52-555", jurisdiction: "CT", section: "52-555" },
      { text: "C.G.S. § 14-227a", jurisdiction: "CT", section: "14-227a" },
      { text: "D.C. Code § 22-3211", jurisdiction: "DC", section: "22-3211" },
      { text: "Haw. Rev. Stat. § 707-711", jurisdiction: "HI", section: "707-711" },
      { text: "HRS § 707-711", jurisdiction: "HI", section: "707-711" },
      { text: "Iowa Code § 714.1", jurisdiction: "IA", section: "714.1" },
      { text: "Idaho Code § 18-4001", jurisdiction: "ID", section: "18-4001" },
    ]
    for (const { text, jurisdiction, section } of cases) {
      it(`should extract "${text}"`, () => {
        const citations = extractCitations(text)
        const statutes = citations.filter((c) => c.type === "statute")
        expect(statutes).toHaveLength(1)
        expect(statutes[0].jurisdiction).toBe(jurisdiction)
        expect(statutes[0].section).toBe(section)
      })
    }
  })

  describe("new state jurisdictions — batch 6", () => {
    const cases = [
      { text: "Kan. Stat. Ann. § 21-5401", jurisdiction: "KS", section: "21-5401" },
      { text: "K.S.A. § 21-5401", jurisdiction: "KS", section: "21-5401" },
      { text: "Ky. Rev. Stat. Ann. § 507.020", jurisdiction: "KY", section: "507.020" },
      { text: "KRS § 507.020", jurisdiction: "KY", section: "507.020" },
      { text: "La. Rev. Stat. Ann. § 14:30", jurisdiction: "LA", section: "14:30" },
      { text: "La. R.S. 14:30", jurisdiction: "LA", section: "14:30" },
      { text: "Me. Rev. Stat. Ann. § 208", jurisdiction: "ME", section: "208" },
      { text: "M.R.S.A. § 208", jurisdiction: "ME", section: "208" },
      { text: "Minn. Stat. § 609.02", jurisdiction: "MN", section: "609.02" },
      { text: "Miss. Code Ann. § 97-3-19", jurisdiction: "MS", section: "97-3-19" },
      { text: "Mo. Rev. Stat. § 565.021", jurisdiction: "MO", section: "565.021" },
      { text: "RSMo § 565.021", jurisdiction: "MO", section: "565.021" },
      { text: "Mont. Code Ann. § 45-5-502", jurisdiction: "MT", section: "45-5-502" },
      { text: "MCA § 45-5-502", jurisdiction: "MT", section: "45-5-502" },
    ]
    for (const { text, jurisdiction, section } of cases) {
      it(`should extract "${text}"`, () => {
        const citations = extractCitations(text)
        const statutes = citations.filter((c) => c.type === "statute")
        expect(statutes).toHaveLength(1)
        expect(statutes[0].jurisdiction).toBe(jurisdiction)
        expect(statutes[0].section).toBe(section)
      })
    }
  })

  describe("new state jurisdictions — batch 7", () => {
    const cases = [
      { text: "N.D. Cent. Code § 12.1-02-01", jurisdiction: "ND", section: "12.1-02-01" },
      { text: "N.D.C.C. § 12.1-02-01", jurisdiction: "ND", section: "12.1-02-01" },
      { text: "Neb. Rev. Stat. § 28-303", jurisdiction: "NE", section: "28-303" },
      { text: "N.H. Rev. Stat. Ann. § 625:9", jurisdiction: "NH", section: "625:9" },
      { text: "RSA § 625:9", jurisdiction: "NH", section: "625:9" },
      { text: "N.M. Stat. Ann. § 30-16-1", jurisdiction: "NM", section: "30-16-1" },
      { text: "NMSA § 30-16-1", jurisdiction: "NM", section: "30-16-1" },
      { text: "Nev. Rev. Stat. § 200.030", jurisdiction: "NV", section: "200.030" },
      { text: "NRS § 200.030", jurisdiction: "NV", section: "200.030" },
      { text: "Okla. Stat. § 496", jurisdiction: "OK", section: "496" },
      { text: "Or. Rev. Stat. § 161.085", jurisdiction: "OR", section: "161.085" },
      { text: "ORS § 161.085", jurisdiction: "OR", section: "161.085" },
      { text: "R.I. Gen. Laws § 11-1-2", jurisdiction: "RI", section: "11-1-2" },
      { text: "R.I.G.L. § 11-1-2", jurisdiction: "RI", section: "11-1-2" },
    ]
    for (const { text, jurisdiction, section } of cases) {
      it(`should extract "${text}"`, () => {
        const citations = extractCitations(text)
        const statutes = citations.filter((c) => c.type === "statute")
        expect(statutes).toHaveLength(1)
        expect(statutes[0].jurisdiction).toBe(jurisdiction)
        expect(statutes[0].section).toBe(section)
      })
    }
  })

  describe("new state jurisdictions — batch 8", () => {
    const cases = [
      { text: "S.C. Code Ann. § 16-3-10", jurisdiction: "SC", section: "16-3-10" },
      { text: "S.D. Codified Laws § 22-1-2", jurisdiction: "SD", section: "22-1-2" },
      { text: "SDCL § 22-1-2", jurisdiction: "SD", section: "22-1-2" },
      { text: "Tenn. Code Ann. § 39-13-101", jurisdiction: "TN", section: "39-13-101" },
      { text: "T.C.A. § 39-13-101", jurisdiction: "TN", section: "39-13-101" },
      { text: "Vt. Stat. Ann. § 2301", jurisdiction: "VT", section: "2301" },
      { text: "V.S.A. § 2301", jurisdiction: "VT", section: "2301" },
      { text: "Wis. Stat. § 940.01", jurisdiction: "WI", section: "940.01" },
      { text: "W. Va. Code § 61-2-9", jurisdiction: "WV", section: "61-2-9" },
      { text: "Wyo. Stat. Ann. § 6-2-101", jurisdiction: "WY", section: "6-2-101" },
      { text: "W.S. § 6-2-101", jurisdiction: "WY", section: "6-2-101" },
    ]
    for (const { text, jurisdiction, section } of cases) {
      it(`should extract "${text}"`, () => {
        const citations = extractCitations(text)
        const statutes = citations.filter((c) => c.type === "statute")
        expect(statutes).toHaveLength(1)
        expect(statutes[0].jurisdiction).toBe(jurisdiction)
        expect(statutes[0].section).toBe(section)
      })
    }
  })

  describe("new fields via full pipeline", () => {
    it("should extract subsection through full pipeline", () => {
      const citations = extractCitations("42 U.S.C. § 1983(a)(1)")
      expect(citations).toHaveLength(1)
      const c = citations[0]
      if (c.type === "statute") {
        expect(c.subsection).toBe("(a)(1)")
        expect(c.pincite).toBe("(a)(1)")
        expect(c.jurisdiction).toBe("US")
      }
    })

    it("should extract et seq. through full pipeline", () => {
      const citations = extractCitations("42 U.S.C. § 1983 et seq.")
      expect(citations).toHaveLength(1)
      const c = citations[0]
      if (c.type === "statute") {
        expect(c.hasEtSeq).toBe(true)
      }
    })

    it("should extract et seq without period through full pipeline", () => {
      const citations = extractCitations("42 U.S.C. § 1983 et seq")
      expect(citations).toHaveLength(1)
      const c = citations[0]
      if (c.type === "statute") {
        expect(c.hasEtSeq).toBe(true)
      }
    })

    it("should extract prose citation through full pipeline", () => {
      const citations = extractCitations("See section 1983 of title 42 for details.")
      expect(citations).toHaveLength(1)
      const c = citations[0]
      if (c.type === "statute") {
        expect(c.title).toBe(42)
        expect(c.section).toBe("1983")
        expect(c.jurisdiction).toBe("US")
      }
    })

    it("should extract Cal. Penal Code § 187 via named-code pattern", () => {
      const citations = extractCitations("Cal. Penal Code § 187")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "statute") {
        // named-code pattern now fires before state-code; code stores cleaned name
        expect(citations[0].code).toBe("Penal")
        expect(citations[0].section).toBe("187")
        expect(citations[0].jurisdiction).toBe("CA")
      }
    })
  })

  describe("named-code does not absorb intervening prose (#328)", () => {
    it("rejects prose between two `California` occurrences", () => {
      // The named-code tokenizer previously matched the first `California`
      // and absorbed lowercase prose words ("for solicitation, acceptance ...")
      // up to the second `California` and the `§` because the code-name
      // body accepted `[A-Za-z]`. With the title-case-only fix, the regex
      // now skips the first `California` and matches at the second one.
      const text =
        "He was convicted in California for solicitation, acceptance or referral of fraudulent insurance claims, in violation of California Penal Code § 549."
      const cites = extractCitations(text).filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].matchedText).toBe("California Penal Code § 549")
        expect(cites[0].code).toBe("Penal")
        expect(cites[0].section).toBe("549")
        // matchedText must equal the slice from span coordinates
        const span = cites[0].span
        expect(text.slice(span.originalStart, span.originalEnd)).toBe(
          cites[0].matchedText,
        )
      }
    })

    it("regression: `Md. Code Ann., Crim. Law § 3-202` (comma inside code name)", () => {
      const cites = extractCitations("See Md. Code Ann., Crim. Law § 3-202.").filter(
        (c) => c.type === "statute",
      )
      expect(cites.length).toBeGreaterThanOrEqual(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].section).toBe("3-202")
      }
    })

    it("regression: `Md. Code, Ins. § 27-101` (comma + abbrev)", () => {
      const cites = extractCitations("Cf. Md. Code, Ins. § 27-101.").filter(
        (c) => c.type === "statute",
      )
      expect(cites.length).toBeGreaterThanOrEqual(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].section).toBe("27-101")
      }
    })

    it("regression: `Tex. Civ. Prac. & Rem. Code Ann. § 17.42` (ampersand + multi-word)", () => {
      const cites = extractCitations("See Tex. Civ. Prac. & Rem. Code Ann. § 17.42.").filter(
        (c) => c.type === "statute",
      )
      expect(cites.length).toBeGreaterThanOrEqual(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].section).toBe("17.42")
      }
    })
  })

  describe("Illinois Revised Statutes (pre-1993) (#330)", () => {
    it("extracts `Ill. Rev. Stat. 1985, ch. 40, par. 504(a)`", () => {
      const cites = extractCitations(
        "violates Ill. Rev. Stat. 1985, ch. 40, par. 504(a).",
      ).filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("Ill. Rev. Stat.")
        expect(cites[0].title).toBe(40)
        expect(cites[0].section).toBe("504")
        expect(cites[0].subsection).toBe("(a)")
        expect(cites[0].year).toBe(1985)
        expect(cites[0].jurisdiction).toBe("IL")
      }
    })

    it("extracts no-space + capitalized `Ill.Rev.Stat. 1985, Ch. 127, par. 780.04`", () => {
      const cites = extractCitations("Ill.Rev.Stat. 1985, Ch. 127, par. 780.04.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("Ill. Rev. Stat.")
        expect(cites[0].title).toBe(127)
        expect(cites[0].section).toBe("780.04")
        expect(cites[0].year).toBe(1985)
      }
    })

    it("extracts plural `pars.` and matches only the first paragraph", () => {
      const cites = extractCitations(
        "See Ill. Rev. Stat. 1987, ch. 85, pars. 8-102, 8-103.",
      ).filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(85)
        expect(cites[0].section).toBe("8-102")
      }
    })

    it("extracts letter-suffix chapter `110A`", () => {
      const cites = extractCitations("Ill. Rev. Stat. 1975, ch. 110A, par. 504.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        // title is the numeric prefix (110); the full "110A" is in matchedText
        expect(cites[0].title).toBe(110)
        expect(cites[0].matchedText).toContain("110A")
        expect(cites[0].year).toBe(1975)
      }
    })

    it("extracts with stray comma + `et seq.`", () => {
      const cites = extractCitations(
        "Ill.Rev.Stat., 1983, Ch. 37, par. 439.1 et seq.",
      ).filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(37)
        expect(cites[0].section).toBe("439.1")
        expect(cites[0].hasEtSeq).toBe(true)
      }
    })

    it("regression: modern `735 ILCS 5/2-1001` still routes through chapter-act", () => {
      const cites = extractCitations("735 ILCS 5/2-1001 governs.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(735)
        expect(cites[0].section).toBe("2-1001")
      }
    })
  })

  describe("ILCS trailing-period absorption (#331)", () => {
    it("strips trailing sentence period: `5 ILCS 100/1-1.`", () => {
      const cites = extractCitations("See 5 ILCS 100/1-1.").filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(5)
        expect(cites[0].code).toBe("100")
        expect(cites[0].section).toBe("1-1")
        expect(cites[0].matchedText).toBe("5 ILCS 100/1-1")
        expect(cites[0].jurisdiction).toBe("IL")
      }
    })

    it("strips trailing period from bare-numeric section: `225 ILCS 60/22.`", () => {
      const cites = extractCitations("See 225 ILCS 60/22.").filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(225)
        expect(cites[0].code).toBe("60")
        expect(cites[0].section).toBe("22")
      }
    })

    it("strips trailing period from hyphenated section: `735 ILCS 5/2-1001.`", () => {
      const cites = extractCitations("See 735 ILCS 5/2-1001.").filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(735)
        expect(cites[0].code).toBe("5")
        expect(cites[0].section).toBe("2-1001")
      }
    })

    it("preserves subsection while stripping sentence period: `750 ILCS 36/305(b).`", () => {
      const cites = extractCitations("See 750 ILCS 36/305(b).").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(750)
        expect(cites[0].code).toBe("36")
        expect(cites[0].section).toBe("305")
        expect(cites[0].subsection).toBe("(b)")
      }
    })

    it("captures et seq. without absorbing sentence period: `820 ILCS 405/1100 et seq.`", () => {
      const cites = extractCitations("See 820 ILCS 405/1100 et seq.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(820)
        expect(cites[0].code).toBe("405")
        expect(cites[0].section).toBe("1100")
        expect(cites[0].hasEtSeq).toBe(true)
      }
    })

    it("retains internal period inside decimal section: `5 ILCS 100/1-1.5`", () => {
      const cites = extractCitations("See 5 ILCS 100/1-1.5 governs.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(5)
        expect(cites[0].section).toBe("1-1.5")
      }
    })
  })

  describe("em-dash subdivision in paragraph numbers (#333)", () => {
    it("extracts Ill. Rev. Stat. paragraph with in-word em-dash subdivision", () => {
      const cites = extractCitations(
        "violates Ill. Rev. Stat. 1983, ch. 110, par. 13—214(a).",
      ).filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(110)
        expect(cites[0].section).toBe("13-214")
        expect(cites[0].subsection).toBe("(a)")
        expect(cites[0].year).toBe(1983)
      }
    })

    it("extracts equivalent output for em-dash and hyphen variants", () => {
      const emDash = extractCitations(
        "Ill. Rev. Stat. 1983, ch. 110, par. 13—214(a).",
      ).filter((c) => c.type === "statute")
      const hyphen = extractCitations(
        "Ill. Rev. Stat. 1983, ch. 110, par. 13-214(a).",
      ).filter((c) => c.type === "statute")
      expect(emDash).toHaveLength(1)
      expect(hyphen).toHaveLength(1)
      if (emDash[0]?.type === "statute" && hyphen[0]?.type === "statute") {
        expect(emDash[0].section).toBe(hyphen[0].section)
        expect(emDash[0].subsection).toBe(hyphen[0].subsection)
        expect(emDash[0].title).toBe(hyphen[0].title)
      }
    })

    it("extracts multi-paragraph em-dash form (first paragraph only)", () => {
      const cites = extractCitations(
        "See Ill. Rev. Stat. 1987, ch. 85, pars. 8—102, 8—103.",
      ).filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(85)
        expect(cites[0].section).toBe("8-102")
      }
    })

    it("regression: blank-page em-dash still tokenizes as case with `---`", () => {
      const cites = extractCitations("See Jones v. Doe, 500 F.4th — (2024).").filter(
        (c) => c.type === "case",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "case") {
        expect(cites[0].matchedText).toContain("---")
      }
    })

    it("originalStart/originalEnd map back to the em-dash position in the source", () => {
      const text = "violates Ill. Rev. Stat. 1983, ch. 110, par. 13—214(a)."
      const cites = extractCitations(text).filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        const slice = text.slice(cites[0].span.originalStart, cites[0].span.originalEnd)
        // Source still contains em-dash; matchedText is the cleaned hyphen form.
        expect(slice).toContain("—")
        expect(cites[0].matchedText).toContain("13-214")
        // Em-dash → hyphen is length-preserving, so clean/original spans match.
        expect(cites[0].span.originalStart).toBe(cites[0].span.cleanStart)
        expect(cites[0].span.originalEnd).toBe(cites[0].span.cleanEnd)
      }
    })
  })

  describe("Code of Alabama 1940 — pre-1975 statutes (#343)", () => {
    it("extracts Code-prefix form: `Code 1940, T. 15, § 389`", () => {
      const cites = extractCitations("violates Code 1940, T. 15, § 389.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(15)
        expect(cites[0].section).toBe("389")
        expect(cites[0].code).toBe("Code of Alabama 1940")
        expect(cites[0].year).toBe(1940)
        expect(cites[0].jurisdiction).toBe("AL")
      }
    })

    it("extracts Title-first with Code trailer + recompiledYear: `Title 26, Section 214, Code of Alabama 1940, as Recompiled 1958`", () => {
      const cites = extractCitations(
        "Per Title 26, Section 214, Code of Alabama 1940, as Recompiled 1958.",
      ).filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(26)
        expect(cites[0].section).toBe("214")
        expect(cites[0].year).toBe(1940)
        expect(cites[0].recompiledYear).toBe(1958)
      }
    })

    it("extracts Title-first with comma before year: `Title 7, Section 273, Code of Alabama, 1940`", () => {
      const cites = extractCitations("Per Title 7, Section 273, Code of Alabama, 1940.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(7)
        expect(cites[0].section).toBe("273")
        expect(cites[0].year).toBe(1940)
        expect(cites[0].recompiledYear).toBeUndefined()
      }
    })

    it("extracts Title-first with abbreviated Code trailer: `Title 7, § 21, Code 1940`", () => {
      const cites = extractCitations("Per Title 7, § 21, Code 1940.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(7)
        expect(cites[0].section).toBe("21")
        expect(cites[0].year).toBe(1940)
      }
    })

    it("extracts Title-first, §-after-title, trailing Code: `Title 43, § 30, Code 1940`", () => {
      const cites = extractCitations("violates Title 43, § 30, Code 1940.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(43)
        expect(cites[0].section).toBe("30")
      }
    })

    it("extracts abbreviated bare form: `Tit. 52, § 361`", () => {
      const cites = extractCitations("See Tit. 52, § 361.").filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].title).toBe(52)
        expect(cites[0].section).toBe("361")
        expect(cites[0].code).toBe("Code of Alabama 1940")
        expect(cites[0].jurisdiction).toBe("AL")
        // No Code trailer, so year is undefined
        expect(cites[0].year).toBeUndefined()
      }
    })

    it("does NOT match bare `Title 7, § 508` (no Alabama context signal)", () => {
      // The spelled-out `Title N, § N` form without any Code clause is
      // intentionally not matched — bare `Title 18, § 1001`-style strings
      // would false-positive on USC and other federal codes. Deferred.
      const cites = extractCitations("Title 7, § 508.").filter((c) => c.type === "statute")
      expect(cites).toHaveLength(0)
    })

    it("regression: modern `Ala. Code § 6-2-39` continues to route through the abbreviated extractor", () => {
      const cites = extractCitations("Ala. Code § 6-2-39.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].section).toBe("6-2-39")
        expect(cites[0].jurisdiction).toBe("AL")
      }
    })
  })

  describe("Colorado pre-1973 and year-edition variants (#352)", () => {
    it("inline `C.R.S. 1963 § 148-21-34` preserves edition in code, section is correct", () => {
      const cites = extractCitations("Per C.R.S. 1963 § 148-21-34.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("C.R.S. 1963")
        expect(cites[0].section).toBe("148-21-34")
        expect(cites[0].jurisdiction).toBe("CO")
      }
    })

    it("inline `C.R.S. 1973 § 13-25-126` works for modern edition variant", () => {
      const cites = extractCitations("Per C.R.S. 1973 § 13-25-126.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("C.R.S. 1973")
        expect(cites[0].section).toBe("13-25-126")
      }
    })

    it("prose form `Section 148-21-34, Colorado Revised Statutes 1963`", () => {
      const cites = extractCitations(
        "violates Section 148-21-34, Colorado Revised Statutes 1963.",
      ).filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("Colorado Revised Statutes 1963")
        expect(cites[0].section).toBe("148-21-34")
        expect(cites[0].jurisdiction).toBe("CO")
      }
    })

    it("prose form with `(YYYY Supp.)` trailing parenthetical", () => {
      const cites = extractCitations(
        "Section 148-11-22, Colorado Revised Statutes 1963 (1965 Supp.).",
      ).filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("Colorado Revised Statutes 1963")
        expect(cites[0].section).toBe("148-11-22")
        expect(cites[0].year).toBe(1965)
        expect(cites[0].editionLabel).toBe("Supp.")
      }
    })

    it("prose form with subsection: `Section 82-4-8(8)(f), Colo. Rev. Stat. 1963`", () => {
      const cites = extractCitations(
        "Per Section 82-4-8(8)(f), Colo. Rev. Stat. 1963.",
      ).filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("Colo. Rev. Stat. 1963")
        expect(cites[0].section).toBe("82-4-8")
        expect(cites[0].subsection).toBe("(8)(f)")
      }
    })

    it("regression: modern `C.R.S. § 13-25-126` continues to work (no year)", () => {
      const cites = extractCitations("under C.R.S. § 13-25-126.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("C.R.S.")
        expect(cites[0].section).toBe("13-25-126")
      }
    })

    it("regression: modern `C.R.S. § 13-25-126 (1973)` keeps 1973 in trailing year-parenthetical", () => {
      const cites = extractCitations("under C.R.S. § 13-25-126 (1973).").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("C.R.S.")
        expect(cites[0].section).toBe("13-25-126")
        expect(cites[0].year).toBe(1973)
      }
    })

    it("regression: federal `42 U.S.C. § 1983 (1976)` unaffected", () => {
      const cites = extractCitations("42 U.S.C. § 1983 (1976).").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].section).toBe("1983")
        expect(cites[0].year).toBe(1976)
      }
    })
  })

  describe("Florida postfix + spelled-out-prefix statute forms (#356)", () => {
    it("postfix word-section: `section 812.035(7), Florida Statutes`", () => {
      const cites = extractCitations(
        "violates section 812.035(7), Florida Statutes.",
      ).filter((c) => c.type === "statute")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("Fla. Stat.")
        expect(cites[0].section).toBe("812.035")
        expect(cites[0].subsection).toBe("(7)")
        expect(cites[0].jurisdiction).toBe("FL")
      }
    })

    it("postfix §-section: `§83.15, Florida Statutes`", () => {
      const cites = extractCitations("under §83.15, Florida Statutes.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("Fla. Stat.")
        expect(cites[0].section).toBe("83.15")
      }
    })

    it("postfix §-section with `Fla. Stat.`: `§120.68, Fla. Stat.`", () => {
      const cites = extractCitations("under §120.68, Fla. Stat.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("Fla. Stat.")
        expect(cites[0].section).toBe("120.68")
      }
    })

    it("spelled-out singular prefix: `Florida Statute 679.504(3)`", () => {
      const cites = extractCitations("Florida Statute 679.504(3) governs.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("Fla. Stat.")
        expect(cites[0].section).toBe("679.504")
        expect(cites[0].subsection).toBe("(3)")
      }
    })

    it("spelled-out plural prefix + §: `Florida Statutes §73.071(3)(b)`", () => {
      const cites = extractCitations("under Florida Statutes §73.071(3)(b).").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("Fla. Stat.")
        expect(cites[0].section).toBe("73.071")
        expect(cites[0].subsection).toBe("(3)(b)")
      }
    })

    it("regression: canonical Bluebook `Fla. Stat. § 812.035(7)` unaffected", () => {
      const cites = extractCitations("Fla. Stat. § 812.035(7).").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("Fla. Stat.")
        expect(cites[0].section).toBe("812.035")
      }
    })

    it("regression: `F.S. § 812.035` abbreviated form unaffected", () => {
      const cites = extractCitations("F.S. § 812.035 governs.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].jurisdiction).toBe("FL")
      }
    })
  })

  describe("Revised Laws of Hawaii (pre-1955) (#359)", () => {
    it("extracts `RLH 1935 § 2545`", () => {
      const cites = extractCitations("Per RLH 1935 § 2545.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("RLH")
        expect(cites[0].section).toBe("2545")
        expect(cites[0].year).toBe(1935)
        expect(cites[0].jurisdiction).toBe("HI")
      }
    })

    it("extracts `RLH 1945 § 7186`", () => {
      const cites = extractCitations("Per RLH 1945 § 7186.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("RLH")
        expect(cites[0].section).toBe("7186")
        expect(cites[0].year).toBe(1945)
      }
    })

    it("extracts hyphenated section: `RLH 1955 § 100-1`", () => {
      const cites = extractCitations("Per RLH 1955 § 100-1.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].section).toBe("100-1")
        expect(cites[0].year).toBe(1955)
      }
    })

    it("regression: modern `HRS § 658-8 (1976)` continues to work", () => {
      const cites = extractCitations("HRS § 658-8 (1976).").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("HRS")
        expect(cites[0].section).toBe("658-8")
        expect(cites[0].year).toBe(1976)
      }
    })
  })

  describe("Idaho Code variants (#360)", () => {
    it("extracts `Idaho Code section 15-5-209` (word section)", () => {
      const cites = extractCitations("See Idaho Code section 15-5-209.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("Idaho Code")
        expect(cites[0].section).toBe("15-5-209")
        expect(cites[0].jurisdiction).toBe("ID")
      }
    })

    it("extracts `Idaho Code section 19-2715(5)` with subsection", () => {
      const cites = extractCitations("See Idaho Code section 19-2715(5).").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("Idaho Code")
        expect(cites[0].section).toBe("19-2715")
        expect(cites[0].subsection).toBe("(5)")
      }
    })

    it("extracts `Idaho Code, § 19-4906(c)` (comma form)", () => {
      const cites = extractCitations("Idaho Code, § 19-4906(c).").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("Idaho Code")
        expect(cites[0].section).toBe("19-4906")
        expect(cites[0].subsection).toBe("(c)")
        expect(cites[0].jurisdiction).toBe("ID")
      }
    })

    it("extracts `Section 23-908(4), Idaho Code` (postfix form)", () => {
      const cites = extractCitations("Section 23-908(4), Idaho Code.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("Idaho Code")
        expect(cites[0].section).toBe("23-908")
        expect(cites[0].subsection).toBe("(4)")
        expect(cites[0].jurisdiction).toBe("ID")
      }
    })

    it("extracts `I.C. § 61-623` (canonical dotted abbreviation)", () => {
      const cites = extractCitations("See I.C. § 61-623.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("I.C.")
        expect(cites[0].section).toBe("61-623")
        expect(cites[0].jurisdiction).toBe("ID")
      }
    })

    it("extracts `I. C. § 61-623` (inter-letter spaced abbreviation)", () => {
      const cites = extractCitations("See I. C. § 61-623.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("I.C.")
        expect(cites[0].section).toBe("61-623")
        expect(cites[0].jurisdiction).toBe("ID")
      }
    })

    it("regression: Indiana `IC 35-42-1-1` still routes to Indiana", () => {
      const cites = extractCitations("See IC 35-42-1-1.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].jurisdiction).toBe("IN")
      }
    })

    it("regression: Indiana `Ind. Code § 35-42-1-1` still routes to Indiana", () => {
      const cites = extractCitations("See Ind. Code § 35-42-1-1.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].jurisdiction).toBe("IN")
        expect(cites[0].section).toBe("35-42-1-1")
      }
    })
  })

  describe("Michigan MSA jurisdiction + bracket subscripts (#370)", () => {
    it("extracts `MSA 23.710(254)` as Michigan (not Minnesota)", () => {
      const cites = extractCitations("See MSA 23.710(254).").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("MSA")
        expect(cites[0].jurisdiction).toBe("MI")
        expect(cites[0].section).toBe("23.710")
        expect(cites[0].subsection).toBe("(254)")
      }
    })

    it("extracts `MSA 23.710[252]` with bracket subscript", () => {
      const cites = extractCitations("See MSA 23.710[252].").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("MSA")
        expect(cites[0].jurisdiction).toBe("MI")
        expect(cites[0].section).toBe("23.710")
        expect(cites[0].subsection).toBe("[252]")
      }
    })

    it("extracts `Mich. Stat. Ann. § 23.710` as Michigan", () => {
      const cites = extractCitations("See Mich. Stat. Ann. § 23.710.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].jurisdiction).toBe("MI")
      }
    })

    it("regression: dotted `M.S.A. § 480A.06` still routes to Minnesota", () => {
      const cites = extractCitations("See M.S.A. § 480A.06.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("M.S.A.")
        expect(cites[0].jurisdiction).toBe("MN")
      }
    })

    it("regression: `Minn. Stat. § 290.16` still routes to Minnesota", () => {
      const cites = extractCitations("See Minn. Stat. § 290.16.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].jurisdiction).toBe("MN")
        expect(cites[0].section).toBe("290.16")
      }
    })

    it("regression: `MCL 801.258` still routes to Michigan with code=MCL", () => {
      const cites = extractCitations("See MCL 801.258.").filter(
        (c) => c.type === "statute",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "statute") {
        expect(cites[0].code).toBe("MCL")
        expect(cites[0].jurisdiction).toBe("MI")
        expect(cites[0].section).toBe("801.258")
      }
    })
  })
})
