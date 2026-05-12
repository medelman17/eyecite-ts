import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import { extractAbbreviated } from "@/extract/statutes/extractAbbreviated"
import type { Token } from "@/tokenize"
import { createIdentityMap } from "../../helpers/transformationMap"

describe("extractAbbreviated", () => {
  const map = createIdentityMap()
  const makeToken = (text: string): Token => ({
    text,
    span: { cleanStart: 0, cleanEnd: text.length },
    type: "statute",
    patternId: "abbreviated-code",
  })

  describe("Florida", () => {
    it("should extract Fla. Stat. § 768.81", () => {
      const c = extractAbbreviated(makeToken("Fla. Stat. § 768.81"), map)
      expect(c.jurisdiction).toBe("FL")
      expect(c.section).toBe("768.81")
      expect(c.confidence).toBeGreaterThanOrEqual(0.95)
    })
    it("should extract F.S. 768.81", () => {
      const c = extractAbbreviated(makeToken("F.S. 768.81"), map)
      expect(c.jurisdiction).toBe("FL")
      expect(c.section).toBe("768.81")
    })
    it("should extract subsections", () => {
      const c = extractAbbreviated(makeToken("Fla. Stat. § 768.81(1)(a)"), map)
      expect(c.section).toBe("768.81")
      expect(c.subsection).toBe("(1)(a)")
    })
  })

  describe("Ohio", () => {
    it("should extract R.C. 2305.01", () => {
      const c = extractAbbreviated(makeToken("R.C. 2305.01"), map)
      expect(c.jurisdiction).toBe("OH")
      expect(c.section).toBe("2305.01")
    })
    it("should extract Ohio Rev. Code § 2305.01", () => {
      const c = extractAbbreviated(makeToken("Ohio Rev. Code § 2305.01"), map)
      expect(c.jurisdiction).toBe("OH")
    })
  })

  describe("Michigan", () => {
    it("should extract MCL 750.81", () => {
      const c = extractAbbreviated(makeToken("MCL 750.81"), map)
      expect(c.jurisdiction).toBe("MI")
      expect(c.section).toBe("750.81")
    })
    it("should extract M.C.L. § 750.81", () => {
      const c = extractAbbreviated(makeToken("M.C.L. § 750.81"), map)
      expect(c.jurisdiction).toBe("MI")
    })
  })

  describe("Utah", () => {
    it("should extract Utah Code § 76-5-302", () => {
      const c = extractAbbreviated(makeToken("Utah Code § 76-5-302"), map)
      expect(c.jurisdiction).toBe("UT")
      expect(c.section).toBe("76-5-302")
    })
    it("should extract U.C.A. § 76-5-302", () => {
      const c = extractAbbreviated(makeToken("U.C.A. § 76-5-302"), map)
      expect(c.jurisdiction).toBe("UT")
    })
  })

  describe("Colorado", () => {
    it("should extract C.R.S. § 13-1-101", () => {
      const c = extractAbbreviated(makeToken("C.R.S. § 13-1-101"), map)
      expect(c.jurisdiction).toBe("CO")
      expect(c.section).toBe("13-1-101")
    })
  })

  describe("Washington", () => {
    it("should extract RCW 26.09.191", () => {
      const c = extractAbbreviated(makeToken("RCW 26.09.191"), map)
      expect(c.jurisdiction).toBe("WA")
      expect(c.section).toBe("26.09.191")
    })
  })

  describe("North Carolina", () => {
    it("should extract G.S. 20-138.1", () => {
      const c = extractAbbreviated(makeToken("G.S. 20-138.1"), map)
      expect(c.jurisdiction).toBe("NC")
      expect(c.section).toBe("20-138.1")
    })
    it("should extract N.C. Gen. Stat. § 20-138.1", () => {
      const c = extractAbbreviated(makeToken("N.C. Gen. Stat. § 20-138.1"), map)
      expect(c.jurisdiction).toBe("NC")
    })
  })

  describe("Georgia", () => {
    it("should extract O.C.G.A. § 16-5-1", () => {
      const c = extractAbbreviated(makeToken("O.C.G.A. § 16-5-1"), map)
      expect(c.jurisdiction).toBe("GA")
      expect(c.section).toBe("16-5-1")
    })
  })

  describe("Pennsylvania", () => {
    it("should extract 42 Pa.C.S. § 5524", () => {
      const c = extractAbbreviated(makeToken("42 Pa.C.S. § 5524"), map)
      expect(c.jurisdiction).toBe("PA")
      expect(c.title).toBe(42)
      expect(c.section).toBe("5524")
    })
    it("should extract 43 P.S. § 951", () => {
      const c = extractAbbreviated(makeToken("43 P.S. § 951"), map)
      expect(c.jurisdiction).toBe("PA")
      expect(c.title).toBe(43)
      expect(c.section).toBe("951")
    })
  })

  describe("Indiana", () => {
    it("should extract Ind. Code § 35-42-1-1", () => {
      const c = extractAbbreviated(makeToken("Ind. Code § 35-42-1-1"), map)
      expect(c.jurisdiction).toBe("IN")
      expect(c.section).toBe("35-42-1-1")
    })
    it("should extract IC 35-42-1-1", () => {
      const c = extractAbbreviated(makeToken("IC 35-42-1-1"), map)
      expect(c.jurisdiction).toBe("IN")
    })
  })

  describe("New Jersey", () => {
    it("should extract N.J.S.A. 2A:10-1", () => {
      const c = extractAbbreviated(makeToken("N.J.S.A. 2A:10-1"), map)
      expect(c.jurisdiction).toBe("NJ")
      expect(c.section).toBe("2A:10-1")
    })
  })

  describe("Delaware", () => {
    it("should extract 8 Del. C. § 141", () => {
      const c = extractAbbreviated(makeToken("8 Del. C. § 141"), map)
      expect(c.jurisdiction).toBe("DE")
      expect(c.title).toBe(8)
      expect(c.section).toBe("141")
    })
  })

  describe("et seq. handling", () => {
    it("should detect et seq.", () => {
      const c = extractAbbreviated(makeToken("R.C. 2305.01 et seq."), map)
      expect(c.hasEtSeq).toBe(true)
      expect(c.section).toBe("2305.01")
    })
    it("should detect et seq without period", () => {
      const c = extractAbbreviated(makeToken("MCL 750.81 et seq"), map)
      expect(c.hasEtSeq).toBe(true)
    })
  })

  describe("unknown abbreviation", () => {
    it("should return low confidence for unrecognized abbreviation", () => {
      const c = extractAbbreviated(makeToken("Unknown 123.45"), map)
      expect(c.confidence).toBeLessThanOrEqual(0.6)
      expect(c.jurisdiction).toBeUndefined()
    })

    it("should return 0.6 confidence for unknown code with § symbol", () => {
      const c = extractAbbreviated(makeToken("Xyz. § 999"), map)
      expect(c.confidence).toBe(0.6)
      expect(c.jurisdiction).toBeUndefined()
    })
  })

  describe("fallback parsing", () => {
    it("should handle token text that does not match ABBREVIATED_RE", () => {
      // Token with no digits in section position — regex won't match
      const c = extractAbbreviated(makeToken("just text"), map)
      expect(c.type).toBe("statute")
      expect(c.section).toBe("")
      expect(c.confidence).toBeLessThanOrEqual(0.4)
    })
  })

  describe("Arizona A.R.S. format variants (#348)", () => {
    it("canonical `A.R.S. § 25-331(E)` extracts with subsection", () => {
      const c = extractAbbreviated(makeToken("A.R.S. § 25-331(E)"), map)
      expect(c.jurisdiction).toBe("AZ")
      expect(c.code).toBe("A.R.S.")
      expect(c.section).toBe("25-331")
      expect(c.subsection).toBe("(E)")
    })

    it("word `section` (lowercase) — `A.R.S. section 14-2804(A)`", () => {
      const c = extractAbbreviated(makeToken("A.R.S. section 14-2804(A)"), map)
      expect(c.jurisdiction).toBe("AZ")
      expect(c.code).toBe("A.R.S.")
      expect(c.section).toBe("14-2804")
      expect(c.subsection).toBe("(A)")
    })

    it("word `Section` (capital S) — `A.R.S. Section 22-318`", () => {
      const c = extractAbbreviated(makeToken("A.R.S. Section 22-318"), map)
      expect(c.jurisdiction).toBe("AZ")
      expect(c.code).toBe("A.R.S.")
      expect(c.section).toBe("22-318")
    })

    it("no-dots variant `ARS § 35-213` normalizes code to `A.R.S.`", () => {
      const c = extractAbbreviated(makeToken("ARS § 35-213"), map)
      expect(c.jurisdiction).toBe("AZ")
      expect(c.code).toBe("A.R.S.")
      expect(c.section).toBe("35-213")
    })

    it("extra-space variant `A. R.S. § 36-1002.02` normalizes code to `A.R.S.`", () => {
      const c = extractAbbreviated(makeToken("A. R.S. § 36-1002.02"), map)
      expect(c.jurisdiction).toBe("AZ")
      expect(c.code).toBe("A.R.S.")
      expect(c.section).toBe("36-1002.02")
    })

    it("OCR variant `AR.S. § 35-213` normalizes code to `A.R.S.`", () => {
      const c = extractAbbreviated(makeToken("AR.S. § 35-213"), map)
      expect(c.jurisdiction).toBe("AZ")
      expect(c.code).toBe("A.R.S.")
      expect(c.section).toBe("35-213")
    })

    it("regression: Bluebook full form `Ariz. Rev. Stat.` preserved (not over-normalized)", () => {
      const c = extractAbbreviated(makeToken("Ariz. Rev. Stat. § 14-1234"), map)
      expect(c.jurisdiction).toBe("AZ")
      expect(c.code).toBe("Ariz. Rev. Stat.")
      expect(c.section).toBe("14-1234")
    })

    it("regression: Bluebook annotated form `Ariz. Rev. Stat. Ann.` preserved", () => {
      const c = extractAbbreviated(makeToken("Ariz. Rev. Stat. Ann. § 14-1234"), map)
      expect(c.jurisdiction).toBe("AZ")
      expect(c.code).toBe("Ariz. Rev. Stat. Ann.")
    })
  })

  describe("Arkansas Code Annotated + edition parenthetical (#349)", () => {
    // The edition-parenthetical post-pass runs in `extractCitations`, not in
    // `extractAbbreviated`, so these tests use `extractCitations` end-to-end.
    it("`Ark. Code Ann. § 11-9-514(a)(1) (Repl. 1996)` → year + editionLabel", () => {
      const cs = extractCitations(
        "violates Ark. Code Ann. § 11-9-514(a)(1) (Repl. 1996).",
      ).filter((x) => x.type === "statute")
      expect(cs).toHaveLength(1)
      if (cs[0]?.type === "statute") {
        expect(cs[0].code).toBe("Ark. Code Ann.")
        expect(cs[0].section).toBe("11-9-514")
        expect(cs[0].subsection).toBe("(a)(1)")
        expect(cs[0].year).toBe(1996)
        expect(cs[0].editionLabel).toBe("Repl.")
        expect(cs[0].jurisdiction).toBe("AR")
      }
    })

    it("`Arkansas Code Annotated § 16-89-111(e)(1) (1987)` (spelled-out form)", () => {
      const cs = extractCitations(
        "Per Arkansas Code Annotated § 16-89-111(e)(1) (1987).",
      ).filter((x) => x.type === "statute")
      expect(cs).toHaveLength(1)
      if (cs[0]?.type === "statute") {
        expect(cs[0].code).toBe("Arkansas Code Annotated")
        expect(cs[0].year).toBe(1987)
        expect(cs[0].editionLabel).toBeUndefined()
      }
    })

    it("`Arkansas Code Annotated section ...` (spelled-out + word section)", () => {
      const cs = extractCitations(
        "see Arkansas Code Annotated section 11-9-102(5)(A)(i) (Repl. 1996).",
      ).filter((x) => x.type === "statute")
      expect(cs).toHaveLength(1)
      if (cs[0]?.type === "statute") {
        expect(cs[0].code).toBe("Arkansas Code Annotated")
        expect(cs[0].section).toBe("11-9-102")
        expect(cs[0].subsection).toBe("(5)(A)(i)")
        expect(cs[0].year).toBe(1996)
        expect(cs[0].editionLabel).toBe("Repl.")
      }
    })

    it("`Ark. Stat. Ann. § 41-1201 (Repl. 1964)` (pre-1987 form)", () => {
      const cs = extractCitations("under Ark. Stat. Ann. § 41-1201 (Repl. 1964).").filter(
        (x) => x.type === "statute",
      )
      expect(cs).toHaveLength(1)
      if (cs[0]?.type === "statute") {
        expect(cs[0].code).toBe("Ark. Stat. Ann.")
        expect(cs[0].section).toBe("41-1201")
        expect(cs[0].year).toBe(1964)
        expect(cs[0].editionLabel).toBe("Repl.")
        expect(cs[0].jurisdiction).toBe("AR")
      }
    })

    it("`(1969 Supp.)` year-first edition label", () => {
      const cs = extractCitations("Ark. Stat. Ann. § 80-1304 (1969 Supp.).").filter(
        (x) => x.type === "statute",
      )
      expect(cs).toHaveLength(1)
      if (cs[0]?.type === "statute") {
        expect(cs[0].year).toBe(1969)
        expect(cs[0].editionLabel).toBe("Supp.")
      }
    })

    it("regression: `(West 2018)` publisher still populates `publisher`, not `editionLabel`", () => {
      const cs = extractCitations("28 U.S.C. § 1331 (West 2018).").filter(
        (x) => x.type === "statute",
      )
      expect(cs).toHaveLength(1)
      if (cs[0]?.type === "statute") {
        expect(cs[0].year).toBe(2018)
        expect(cs[0].publisher).toBe("West")
        expect(cs[0].editionLabel).toBeUndefined()
      }
    })

    it("regression: bare `(1976)` year still works", () => {
      const cs = extractCitations("42 U.S.C. § 1983 (1976).").filter(
        (x) => x.type === "statute",
      )
      expect(cs).toHaveLength(1)
      if (cs[0]?.type === "statute") {
        expect(cs[0].year).toBe(1976)
        expect(cs[0].publisher).toBeUndefined()
        expect(cs[0].editionLabel).toBeUndefined()
      }
    })
  })
})
