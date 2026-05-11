import { describe, expect, it } from "vitest"
import { extractCase, extractCitations } from "@/extract"
import type { Token } from "@/tokenize"
import type { FullCaseCitation } from "@/types/citation"
import { createIdentityMap, createOffsetMap } from "../helpers/transformationMap"

describe("extractCase", () => {
  describe("volume-reporter-page parsing", () => {
    it("should extract volume, reporter, and page from basic case citation", () => {
      const token: Token = {
        text: "500 F.2d 123",
        span: { cleanStart: 10, cleanEnd: 22 },
        type: "case",
        patternId: "federal-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.type).toBe("case")
      expect(citation.volume).toBe(500)
      expect(citation.reporter).toBe("F.2d")
      expect(citation.page).toBe(123)
      expect(citation.text).toBe("500 F.2d 123")
      expect(citation.matchedText).toBe("500 F.2d 123")
      expect(citation.confidence).toBeGreaterThanOrEqual(0.5)
    })

    it("should handle different reporter formats", () => {
      const token: Token = {
        text: "410 U.S. 113",
        span: { cleanStart: 0, cleanEnd: 12 },
        type: "case",
        patternId: "us-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.volume).toBe(410)
      expect(citation.reporter).toBe("U.S.")
      expect(citation.page).toBe(113)
    })

    it("should handle reporters with multiple spaces", () => {
      const token: Token = {
        text: "123 So. 2d 456",
        span: { cleanStart: 0, cleanEnd: 14 },
        type: "case",
        patternId: "southern-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.volume).toBe(123)
      expect(citation.reporter).toBe("So. 2d")
      expect(citation.page).toBe(456)
    })

    it("should extract F.4th citations", () => {
      const token: Token = {
        text: "50 F.4th 100",
        span: { cleanStart: 0, cleanEnd: 12 },
        type: "case",
        patternId: "federal-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.volume).toBe(50)
      expect(citation.reporter).toBe("F.4th")
      expect(citation.page).toBe(100)
    })

    it("should extract Cal.App.4th citations", () => {
      const token: Token = {
        text: "173 Cal.App.4th 655",
        span: { cleanStart: 0, cleanEnd: 19 },
        type: "case",
        patternId: "state-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.volume).toBe(173)
      expect(citation.reporter).toBe("Cal.App.4th")
      expect(citation.page).toBe(655)
    })

    it("should extract A.4th citations", () => {
      const token: Token = {
        text: "100 A.4th 200",
        span: { cleanStart: 0, cleanEnd: 13 },
        type: "case",
        patternId: "state-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.volume).toBe(100)
      expect(citation.reporter).toBe("A.4th")
      expect(citation.page).toBe(200)
    })

    it("should extract Cal.App.5th citations", () => {
      const token: Token = {
        text: "75 Cal.App.5th 123",
        span: { cleanStart: 0, cleanEnd: 18 },
        type: "case",
        patternId: "state-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.volume).toBe(75)
      expect(citation.reporter).toBe("Cal.App.5th")
      expect(citation.page).toBe(123)
    })

    it("should extract F.Supp.4th citations", () => {
      const token: Token = {
        text: "200 F.Supp.4th 500",
        span: { cleanStart: 0, cleanEnd: 18 },
        type: "case",
        patternId: "federal-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.volume).toBe(200)
      expect(citation.reporter).toBe("F.Supp.4th")
      expect(citation.page).toBe(500)
    })
  })

  describe("optional metadata extraction", () => {
    it("should extract pincite from case citation with page reference", () => {
      const token: Token = {
        text: "500 F.2d 123, 125",
        span: { cleanStart: 10, cleanEnd: 27 },
        type: "case",
        patternId: "federal-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.volume).toBe(500)
      expect(citation.reporter).toBe("F.2d")
      expect(citation.page).toBe(123)
      expect(citation.pincite).toBe(125)
    })

    it("should extract court from parenthetical", () => {
      const token: Token = {
        text: "500 F.2d 123 (9th Cir.)",
        span: { cleanStart: 0, cleanEnd: 23 },
        type: "case",
        patternId: "federal-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.court).toBe("9th Cir.")
    })

    it("should extract year from parenthetical", () => {
      const token: Token = {
        text: "500 F.2d 123 (2020)",
        span: { cleanStart: 0, cleanEnd: 19 },
        type: "case",
        patternId: "federal-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.year).toBe(2020)
    })

    it("should extract both court and year from combined parenthetical", () => {
      const token: Token = {
        text: "500 F.2d 123 (9th Cir. 2020)",
        span: { cleanStart: 0, cleanEnd: 28 },
        type: "case",
        patternId: "federal-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.court).toBe("9th Cir.")
      expect(citation.year).toBe(2020)
    })
  })

  describe("position translation", () => {
    it("should translate clean positions to original positions using TransformationMap", () => {
      const token: Token = {
        text: "500 F.2d 123",
        span: { cleanStart: 10, cleanEnd: 22 },
        type: "case",
        patternId: "federal-reporter",
      }
      // Simulate HTML removal: clean position 10 → original position 15
      const transformationMap = createOffsetMap(5)

      const citation = extractCase(token, transformationMap)

      expect(citation.span.cleanStart).toBe(10)
      expect(citation.span.cleanEnd).toBe(22)
      expect(citation.span.originalStart).toBe(15) // 10 + 5
      expect(citation.span.originalEnd).toBe(27) // 22 + 5
    })

    it("should handle identity mapping when no transformation", () => {
      const token: Token = {
        text: "500 F.2d 123",
        span: { cleanStart: 10, cleanEnd: 22 },
        type: "case",
        patternId: "federal-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.span.originalStart).toBe(citation.span.cleanStart)
      expect(citation.span.originalEnd).toBe(citation.span.cleanEnd)
    })

    it("should fallback to clean positions if mapping is missing", () => {
      const token: Token = {
        text: "500 F.2d 123",
        span: { cleanStart: 10, cleanEnd: 22 },
        type: "case",
        patternId: "federal-reporter",
      }
      // Empty transformation map
      const transformationMap: TransformationMap = {
        cleanToOriginal: new Map(),
        originalToClean: new Map(),
      }

      const citation = extractCase(token, transformationMap)

      // Should fallback to clean positions
      expect(citation.span.originalStart).toBe(10)
      expect(citation.span.originalEnd).toBe(22)
    })
  })

  describe("confidence scoring", () => {
    it("should have high confidence for common reporter patterns", () => {
      const reporters = ["F.2d", "F.3d", "U.S.", "S. Ct.", "P.2d", "A.2d"]
      const transformationMap = createIdentityMap()

      for (const reporter of reporters) {
        const token: Token = {
          text: `500 ${reporter} 123`,
          span: { cleanStart: 0, cleanEnd: `500 ${reporter} 123`.length },
          type: "case",
          patternId: "test",
        }

        const citation = extractCase(token, transformationMap)

        // Base 0.2 + common reporter 0.3 = 0.5 (may be higher with court inference)
        expect(citation.confidence).toBeGreaterThanOrEqual(0.5)
      }
    })

    it("should increase confidence for valid year", () => {
      const token: Token = {
        text: "500 F.2d 123 (2020)",
        span: { cleanStart: 0, cleanEnd: 19 },
        type: "case",
        patternId: "federal-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      // Base (0.2) + common reporter (+0.3) + valid year (+0.2) = 0.7
      expect(citation.confidence).toBe(0.7)
    })

    it("should not boost confidence for future year", () => {
      const futureYear = new Date().getFullYear() + 10
      const token: Token = {
        text: `500 F.2d 123 (${futureYear})`,
        span: { cleanStart: 0, cleanEnd: `500 F.2d 123 (${futureYear})`.length },
        type: "case",
        patternId: "federal-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      // Base (0.2) + common reporter (+0.3) but no year boost = 0.5
      expect(citation.confidence).toBe(0.5)
    })

    it("should have lower confidence for unknown reporter", () => {
      const token: Token = {
        text: "500 Unknown Rep. 123",
        span: { cleanStart: 0, cleanEnd: 21 },
        type: "case",
        patternId: "unknown",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      // Base confidence only (unknown reporter, no year, no case name)
      expect(citation.confidence).toBe(0.2)
    })
  })

  describe("metadata fields", () => {
    it("should include all required CitationBase fields", () => {
      const token: Token = {
        text: "500 F.2d 123",
        span: { cleanStart: 10, cleanEnd: 22 },
        type: "case",
        patternId: "federal-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.text).toBeDefined()
      expect(citation.span).toBeDefined()
      expect(citation.confidence).toBeDefined()
      expect(citation.matchedText).toBeDefined()
      expect(citation.processTimeMs).toBeDefined()
      expect(citation.patternsChecked).toBeDefined()
    })

    it("should set processTimeMs to 0 as placeholder", () => {
      const token: Token = {
        text: "500 F.2d 123",
        span: { cleanStart: 10, cleanEnd: 22 },
        type: "case",
        patternId: "federal-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.processTimeMs).toBe(0)
    })

    it("should set patternsChecked to 1", () => {
      const token: Token = {
        text: "500 F.2d 123",
        span: { cleanStart: 10, cleanEnd: 22 },
        type: "case",
        patternId: "federal-reporter",
      }
      const transformationMap = createIdentityMap()

      const citation = extractCase(token, transformationMap)

      expect(citation.patternsChecked).toBe(1)
    })
  })
})

describe("reporter with internal spaces (integration)", () => {
  it('should recognize "U. S." with space as case citation', () => {
    const citations = extractCitations("506 U. S. 534")
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].reporter).toBe("U.S.")
      expect(citations[0].volume).toBe(506)
      expect(citations[0].page).toBe(534)
    }
  })

  it('should still recognize "U.S." without space', () => {
    const citations = extractCitations("506 U.S. 534")
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].reporter).toBe("U.S.")
    }
  })
})

describe("hyphenated volume (integration)", () => {
  it("should extract full hyphenated volume from Trade Cases", () => {
    const citations = extractCitations("1984-1 Trade Cas. 66")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case" || citations[0].type === "journal") {
      expect(citations[0].volume).toBe("1984-1")
    }
  })

  it("should still extract numeric volumes as numbers", () => {
    const citations = extractCitations("500 F.2d 123")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].volume).toBe(500)
      expect(typeof citations[0].volume).toBe("number")
    }
  })

  it("should handle multiple hyphenated volume examples", () => {
    const examples = [
      { text: "1998-2 Trade Cas. 72", volume: "1998-2" },
      { text: "2020-1 Trade Cas. 81", volume: "2020-1" },
    ]
    for (const { text, volume } of examples) {
      const citations = extractCitations(text)
      expect(citations).toHaveLength(1)
      const c = citations[0]
      if (c.type === "case" || c.type === "journal") {
        expect(c.volume).toBe(volume)
      }
    }
  })
})

describe("parenthetical year and court extraction (integration)", () => {
  it("should extract year from parenthetical", () => {
    const citations = extractCitations("491 U.S. 397 (1989)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].year).toBe(1989)
    }
  })

  it("should extract year from parenthetical after pincite", () => {
    const citations = extractCitations("See Texas v. Johnson, 491 U.S. 397, 404 (1989).")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].volume).toBe(491)
      expect(citations[0].reporter).toBe("U.S.")
      expect(citations[0].page).toBe(397)
      expect(citations[0].year).toBe(1989)
      expect(citations[0].pincite).toBe(404)
    }
  })

  it("should infer scotus court from U.S. reporter", () => {
    const citations = extractCitations("491 U.S. 397 (1989)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("scotus")
    }
  })

  it("should infer scotus court from S. Ct. reporter", () => {
    const citations = extractCitations("129 S. Ct. 2252 (2009)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("scotus")
      expect(citations[0].year).toBe(2009)
    }
  })

  it("should infer scotus court from L. Ed. reporter", () => {
    const citations = extractCitations("174 L. Ed. 2d 490 (2009)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("scotus")
      expect(citations[0].year).toBe(2009)
    }
  })

  it("should extract court and year from combined parenthetical", () => {
    const citations = extractCitations("500 F.2d 123 (9th Cir. 2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("9th Cir.")
      expect(citations[0].year).toBe(2020)
    }
  })

  it("should extract court from district court parenthetical", () => {
    const citations = extractCitations("350 F. Supp. 3d 100 (D. Mass. 2019)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("D. Mass.")
      expect(citations[0].year).toBe(2019)
    }
  })

  it("should handle multiple SCOTUS citations from issue examples", () => {
    const examples = [
      { text: "491 U.S. 397, 404 (1989)", year: 1989 },
      { text: "418 U.S. 405, 409 (1974)", year: 1974 },
      { text: "468 U.S. 288, 294 (1984)", year: 1984 },
      { text: "391 U.S. 367, 376 (1968)", year: 1968 },
    ]
    for (const { text, year } of examples) {
      const citations = extractCitations(text)
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].year).toBe(year)
        expect(citations[0].court).toBe("scotus")
      }
    }
  })
})

describe("court inference from reporter (#78)", () => {
  it("infers federal appellate from F.3d", () => {
    const citations = extractCitations("500 F.3d 123 (9th Cir. 2020)")
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("9th Cir.")
      expect(citations[0].inferredCourt).toEqual({
        level: "appellate",
        jurisdiction: "federal",
        confidence: 1.0,
      })
    }
  })

  it("infers federal trial from F. Supp. 3d", () => {
    const citations = extractCitations("350 F. Supp. 3d 100 (D. Mass. 2019)")
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("D. Mass.")
      expect(citations[0].inferredCourt).toEqual({
        level: "trial",
        jurisdiction: "federal",
        confidence: 1.0,
      })
    }
  })

  it("infers federal supreme from U.S. reporter", () => {
    const citations = extractCitations("491 U.S. 397 (1989)")
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("scotus")
      expect(citations[0].inferredCourt).toEqual({
        level: "supreme",
        jurisdiction: "federal",
        confidence: 1.0,
      })
    }
  })

  it("populates inferredCourt even when parenthetical has court", () => {
    const citations = extractCitations("500 F.3d 123 (9th Cir. 2020)")
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("9th Cir.")
      expect(citations[0].inferredCourt).toBeDefined()
    }
  })

  it("returns undefined inferredCourt for unknown reporter", () => {
    const citations = extractCitations("10 Wheat. 66 (1825)")
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].inferredCourt).toBeUndefined()
    }
  })
})

describe("court extraction with date in parenthetical (#5)", () => {
  it("extracts court when parenthetical contains month and day", () => {
    const citations = extractCitations("500 F.3d 100 (2d Cir. Jan. 15, 2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("2d Cir.")
      expect(citations[0].year).toBe(2020)
    }
  })

  it("extracts court with different month abbreviation", () => {
    const citations = extractCitations("347 U.S. 483 (C.D. Cal. Feb. 9, 2015)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("C.D. Cal.")
      expect(citations[0].year).toBe(2015)
    }
  })

  it("extracts court when parenthetical has month without day", () => {
    const citations = extractCitations("500 F.3d 100 (D. Mass. Mar. 2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("D. Mass.")
      expect(citations[0].year).toBe(2020)
    }
  })

  it("still extracts court with simple year-only parenthetical", () => {
    const citations = extractCitations("500 F.3d 100 (2d Cir. 2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("2d Cir.")
      expect(citations[0].year).toBe(2020)
    }
  })

  it("handles Sept. abbreviation", () => {
    const citations = extractCitations("100 F.2d 50 (5th Cir. Sept. 30, 2019)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("5th Cir.")
      expect(citations[0].year).toBe(2019)
    }
  })

  it("handles district court with full date", () => {
    const citations = extractCitations("200 F. Supp. 2d 300 (S.D.N.Y. Dec. 1, 2018)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("S.D.N.Y.")
      expect(citations[0].year).toBe(2018)
    }
  })
})

describe("backward compatibility (QUAL-01)", () => {
  it("normal citations still have numeric page field", () => {
    const citations = extractCitations("500 F.2d 123")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].page).toBe(123)
      expect(typeof citations[0].page).toBe("number")
    }
  })

  it("new optional fields are undefined by default", () => {
    const citations = extractCitations("500 F.2d 123")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].hasBlankPage).toBeUndefined()
      expect(citations[0].fullSpan).toBeUndefined()
      expect(citations[0].caseName).toBeUndefined()
      expect(citations[0].plaintiff).toBeUndefined()
      expect(citations[0].defendant).toBeUndefined()
    }
  })

  it("all v1.0 citation fields still present and typed correctly", () => {
    const citations = extractCitations("410 U.S. 113 (1973)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].volume).toBe(410)
      expect(citations[0].reporter).toBe("U.S.")
      expect(citations[0].page).toBe(113)
      expect(citations[0].year).toBe(1973)
      expect(citations[0].court).toBe("scotus")
      expect(citations[0].text).toBeDefined()
      expect(citations[0].span).toBeDefined()
      expect(citations[0].confidence).toBeGreaterThan(0)
      expect(citations[0].matchedText).toBeDefined()
    }
  })
})

