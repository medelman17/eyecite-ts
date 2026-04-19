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