describe("case name extraction (Phase 6)", () => {
  it("extracts standard case name with v.", () => {
    const citations = extractCitations("Smith v. Jones, 500 F.2d 123 (2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].caseName).toBe("Smith v. Jones")
      expect(citations[0].volume).toBe(500)
    }
  })

  it("extracts case name with multi-word parties", () => {
    const citations = extractCitations("United States v. Jones, 500 F.2d 123 (2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].caseName).toBe("United States v. Jones")
    }
  })

  it("extracts procedural prefix: In re", () => {
    const citations = extractCitations("In re Smith, 410 U.S. 113 (1973)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].caseName).toBe("In re Smith")
    }
  })

  it("extracts procedural prefix: Ex parte", () => {
    const citations = extractCitations("Ex parte Young, 209 U.S. 123 (1908)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].caseName).toBe("Ex parte Young")
    }
  })

  it("extracts procedural prefix: Matter of", () => {
    const citations = extractCitations("Matter of ABC, 500 F.2d 123 (2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].caseName).toBe("Matter of ABC")
    }
  })

  it("returns undefined caseName when no case name present", () => {
    const citations = extractCitations("500 F.2d 123 (2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].caseName).toBeUndefined()
    }
  })

  it("handles case name with Inc. and abbreviations", () => {
    const citations = extractCitations("Acme Corp., Inc. v. Doe, 500 F.2d 123 (2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].caseName).toContain("Inc.")
    }
  })

  describe("sentence context trimming (#168, #169)", () => {
    it("trims short sentence context from plaintiff", () => {
      const citations = extractCitations(
        "The court cited Smith v. Jones, 500 F.2d 123 (2020).",
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].caseName).toBe("Smith v. Jones")
        expect(citations[0].plaintiff).toBe("Smith")
      }
    })

    it("trims long sentence context from plaintiff", () => {
      const citations = extractCitations(
        "The Ninth Circuit addressed this issue in Smith v. Jones, 500 F.2d 123 (2020).",
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].caseName).toBe("Smith v. Jones")
        expect(citations[0].plaintiff).toBe("Smith")
      }
    })

    it("trims very long sentence context", () => {
      const citations = extractCitations(
        "As the court explained in its thorough opinion discussing the standard of review in Smith v. Jones, 500 F.2d 123 (2020).",
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].caseName).toBe("Smith v. Jones")
      }
    })

    it("preserves multi-word party names", () => {
      const citations = extractCitations(
        "United States v. Jones, 500 F.2d 123 (2020).",
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].caseName).toBe("United States v. Jones")
        expect(citations[0].plaintiff).toBe("United States")
      }
    })

    it("preserves long party names with connectors", () => {
      const citations = extractCitations(
        "People of the State of New York v. Jones, 500 F.2d 123 (2020).",
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].caseName).toBe("People of the State of New York v. Jones")
        expect(citations[0].plaintiff).toBe("People of the State of New York")
      }
    })

    it("preserves corporate party names with abbreviations", () => {
      const citations = extractCitations(
        "Heart of Atlanta Motel, Inc. v. United States, 500 F.2d 123 (2020).",
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].caseName).toBe(
          "Heart of Atlanta Motel, Inc. v. United States",
        )
      }
    })

    it("preserves signal words for downstream extraction", () => {
      const citations = extractCitations(
        "See also Smith v. Jones, 500 F.3d 100 (9th Cir. 2007).",
      )
      const cite = citations.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case") {
        expect(cite.caseName).toBe("Smith v. Jones")
        expect(cite.signal).toBe("see also")
      }
    })

    it("trims context but preserves signal when both present", () => {
      const citations = extractCitations(
        "See Smith v. Jones, 500 F.2d 123 (2020).",
      )
      const cite = citations.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case") {
        expect(cite.caseName).toBe("Smith v. Jones")
        expect(cite.signal).toBe("see")
      }
    })

    it("preserves party names with numbers", () => {
      const citations = extractCitations(
        "Doe No. 2 v. Smith, 500 F.2d 123 (2020).",
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].caseName).toBe("Doe No. 2 v. Smith")
      }
    })

    it("trims sentence-initial pronouns like 'This'", () => {
      const citations = extractCitations(
        "This landmark decision effectively overruled Plessy v. Ferguson, 163 U.S. 537 (1896).",
      )
      const cite = citations.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case") {
        expect(cite.caseName).toBe("Plessy v. Ferguson")
        expect(cite.plaintiff).toBe("Plessy")
      }
    })

    it("strips 'In' prefix and rebuilds caseName", () => {
      const citations = extractCitations(
        "In Brown v. Board of Education, 347 U.S. 483, 495 (1954), the Court held that segregation was unconstitutional.",
      )
      const cite = citations.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case") {
        expect(cite.caseName).toBe("Brown v. Board of Education")
        expect(cite.plaintiff).toBe("Brown")
        expect(cite.defendant).toBe("Board of Education")
      }
    })

    it("adjusts fullSpan.originalStart after trimming", () => {
      const text =
        "The court cited Smith v. Jones, 500 F.2d 123 (2020)."
      const citations = extractCitations(text)
      const cite = citations.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case" && cite.fullSpan) {
        const highlighted = text.slice(
          cite.fullSpan.originalStart,
          cite.fullSpan.originalEnd,
        )
        expect(highlighted).toMatch(/^Smith v\. Jones/)
        expect(highlighted).not.toMatch(/^The court/)
      }
    })
  })
})

describe("fullSpan calculation (Phase 6)", () => {
  it("fullSpan covers case name through parenthetical", () => {
    const text = "Smith v. Jones, 500 F.2d 123 (2020)"
    const citations = extractCitations(text)
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].fullSpan).toBeDefined()
      expect(citations[0].fullSpan?.originalStart).toBe(0)
      expect(citations[0].fullSpan?.originalEnd).toBe(text.length)
    }
  })

  it("fullSpan includes chained parentheticals", () => {
    const text = "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc)"
    const citations = extractCitations(text)
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].fullSpan).toBeDefined()
      expect(citations[0].fullSpan?.originalEnd).toBe(text.length)
    }
  })

  it("fullSpan undefined when no case name", () => {
    const citations = extractCitations("500 F.2d 123 (2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].fullSpan).toBeUndefined()
    }
  })

  it("existing span unchanged (core only)", () => {
    const text = "Smith v. Jones, 500 F.2d 123 (2020)"
    const citations = extractCitations(text)
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      // span should point only to "500 F.2d 123" portion
      const coreStart = text.indexOf("500")
      const coreEnd = text.indexOf(" (")
      expect(citations[0].span.originalStart).toBe(coreStart)
      expect(citations[0].span.originalEnd).toBe(coreEnd)
      // fullSpan should cover entire citation
      expect(citations[0].fullSpan?.originalStart).toBe(0)
      expect(citations[0].fullSpan?.originalEnd).toBe(text.length)
    }
  })

  it("fullSpan includes subsequent history", () => {
    const text = "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991)"
    const citations = extractCitations(text)
    // Should extract two citations (main + subsequent history)
    expect(citations.length).toBeGreaterThanOrEqual(1)
    // First citation should include subsequent history signal in fullSpan
    if (citations[0].type === "case") {
      expect(citations[0].caseName).toBe("Smith v. Jones")
      // fullSpan should extend past the first citation's parenthetical
      const firstParenEnd =
        text.indexOf(") (") !== -1 ? text.indexOf(")") + 1 : text.indexOf("),") + 1
      expect(citations[0].fullSpan?.originalEnd).toBeGreaterThanOrEqual(firstParenEnd)
    }
  })
})

describe("unified parenthetical parser (Phase 6)", () => {
  it("extracts court and year from standard parenthetical", () => {
    const citations = extractCitations("500 F.2d 100 (9th Cir. 2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("9th Cir.")
      expect(citations[0].year).toBe(2020)
    }
  })

  it("extracts court and full date: abbreviated month", () => {
    const citations = extractCitations("500 F.3d 100 (2d Cir. Jan. 15, 2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("2d Cir.")
      expect(citations[0].year).toBe(2020)
      expect(citations[0].date?.iso).toBe("2020-01-15")
      expect(citations[0].date?.parsed.year).toBe(2020)
      expect(citations[0].date?.parsed.month).toBe(1)
      expect(citations[0].date?.parsed.day).toBe(15)
    }
  })

  it("extracts court and full date: full month name", () => {
    const citations = extractCitations("500 F.3d 100 (D. Mass. January 15, 2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("D. Mass.")
      expect(citations[0].date?.iso).toBe("2020-01-15")
    }
  })

  it("extracts court and full date: numeric format", () => {
    const citations = extractCitations("500 F.3d 100 (D. Mass. 1/15/2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("D. Mass.")
      expect(citations[0].date?.iso).toBe("2020-01-15")
    }
  })

  it("handles year-only parenthetical", () => {
    const citations = extractCitations("500 F.2d 123 (2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].year).toBe(2020)
      expect(citations[0].date?.iso).toBe("2020")
      expect(citations[0].date?.parsed.year).toBe(2020)
    }
  })

  it("handles court-only with year", () => {
    const citations = extractCitations("500 F.2d 123 (9th Cir. 2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("9th Cir.")
      expect(citations[0].year).toBe(2020)
    }
  })

  it("structured date for year-only", () => {
    const citations = extractCitations("410 U.S. 113 (1973)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].date?.parsed.year).toBe(1973)
      expect(citations[0].date?.parsed.month).toBeUndefined()
      expect(citations[0].date?.parsed.day).toBeUndefined()
    }
  })

  it("structured date for full date", () => {
    const citations = extractCitations("500 F.3d 100 (2d Cir. Jan. 15, 2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].date?.parsed.year).toBe(2020)
      expect(citations[0].date?.parsed.month).toBe(1)
      expect(citations[0].date?.parsed.day).toBe(15)
    }
  })
})

describe("disposition extraction (Phase 6)", () => {
  it("extracts en banc from chained paren", () => {
    const citations = extractCitations("500 F.2d 123 (9th Cir. 2020) (en banc)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].disposition).toBe("en banc")
    }
  })

  it("extracts per curiam", () => {
    const citations = extractCitations("500 F.2d 123 (per curiam)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].disposition).toBe("per curiam")
    }
  })

  it("no disposition when not present", () => {
    const citations = extractCitations("500 F.2d 123 (2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].disposition).toBeUndefined()
    }
  })
})

describe("explanatory parentheticals (#76)", () => {
  it("extracts single explanatory parenthetical", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (holding that X requires Y)",
    )
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].parentheticals).toMatchObject([
        { text: "holding that X requires Y", type: "holding" },
      ])
    }
  })

  it("extracts multiple chained explanatory parentheticals", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (holding that X) (citing Doe v. City)",
    )
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].parentheticals).toMatchObject([
        { text: "holding that X", type: "holding" },
        { text: "citing Doe v. City", type: "citing" },
      ])
    }
  })

  it("no parentheticals when only court/year paren present", () => {
    const citations = extractCitations("Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)")
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].parentheticals).toBeUndefined()
    }
  })

  it("classifies each signal word type", () => {
    const signals = [
      "holding",
      "finding",
      "stating",
      "noting",
      "explaining",
      "quoting",
      "citing",
      "discussing",
      "describing",
      "recognizing",
      "applying",
      "rejecting",
      "adopting",
      "requiring",
    ] as const
    for (const signal of signals) {
      const citations = extractCitations(`Smith v. Jones, 500 F.2d 123 (2020) (${signal} that X)`)
      expect(citations).toHaveLength(1)
      expect(citations[0].type).toBe("case")
      if (citations[0].type === "case") {
        expect(citations[0].parentheticals?.[0]?.type).toBe(signal)
      }
    }
  })

  it("classifies unknown signal as other", () => {
    const citations = extractCitations("Smith v. Jones, 500 F.2d 123 (2020) (the court found X)")
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].parentheticals).toMatchObject([{ text: "the court found X", type: "other" }])
    }
  })

  it("disposition paren not treated as explanatory", () => {
    const citations = extractCitations("Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc)")
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].disposition).toBe("en banc")
      expect(citations[0].parentheticals).toBeUndefined()
    }
  })

  it("extracts disposition AND explanatory from mixed chain", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc) (holding that X)",
    )
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].disposition).toBe("en banc")
      expect(citations[0].parentheticals).toMatchObject([{ text: "holding that X", type: "holding" }])
    }
  })

  it("handles nested parens inside explanatory", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2020) (holding that (a) X and (b) Y)",
    )
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].parentheticals?.[0]?.text).toBe("holding that (a) X and (b) Y")
      expect(citations[0].parentheticals?.[0]?.type).toBe("holding")
    }
  })

  it("handles quoted text with parens inside explanatory", () => {
    const citations = extractCitations(
      'Smith v. Jones, 500 F.2d 123 (2020) (quoting "the (original) rule")',
    )
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].parentheticals?.[0]?.text).toBe('quoting "the (original) rule"')
      expect(citations[0].parentheticals?.[0]?.type).toBe("quoting")
    }
  })

  it("handles capitalized signal words", () => {
    const citations = extractCitations("Smith v. Jones, 500 F.2d 123 (2020) (Holding that X)")
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].parentheticals?.[0]?.type).toBe("holding")
    }
  })

  it("extracts court/year from later metadata paren", () => {
    // "(en banc) (9th Cir. 2021)" — second paren has court+year
    const citations = extractCitations("Smith v. Jones, 500 F.2d 123 (en banc) (9th Cir. 2021)")
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].disposition).toBe("en banc")
      expect(citations[0].court).toBe("9th Cir.")
      expect(citations[0].year).toBe(2021)
      expect(citations[0].parentheticals).toBeUndefined()
    }
  })
})

describe("backward compatibility (Phase 6)", () => {
  it("year-only extraction still works", () => {
    const citations = extractCitations("410 U.S. 113 (1973)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].year).toBe(1973)
    }
  })

  it("court extraction still works", () => {
    const citations = extractCitations("500 F.2d 123 (9th Cir. 2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("9th Cir.")
    }
  })

  it("pincite extraction unchanged", () => {
    const citations = extractCitations("500 F.2d 123, 125 (2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].pincite).toBe(125)
    }
  })

  it("scotus inference from reporter unchanged", () => {
    const citations = extractCitations("410 U.S. 113 (1973)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].court).toBe("scotus")
    }
  })

  it("blank page citations still work", () => {
    const citations = extractCitations("500 F.2d ___ (2020)")
    expect(citations).toHaveLength(1)
    if (citations[0].type === "case") {
      expect(citations[0].hasBlankPage).toBe(true)
      expect(citations[0].page).toBeUndefined()
    }
  })

  it("disposition extraction still works via classify", () => {
    const citations = extractCitations("500 F.2d 123 (9th Cir. 2020) (en banc)")
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].disposition).toBe("en banc")
      expect(citations[0].parentheticals).toBeUndefined()
    }
  })

  it("per curiam still extracted from chained paren", () => {
    const citations = extractCitations("500 F.2d 123 (9th Cir. 2020) (per curiam)")
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].disposition).toBe("per curiam")
      expect(citations[0].parentheticals).toBeUndefined()
    }
  })

  it("subsequent history does not break fullSpan", () => {
    const text = "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991)"
    const citations = extractCitations(text)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].fullSpan).toBeDefined()
      // fullSpan covers from case name through the citation's own closing paren
      const closingParenPos = text.indexOf(")") + 1 // end of "(2d Cir. 1990)"
      expect(citations[0].fullSpan?.originalEnd).toBe(closingParenPos)
    }
  })

  it("explanatory parentheticals still work with subsequent history", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2020) (holding that X), aff'd, 501 U.S. 1 (2021)",
    )
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].parentheticals).toMatchObject([{ text: "holding that X", type: "holding" }])
      expect(citations[0].subsequentHistoryEntries).toHaveLength(1)
      expect(citations[0].subsequentHistoryEntries?.[0].signal).toBe("affirmed")
    }
  })

  it("disposition still extracted when followed by history", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (en banc), aff'd, 501 U.S. 1 (2021)",
    )
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].disposition).toBe("en banc")
      expect(citations[0].subsequentHistoryEntries).toHaveLength(1)
    }
  })
})

describe("blank page placeholders (BLANK-01 through BLANK-04)", () => {
  describe("triple underscore placeholder", () => {
    it("should extract federal reporter citation with ___ as blank page", () => {
      const citations = extractCitations("500 F.2d ___")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].volume).toBe(500)
        expect(citations[0].reporter).toBe("F.2d")
        expect(citations[0].page).toBeUndefined()
        expect(citations[0].hasBlankPage).toBe(true)
        expect(citations[0].confidence).toBe(0.5)
      }
    })

    it("should extract supreme court citation with ___ as blank page", () => {
      const citations = extractCitations("410 U.S. ___")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].volume).toBe(410)
        expect(citations[0].reporter).toBe("U.S.")
        expect(citations[0].page).toBeUndefined()
        expect(citations[0].hasBlankPage).toBe(true)
        // 0.2 base + 0.3 reporter + 0.1 court (U.S. → scotus inference) = 0.6
        expect(citations[0].confidence).toBe(0.6)
      }
    })

    it("should extract state reporter citation with ___ as blank page", () => {
      const citations = extractCitations("100 Cal.App.4th ___")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].volume).toBe(100)
        expect(citations[0].reporter).toBe("Cal.App.4th")
        expect(citations[0].page).toBeUndefined()
        expect(citations[0].hasBlankPage).toBe(true)
        expect(citations[0].confidence).toBe(0.5)
      }
    })

    it("should extract citation with ____ (4 underscores) as blank page", () => {
      const citations = extractCitations("410 U.S. ____")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].volume).toBe(410)
        expect(citations[0].reporter).toBe("U.S.")
        expect(citations[0].page).toBeUndefined()
        expect(citations[0].hasBlankPage).toBe(true)
        expect(citations[0].confidence).toBe(0.6)
      }
    })
  })

  describe("triple dash placeholder", () => {
    it("should extract citation with --- as blank page", () => {
      const citations = extractCitations("500 F.2d ---")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].volume).toBe(500)
        expect(citations[0].reporter).toBe("F.2d")
        expect(citations[0].page).toBeUndefined()
        expect(citations[0].hasBlankPage).toBe(true)
        expect(citations[0].confidence).toBe(0.5)
      }
    })

    it("should extract citation with ---- (4 dashes) as blank page", () => {
      const citations = extractCitations("410 U.S. ----")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].volume).toBe(410)
        expect(citations[0].reporter).toBe("U.S.")
        expect(citations[0].page).toBeUndefined()
        expect(citations[0].hasBlankPage).toBe(true)
        expect(citations[0].confidence).toBe(0.6)
      }
    })
  })

  describe("blank page with parenthetical", () => {
    it("should extract blank page citation with year in parenthetical", () => {
      const citations = extractCitations("500 F.2d ___ (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].volume).toBe(500)
        expect(citations[0].reporter).toBe("F.2d")
        expect(citations[0].page).toBeUndefined()
        expect(citations[0].hasBlankPage).toBe(true)
        expect(citations[0].year).toBe(2020)
        expect(citations[0].confidence).toBe(0.7)
      }
    })

    it("should extract blank page citation with court and year", () => {
      const citations = extractCitations("500 F.2d ___ (9th Cir. 2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].volume).toBe(500)
        expect(citations[0].reporter).toBe("F.2d")
        expect(citations[0].page).toBeUndefined()
        expect(citations[0].hasBlankPage).toBe(true)
        expect(citations[0].court).toBe("9th Cir.")
        expect(citations[0].year).toBe(2020)
        expect(citations[0].confidence).toBe(0.8)
      }
    })
  })

  describe("edge cases", () => {
    it("should not match single underscore as blank page", () => {
      const citations = extractCitations("500 F.2d _")
      // Should not match - single underscore is not a valid placeholder
      expect(citations).toHaveLength(0)
    })

    it("should not match single dash as blank page", () => {
      const citations = extractCitations("500 F.2d -")
      // Should not match - single dash is not a valid placeholder
      expect(citations).toHaveLength(0)
    })

    it("should not match double underscore as blank page", () => {
      const citations = extractCitations("500 F.2d __")
      // Should not match - need at least 3 for valid placeholder
      expect(citations).toHaveLength(0)
    })

    it("should not set hasBlankPage for normal numeric page", () => {
      const citations = extractCitations("500 F.2d 123")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].page).toBe(123)
        expect(citations[0].hasBlankPage).toBeUndefined()
        expect(citations[0].confidence).toBeGreaterThanOrEqual(0.5)
      }
    })
  })

  describe("Unicode dash handling (issue #54)", () => {
    it("should parse en-dash pincite range correctly", () => {
      const citations = extractCitations("500 F.3d 100, 105\u2013107 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].year).toBe(2020)
        expect(citations[0].pincite).toBe(105)
        expect(citations[0].pinciteInfo?.endPage).toBe(107)
        expect(citations[0].pinciteInfo?.isRange).toBe(true)
      }
    })

    it("should recognize em-dash as blank page placeholder", () => {
      const citations = extractCitations("500 F.4th \u2014 (2024)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].volume).toBe(500)
        expect(citations[0].reporter).toBe("F.4th")
        expect(citations[0].page).toBeUndefined()
        expect(citations[0].hasBlankPage).toBe(true)
        expect(citations[0].year).toBe(2024)
        expect(citations[0].confidence).toBe(0.7)
      }
    })

    it("should recognize em-dash blank page in Supreme Court citation", () => {
      const citations = extractCitations("600 U.S. \u2014 (2024)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].volume).toBe(600)
        expect(citations[0].reporter).toBe("U.S.")
        expect(citations[0].page).toBeUndefined()
        expect(citations[0].hasBlankPage).toBe(true)
        expect(citations[0].year).toBe(2024)
      }
    })

    it("should recognize em-dash blank page with court and year", () => {
      const citations = extractCitations("500 F.4th \u2014 (9th Cir. 2024)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].hasBlankPage).toBe(true)
        expect(citations[0].court).toBe("9th Cir.")
        expect(citations[0].year).toBe(2024)
      }
    })
  })
})

describe("party name extraction (Phase 7)", () => {
  describe("standard adversarial cases (PARTY-01)", () => {
    it("extracts plaintiff and defendant from simple case name", () => {
      const citations = extractCitations("Smith v. Jones, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiff).toBe("Smith")
        expect(citations[0].defendant).toBe("Jones")
        expect(citations[0].plaintiffNormalized).toBe("smith")
        expect(citations[0].defendantNormalized).toBe("jones")
        expect(citations[0].proceduralPrefix).toBeUndefined()
      }
    })

    it("preserves exact text in raw fields", () => {
      const citations = extractCitations("The Smith Corp., Inc. v. Doe et al., 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiff).toBe("The Smith Corp., Inc.")
        expect(citations[0].defendant).toBe("Doe et al.")
      }
    })

    it("normalizes plaintiff and defendant", () => {
      const citations = extractCitations("The Smith Corp., Inc. v. Doe et al., 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiffNormalized).toBe("smith")
        expect(citations[0].defendantNormalized).toBe("doe")
      }
    })

    it('handles "v" without period', () => {
      const citations = extractCitations("Smith v Jones, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiff).toBe("Smith")
        expect(citations[0].defendant).toBe("Jones")
      }
    })

    it('handles "vs." variant', () => {
      const citations = extractCitations("Smith vs. Jones, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiff).toBe("Smith")
        expect(citations[0].defendant).toBe("Jones")
      }
    })
  })

  describe('multiple "v." handling', () => {
    it('splits on first "v." only', () => {
      const citations = extractCitations("People v. Smith v. Jones, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiff).toBe("People")
        expect(citations[0].defendant).toBe("Smith v. Jones")
      }
    })
  })

  describe("procedural prefixes (PARTY-02)", () => {
    it('extracts "In re" as procedural prefix', () => {
      const citations = extractCitations("In re Smith, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiff).toBe("In re Smith")
        expect(citations[0].plaintiffNormalized).toBe("smith")
        expect(citations[0].defendant).toBeUndefined()
        expect(citations[0].proceduralPrefix).toBe("In re")
      }
    })

    it('extracts "Ex parte" as procedural prefix', () => {
      const citations = extractCitations("Ex parte Jones, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiff).toBe("Ex parte Jones")
        expect(citations[0].plaintiffNormalized).toBe("jones")
        expect(citations[0].defendant).toBeUndefined()
        expect(citations[0].proceduralPrefix).toBe("Ex parte")
      }
    })

    it('extracts "Matter of" as procedural prefix', () => {
      const citations = extractCitations("Matter of Johnson, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiff).toBe("Matter of Johnson")
        expect(citations[0].plaintiffNormalized).toBe("johnson")
        expect(citations[0].defendant).toBeUndefined()
        expect(citations[0].proceduralPrefix).toBe("Matter of")
      }
    })

    it('handles "Estate of" without "v." as procedural', () => {
      const citations = extractCitations("Estate of Smith, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiff).toBe("Estate of Smith")
        expect(citations[0].plaintiffNormalized).toBe("smith")
        expect(citations[0].defendant).toBeUndefined()
        expect(citations[0].proceduralPrefix).toBe("Estate of")
      }
    })

    it('handles "Estate of X v. Y" as adversarial', () => {
      const citations = extractCitations("Estate of Smith v. Jones, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiff).toBe("Estate of Smith")
        expect(citations[0].defendant).toBe("Jones")
        expect(citations[0].proceduralPrefix).toBeUndefined()
      }
    })

    it("handles case-insensitive procedural prefix", () => {
      const citations = extractCitations("IN RE SMITH, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].proceduralPrefix).toBe("IN RE")
        expect(citations[0].plaintiffNormalized).toBe("smith")
      }
    })
  })

  describe("government entity plaintiffs (PARTY-03)", () => {
    it('treats "United States" as plaintiff, not procedural', () => {
      const citations = extractCitations("United States v. Jones, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiff).toBe("United States")
        expect(citations[0].defendant).toBe("Jones")
        expect(citations[0].proceduralPrefix).toBeUndefined()
      }
    })

    it('treats "People" as plaintiff, not procedural', () => {
      const citations = extractCitations("People v. Smith, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiff).toBe("People")
        expect(citations[0].defendant).toBe("Smith")
        expect(citations[0].proceduralPrefix).toBeUndefined()
      }
    })

    it('treats "Commonwealth" as plaintiff', () => {
      const citations = extractCitations("Commonwealth v. Davis, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiff).toBe("Commonwealth")
        expect(citations[0].defendant).toBe("Davis")
      }
    })

    it('treats "State" as plaintiff', () => {
      const citations = extractCitations("State v. Miller, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiff).toBe("State")
        expect(citations[0].defendant).toBe("Miller")
      }
    })
  })

  describe("normalization pipeline", () => {
    it('strips "et al." from defendant', () => {
      const citations = extractCitations("Smith v. Doe et al., 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].defendantNormalized).toBe("doe")
      }
    })

    it('strips "d/b/a" from party name', () => {
      const citations = extractCitations(
        "Smith d/b/a Smith Industries v. Jones, 500 F.2d 123 (2020)",
      )
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiffNormalized).toBe("smith")
      }
    })

    it('strips "aka" from party name', () => {
      const citations = extractCitations("Jones aka Johnson v. Smith, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiffNormalized).toBe("jones")
      }
    })

    describe("slash-alias party-name aliases (#240)", () => {
      // d/b/a, f/k/a, n/k/a, a/k/a are slash-form party-name aliases that appear
      // mid-caption (~96k corpus matches). The full caseName must be preserved
      // verbatim with the alias clause intact; plaintiffNormalized strips it.

      it('preserves "f/k/a" in caseName and strips it in plaintiffNormalized', () => {
        const citations = extractCitations(
          "Acme Corp. f/k/a Beta Inc. v. Jones, 500 F.3d 100 (2d Cir. 2020)",
        )
        expect(citations).toHaveLength(1)
        if (citations[0].type === "case") {
          expect(citations[0].caseName).toBe("Acme Corp. f/k/a Beta Inc. v. Jones")
          expect(citations[0].plaintiff).toBe("Acme Corp. f/k/a Beta Inc.")
          expect(citations[0].plaintiffNormalized).toBe("acme")
        }
      })

      it('preserves "d/b/a" in caseName and strips it in plaintiffNormalized', () => {
        const citations = extractCitations(
          "Smith d/b/a Old Bob's Diner v. Roe, 100 U.S. 1 (2020)",
        )
        expect(citations).toHaveLength(1)
        if (citations[0].type === "case") {
          expect(citations[0].caseName).toBe("Smith d/b/a Old Bob's Diner v. Roe")
          expect(citations[0].plaintiff).toBe("Smith d/b/a Old Bob's Diner")
          expect(citations[0].plaintiffNormalized).toBe("smith")
        }
      })

      it('preserves "n/k/a" in caseName and strips it in plaintiffNormalized', () => {
        const citations = extractCitations(
          "Doe n/k/a Doe-Smith v. State, 200 U.S. 2 (2020)",
        )
        expect(citations).toHaveLength(1)
        if (citations[0].type === "case") {
          expect(citations[0].caseName).toBe("Doe n/k/a Doe-Smith v. State")
          expect(citations[0].plaintiff).toBe("Doe n/k/a Doe-Smith")
          expect(citations[0].plaintiffNormalized).toBe("doe")
        }
      })

      it('preserves "a/k/a" in caseName and strips it in plaintiffNormalized', () => {
        const citations = extractCitations(
          "Acme LLC a/k/a Acme Holdings v. Beta Corp., 300 F.3d 200 (9th Cir. 2020)",
        )
        expect(citations).toHaveLength(1)
        if (citations[0].type === "case") {
          expect(citations[0].caseName).toBe("Acme LLC a/k/a Acme Holdings v. Beta Corp.")
          expect(citations[0].plaintiff).toBe("Acme LLC a/k/a Acme Holdings")
          expect(citations[0].plaintiffNormalized).toBe("acme")
        }
      })
    })

    it('strips leading article "The"', () => {
      const citations = extractCitations("The Ford Motor Co. v. Smith, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiffNormalized).toBe("ford motor")
      }
    })

    it('strips "Inc." corporate suffix', () => {
      const citations = extractCitations("Apple Inc. v. Samsung, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiffNormalized).toBe("apple")
      }
    })

    it('strips "Corp." corporate suffix', () => {
      const citations = extractCitations("Microsoft Corp. v. Google, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiffNormalized).toBe("microsoft")
      }
    })

    it('does not strip government entity "United States"', () => {
      const citations = extractCitations("United States v. Jones, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiffNormalized).toBe("united states")
      }
    })

    it('does not strip government entity "People"', () => {
      const citations = extractCitations("People v. Smith, 500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiffNormalized).toBe("people")
      }
    })
  })

  describe("edge cases", () => {
    it("handles undefined caseName", () => {
      const citations = extractCitations("500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].plaintiff).toBeUndefined()
        expect(citations[0].defendant).toBeUndefined()
        expect(citations[0].plaintiffNormalized).toBeUndefined()
        expect(citations[0].defendantNormalized).toBeUndefined()
        expect(citations[0].proceduralPrefix).toBeUndefined()
      }
    })

    it("handles citation with no case name", () => {
      // When no case name is found in backward search, party fields should be undefined
      const citations = extractCitations("500 F.2d 123 (2020)")
      expect(citations).toHaveLength(1)
      if (citations[0].type === "case") {
        expect(citations[0].caseName).toBeUndefined()
        expect(citations[0].plaintiff).toBeUndefined()
        expect(citations[0].defendant).toBeUndefined()
        expect(citations[0].proceduralPrefix).toBeUndefined()
      }
    })
  })
})

describe("subsequent history signals (#73)", () => {
  it("captures single affirmed signal", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991)",
    )
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].subsequentHistoryEntries).toBeDefined()
      expect(citations[0].subsequentHistoryEntries).toHaveLength(1)
      expect(citations[0].subsequentHistoryEntries?.[0].signal).toBe("affirmed")
      expect(citations[0].subsequentHistoryEntries?.[0].rawSignal).toBe("aff'd")
      expect(citations[0].subsequentHistoryEntries?.[0].order).toBe(0)
    }
  })

  it("captures chained history signals with correct order", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991), cert. denied, 502 U.S. 2 (1992)",
    )
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].subsequentHistoryEntries).toHaveLength(2)
      expect(citations[0].subsequentHistoryEntries?.[0].signal).toBe("affirmed")
      expect(citations[0].subsequentHistoryEntries?.[0].order).toBe(0)
      expect(citations[0].subsequentHistoryEntries?.[1].signal).toBe("cert_denied")
      expect(citations[0].subsequentHistoryEntries?.[1].order).toBe(1)
    }
  })

  it("normalizes signal variants", () => {
    const variants: Array<[string, string]> = [
      ["aff'd", "affirmed"],
      ["affirmed", "affirmed"],
      ["rev'd", "reversed"],
      ["reversed", "reversed"],
      ["cert. denied", "cert_denied"],
      ["cert. den.", "cert_denied"],
      ["certiorari denied", "cert_denied"],
      ["cert. granted", "cert_granted"],
      ["certiorari granted", "cert_granted"],
      ["overruled by", "overruled"],
      ["overruling", "overruled"],
      ["vacated by", "vacated"],
      ["vacated", "vacated"],
      ["remanded", "remanded"],
      ["modified by", "modified"],
      ["modified", "modified"],
      ["abrogated by", "abrogated"],
      ["abrogated", "abrogated"],
      ["superseded by", "superseded"],
      ["superseded", "superseded"],
      ["disapproved of", "disapproved"],
      ["disapproved", "disapproved"],
      ["questioned by", "questioned"],
      ["questioned", "questioned"],
      ["distinguished by", "distinguished"],
      ["distinguished", "distinguished"],
      ["withdrawn", "withdrawn"],
      ["reinstated", "reinstated"],
    ]
    for (const [raw, expected] of variants) {
      const citations = extractCitations(
        `Smith v. Jones, 500 F.2d 123 (2020), ${raw}, 501 U.S. 1 (2021)`,
      )
      expect(citations[0].type).toBe("case")
      if (citations[0].type === "case") {
        expect(citations[0].subsequentHistoryEntries?.[0]?.signal, `signal for "${raw}"`).toBe(
          expected,
        )
      }
    }
  })

  it("no history entries when no signals present", () => {
    const citations = extractCitations("Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)")
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      expect(citations[0].subsequentHistoryEntries).toBeUndefined()
    }
  })

  it("signal span has correct positions", () => {
    const text = "Smith v. Jones, 500 F.2d 123 (2020), aff'd, 501 U.S. 1 (2021)"
    const citations = extractCitations(text)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      const entry = citations[0].subsequentHistoryEntries?.[0]
      expect(entry).toBeDefined()
      const signalText = text.substring(
        entry?.signalSpan.originalStart ?? 0,
        entry?.signalSpan.originalEnd ?? 0,
      )
      expect(signalText).toBe("aff'd")
    }
  })
})

describe("signal word extraction", () => {
  it("captures 'see' signal from case citation", () => {
    const text = "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite?.signal).toBe("see")
  })

  it("captures 'see also' signal", () => {
    const text = "See also Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite?.signal).toBe("see also")
  })

  it("captures 'cf' signal (with period)", () => {
    const text = "Cf. Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite?.signal).toBe("cf")
  })

  it("captures 'but see' signal", () => {
    const text = "But see Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite?.signal).toBe("but see")
  })

  it("captures 'compare' signal", () => {
    const text = "Compare Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite?.signal).toBe("compare")
  })

  it("does not set signal when none present", () => {
    const text = "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case")
    expect(caseCite?.signal).toBeUndefined()
  })

  it("strips signal from plaintiff name", () => {
    const text = "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
    const citations = extractCitations(text)
    const caseCite = citations.find((c) => c.type === "case") as FullCaseCitation | undefined
    expect(caseCite?.plaintiff).toBe("Smith")
    expect(caseCite?.signal).toBe("see")
  })

  describe("combined signals with 'e.g.' (#239)", () => {
    // The `, e.g.,` interjection between a signal and the citation has both
    // an internal comma (after the signal stem) and a trailing comma (before
    // the case name). Without combined-signal support, the case-name backward
    // scanner gets confused — `e.g.,` looks like noise prefix and the signal
    // field stays unset.

    it("captures 'see, e.g.' as the signal", () => {
      const text = "See, e.g., Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)."
      const citations = extractCitations(text)
      const caseCite = citations.find((c) => c.type === "case") as FullCaseCitation | undefined
      expect(caseCite).toBeDefined()
      expect(caseCite?.signal).toBe("see, e.g.")
      expect(caseCite?.plaintiff).toBe("Smith")
      expect(caseCite?.defendant).toBe("Jones")
    })

    it("captures 'but see, e.g.' as the signal", () => {
      const text =
        "But see, e.g., Acme Corp. v. Beta Inc., 100 U.S. 1 (2020)."
      const citations = extractCitations(text)
      const caseCite = citations.find((c) => c.type === "case") as FullCaseCitation | undefined
      expect(caseCite).toBeDefined()
      expect(caseCite?.signal).toBe("but see, e.g.")
      expect(caseCite?.plaintiff).toBe("Acme Corp.")
    })

    it("captures 'see also, e.g.' as the signal", () => {
      const text =
        "See also, e.g., Gamma LLC v. Delta Co., 200 U.S. 2 (2021)."
      const citations = extractCitations(text)
      const caseCite = citations.find((c) => c.type === "case") as FullCaseCitation | undefined
      expect(caseCite).toBeDefined()
      expect(caseCite?.signal).toBe("see also, e.g.")
      expect(caseCite?.plaintiff).toBe("Gamma LLC")
    })

    it("captures 'cf., e.g.' as the signal", () => {
      const text = "Cf., e.g., Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)."
      const citations = extractCitations(text)
      const caseCite = citations.find((c) => c.type === "case") as FullCaseCitation | undefined
      expect(caseCite).toBeDefined()
      expect(caseCite?.signal).toBe("cf., e.g.")
      expect(caseCite?.plaintiff).toBe("Smith")
    })

    it("does not regress bare 'see' for non-combined captions", () => {
      const text = "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)."
      const citations = extractCitations(text)
      const caseCite = citations.find((c) => c.type === "case") as FullCaseCitation | undefined
      expect(caseCite?.signal).toBe("see")
      expect(caseCite?.plaintiff).toBe("Smith")
    })
  })
})

describe("nominative reporter support (#49, #16)", () => {
  describe("extraction — citations with nominative parenthetical", () => {
    it("extracts 67 U.S. (2 Black) 635 (1862)", () => {
      const citations = extractCitations("67 U.S. (2 Black) 635 (1862)")
      expect(citations.length).toBeGreaterThanOrEqual(1)
      const cite = citations[0] as FullCaseCitation
      expect(cite.type).toBe("case")
      expect(cite.volume).toBe(67)
      expect(cite.reporter).toBe("U.S.")
      expect(cite.page).toBe(635)
      expect(cite.year).toBe(1862)
      expect(cite.nominativeVolume).toBe(2)
      expect(cite.nominativeReporter).toBe("Black")
    })

    it("extracts Marbury v. Madison, 5 U.S. (1 Cranch) 137 (1803)", () => {
      const citations = extractCitations(
        "Marbury v. Madison, 5 U.S. (1 Cranch) 137 (1803)",
      )
      expect(citations.length).toBeGreaterThanOrEqual(1)
      const cite = citations[0] as FullCaseCitation
      expect(cite.volume).toBe(5)
      expect(cite.reporter).toBe("U.S.")
      expect(cite.page).toBe(137)
      expect(cite.nominativeVolume).toBe(1)
      expect(cite.nominativeReporter).toBe("Cranch")
      expect(cite.caseName).toContain("Marbury")
    })

    it("extracts multi-digit nominative volume: 60 U.S. (19 How.) 393", () => {
      const citations = extractCitations("60 U.S. (19 How.) 393 (1856)")
      expect(citations.length).toBeGreaterThanOrEqual(1)
      const cite = citations[0] as FullCaseCitation
      expect(cite.volume).toBe(60)
      expect(cite.reporter).toBe("U.S.")
      expect(cite.page).toBe(393)
      expect(cite.nominativeVolume).toBe(19)
      expect(cite.nominativeReporter).toBe("How.")
    })

    it("extracts Wallace reporter: 74 U.S. (7 Wall.) 506 (1868)", () => {
      const citations = extractCitations("74 U.S. (7 Wall.) 506 (1868)")
      expect(citations.length).toBeGreaterThanOrEqual(1)
      const cite = citations[0] as FullCaseCitation
      expect(cite.volume).toBe(74)
      expect(cite.reporter).toBe("U.S.")
      expect(cite.page).toBe(506)
      expect(cite.nominativeVolume).toBe(7)
      expect(cite.nominativeReporter).toBe("Wall.")
    })
  })

  describe("backward compatibility — no nominative fields when absent", () => {
    it("500 U.S. 123 has no nominative fields", () => {
      const citations = extractCitations("500 U.S. 123 (1991)")
      const cite = citations[0] as FullCaseCitation
      expect(cite.volume).toBe(500)
      expect(cite.reporter).toBe("U.S.")
      expect(cite.page).toBe(123)
      expect(cite.nominativeVolume).toBeUndefined()
      expect(cite.nominativeReporter).toBeUndefined()
    })

    it("410 F.2d 999 has no nominative fields", () => {
      const citations = extractCitations("410 F.2d 999 (1969)")
      const cite = citations[0] as FullCaseCitation
      expect(cite.nominativeVolume).toBeUndefined()
      expect(cite.nominativeReporter).toBeUndefined()
    })
  })

  describe("issue regressions (#120-#124)", () => {
    it("#120: fullSpan extends through pincite and closing parenthetical", () => {
      const text =
        "see also Lagasse v. Horton, 982 N.W.2d 189, 199 n.2 (Minn. 2022) (explaining that...)"
      const cite = extractCitations(text).find((c) => c.type === "case") as FullCaseCitation
      expect(cite.fullSpan).toBeDefined()
      const fullText = text.slice(cite.fullSpan!.originalStart, cite.fullSpan!.originalEnd)
      expect(fullText).toContain("(Minn. 2022)")
      expect(fullText).toContain("Lagasse v. Horton")
    })

    it("#122: pincite captured from comma-separated page after core", () => {
      const text = "See United States v. Ashburn, 865 F.3d 997, 999-1000 (8th Cir. 2017)."
      const cite = extractCitations(text).find((c) => c.type === "case") as FullCaseCitation
      expect(cite.pincite).toBe(999)
      expect(cite.pinciteInfo).toMatchObject({ page: 999, endPage: 1000, isRange: true })
    })

    it("#123: (per curiam) captured as disposition", () => {
      const text = "United States v. Cosey, 602 F.3d 943, 948 (8th Cir. 2010) (per curiam)."
      const cite = extractCitations(text).find((c) => c.type === "case") as FullCaseCitation
      expect(cite.disposition).toBe("per curiam")
      expect(cite.court).toBe("8th Cir.")
      expect(cite.year).toBe(2010)
    })

    it("#123: (en banc) captured as disposition", () => {
      const text = "Smith v. Jones, 500 F.3d 100, 110 (9th Cir. 2007) (en banc)."
      const cite = extractCitations(text).find((c) => c.type === "case") as FullCaseCitation
      expect(cite.disposition).toBe("en banc")
    })

    it("#124: signal word not absorbed into caseName", () => {
      const text = "See United States v. Anderson, 618 F.3d 873, 880 (8th Cir. 2010)."
      const cite = extractCitations(text).find((c) => c.type === "case") as FullCaseCitation
      expect(cite.caseName).toBe("United States v. Anderson")
      expect(cite.signal).toBe("see")
      expect(cite.plaintiff).toBe("United States")
    })

    it("#124: see also signal stripped from caseName", () => {
      const text = "See also Smith v. Jones, 500 F.3d 100 (9th Cir. 2007)."
      const cite = extractCitations(text).find((c) => c.type === "case") as FullCaseCitation
      expect(cite.caseName).toBe("Smith v. Jones")
      expect(cite.signal).toBe("see also")
    })

    it("pincite skip does not break when no parenthetical follows", () => {
      const text = "Smith v. Jones, 500 F.2d 123, 125."
      const cite = extractCitations(text).find((c) => c.type === "case") as FullCaseCitation
      // Core citation still extracted correctly even though pincite text
      // precedes end-of-sentence rather than a parenthetical
      expect(cite.volume).toBe(500)
      expect(cite.reporter).toBe("F.2d")
      expect(cite.page).toBe(123)
      expect(cite.year).toBeUndefined()
    })

    it("#124: signal stripped from procedural case with v. (Estate of X v. Y)", () => {
      const text = "See Estate of Smith v. Jones, 500 F.3d 100 (9th Cir. 2007)."
      const cite = extractCitations(text).find((c) => c.type === "case") as FullCaseCitation
      expect(cite.caseName).toBe("Estate of Smith v. Jones")
      expect(cite.signal).toBe("see")
    })

    it("#124: fullSpan excludes signal word after rebuild", () => {
      const text = "See Smith v. Jones, 500 F.3d 100 (9th Cir. 2007)."
      const cite = extractCitations(text).find((c) => c.type === "case") as FullCaseCitation
      expect(cite.fullSpan).toBeDefined()
      const fullText = text.slice(cite.fullSpan!.originalStart, cite.fullSpan!.originalEnd)
      expect(fullText).toContain("Smith v. Jones")
      expect(fullText).not.toMatch(/^See\s/)
    })

    it("#120: multi-pincite skip handles comma-separated pages", () => {
      const text = "Smith v. Jones, 500 F.2d 100, 105, 110 (2d Cir. 1990)."
      const cite = extractCitations(text).find((c) => c.type === "case") as FullCaseCitation
      expect(cite.court).toBe("2d Cir.")
      expect(cite.year).toBe(1990)
    })
  })

  describe("case name boundary bugs (#182, #183, #184)", () => {
    // ── Issue #184: caseName undefined when plaintiff has abbreviation/initials ──

    it("#184: plaintiff with trailing Inc. before v.", () => {
      const text =
        "Men Women N.Y. Model Mgt., Inc. v. Elite Model Mgt. LLC, 183 A.D.3d 501 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBeDefined()
        expect(cite.caseName).toContain("v.")
        expect(cite.caseName).toContain("Elite Model Mgt. LLC")
      }
    })

    it("#184: plaintiff with simpler Inc. before v.", () => {
      const text =
        "Men Women Model Mgt., Inc. v. Elite Model Mgt. LLC, 183 A.D.3d 501 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBeDefined()
        expect(cite.caseName).toContain("v.")
      }
    })

    it("#184: single-letter initials in party names", () => {
      const text = "A. Smith v. B. Jones, 500 F.3d 123 (2d Cir. 2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBeDefined()
        expect(cite.caseName).toBe("A. Smith v. B. Jones")
      }
    })

    // ── Issue #183: case name stops at intra-name abbreviation chains ──

    it("#183: consecutive abbreviations Cent. Sch. Dist.", () => {
      const text =
        "See Alfred-Almond Cent. Sch. Dist. v. NY44 Health Benefits Plan Trust, 2019 NY Slip Op 6303 (4th Dep't 2019)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toContain("Alfred-Almond Cent. Sch. Dist.")
        expect(cite.caseName).toContain("NY44 Health Benefits Plan Trust")
      }
    })

    it("#183: initialism followed by abbreviation (A.N.L.Y.H. Invs.)", () => {
      const text =
        "A.N.L.Y.H. Invs. LP v. JDS Principal Highline LLC, 2024 NY Slip Op 05133 (1st Dep't 2024)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toContain("A.N.L.Y.H. Invs. LP")
        expect(cite.caseName).toContain("JDS Principal Highline LLC")
      }
    })

    // ── Issue #182: case name overshoots across Id. and nested citations ──

    it("#182: does not overshoot across Id. boundary", () => {
      const text =
        "Id. at 19-20 (quoting Northeast Gen. Corp. v. Wellington Adv., 82 N.Y.2d 158, 162 [1993])."
      const cites = extractCitations(text)
      const fullCite = cites.find(
        (c) => c.type === "case" && c.reporter === "N.Y.2d",
      )
      expect(fullCite).toBeDefined()
      if (fullCite?.type === "case") {
        expect(fullCite.caseName).toBe(
          "Northeast Gen. Corp. v. Wellington Adv.",
        )
        expect(fullCite.caseName).not.toContain("Id.")
      }
    })

    it("#182: does not overshoot across (cited in) parenthetical", () => {
      const text =
        "Clark-Fitzpatrick, Inc. v. Long Is. R.R. Co., 70 N.Y.2d 382, 388 (1987) (cited in Polaris Venture Partners VI L.P. v. AD-Venture Capital Partners L.P., 179 A.D.3d 548, 548 (1st Dep't 2020))."
      const cites = extractCitations(text)
      const innerCite = cites.find(
        (c) => c.type === "case" && c.reporter === "A.D.3d",
      )
      expect(innerCite).toBeDefined()
      if (innerCite?.type === "case") {
        expect(innerCite.caseName).toContain("Polaris Venture Partners")
        expect(innerCite.caseName).not.toContain("Co.")
        expect(innerCite.caseName).not.toContain("70 N.Y.2d")
      }
    })

    // ── Additional edge cases from the research ──

    it("handles Corp. Sec. Litig. abbreviation chain", () => {
      const text =
        "In re ABC Corp. Sec. Litig., 500 F. Supp. 2d 100 (S.D.N.Y. 2007)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toContain("ABC Corp. Sec. Litig.")
      }
    })

    it("handles Fed. Sav. Bank abbreviation chain", () => {
      const text = "Smith v. First Fed. Sav. Bank, 500 F.3d 100 (5th Cir. 2007)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Smith v. First Fed. Sav. Bank")
      }
    })

    it("handles Mun. Util. Dist. abbreviation chain", () => {
      const text =
        "Nw. Austin Mun. Util. Dist. No. 1 v. Holder, 557 U.S. 193 (2009)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toContain("Nw. Austin Mun. Util. Dist.")
      }
    })
  })
})

describe("case name boundary bugs (#187, #188)", () => {
  // ── #187: backward scan overshoots into prior citation's (…) parenthetical ──

  describe("#187: paren signal boundaries", () => {
    it("stops at `(quoted in `", () => {
      const text =
        "Prior v. Case, 100 U.S. 1 (2020) (quoted in Target v. Name, 200 U.S. 2 [2000])."
      const cites = extractCitations(text)
      const target = cites.find(
        (c) => c.type === "case" && c.text.includes("200 U.S. 2"),
      )
      expect(target?.type).toBe("case")
      if (target?.type === "case") {
        expect(target.caseName).toBe("Target v. Name")
      }
    })

    it("stops at `(accord `", () => {
      const text =
        "Prior v. Case, 100 U.S. 1 (2020) (accord Target v. Name, 200 U.S. 2 [2000])."
      const cites = extractCitations(text)
      const target = cites.find(
        (c) => c.type === "case" && c.text.includes("200 U.S. 2"),
      )
      expect(target?.type).toBe("case")
      if (target?.type === "case") {
        expect(target.caseName).toBe("Target v. Name")
      }
    })

    it("stops at `(citing, e.g., ` with comma-prefixed e.g.", () => {
      const text =
        "Prior v. Case, 100 U.S. 1 (2020) (citing, e.g., Target v. Name, 200 U.S. 2 [2000])."
      const cites = extractCitations(text)
      const target = cites.find(
        (c) => c.type === "case" && c.text.includes("200 U.S. 2"),
      )
      expect(target?.type).toBe("case")
      if (target?.type === "case") {
        expect(target.caseName).toBe("Target v. Name")
      }
    })
  })

  // ── #188: backward scan returns null for common NY reporter variants ──

  describe("#188: geographic abbreviations in party names", () => {
    it("handles `Long Is.` inside party name (NY2d, Inc. plaintiff)", () => {
      const text =
        "See Clark-Fitzpatrick, Inc. v. Long Is. R.R. Co., 70 NY2d 382, 388 [1987]."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Clark-Fitzpatrick, Inc. v. Long Is. R.R. Co.",
        )
      }
    })

    it("handles `Long Is.` inside `Matter of` proceeding", () => {
      const text =
        "See Matter of Long Is. Power Auth. Hurricane Sandy Litig., 134 A.D.3d 1119, 1120 (2d Dep't 2015)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Matter of Long Is. Power Auth. Hurricane Sandy Litig.",
        )
      }
    })

    it("handles `Mt.` (Mount) in party name", () => {
      const text = "See Mt. Sinai Hosp. v. Jones, 500 F.3d 100 (2d Cir. 2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Mt. Sinai Hosp. v. Jones")
      }
    })

    it("handles `Ft.` (Fort) in party name", () => {
      const text = "See Ft. Worth, Inc. v. Jones, 500 F.3d 100 (5th Cir. 2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Ft. Worth, Inc. v. Jones")
      }
    })

    it("handles `Pt.` (Point) in party name", () => {
      const text =
        "See Smith v. Stony Pt. Realty Corp., 500 F.3d 100 (2d Cir. 2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Smith v. Stony Pt. Realty Corp.")
      }
    })

    it("handles `St.` (Saint/Street) in party name", () => {
      const text =
        "See St. Paul Fire & Marine Ins. Co. v. Jones, 500 F.3d 100 (8th Cir. 2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("St. Paul Fire & Marine Ins. Co. v. Jones")
      }
    })
  })

  // Additional #188 variants the reporter documented as already broken.

  describe("#188: NY reporters without periods", () => {
    it("scans past `NY3d`", () => {
      const text =
        "Dormitory Auth. of the State of N.Y. v. Samson Constr. Co., 30 NY3d 704, 712 [2018]."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Dormitory Auth. of the State of N.Y. v. Samson Constr. Co.",
        )
      }
    })

    it("scans past `NY3d` with short case name", () => {
      const text = "See Cox v. NAP Constr. Co., Inc., 10 NY3d 592, 607 [2008]."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Cox v. NAP Constr. Co., Inc.")
      }
    })

    it("handles party with internal abbreviations + commas", () => {
      const text =
        "See Dembeck v. 220 Cent. Park S., LLC, 33 A.D.3d 491, 492 [1st Dep't 2006]."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Dembeck v. 220 Cent. Park S., LLC")
      }
    })
  })
})

describe("case name boundary bugs (#193)", () => {
  // Single-party corporate / association captions that don't use ` v. ` and
  // aren't matched by the procedural-prefix list. Previously `caseName`
  // came back null; the generic Priority-3 fallback now recognizes them.

  describe("#193: single-party corporate captions", () => {
    it("captures 'Board of Mgrs. of X' (abbreviated)", () => {
      const text =
        "See Board of Mgrs. of the St. Tropez Condominium, 2021 NY Slip Op 00520, at *1."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Board of Mgrs. of the St. Tropez Condominium",
        )
      }
    })

    it("captures 'Board of Managers of X' (spelled out)", () => {
      const text =
        "See Board of Managers of the St. Tropez Condominium, 2021 NY Slip Op 00520, at *1."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Board of Managers of the St. Tropez Condominium",
        )
      }
    })

    it("captures 'Board of Directors of X'", () => {
      const text =
        "See Board of Directors of Hill Park, 2021 NY Slip Op 00520."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Board of Directors of Hill Park")
      }
    })

    it("captures bare corporate caption with 'Corp.' suffix", () => {
      const text = "Acme Widgets Corp., 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Acme Widgets Corp.")
      }
    })
  })

  describe("#193: procedural prefix long form", () => {
    it("prefers 'In the Matter of' over 'Matter of' when present", () => {
      const text =
        "See In the Matter of Long Is. Power Auth. Litig., 2021 NY Slip Op 00520."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "In the Matter of Long Is. Power Auth. Litig.",
        )
      }
    })

    it("still matches 'Matter of X' (short form)", () => {
      const text = "See Matter of Smith, 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Matter of Smith")
      }
    })
  })

  describe("#193: safety — fallback does not fire on sentence prose", () => {
    it("returns null for 'The court held that this is fine. 100 U.S. 1.'", () => {
      const text = "The court held that this is fine. 100 U.S. 1."
      const [cite] = extractCitations(text)
      if (cite?.type === "case") {
        expect(cite.caseName).toBeUndefined()
      }
    })

    it("returns null for 'The argument was strong. 100 U.S. 1.'", () => {
      const text = "The argument was strong. 100 U.S. 1."
      const [cite] = extractCitations(text)
      if (cite?.type === "case") {
        expect(cite.caseName).toBeUndefined()
      }
    })
  })

  describe("#193: control — adversarial captions still work", () => {
    it("'Smith v. Jones' still matches via V. regex", () => {
      const text = "See Smith v. Jones, 2021 NY Slip Op 00520, at *1."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Smith v. Jones")
      }
    })

    it("'People ex rel. Smith v. Jones' still matches via V. regex", () => {
      const text = "See People ex rel. Smith v. Jones, 2021 NY Slip Op 00520."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("People ex rel. Smith v. Jones")
      }
    })

    it("'Estate of X' still matches via procedural prefix", () => {
      const text = "See Estate of Smith, 2021 NY Slip Op 00520, at *1."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Estate of Smith")
      }
    })
  })
})

describe("reporters-db alignment + ampersand support", () => {
  // Follow-up to #193 after aligning CASE_NAME_ABBREVS with
  // freelawproject/reporters-db/case_name_abbreviations.json (Bluebook T6).

  describe("period-form abbreviations (Co./Company etc.)", () => {
    it("handles 'Co.' mid-caption (previously truncated to suffix)", () => {
      const text =
        "Smith & Co. United States Corp., 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Smith & Co. United States Corp.")
      }
    })

    it("handles 'Co.' followed by capital word", () => {
      const text = "Acme Co. International Group, 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Acme Co. International Group")
      }
    })
  })

  describe("apostrophe-form abbreviations (Nat'l, Dep't, Ass'n)", () => {
    it("handles 'Nat'l.' with trailing period mid-caption", () => {
      // Rare but valid form. Without the stem-strip fix, "Nat'l. B" would
      // trigger a sentence boundary because the old stem computation
      // preserved internal apostrophes ("nat'l" not in set).
      const text = "Nat'l. Board Corp., 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Nat'l. Board Corp.")
      }
    })

    it("handles 'Dep't of Health v. Smith' adversarial", () => {
      const text = "Dep't of Health v. Smith, 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Dep't of Health v. Smith")
      }
    })
  })

  describe("ampersand in party names", () => {
    it("captures 'Smith & Jones' (no v.)", () => {
      const text = "Smith & Jones, 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Smith & Jones")
      }
    })

    it("captures 'Goldman, Sachs & Co.' (comma + ampersand)", () => {
      const text = "Goldman, Sachs & Co., 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Goldman, Sachs & Co.")
      }
    })

    it("captures 'Acme & Sons v. Jones' adversarial", () => {
      const text = "See Acme & Sons v. Jones, 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Acme & Sons v. Jones")
      }
    })
  })
})

describe("Cornell § 4-100 / state-practice abbreviations (Tp., Tax'n, Enf't, Rts.)", () => {
  it("handles `Tp.` (NJ Township) in compound party name", () => {
    const text =
      "See Troy Hills Village v. Parsippany-Troy Hills Tp. Council, 68 N.J. 604, 621-22 (1975)."
    const [cite] = extractCitations(text)
    expect(cite.type).toBe("case")
    if (cite.type === "case") {
      expect(cite.caseName).toBe(
        "Troy Hills Village v. Parsippany-Troy Hills Tp. Council",
      )
    }
  })

  it("handles bare `Tp.` (NJ Township) as plaintiff", () => {
    const text = "See Bernards Tp. v. Smith, 100 N.J. 1 (2020)."
    const [cite] = extractCitations(text)
    expect(cite.type).toBe("case")
    if (cite.type === "case") {
      expect(cite.caseName).toBe("Bernards Tp. v. Smith")
    }
  })

  it("handles `Tax'n` (Taxation) in agency party name", () => {
    const text = "See Dep't of Tax'n v. Smith Corp., 100 U.S. 1 (2020)."
    const [cite] = extractCitations(text)
    expect(cite.type).toBe("case")
    if (cite.type === "case") {
      expect(cite.caseName).toBe("Dep't of Tax'n v. Smith Corp.")
    }
  })

  it("handles `Enf't` (Enforcement) in agency party name", () => {
    const text = "See Drug Enf't Admin. v. Smith, 100 U.S. 1 (2020)."
    const [cite] = extractCitations(text)
    expect(cite.type).toBe("case")
    if (cite.type === "case") {
      expect(cite.caseName).toBe("Drug Enf't Admin. v. Smith")
    }
  })

  it("handles `Rts.` (Rights) in organizational party name", () => {
    const text = "See Human Rts. Watch v. Smith, 100 U.S. 1 (2020)."
    const [cite] = extractCitations(text)
    expect(cite.type).toBe("case")
    if (cite.type === "case") {
      expect(cite.caseName).toBe("Human Rts. Watch v. Smith")
    }
  })
})

describe("2026-05-10 jurisdiction-survey abbreviations", () => {
  // Cross-agent jurisdictional canvas; reports in docs/research/2026-05-10-*.
  // Tests cover representative samples from each addition category.

  describe("universal apostrophe-form + Bluebook party designations", () => {
    it("captures `Att'y Gen.` in federal captions (8+ agent consensus)", () => {
      const text =
        "See N.J. Bankers Ass'n v. Att'y Gen. of N.J., 49 F.4th 849 (3d Cir. 2022)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("N.J. Bankers Ass'n v. Att'y Gen. of N.J.")
      }
    })

    it("captures `Att'ys` (plural) in party name", () => {
      const text = "See Smith Att'ys, LLP v. Jones, 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Smith Att'ys, LLP v. Jones")
      }
    })

    it("captures `Pet'r` / `Resp't` (Bluebook 21st BT1.2)", () => {
      const text = "See Smith, Pet'r v. Doe, Resp't, 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Smith, Pet'r v. Doe, Resp't")
      }
    })

    it("captures `Comm'rs` (plural of Comm'r) mid-caption", () => {
      const text =
        "Marrek v. Cleveland Metroparks Bd. of Comm'rs, 9 Ohio St.3d 194 (1984)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Marrek v. Cleveland Metroparks Bd. of Comm'rs",
        )
      }
    })
  })

  describe("plurals of existing singular stems", () => {
    it("captures `Hldgs.` in LLC captions (DE Chancery, NY 1st Dep't)", () => {
      const text =
        "See In re Lost Lake Hldgs. LLC v. Hogue, 100 N.Y.S.3d 1 (3d Dep't 2024)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toContain("Lost Lake Hldgs. LLC")
      }
    })

    it("captures `Props.` (Properties plural)", () => {
      const text = "See Lanvale Props., LLC v. Cnty. of Cabarrus, 366 N.C. 142 (2012)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Lanvale Props., LLC v. Cnty. of Cabarrus",
        )
      }
    })

    it("captures `Sols.` (Solutions plural) in modern LLC captions", () => {
      const text = "See Med-Care Sols., LLC v. Smith, 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Med-Care Sols., LLC v. Smith")
      }
    })

    it("captures `Emps.` (Employees plural) in agency captions", () => {
      const text =
        "See Okla. Pub. Emps. Ret. Sys. v. Smith, 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Okla. Pub. Emps. Ret. Sys. v. Smith",
        )
      }
    })

    it("captures `Corrs.` and `Telecomms.` (plurals)", () => {
      const text =
        "See Ark. Bd. of Corrs. v. BellSouth Telecomms., Inc., 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Ark. Bd. of Corrs. v. BellSouth Telecomms., Inc.",
        )
      }
    })
  })

  describe("standard institutional / agency abbreviations", () => {
    it("captures `Civ.` (Civil) — Ala. Civ. App. and Civ. Rts. Div.", () => {
      const text =
        "See Civ. Rts. Div. v. Smith, 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Civ. Rts. Div. v. Smith")
      }
    })

    it("captures `Lic.` (License) — Bd. of License Comm'rs (R.I.)", () => {
      const text =
        "See Tiverton Bd. of License Comm'rs v. Pastore, 469 U.S. 238 (1985)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Tiverton Bd. of License Comm'rs v. Pastore",
        )
      }
    })

    it("captures `Bur.` (Bureau) and `Insp.` (Inspection)", () => {
      const text =
        "See Bur. of Driver Lic. & Insp. Review v. Smith, 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Bur. of Driver Lic. & Insp. Review v. Smith",
        )
      }
    })

    it("captures `Supers.` (Supervisors) — PA Twp. Bd. of Supers.", () => {
      const text =
        "See Cranberry Twp. Bd. of Supers. v. Smith, 100 Pa. Commw. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Cranberry Twp. Bd. of Supers. v. Smith",
        )
      }
    })

    it("captures `Retire.` (Retirement) — WV consolidated board", () => {
      const text =
        "See W. Va. Consol. Pub. Retire. Bd. v. Smith, 100 W. Va. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "W. Va. Consol. Pub. Retire. Bd. v. Smith",
        )
      }
    })
  })

  describe("regional / state-specific", () => {
    it("captures `Boro.` — NJ long-form alternative to Bor.", () => {
      const text =
        "See Male v. Pompton Lakes Boro. Mun. Util. Auth., 105 N.J. Super. 348 (App. Div. 1969)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Male v. Pompton Lakes Boro. Mun. Util. Auth.",
        )
      }
    })

    it("captures `Vol.` (Volunteer) — PA Vol. Fire Dept.", () => {
      const text =
        "See Univ. Vol. Fire Dept. v. Smith, 100 Pa. Commw. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Univ. Vol. Fire Dept. v. Smith")
      }
    })

    it("captures `Vet.` (Veterans) — Sec'y of Vet. Aff.", () => {
      const text =
        "See Sec'y of Vet. Aff. v. Smith, 100 Vet. App. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Sec'y of Vet. Aff. v. Smith")
      }
    })

    it("captures `Irrig.` (Irrigation) in water-rights captions", () => {
      const text =
        "See Pioneer Irrig. Dist. v. Smith, 100 Idaho 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Pioneer Irrig. Dist. v. Smith")
      }
    })
  })

  describe("Bluebook 21st ed. (2020) T6/T13.2 merger", () => {
    it("captures `Lab'y` (Laboratory) — distinct from existing Lab. (Labor)", () => {
      const text =
        "See Smith Lab'y, Inc. v. Jones, 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Smith Lab'y, Inc. v. Jones")
      }
    })

    it("captures `Pol'y` (Policy) and `Stud.` (Studies)", () => {
      const text =
        "See Ctr. for Health Pol'y & Stud. v. Smith, 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Ctr. for Health Pol'y & Stud. v. Smith",
        )
      }
    })

    it("captures `Refin.` (Refining) — distinct from existing Ref. (Referee)", () => {
      const text = "See Acme Refin. Corp. v. Smith, 100 U.S. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe("Acme Refin. Corp. v. Smith")
      }
    })
  })

  describe("Plains + Upper Midwest (NE apostrophe-dropping, ND insurance)", () => {
    it("captures `Comrs.` — NE Bd. of Comrs. (single-m, no apostrophe)", () => {
      const text =
        "See Cherry Cty. Bd. of Comrs. v. Smith, 100 Neb. 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Cherry Cty. Bd. of Comrs. v. Smith",
        )
      }
    })

    it("captures `Reins.` (Reinsurance) in insurance captions", () => {
      const text =
        "See Grinnell Mut. Reins. Co. v. Farm & City Ins. Co., 100 N.W.2d 1 (2020)."
      const [cite] = extractCitations(text)
      expect(cite.type).toBe("case")
      if (cite.type === "case") {
        expect(cite.caseName).toBe(
          "Grinnell Mut. Reins. Co. v. Farm & City Ins. Co.",
        )
      }
    })
  })
})

describe("phantom-citation suppression (#196)", () => {
  // Numeric-prefixed party names like "15 Union Sq. W. Condominium v. BCRE 15"
  // used to emit a phantom state-reporter citation because the non-greedy
  // reporter capture happily spanned the " v. " case-name separator and
  // backtracked until a second number appeared. Negative lookahead for
  // " v. " / " vs. " blocks this at tokenization.

  it("does not emit a phantom from numeric-prefixed party name with v.", () => {
    const text = `Board of Mgrs. of the 15 Union Sq. W. Condominium v. BCRE 15 Union St., LLC, 2025 NY Slip Op 00784 (1st Dep't 2025).`
    const cits = extractCitations(text)
    const cases = cits.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    expect(cases[0].text).toBe("2025 NY Slip Op 00784")
  })

  it("does not emit a phantom with 'vs.' form", () => {
    const text = `See 10 Smith vs. Jones 10 Corp., 2025 NY Slip Op 00784.`
    const cits = extractCitations(text)
    const cases = cits.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    expect(cases[0].text).toBe("2025 NY Slip Op 00784")
  })

  it("does not mis-classify phantom as a law-review journal", () => {
    // The phantom moved to the `journal` type before both patterns were
    // guarded. Regression guard: check no journal type is emitted here.
    const text = `Board of Mgrs. of the 15 Union Sq. W. Condominium v. BCRE 15 Union St., LLC, 2025 NY Slip Op 00784.`
    const cits = extractCitations(text)
    expect(cits.some((c) => c.type === "journal")).toBe(false)
  })

  describe("controls — real citations adjacent to a v. still work", () => {
    it("'Smith v. Jones, 100 U.S. 1' extracts the core cite", () => {
      const text = "Smith v. Jones, 100 U.S. 1 (2020)."
      const cits = extractCitations(text)
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      expect(cases[0].text).toBe("100 U.S. 1")
    })

    it("two adjacent v.-joined cites both extract", () => {
      const text =
        "Smith v. Jones, 100 F.3d 456 (2d Cir. 2020); see also Doe v. Roe, 200 F.3d 789 (9th Cir. 2021)."
      const cits = extractCitations(text)
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(2)
    })
  })
})

describe("case name scanback cluster (#221, #222, #223, #224)", () => {
  describe("#221: paragraph boundaries halt the scanback", () => {
    it("does not cross a \\n\\n paragraph break above the case name", () => {
      const text = `B. Comparative Fault and Contributory Negligence

California adopted comparative fault in Li v. Yellow Cab Co., 13 Cal.3d 804, 813 (1975).`
      const cits = extractCitations(text)
      const cite = cits.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case") {
        expect(cite.caseName).toBe("Li v. Yellow Cab Co.")
      }
    })

    it("does not cross a paragraph break above an ALL-CAPS heading", () => {
      const text = `INTENTIONAL INFLICTION OF EMOTIONAL DISTRESS

New York first recognized IIED as a cognizable cause of action in Fischer v. Maloney, 43 N.Y.2d 553, 557 (1978).`
      const cits = extractCitations(text)
      const cite = cits.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case") {
        expect(cite.caseName).toBe("Fischer v. Maloney")
      }
    })
  })

  describe("#222: consolidated captions do not produce multi-segment caseName", () => {
    it("returns a single-segment caption when multiple v.-anchors precede the cite", () => {
      const text = `In Matter of New York City Asbestos Litigation, Doris Kay Dummitt v. A.W. Chesterton, Matter of Eighth Judicial District Asbestos Litigation, Joann H. Suttner v. A.W. Chesterton Company, 27 N.Y.3d 765, 787 (2016), the court held that successor-liability principles apply.`
      const cits = extractCitations(text)
      const cite = cits.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case") {
        // Acceptable canonical caption: either the leading "Matter of …" segment
        // or the first "X v. Y" segment. The invariant is that the second/third
        // segments must NOT be concatenated in.
        expect(cite.caseName).not.toMatch(/Joann H\. Suttner/)
        expect(cite.caseName).not.toMatch(/, Matter of Eighth/)
      }
    })
  })

  describe("#223: lead-in clauses are trimmed off the plaintiff", () => {
    it("trims 'Under the controlling authority of the Court of Appeals in'", () => {
      const text = `Under the controlling authority of the Court of Appeals in Dormitory Auth. of the State of N.Y. v. Samson Constr. Co., 30 N.Y.3d 704, 708 (2018), the rule is settled.`
      const cits = extractCitations(text)
      const cite = cits.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case") {
        expect(cite.caseName).toBe("Dormitory Auth. of the State of N.Y. v. Samson Constr. Co.")
      }
    })

    it("trims 'As the Supreme Court emphasized in'", () => {
      const text = `As the Supreme Court emphasized in Bell Atlantic Corp. v. Twombly, 550 U.S. 544, 570 (2007), pleading must be plausible.`
      const cits = extractCitations(text)
      const cite = cits.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case") {
        expect(cite.caseName).toBe("Bell Atlantic Corp. v. Twombly")
      }
    })

    it("trims 'Pursuant to the rule announced in'", () => {
      const text = `Pursuant to the rule announced in Mathews v. Eldridge, 424 U.S. 319, 335 (1976), three factors apply.`
      const cits = extractCitations(text)
      const cite = cits.find((c) => c.type === "case")
      expect(cite).toBeDefined()
      if (cite?.type === "case") {
        expect(cite.caseName).toBe("Mathews v. Eldridge")
      }
    })
  })

  describe("#224: subsequent-history chains share a caseName", () => {
    it("'modified on other grounds' chain — both cites share the original caseName", () => {
      const text = `The court applied Corsello v. Verizon N.Y., Inc., 77 A.D.3d 344, 368 (2d Dep't 2010), modified on other grounds, 18 N.Y.3d 777 (2012), to find the claim time-barred.`
      const cits = extractCitations(text)
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(2)
      if (cases[0]?.type === "case") {
        expect(cases[0].caseName).toBe("Corsello v. Verizon N.Y., Inc.")
      }
      if (cases[1]?.type === "case") {
        expect(cases[1].caseName).toBe("Corsello v. Verizon N.Y., Inc.")
      }
    })

    it("'aff'd' chain — both cites share the original caseName", () => {
      const text = `The Court relied on Smith v. Doe, 100 F.3d 200, 205 (2d Cir. 1996), aff'd, 200 F.3d 300 (2d Cir. 1997), to reach this result.`
      const cits = extractCitations(text)
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(2)
      if (cases[0]?.type === "case") {
        expect(cases[0].caseName).toBe("Smith v. Doe")
      }
      if (cases[1]?.type === "case") {
        expect(cases[1].caseName).toBe("Smith v. Doe")
      }
    })
  })
})

describe("California research Tier 1 additions (2026-05-11)", () => {
  // Six-agent CA research dispatch identified Tier 1 mechanical additions:
  // - Conservatorship extended forms (Person of / Estate of / Person and Estate of)
  // - In re Conservatorship/Guardianship/Adoption of (precision upgrades)
  // - Inquiry Concerning Judge (CJP discipline captions)
  // - Appeal of (OTA/BOE tax appeals)
  // - (in bank) disposition (CA Supreme Court en-banc equivalent)
  // - Depublication signals (ordered not pub., nonpub. opn., not for publication)
  // - Additional CA history: petition for review filed/granted/denied,
  //   superseded by grant of review, as modified on denial of rehearing

  describe("Conservatorship extended forms", () => {
    it("captures 'Conservatorship of the Person of O.B.' (Cal.5th)", () => {
      const cits = extractCitations(
        "See Conservatorship of the Person of O.B., 9 Cal.5th 989 (Cal. 2020).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Conservatorship of the Person of O.B.")
        expect(cases[0].proceduralPrefix).toBe("Conservatorship of the Person of")
      }
    })

    it("captures 'Conservatorship of the Estate of Smith'", () => {
      const cits = extractCitations(
        "See Conservatorship of the Estate of Smith, 100 Cal.4th 1 (Cal. 2010).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].proceduralPrefix).toBe("Conservatorship of the Estate of")
      }
    })

    it("captures 'Conservatorship of the Person and Estate of Jones' (longest first)", () => {
      const cits = extractCitations(
        "See Conservatorship of the Person and Estate of Jones, 50 Cal.App.5th 100 (Cal. Ct. App. 2020).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].proceduralPrefix).toBe(
          "Conservatorship of the Person and Estate of",
        )
      }
    })
  })

  describe("In re explicit-prefix forms (precision upgrades)", () => {
    it("captures 'In re Conservatorship of Wendland' as proceduralPrefix='In re Conservatorship of'", () => {
      const cits = extractCitations(
        "See In re Conservatorship of Wendland, 26 Cal.4th 519 (Cal. 2001).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].proceduralPrefix).toBe("In re Conservatorship of")
      }
    })

    it("captures 'In re Guardianship of Saul H.'", () => {
      const cits = extractCitations(
        "See In re Guardianship of Saul H., 13 Cal.5th 827 (Cal. 2022).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].proceduralPrefix).toBe("In re Guardianship of")
      }
    })

    it("captures 'In re Adoption of Kelsey S.'", () => {
      const cits = extractCitations(
        "See In re Adoption of Kelsey S., 1 Cal.4th 816 (Cal. 1992).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].proceduralPrefix).toBe("In re Adoption of")
      }
    })
  })

  describe("Inquiry Concerning Judge (CJP discipline)", () => {
    it("captures 'Inquiry Concerning Judge Saucedo'", () => {
      const cits = extractCitations(
        "See Inquiry Concerning Judge Saucedo, 2 Cal. 4th CJP Supp. 33 (1997).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        expect(cases[0].proceduralPrefix).toBe("Inquiry Concerning Judge")
      }
    })
  })

  describe("Appeal of (OTA/BOE tax appeals)", () => {
    it("captures 'Appeal of Jali, LLC'", () => {
      const cits = extractCitations(
        "See Appeal of Jali, LLC, 100 Cal.App.5th 1 (Cal. Ct. App. 2024).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].proceduralPrefix).toBe("Appeal of")
      }
    })
  })

  describe("(in bank) disposition", () => {
    it("captures '(in bank)' as disposition='in bank'", () => {
      const cits = extractCitations(
        "Smith v. Jones, 50 Cal.3d 100 (Cal. 1990) (in bank).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].disposition).toBe("in bank")
      }
    })
  })

  describe("CA history signals — depublication + petition for review", () => {
    it("captures 'ordered not pub.' as not_published", () => {
      const cits = extractCitations(
        "Smith v. Jones, 50 Cal.App.5th 100 (Cal. Ct. App. 2020), ordered not pub.",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        expect(cases[0].subsequentHistoryEntries?.[0]?.signal).toBe("not_published")
      }
    })

    it("captures 'nonpub. opn.' as not_published", () => {
      const cits = extractCitations(
        "Smith v. Jones, 50 Cal.App.5th 100 (Cal. Ct. App. 2020), nonpub. opn.",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        expect(cases[0].subsequentHistoryEntries?.[0]?.signal).toBe("not_published")
      }
    })

    it("captures 'petition for review filed'", () => {
      const cits = extractCitations(
        "Smith v. Jones, 50 Cal.App.5th 100 (Cal. Ct. App. 2024), petition for review filed.",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        expect(cases[0].subsequentHistoryEntries?.[0]?.signal).toBe("petition_for_review_filed")
      }
    })

    it("captures 'superseded by grant of review' (pre-2019 form)", () => {
      const cits = extractCitations(
        "Smith v. Jones, 50 Cal.App.5th 100 (Cal. Ct. App. 2018), superseded by grant of review.",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        expect(cases[0].subsequentHistoryEntries?.[0]?.signal).toBe(
          "superseded_by_grant_of_review",
        )
      }
    })

    it("captures 'as modified on denial of rehearing'", () => {
      const cits = extractCitations(
        "Smith v. Jones, 50 Cal.3d 100 (Cal. 1990), as modified on denial of rehearing.",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        expect(cases[0].subsequentHistoryEntries?.[0]?.signal).toBe(
          "modified_on_denial_of_rehearing",
        )
      }
    })
  })

  describe("regression — existing CA fixes still work", () => {
    it("'(en banc)' still maps to disposition='en banc' (not 'in bank')", () => {
      const cits = extractCitations("Smith v. Jones, 100 F.3d 200 (9th Cir. 2020) (en banc).")
      const cases = cits.filter((c) => c.type === "case")
      if (cases[0].type === "case") {
        expect(cases[0].disposition).toBe("en banc")
      }
    })

    it("review denied (from #238) still maps to review_denied", () => {
      const cits = extractCitations(
        "Smith v. Jones, 50 Cal.3d 100 (Cal. 1990), review denied.",
      )
      const cases = cits.filter((c) => c.type === "case")
      if (cases[0].type === "case") {
        expect(cases[0].subsequentHistoryEntries?.[0]?.signal).toBe("review_denied")
      }
    })
  })
})

describe("California bracketed parallel citations (#237)", () => {
  // California Style Manual uses `[<vol> <Reporter> <page>]` brackets for
  // parallel reporter citations, e.g.,
  //   People v. Smith, 50 Cal.3d 100 (Cal. 1990) [266 Cal.Rptr. 569]
  // Pre-fix the bracketed cite was tokenized as a journal (wrong type) or
  // missed entirely. After fix: the bracketed cite extracts as a `case`
  // citation and is linked as a parallel to the preceding primary.

  describe("bracketed cite extraction", () => {
    it("extracts '[266 Cal.Rptr. 569]' as a case citation (Bluebook-form leading cite)", () => {
      const cits = extractCitations(
        "Smith v. Jones, 50 Cal.3d 100 (Cal. 1990) [266 Cal.Rptr. 569]",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(2)
      const bracketed = cases.find((c) => c.type === "case" && c.reporter === "Cal.Rptr.")
      expect(bracketed).toBeDefined()
      if (bracketed?.type === "case") {
        expect(bracketed.volume).toBe(266)
        expect(bracketed.page).toBe(569)
      }
    })

    it("extracts '[54 Cal.Rptr.2d 370]' (no pincite) as case", () => {
      const cits = extractCitations(
        "Smith v. Williams, 65 Cal.2d 263, 265 (Cal. 1966) [54 Cal.Rptr.2d 370]",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(2)
      const bracketed = cases.find(
        (c) => c.type === "case" && c.reporter === "Cal.Rptr.2d",
      )
      expect(bracketed).toBeDefined()
    })

    it("extracts bracketed cite with pincite '[266 Cal.Rptr. 569, 575]'", () => {
      const cits = extractCitations(
        "Smith v. Jones, 50 Cal.3d 100, 115 (Cal. 1990) [266 Cal.Rptr. 569, 575]",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(2)
      const bracketed = cases.find((c) => c.type === "case" && c.reporter === "Cal.Rptr.")
      expect(bracketed).toBeDefined()
      if (bracketed?.type === "case") {
        expect(bracketed.pincite).toBe(575)
      }
    })

    it("extracts '[100 P.3d 1]' (Cal.4th + P.3d parallel)", () => {
      const cits = extractCitations(
        "Doe v. Roe, 1 Cal.4th 50 (Cal. 2010) [100 P.3d 1]",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(2)
      const bracketed = cases.find((c) => c.type === "case" && c.reporter === "P.3d")
      expect(bracketed).toBeDefined()
    })
  })

  describe("parallel linking", () => {
    it("links primary 'Cal.3d' with bracketed 'Cal.Rptr.' via parallelCitations", () => {
      const cits = extractCitations(
        "Smith v. Jones, 50 Cal.3d 100 (Cal. 1990) [266 Cal.Rptr. 569]",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(2)
      // Both citations should share a groupId set by parallel detection
      const primary = cases.find((c) => c.type === "case" && c.reporter === "Cal.3d")
      const secondary = cases.find((c) => c.type === "case" && c.reporter === "Cal.Rptr.")
      expect(primary?.groupId).toBeDefined()
      expect(secondary?.groupId).toBeDefined()
      expect(primary?.groupId).toBe(secondary?.groupId)
    })
  })

  describe("regression — non-CA-bracket forms unaffected", () => {
    it("NY Slip Op '[U]' unpublished marker is NOT treated as a bracket parallel", () => {
      const cits = extractCitations("2024 NY Slip Op 51192[U]")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].unpublished).toBe(true)
      }
    })

    it("non-bracketed Cal.Rptr. parallel still works (comma-separated)", () => {
      const cits = extractCitations(
        "Smith v. Jones, 50 Cal.3d 100, 266 Cal.Rptr. 569 (Cal. 1990)",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(2)
    })
  })
})

describe("bankruptcy adversary admin parenthetical (#241)", () => {
  // In bankruptcy adversary proceedings, the case caption includes an
  // administrative parenthetical naming the underlying debtor:
  //   Spence v. Hintze (In re Hintze), 570 B.R. 369 (Bankr. D. Mass. 2017)
  // The `(In re Hintze)` is part of the case name, not an explanatory paren.
  // Acceptance criteria: caseName preserves the clause, fullSpan covers it.
  // Cleanup: defendant strips the admin paren; new adminParenthetical field.

  describe("acceptance criteria (already satisfied — regression tests)", () => {
    it("'Spence v. Hintze (In re Hintze), 570 B.R. 369 (...)' — caseName preserves admin paren", () => {
      const cits = extractCitations(
        "Spence v. Hintze (In re Hintze), 570 B.R. 369 (Bankr. D. Mass. 2017)",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Spence v. Hintze (In re Hintze)")
        expect(cases[0].court).toBe("Bankr. D. Mass.")
        expect(cases[0].year).toBe(2017)
        // fullSpan must cover the entire caption-plus-parenthetical text
        expect(cases[0].fullSpan?.originalStart).toBe(0)
      }
    })

    it("no regression in explanatory parens after citation core", () => {
      const cits = extractCitations(
        "Smith v. Jones, 100 F.3d 200 (9th Cir. 2020) (holding that X requires Y)",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Smith v. Jones")
        expect(cases[0].parentheticals?.[0]?.text).toMatch(/holding that X/)
      }
    })
  })

  describe("defendant cleanup + adminParenthetical field", () => {
    it("strips '(In re Hintze)' from defendant; exposes via adminParenthetical", () => {
      const cits = extractCitations(
        "Spence v. Hintze (In re Hintze), 570 B.R. 369 (Bankr. D. Mass. 2017)",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].defendant).toBe("Hintze")
        expect(cases[0].defendantNormalized).toBe("hintze")
        expect(cases[0].adminParenthetical).toBe("In re Hintze")
      }
    })

    it("handles compound debtor name '(In re Roe Corp.)'", () => {
      const cits = extractCitations(
        "Doe v. Roe (In re Roe Corp.), 250 B.R. 50 (Bankr. S.D.N.Y. 2018)",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].defendant).toBe("Roe")
        expect(cases[0].adminParenthetical).toBe("In re Roe Corp.")
      }
    })

    it("handles hyphenated debtor name '(In re Jones-Smith Estate)'", () => {
      const cits = extractCitations(
        "Trustee v. Jones-Smith (In re Jones-Smith Estate), 300 B.R. 100 (Bankr. D. Del. 2019)",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].defendant).toBe("Jones-Smith")
        expect(cases[0].adminParenthetical).toBe("In re Jones-Smith Estate")
      }
    })
  })

  describe("regression — non-bankruptcy parens don't trigger adminParenthetical", () => {
    it("'Smith v. Jones' without admin paren — adminParenthetical is undefined", () => {
      const cits = extractCitations("Smith v. Jones, 100 F.3d 200 (9th Cir. 2020)")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].adminParenthetical).toBeUndefined()
        expect(cases[0].defendant).toBe("Jones")
      }
    })

    it("non-(In re) paren after defendant doesn't trigger admin-paren treatment", () => {
      // Hypothetical (rare but plausible): "X v. Y (publisher)" — not adversary
      const cits = extractCitations("Smith v. Jones (publisher), 100 F.3d 200 (9th Cir. 2020)")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].adminParenthetical).toBeUndefined()
      }
    })
  })
})

describe("justice-attribution parentheticals (#235)", () => {
  // Justice-attribution form: `(Brennan, J., dissenting)` and variants.
  // The parser now extracts structured fields: `disposition` (dissent /
  // concurrence / mixed / majority / plurality opinion / etc.), `justices[]`
  // (surnames), and optional `scope` (in_judgment / in_part / from_denial).
  // Existing `(en banc)` / `(per curiam)` disposition handling is preserved.

  describe("single-justice attribution", () => {
    it("captures 'Brennan, J., dissenting' as disposition=dissent + justice", () => {
      const cits = extractCitations(
        "Smith v. Jones, 410 U.S. 113, 130 (1973) (Brennan, J., dissenting).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].disposition).toBe("dissent")
        expect(cases[0].justices).toEqual(["Brennan"])
      }
    })

    it("captures 'Roberts, C.J., concurring' as disposition=concurrence", () => {
      const cits = extractCitations(
        "Smith v. Jones, 410 U.S. 113 (1973) (Roberts, C.J., concurring).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].disposition).toBe("concurrence")
        expect(cases[0].justices).toEqual(["Roberts"])
      }
    })
  })

  describe("scope qualifiers", () => {
    it("captures 'Kennedy, J., concurring in the judgment' with scope=in_judgment", () => {
      const cits = extractCitations(
        "Doe v. Roe, 500 U.S. 200, 215 (1991) (Kennedy, J., concurring in the judgment).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].disposition).toBe("concurrence")
        expect(cases[0].justices).toEqual(["Kennedy"])
        expect(cases[0].scope).toBe("in_judgment")
      }
    })

    it("captures 'Roberts, C.J., concurring in part and dissenting in part' with disposition=mixed", () => {
      const cits = extractCitations(
        "United States v. Smith, 600 U.S. 1, 50 (2023) (Roberts, C.J., concurring in part and dissenting in part).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].disposition).toBe("mixed")
        expect(cases[0].justices).toEqual(["Roberts"])
        expect(cases[0].scope).toBe("in_part")
      }
    })

    it("captures 'Cabranes, J., dissenting from denial of rehearing en banc' with scope=from_denial — no en banc false positive", () => {
      const cits = extractCitations(
        "Acme Corp. v. Beta, 100 F.3d 1, 25 (2d Cir. 2020) (Cabranes, J., dissenting from denial of rehearing en banc).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].disposition).toBe("dissent")
        expect(cases[0].justices).toEqual(["Cabranes"])
        expect(cases[0].scope).toBe("from_denial")
      }
    })
  })

  describe("non-justice disposition parens", () => {
    it("captures '(plurality opinion)' as disposition=plurality opinion", () => {
      const cits = extractCitations("Smith v. Jones, 100 U.S. 1 (1990) (plurality opinion).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].disposition).toBe("plurality opinion")
      }
    })

    it("captures '(mem.)' as disposition=mem.", () => {
      const cits = extractCitations("Smith v. Jones, 100 U.S. 1 (1990) (mem.).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].disposition).toBe("mem.")
      }
    })
  })

  describe("regression — en banc / per curiam still work", () => {
    it("captures '(en banc)' as disposition=en banc", () => {
      const cits = extractCitations("Smith v. Jones, 100 U.S. 1 (1990) (en banc).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].disposition).toBe("en banc")
        expect(cases[0].justices).toBeUndefined()
      }
    })

    it("captures '(per curiam)' as disposition=per curiam", () => {
      const cits = extractCitations("Smith v. Jones, 100 U.S. 1 (1990) (per curiam).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].disposition).toBe("per curiam")
      }
    })
  })
})

describe("NY Slip Op (U)/[U] unpublished markers (#231)", () => {
  // New York Slip Opinion citations carry a trailing `(U)` (older form) or
  // `[U]` (newer form) marker immediately after the document number to flag
  // an unpublished disposition. Pre-fix, the parser misread `(U)` as a court
  // parenthetical and set `court = "U"`. These tests pin down the fix:
  // the marker is consumed and exposed via `unpublished: true`, and a
  // following real court paren (e.g., `(Sup. Ct. 2007)`) is still captured.

  describe("bare (U) suffix", () => {
    it("recognizes '52377(U)' as unpublished, court is not 'U'", () => {
      const cits = extractCitations("2007 N.Y. Slip Op. 52377(U)")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].page).toBe(52377)
        expect(cases[0].unpublished).toBe(true)
        // The (U) must not pollute the court field
        expect(cases[0].court).not.toBe("U")
      }
    })

    it("recognizes '64325(U)' as unpublished", () => {
      const cits = extractCitations("2024 NY Slip Op 64325(U)")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].page).toBe(64325)
        expect(cases[0].unpublished).toBe(true)
      }
    })
  })

  describe("bracket [U] suffix (newer form)", () => {
    it("recognizes '51192[U]' as unpublished", () => {
      const cits = extractCitations("2024 NY Slip Op 51192[U]")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].page).toBe(51192)
        expect(cases[0].unpublished).toBe(true)
      }
    })
  })

  describe("with following real court parenthetical", () => {
    it("captures '52377(U) ... (Sup. Ct. 2007)' — court is 'Sup. Ct.', not 'U'", () => {
      const cits = extractCitations(
        "Pickard v. Tarnow, 2007 N.Y. Slip Op. 52377(U) (Sup. Ct. 2007)",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].page).toBe(52377)
        expect(cases[0].unpublished).toBe(true)
        expect(cases[0].court).toBe("Sup. Ct.")
        expect(cases[0].year).toBe(2007)
      }
    })

    it("captures case name preceding (U)-suffixed Slip Op", () => {
      const cits = extractCitations(
        "Doe v. Roe, 2024 NY Slip Op 51192[U] (Sup. Ct. 2024)",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].unpublished).toBe(true)
        expect(cases[0].caseName).toBe("Doe v. Roe")
      }
    })
  })

  describe("regression — non-(U) Slip Op still extracts normally", () => {
    it("'2020 NY Slip Op 12345' without (U) — unpublished is undefined/false", () => {
      const cits = extractCitations("Smith v. Jones, 2020 NY Slip Op 12345 (Sup. Ct. 2020)")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].page).toBe(12345)
        expect(cases[0].unpublished).toBeFalsy()
        expect(cases[0].court).toBe("Sup. Ct.")
      }
    })

    it("'500 F.3d 123 (9th Cir. 2020)' — normal federal cite unaffected", () => {
      const cits = extractCitations("Smith v. Jones, 500 F.3d 123 (9th Cir. 2020)")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].unpublished).toBeFalsy()
        expect(cases[0].court).toBe("9th Cir.")
      }
    })
  })
})

describe("California review history signals (#238)", () => {
  // California Supreme Court history uses "review denied" / "review granted"
  // / "opinion vacated" / "disapproved on other grounds" — signals distinct
  // from federal cert. denied/granted. The current SIGNAL_TABLE has no
  // entries for these, so the after-citation history clause is dropped.

  describe("review denied / granted", () => {
    it("captures 'review denied' as review_denied", () => {
      const cits = extractCitations(
        "People v. Smith, 50 Cal. 3d 100 (Cal. 1990), review denied.",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        expect(cases[0].subsequentHistoryEntries?.[0]?.signal).toBe("review_denied")
      }
    })

    it("captures 'review den.' (abbreviated) as review_denied", () => {
      const cits = extractCitations(
        "People v. Smith, 50 Cal. 3d 100 (Cal. 1990), review den.",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        expect(cases[0].subsequentHistoryEntries?.[0]?.signal).toBe("review_denied")
      }
    })

    it("captures 'review granted' as review_granted", () => {
      const cits = extractCitations(
        "Doe v. Roe, 1 Cal. 4th 50 (Cal. 2010), review granted.",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        expect(cases[0].subsequentHistoryEntries?.[0]?.signal).toBe("review_granted")
      }
    })
  })

  describe("opinion vacated", () => {
    it("captures 'opinion vacated' as opinion_vacated", () => {
      const cits = extractCitations(
        "Doe v. Roe, 1 Cal. 4th 50 (Cal. 2010), opinion vacated.",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        expect(cases[0].subsequentHistoryEntries?.[0]?.signal).toBe("opinion_vacated")
      }
    })
  })

  describe("disapproved on other grounds (CA-specific)", () => {
    it("captures 'disapproved on other grounds' as disapproved_other_grounds (beats bare 'disapproved')", () => {
      const cits = extractCitations(
        "People v. Davis, 5 Cal. 5th 200 (Cal. 2020), disapproved on other grounds in People v. Jones.",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        expect(cases[0].subsequentHistoryEntries?.[0]?.signal).toBe(
          "disapproved_other_grounds",
        )
      }
    })
  })

  describe("multi-stage chains", () => {
    it("captures 'review granted, opinion vacated' as 2 chained entries", () => {
      const cits = extractCitations(
        "Doe v. Roe, 1 Cal. 4th 50 (Cal. 2010), review granted, opinion vacated.",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        const entries = cases[0].subsequentHistoryEntries
        expect(entries?.length).toBeGreaterThanOrEqual(2)
        expect(entries?.[0]?.signal).toBe("review_granted")
        expect(entries?.[1]?.signal).toBe("opinion_vacated")
      }
    })
  })

  describe("regression — existing signals still work", () => {
    it("still recognizes 'disapproved' (bare) as disapproved", () => {
      // The longer "disapproved on other grounds" must not over-match the bare form.
      const cits = extractCitations(
        "Smith v. Jones, 100 F.3d 200 (2d Cir. 1996), disapproved, 200 F.3d 300 (2d Cir. 1997).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        expect(cases[0].subsequentHistoryEntries?.[0]?.signal).toBe("disapproved")
      }
    })

    it("still recognizes 'cert. denied' (federal — distinct from CA review)", () => {
      const cits = extractCitations(
        "Smith v. Jones, 100 F.3d 200 (2d Cir. 1996), cert. denied, 500 U.S. 100 (1997).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        expect(cases[0].subsequentHistoryEntries?.[0]?.signal).toBe("cert_denied")
      }
    })

    it("still recognizes 'aff'd' chain", () => {
      const cits = extractCitations(
        "Smith v. Doe, 100 F.3d 200 (2d Cir. 1996), aff'd, 200 F.3d 300 (2d Cir. 1997).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        expect(cases[0].subsequentHistoryEntries?.[0]?.signal).toBe("affirmed")
      }
    })
  })
})

describe("Texas writ/petition history (#229)", () => {
  // Texas Greenbook places writ/petition history inside the court-and-year
  // parenthetical, after a second comma — e.g.,
  //   (Tex. App.—Houston [1st Dist.] 2002, writ ref'd n.r.e.)
  // The em-dash is converted to "---" by the existing cleaning step (which
  // also handles em-dash blank-page placeholders), so test expectations use
  // the cleaned-text form. parseParenthetical must:
  //   1) extract court ending before the year (preserving em-dash & brackets)
  //   2) extract year correctly when followed by a non-date trailing clause
  //   3) populate subsequentHistory[] with the writ/pet signal

  describe("court extraction with em-dash + brackets", () => {
    it("captures 'Tex. App.---Houston [1st Dist.]' court", () => {
      const cits = extractCitations(
        "Smith v. State, 100 S.W.3d 1 (Tex. App.—Houston [1st Dist.] 2002, writ ref'd n.r.e.).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].court).toBe("Tex. App.---Houston [1st Dist.]")
        expect(cases[0].year).toBe(2002)
      }
    })

    it("captures 'Tex. App.---Dallas' court", () => {
      const cits = extractCitations(
        "Brown v. State, 200 S.W.3d 2 (Tex. App.—Dallas 2010, no pet.).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].court).toBe("Tex. App.---Dallas")
        expect(cases[0].year).toBe(2010)
      }
    })

    it("captures 'Tex. App.---Austin' court", () => {
      const cits = extractCitations(
        "Wilson v. State, 300 S.W.3d 3 (Tex. App.—Austin 2018, pet. ref'd).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].court).toBe("Tex. App.---Austin")
        expect(cases[0].year).toBe(2018)
      }
    })

    it("captures 'Tex. App.---Fort Worth' court (two-word city)", () => {
      const cits = extractCitations(
        "Richardson v. Kays, 234 S.W.3d 657 (Tex. App.—Fort Worth 2003, writ dism'd w.o.j.).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].court).toBe("Tex. App.---Fort Worth")
        expect(cases[0].year).toBe(2003)
      }
    })
  })

  describe("writ history signals", () => {
    const writCases: Array<[string, string]> = [
      ["writ ref'd", "writ_refused"],
      ["writ ref'd n.r.e.", "writ_refused"],
      ["writ ref'd w.m.j.", "writ_refused"],
      ["writ dism'd", "writ_dismissed"],
      ["writ dism'd w.o.j.", "writ_dismissed"],
      ["writ denied", "writ_denied"],
      ["no writ", "no_writ"],
    ]
    for (const [phrase, normalized] of writCases) {
      it(`recognizes '${phrase}' → ${normalized}`, () => {
        const cits = extractCitations(
          `Smith v. State, 100 S.W.3d 1 (Tex. App.—Dallas 2010, ${phrase}).`,
        )
        const cases = cits.filter((c) => c.type === "case")
        expect(cases).toHaveLength(1)
        if (cases[0].type === "case") {
          const entries = cases[0].subsequentHistoryEntries
          expect(entries).toBeDefined()
          expect(entries?.[0]?.signal).toBe(normalized)
          expect(entries?.[0]?.rawSignal).toBe(phrase)
        }
      })
    }
  })

  describe("petition history signals", () => {
    const petCases: Array<[string, string]> = [
      ["pet. ref'd", "pet_refused"],
      ["pet. denied", "pet_denied"],
      ["pet. dism'd", "pet_dismissed"],
      ["pet. granted", "pet_granted"],
      ["no pet.", "no_pet"],
      ["no pet. h.", "no_pet"],
    ]
    for (const [phrase, normalized] of petCases) {
      it(`recognizes '${phrase}' → ${normalized}`, () => {
        const cits = extractCitations(
          `Smith v. State, 100 S.W.3d 1 (Tex. App.—Dallas 2010, ${phrase}).`,
        )
        const cases = cits.filter((c) => c.type === "case")
        expect(cases).toHaveLength(1)
        if (cases[0].type === "case") {
          const entries = cases[0].subsequentHistoryEntries
          expect(entries).toBeDefined()
          expect(entries?.[0]?.signal).toBe(normalized)
          expect(entries?.[0]?.rawSignal).toBe(phrase)
        }
      })
    }
  })

  describe("In re Google example from issue body", () => {
    it("captures court + year + 'no pet. h.' history with [15th Dist.] bracket", () => {
      const cits = extractCitations(
        "In re Google, LLC, 705 S.W.3d 479, 484 (Tex. App.—15th Dist. 2025, no pet. h.).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].court).toBe("Tex. App.---15th Dist.")
        expect(cases[0].year).toBe(2025)
        expect(cases[0].caseName).toBe("In re Google, LLC")
        const entries = cases[0].subsequentHistoryEntries
        expect(entries?.[0]?.signal).toBe("no_pet")
      }
    })
  })

  describe("regression — non-Texas parentheticals still parse correctly", () => {
    it("'9th Cir. 2020' still extracts court='9th Cir.', year=2020", () => {
      const cits = extractCitations("Smith v. Jones, 100 F.3d 200 (9th Cir. 2020).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].court).toBe("9th Cir.")
        expect(cases[0].year).toBe(2020)
        expect(cases[0].subsequentHistoryEntries).toBeUndefined()
      }
    })

    it("'S.D.N.Y. 2010' still extracts court='S.D.N.Y.', year=2010", () => {
      const cits = extractCitations("Smith v. Jones, 100 F. Supp. 2d 200 (S.D.N.Y. 2010).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].court).toBe("S.D.N.Y.")
        expect(cases[0].year).toBe(2010)
        expect(cases[0].subsequentHistoryEntries).toBeUndefined()
      }
    })

    it("non-Texas trailing parenthetical does not populate subsequentHistory", () => {
      // The existing case with 'aff'd' AFTER the closing paren still works
      // via the existing between-parens collectParentheticals path — that's
      // distinct from #229's inside-the-parens fix.
      const cits = extractCitations(
        "Smith v. Doe, 100 F.3d 200, 205 (2d Cir. 1996), aff'd, 200 F.3d 300 (2d Cir. 1997).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      if (cases[0].type === "case") {
        expect(cases[0].court).toBe("2d Cir.")
        expect(cases[0].year).toBe(1996)
      }
    })
  })
})

describe("BIA hyphenated-initials respondent names (#244)", () => {
  // BIA opinions use a distinctive caption form where the respondent's name is
  // reduced to hyphenated single-letter initials (e.g., `Matter of A-B-`) for
  // confidentiality. The proximate cause of #244 is *not* the hyphenated-initials
  // caption — the existing `PROCEDURAL_PREFIX_REGEX` subject character class
  // already accepts hyphens — but the BIA reporter `I&N Dec.` (and its variants
  // `I. & N. Dec.`, `I & N Dec.`) contain an `&`, which is missing from the
  // state-reporter regex character class. Without that fix, the citation token
  // never forms and no case-name lookback runs. Corpus examples drawn from
  // docs/research/2026-05-11-procedural-prefixes-immigration-admin.md §8.

  describe("reporter recognition — I&N Dec. variants", () => {
    it("extracts 27 I&N Dec. 316 as a case citation (no-space form)", () => {
      const cits = extractCitations("27 I&N Dec. 316 (BIA 2018)")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].volume).toBe(27)
        expect(cases[0].page).toBe(316)
      }
    })

    it("extracts 28 I. & N. Dec. 307 as a case citation (Bluebook spaced form)", () => {
      const cits = extractCitations("28 I. & N. Dec. 307 (A.G. 2021)")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].volume).toBe(28)
        expect(cases[0].page).toBe(307)
      }
    })
  })

  describe("two-letter hyphenated-initials respondents", () => {
    it("captures 'Matter of A-B-' (Sessions's asylum decision)", () => {
      const cits = extractCitations(
        "See Matter of A-B-, 27 I&N Dec. 316 (BIA 2018).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Matter of A-B-")
        expect(cases[0].proceduralPrefix).toBe("Matter of")
      }
    })
  })

  describe("three-letter hyphenated-initials respondents", () => {
    it("captures 'Matter of L-E-A-' (family-based asylum)", () => {
      const cits = extractCitations(
        "See Matter of L-E-A-, 27 I&N Dec. 581 (A.G. 2019).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Matter of L-E-A-")
      }
    })

    it("captures 'Matter of W-G-R-' (PSG class)", () => {
      const cits = extractCitations(
        "See Matter of W-G-R-, 26 I&N Dec. 208 (BIA 2014).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Matter of W-G-R-")
      }
    })
  })

  describe("four-letter hyphenated-initials respondents", () => {
    it("captures 'Matter of A-R-C-G-' (domestic violence asylum precedent)", () => {
      const cits = extractCitations(
        "See Matter of A-R-C-G-, 26 I&N Dec. 388 (BIA 2014).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Matter of A-R-C-G-")
      }
    })

    it("captures 'Matter of M-E-V-G-' (PSG analysis)", () => {
      const cits = extractCitations(
        "See Matter of M-E-V-G-, 26 I&N Dec. 227 (BIA 2014).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Matter of M-E-V-G-")
      }
    })

    it("captures 'Matter of E-F-H-L-' (El Salvadoran asylum)", () => {
      const cits = extractCitations(
        "See Matter of E-F-H-L-, 26 I&N Dec. 319 (BIA 2014).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Matter of E-F-H-L-")
      }
    })

    it("captures 'Matter of M-R-M-S-' (modern PSG)", () => {
      const cits = extractCitations(
        "See Matter of M-R-M-S-, 28 I&N Dec. 757 (BIA 2023).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Matter of M-R-M-S-")
      }
    })
  })

  describe("non-anonymized BIA captions", () => {
    it("captures 'Matter of Garcia' (regular surname)", () => {
      const cits = extractCitations(
        "See Matter of Garcia, 25 I&N Dec. 332 (BIA 2010).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Matter of Garcia")
      }
    })

    it("captures 'Matter of Jurado-Delgado' (hyphenated real surname)", () => {
      const cits = extractCitations(
        "See Matter of Jurado-Delgado, 24 I&N Dec. 29 (BIA 2006).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Matter of Jurado-Delgado")
      }
    })

    it("captures 'Matter of THAKKER' (ALL-CAPS surname)", () => {
      const cits = extractCitations(
        "See Matter of THAKKER, 28 I&N Dec. 843 (BIA 2024).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Matter of THAKKER")
      }
    })

    it("captures 'Matter of CRUZ-VALDEZ' (ALL-CAPS hyphenated)", () => {
      const cits = extractCitations(
        "See Matter of CRUZ-VALDEZ, 28 I&N Dec. 326 (A.G. 2021).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Matter of CRUZ-VALDEZ")
      }
    })
  })

  describe("In re form for hyphenated surname", () => {
    it("captures 'In re Rivera-Valencia' (federal-court re-cite)", () => {
      const cits = extractCitations(
        "See In re Rivera-Valencia, 24 I&N Dec. 484 (BIA 2008).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Rivera-Valencia")
        expect(cases[0].proceduralPrefix).toBe("In re")
      }
    })
  })

  describe("regression controls — other reporters with & still work", () => {
    // The character-class change to state-reporter must not affect existing
    // reporters that don't contain `&`. Plus a control with the spaced
    // Bluebook variant.

    it("regression: '100 U.S. 1' (no &)", () => {
      const cits = extractCitations("Smith v. Jones, 100 U.S. 1 (1920).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].reporter).toBe("U.S.")
      }
    })

    it("regression: '500 F.3d 123' (no &)", () => {
      const cits = extractCitations("Smith v. Jones, 500 F.3d 123 (2d Cir. 2020).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].reporter).toBe("F.3d")
      }
    })

    it("regression: '50 N.E.2d 100' (period+space, no &)", () => {
      const cits = extractCitations("Smith v. Jones, 50 N.E.2d 100 (1940).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].reporter).toMatch(/N\.\s?E\.\s?2d/)
      }
    })
  })
})

describe("procedural prefix research expansion (2026-05-11)", () => {
  // Follow-up to #242 — six cross-domain research dispatches (family, probate,
  // bankruptcy, immigration, criminal/habeas, ex rel./qui tam) identified ~29
  // additional procedural-prefix forms appearing in published opinions but
  // missed by the current regex. All test inputs are verbatim corpus examples
  // from the research docs in docs/research/2026-05-11-procedural-prefixes-*.md.

  describe("ex rel. sovereign variants", () => {
    it("recognizes 'People ex rel.' (NY habeas)", () => {
      const cits = extractCitations(
        "See People ex rel. Williams v. La Vallee, 19 N.Y.2d 238 (1967).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("People ex rel. Williams v. La Vallee")
      }
    })

    it("recognizes 'District of Columbia ex rel.'", () => {
      const cits = extractCitations(
        "See District of Columbia ex rel. Lupo v. Smith, 100 D.C. 1 (2020).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("District of Columbia ex rel. Lupo v. Smith")
      }
    })

    it("recognizes 'Commonwealth of Puerto Rico ex rel.' (beats Commonwealth ex rel.)", () => {
      const cits = extractCitations(
        "See Commonwealth of Puerto Rico ex rel. Quiros v. Alfred L. Snapp & Son, 458 U.S. 592 (1982).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe(
          "Commonwealth of Puerto Rico ex rel. Quiros v. Alfred L. Snapp & Son",
        )
      }
    })

    it("recognizes 'Government of the Virgin Islands ex rel.'", () => {
      const cits = extractCitations(
        "See Government of the Virgin Islands ex rel. Suris v. Suris, 100 V.I. 1 (2020).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Government of the Virgin Islands ex rel. Suris v. Suris")
      }
    })
  })

  describe("family / juvenile prefixes", () => {
    it("recognizes 'In re Welfare of' (MN — beats 'In re')", () => {
      const cits = extractCitations(
        "See In re Welfare of M.A.B., 999 N.W.2d 100 (Minn. Ct. App. 2024).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Welfare of M.A.B.")
        expect(cases[0].proceduralPrefix).toBe("In re Welfare of")
      }
    })

    it("recognizes 'In the Matter of the Welfare of' (MN long form)", () => {
      const cits = extractCitations(
        "See In the Matter of the Welfare of M.A.B., 999 N.W.2d 100 (Minn. Ct. App. 2024).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In the Matter of the Welfare of M.A.B.")
        expect(cases[0].proceduralPrefix).toBe("In the Matter of the Welfare of")
      }
    })

    it("recognizes 'In re Dependency of' (WA)", () => {
      const cits = extractCitations(
        "See In re Dependency of A.B., 100 Wn.2d 1 (2020).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Dependency of A.B.")
        expect(cases[0].proceduralPrefix).toBe("In re Dependency of")
      }
    })

    it("recognizes 'In re Termination of Parental Rights to' (WI)", () => {
      const cits = extractCitations(
        "See In re Termination of Parental Rights to B.W., 100 Wis. 2d 1 (2020).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Termination of Parental Rights to B.W.")
        expect(cases[0].proceduralPrefix).toBe("In re Termination of Parental Rights to")
      }
    })

    it("recognizes 'In re Termination of Parental Rights as to' (AZ — beats 'to' variant)", () => {
      const cits = extractCitations(
        "See In re Termination of Parental Rights as to C.D., 100 Ariz. 1 (2020).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Termination of Parental Rights as to C.D.")
        expect(cases[0].proceduralPrefix).toBe("In re Termination of Parental Rights as to")
      }
    })

    it("recognizes 'In re Termination of Parental Rights of' (WI alt)", () => {
      const cits = extractCitations(
        "See In re Termination of Parental Rights of E.F., 100 Wis. 2d 1 (2020).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Termination of Parental Rights of E.F.")
        expect(cases[0].proceduralPrefix).toBe("In re Termination of Parental Rights of")
      }
    })

    it("recognizes 'In re Paternity of' (IN)", () => {
      const cits = extractCitations(
        "See In re Paternity of M.R., 778 N.E.2d 861 (Ind. Ct. App. 2002).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Paternity of M.R.")
        expect(cases[0].proceduralPrefix).toBe("In re Paternity of")
      }
    })

    it("recognizes 'In re Parentage of' (CA/IL)", () => {
      const cits = extractCitations(
        "See In re Parentage of Scarlett Z.-D., 100 Ill. 2d 1 (2015).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Parentage of Scarlett Z.-D.")
        expect(cases[0].proceduralPrefix).toBe("In re Parentage of")
      }
    })

    it("recognizes 'Care and Protection of' (MA bare form)", () => {
      const cits = extractCitations(
        "See Care and Protection of Jaylen, 493 Mass. 798 (2024).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Care and Protection of Jaylen")
        expect(cases[0].proceduralPrefix).toBe("Care and Protection of")
      }
    })
  })

  describe("probate (Louisiana civil law)", () => {
    it("recognizes 'Succession of' (LA bare form, no 'In re')", () => {
      const cits = extractCitations("See Succession of Talbot, 530 So. 2d 1132 (La. 1988).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Succession of Talbot")
        expect(cases[0].proceduralPrefix).toBe("Succession of")
      }
    })
  })

  describe("bankruptcy / insurance insolvency prefixes", () => {
    it("recognizes 'In re Liquidation of' (PA insurance)", () => {
      const cits = extractCitations(
        "See In re Liquidation of Legion Insurance Co., 831 A.2d 1196 (Pa. Cmwlth. 2003).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Liquidation of Legion Insurance Co.")
        expect(cases[0].proceduralPrefix).toBe("In re Liquidation of")
      }
    })

    it("recognizes 'In the Matter of the Liquidation of' (MA insurance long form)", () => {
      const cits = extractCitations(
        "See In the Matter of the Liquidation of American Mutual Liability Insurance Co., 434 Mass. 272 (2001).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe(
          "In the Matter of the Liquidation of American Mutual Liability Insurance Co.",
        )
        expect(cases[0].proceduralPrefix).toBe("In the Matter of the Liquidation of")
      }
    })

    it("recognizes 'In re Rehabilitation of' (state insurance)", () => {
      const cits = extractCitations(
        "See In re Rehabilitation of Scottish RE Inc., 100 A.3d 1 (Del. Ch. 2022).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Rehabilitation of Scottish RE Inc.")
        expect(cases[0].proceduralPrefix).toBe("In re Rehabilitation of")
      }
    })

    it("recognizes 'In the Matter of the Rehabilitation of' (NH long form)", () => {
      const cits = extractCitations(
        "See In the Matter of the Rehabilitation of the Home Insurance Co., 166 N.H. 84 (2014).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe(
          "In the Matter of the Rehabilitation of the Home Insurance Co.",
        )
        expect(cases[0].proceduralPrefix).toBe("In the Matter of the Rehabilitation of")
      }
    })

    it("recognizes 'Matter of Liquidation of' (NY)", () => {
      const cits = extractCitations(
        "See Matter of Liquidation of Union Indemnity Insurance Co., 89 N.Y.2d 94 (1996).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe(
          "Matter of Liquidation of Union Indemnity Insurance Co.",
        )
        expect(cases[0].proceduralPrefix).toBe("Matter of Liquidation of")
      }
    })

    it("recognizes 'In re Receivership of'", () => {
      const cits = extractCitations(
        "See In re Receivership of Bayou Group LLC, 372 B.R. 661 (S.D.N.Y. 2007).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Receivership of Bayou Group LLC")
        expect(cases[0].proceduralPrefix).toBe("In re Receivership of")
      }
    })
  })

  describe("immigration / naturalization prefixes", () => {
    it("recognizes 'In re Petition for Naturalization of' (federal naturalization)", () => {
      const cits = extractCitations(
        "See In re Petition for Naturalization of Haniatakis, 246 F. Supp. 545 (W.D. Pa. 1965).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Petition for Naturalization of Haniatakis")
        expect(cases[0].proceduralPrefix).toBe("In re Petition for Naturalization of")
      }
    })

    it("recognizes 'In re Naturalization of'", () => {
      const cits = extractCitations(
        "See In re Naturalization of Vafaei-Makhsoos, 597 F. Supp. 499 (D. Minn. 1984).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Naturalization of Vafaei-Makhsoos")
        expect(cases[0].proceduralPrefix).toBe("In re Naturalization of")
      }
    })

    it("recognizes 'Petition for Naturalization of' (no 'In re' prefix)", () => {
      const cits = extractCitations(
        "See Petition for Naturalization of Clarino, 691 F. Supp. 193 (C.D. Cal. 1988).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Petition for Naturalization of Clarino")
        expect(cases[0].proceduralPrefix).toBe("Petition for Naturalization of")
      }
    })
  })

  describe("criminal / habeas / extradition prefixes", () => {
    it("recognizes 'In re Extradition of'", () => {
      const cits = extractCitations(
        "See In re Extradition of Kirby, 106 F.3d 855 (9th Cir. 1996).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Extradition of Kirby")
        expect(cases[0].proceduralPrefix).toBe("In re Extradition of")
      }
    })

    it("recognizes 'In the Matter of the Extradition of'", () => {
      const cits = extractCitations(
        "See In the Matter of the Extradition of Kirby, 106 F.3d 855 (9th Cir. 1996).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In the Matter of the Extradition of Kirby")
        expect(cases[0].proceduralPrefix).toBe("In the Matter of the Extradition of")
      }
    })

    it("recognizes 'In re Application of' (federal surveillance — beats bare 'Application of')", () => {
      const cits = extractCitations(
        "See In re Application of the United States, 724 F.3d 600 (5th Cir. 2013).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Application of the United States")
        expect(cases[0].proceduralPrefix).toBe("In re Application of")
      }
    })

    it("recognizes 'In the Matter of the Application of'", () => {
      const cits = extractCitations(
        "See In the Matter of the Application of John Smith, 100 N.Y.S.2d 1 (1950).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In the Matter of the Application of John Smith")
        expect(cases[0].proceduralPrefix).toBe("In the Matter of the Application of")
      }
    })
  })

  describe("regression controls — existing prefixes still work after expansion", () => {
    it("still recognizes 'In re'", () => {
      const cits = extractCitations("See In re Smith, 100 U.S. 1 (2020).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].proceduralPrefix).toBe("In re")
      }
    })

    it("still recognizes 'Commonwealth ex rel.' (without Puerto Rico)", () => {
      const cits = extractCitations(
        "See Commonwealth ex rel. Smith v. Jones, 100 Pa. 1 (2020).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Commonwealth ex rel. Smith v. Jones")
      }
    })

    it("still recognizes bare 'Application of'", () => {
      const cits = extractCitations(
        "See Application of Jones, 100 U.S. 1 (2020).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].proceduralPrefix).toBe("Application of")
      }
    })

    it("does not mis-classify 'People v.' criminal as 'People ex rel.'", () => {
      const cits = extractCitations("See People v. Smith, 100 N.Y. 1 (2020).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("People v. Smith")
        expect(cases[0].plaintiff).toBe("People")
        expect(cases[0].defendant).toBe("Smith")
      }
    })
  })
})

describe("procedural prefix expansion (#242)", () => {
  // PROCEDURAL_PREFIX_REGEX covered In re, Ex parte, Matter of, Estate of,
  // State ex rel., United States ex rel., Application of, Petition of. Many
  // common procedural prefixes were missing, so captions like "In re Marriage
  // of Smith" lost everything before the second word and "In the Interest of
  // A.B." collapsed to "A.B." (the initials-only party form). All 7 prefixes
  // below appear in real opinions across PA, NJ, CA, MA, NY, VT.

  it("recognizes 'Commonwealth ex rel.' as a procedural plaintiff (PA)", () => {
    const cits = extractCitations(
      "See Commonwealth ex rel. Smith v. Jones, 100 Pa. 1 (2020).",
    )
    const cases = cits.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    if (cases[0].type === "case") {
      expect(cases[0].caseName).toBe("Commonwealth ex rel. Smith v. Jones")
    }
  })

  it("recognizes 'In the Interest of' with initials-only party (juvenile)", () => {
    const cits = extractCitations(
      "See In the Interest of A.B., a Minor, 200 N.J. 1 (2020).",
    )
    const cases = cits.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    if (cases[0].type === "case") {
      expect(cases[0].caseName).toBe("In the Interest of A.B., a Minor")
    }
  })

  it("recognizes 'In re Marriage of' (CA family) — beats 'In re' alone", () => {
    const cits = extractCitations(
      "See In re Marriage of Smith, 50 Cal.4th 100 (2010).",
    )
    const cases = cits.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    if (cases[0].type === "case") {
      expect(cases[0].caseName).toBe("In re Marriage of Smith")
      expect(cases[0].proceduralPrefix).toBe("In re Marriage of")
    }
  })

  it("recognizes 'Adoption of' with initials-only party", () => {
    const cits = extractCitations("See Adoption of J.K., 100 Mass. 1 (2020).")
    const cases = cits.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    if (cases[0].type === "case") {
      expect(cases[0].caseName).toBe("Adoption of J.K.")
      expect(cases[0].proceduralPrefix).toBe("Adoption of")
    }
  })

  it("recognizes 'Conservatorship of' with initials-only party (CA probate)", () => {
    const cits = extractCitations(
      "See Conservatorship of L.M., 1 Cal.5th 50 (2018).",
    )
    const cases = cits.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    if (cases[0].type === "case") {
      expect(cases[0].caseName).toBe("Conservatorship of L.M.")
      expect(cases[0].proceduralPrefix).toBe("Conservatorship of")
    }
  })

  it("recognizes 'Guardianship of' with initials-only party", () => {
    const cits = extractCitations(
      "See Guardianship of N.O., 300 N.Y.S.2d 100 (2020).",
    )
    const cases = cits.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    if (cases[0].type === "case") {
      expect(cases[0].caseName).toBe("Guardianship of N.O.")
      expect(cases[0].proceduralPrefix).toBe("Guardianship of")
    }
  })

  it("recognizes 'On Petition of' (older form) — beats 'Petition of' alone", () => {
    const cits = extractCitations(
      "See On Petition of P.Q., 100 Vt. 1 (2020).",
    )
    const cases = cits.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    if (cases[0].type === "case") {
      expect(cases[0].caseName).toBe("On Petition of P.Q.")
      expect(cases[0].proceduralPrefix).toBe("On Petition of")
    }
  })

  describe("regression controls — existing prefixes still work", () => {
    it("still recognizes 'In re'", () => {
      const cits = extractCitations("See In re Smith, 100 U.S. 1 (2020).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].proceduralPrefix).toBe("In re")
      }
    })

    it("still recognizes 'Petition of' (without 'On')", () => {
      const cits = extractCitations(
        "See Petition of Smith, 100 U.S. 1 (2020).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].proceduralPrefix).toBe("Petition of")
      }
    })

    it("still recognizes 'Estate of'", () => {
      const cits = extractCitations(
        "See Estate of Smith, 100 U.S. 1 (2020).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].proceduralPrefix).toBe("Estate of")
      }
    })
  })
})

describe("reporter edition future-proofing (#234)", () => {
  // The federal-reporter pattern hard-codes editions (F., F.2d, F.3d, F.4th)
  // and the COMMON_REPORTERS confidence-boost set mirrors that enumeration.
  // The state-reporter fallback catches future editions in extraction, but the
  // missing COMMON_REPORTERS entries cost the +0.3 reporter-boost — so F.5th
  // gets noticeably lower confidence than F.4th for the same surrounding
  // context. These tests pin both extraction correctness and confidence parity.

  describe("future federal-reporter editions", () => {
    it("extracts F.5th as a case citation with the same confidence as F.4th", () => {
      const f5 = extractCitations("Smith v. Jones, 100 F.5th 200 (9th Cir. 2025).")
      const f4 = extractCitations("Smith v. Jones, 50 F.4th 1234 (9th Cir. 2024).")
      const f5Cases = f5.filter((c) => c.type === "case")
      const f4Cases = f4.filter((c) => c.type === "case")
      expect(f5Cases).toHaveLength(1)
      expect(f4Cases).toHaveLength(1)
      if (f5Cases[0].type === "case" && f4Cases[0].type === "case") {
        expect(f5Cases[0].volume).toBe(100)
        expect(f5Cases[0].reporter).toBe("F.5th")
        expect(f5Cases[0].page).toBe(200)
        expect(f5Cases[0].confidence).toBe(f4Cases[0].confidence)
      }
    })

    it("extracts F.6th as a case citation with the same confidence as F.4th", () => {
      const f6 = extractCitations("Smith v. Jones, 50 F.6th 999 (D.C. Cir. 2030).")
      const f4 = extractCitations("Smith v. Jones, 50 F.4th 999 (D.C. Cir. 2030).")
      const f6Cases = f6.filter((c) => c.type === "case")
      const f4Cases = f4.filter((c) => c.type === "case")
      expect(f6Cases).toHaveLength(1)
      expect(f4Cases).toHaveLength(1)
      if (f6Cases[0].type === "case" && f4Cases[0].type === "case") {
        expect(f6Cases[0].volume).toBe(50)
        expect(f6Cases[0].reporter).toBe("F.6th")
        expect(f6Cases[0].page).toBe(999)
        expect(f6Cases[0].confidence).toBe(f4Cases[0].confidence)
      }
    })
  })

  describe("future regional-reporter editions", () => {
    it("extracts Cal.6th as a case citation", () => {
      const cits = extractCitations("Doe v. Roe, 1 Cal.6th 50 (Cal. 2027).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].volume).toBe(1)
        expect(cases[0].reporter).toBe("Cal.6th")
        expect(cases[0].page).toBe(50)
      }
    })

    it("extracts Cal.7th as a case citation", () => {
      const cits = extractCitations("Doe v. Roe, 10 Cal.7th 500 (Cal. 2040).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].volume).toBe(10)
        expect(cases[0].reporter).toBe("Cal.7th")
        expect(cases[0].page).toBe(500)
      }
    })
  })

  describe("regression controls — existing editions still work", () => {
    it("extracts F.4th (existing)", () => {
      const cits = extractCitations(
        "Smith v. Jones, 50 F.4th 1234 (D.C. Cir. 2024).",
      )
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].reporter).toBe("F.4th")
      }
    })

    it("extracts F.3d (existing)", () => {
      const cits = extractCitations("Smith v. Doe, 100 F.3d 200 (2d Cir. 1996).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].reporter).toBe("F.3d")
      }
    })

    it("extracts F.2d (existing)", () => {
      const cits = extractCitations("Smith v. Jones, 500 F.2d 123 (2020).")
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].reporter).toBe("F.2d")
      }
    })
  })
})

/**
 * California Style Manual year-first citation format (#19).
 *
 * CSM rule 1:1 places the year in parentheses BEFORE the volume-reporter-page,
 * not after — e.g., `Smith v. Jones (2020) 50 Cal.App.5th 100` rather than the
 * Bluebook `Smith v. Jones, 50 Cal.App.5th 100 (Cal. Ct. App. 2020)`. This is
 * the canonical form for California state-court opinions and is required by
 * the CRC for briefs filed in CA courts. The case name and year must both
 * round-trip into the FullCaseCitation; the year-bearing paren is *not* a
 * trailing court parenthetical (no court abbreviation; year-only).
 *
 * Six research dispatches at docs/research/2026-05-11-ca-style-* confirm this
 * is the single biggest CA blocker — every CA practice discipline uses it.
 */
describe("California year-first citation format (#19)", () => {
  describe("procedural prefix + year-first", () => {
    it("extracts case name and year from `In re K.F. (2009) 173 Cal.App.4th 655`", () => {
      const text = "See In re K.F. (2009) 173 Cal.App.4th 655 for the rule."
      const cits = extractCitations(text)
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re K.F.")
        expect(cases[0].year).toBe(2009)
        expect(cases[0].volume).toBe(173)
        expect(cases[0].reporter).toBe("Cal.App.4th")
        expect(cases[0].page).toBe(655)
        // Year span should point at the digits (excluding the parens).
        expect(cases[0].spans?.year).toBeDefined()
        if (cases[0].spans?.year) {
          expect(
            text.substring(
              cases[0].spans.year.originalStart,
              cases[0].spans.year.originalEnd,
            ),
          ).toBe("2009")
        }
      }
    })

    it("extracts `In re Marriage of Bonds (2000) 24 Cal.4th 1`", () => {
      const text = "Citing In re Marriage of Bonds (2000) 24 Cal.4th 1, 5."
      const cits = extractCitations(text)
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re Marriage of Bonds")
        expect(cases[0].year).toBe(2000)
        expect(cases[0].volume).toBe(24)
        expect(cases[0].reporter).toBe("Cal.4th")
        expect(cases[0].page).toBe(1)
        expect(cases[0].pincite).toBe(5)
      }
    })

    it("extracts `Conservatorship of Wendland (2001) 26 Cal.4th 519`", () => {
      const text = "Cf. Conservatorship of Wendland (2001) 26 Cal.4th 519."
      const cits = extractCitations(text)
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Conservatorship of Wendland")
        expect(cases[0].year).toBe(2001)
      }
    })
  })

  describe("v. + year-first", () => {
    it("extracts `People v. Smith (1990) 50 Cal.3d 100`", () => {
      const text = "Cf. People v. Smith (1990) 50 Cal.3d 100, 105."
      const cits = extractCitations(text)
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("People v. Smith")
        expect(cases[0].year).toBe(1990)
        expect(cases[0].pincite).toBe(105)
      }
    })

    it("extracts `Yield Dynamics, Inc. v. TEA Systems Corp. (2007) 154 Cal.App.4th 547, 558`", () => {
      const text =
        "We followed Yield Dynamics, Inc. v. TEA Systems Corp. (2007) 154 Cal.App.4th 547, 558 there."
      const cits = extractCitations(text)
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe(
          "Yield Dynamics, Inc. v. TEA Systems Corp.",
        )
        expect(cases[0].year).toBe(2007)
        expect(cases[0].pincite).toBe(558)
      }
    })
  })

  describe("regression controls — Bluebook form still works", () => {
    it("`Smith v. Jones, 50 Cal.3d 100 (Cal. 1990)` still parses court+year", () => {
      const text = "Smith v. Jones, 50 Cal.3d 100 (Cal. 1990) held that..."
      const cits = extractCitations(text)
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("Smith v. Jones")
        expect(cases[0].year).toBe(1990)
        expect(cases[0].court).toBe("Cal.")
      }
    })

    it("`In re K.F., 173 Cal.App.4th 655 (Cal. Ct. App. 2009)` (Bluebook)", () => {
      const text =
        "See In re K.F., 173 Cal.App.4th 655 (Cal. Ct. App. 2009) for it."
      const cits = extractCitations(text)
      const cases = cits.filter((c) => c.type === "case")
      expect(cases).toHaveLength(1)
      if (cases[0].type === "case") {
        expect(cases[0].caseName).toBe("In re K.F.")
        expect(cases[0].year).toBe(2009)
      }
    })
  })
})


