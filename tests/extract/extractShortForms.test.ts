import { describe, expect, it } from "vitest"
import { extractCitations, extractId, extractShortFormCase, extractSupra } from "@/extract"
import type { Token } from "@/tokenize"
import { createIdentityMap, createOffsetMap } from "../helpers/transformationMap"

describe("extractShortForms", () => {
  describe("extractId", () => {
    it("should extract Id. without pincite", () => {
      const token: Token = {
        text: "Id.",
        span: { cleanStart: 10, cleanEnd: 13 },
        type: "case",
        patternId: "id",
      }
      const transformationMap = createIdentityMap()

      const citation = extractId(token, transformationMap)

      expect(citation.type).toBe("id")
      expect(citation.text).toBe("Id.")
      expect(citation.matchedText).toBe("Id.")
      expect(citation.pincite).toBeUndefined()
      expect(citation.confidence).toBe(1.0)
      expect(citation.span.cleanStart).toBe(10)
      expect(citation.span.cleanEnd).toBe(13)
      expect(citation.span.originalStart).toBe(10)
      expect(citation.span.originalEnd).toBe(13)
    })

    it("should extract Id. with pincite", () => {
      const token: Token = {
        text: "Id. at 253",
        span: { cleanStart: 10, cleanEnd: 20 },
        type: "case",
        patternId: "id",
      }
      const transformationMap = createIdentityMap()

      const citation = extractId(token, transformationMap)

      expect(citation.type).toBe("id")
      expect(citation.pincite).toBe(253)
      expect(citation.confidence).toBe(1.0)
    })

    it("should extract Ibid. without pincite", () => {
      const token: Token = {
        text: "Ibid.",
        span: { cleanStart: 0, cleanEnd: 5 },
        type: "case",
        patternId: "ibid",
      }
      const transformationMap = createIdentityMap()

      const citation = extractId(token, transformationMap)

      expect(citation.type).toBe("id")
      expect(citation.text).toBe("Ibid.")
      expect(citation.pincite).toBeUndefined()
      expect(citation.confidence).toBe(1.0)
    })

    it("should extract Ibid. with pincite", () => {
      const token: Token = {
        text: "Ibid. at 125",
        span: { cleanStart: 0, cleanEnd: 12 },
        type: "case",
        patternId: "ibid",
      }
      const transformationMap = createIdentityMap()

      const citation = extractId(token, transformationMap)

      expect(citation.type).toBe("id")
      expect(citation.pincite).toBe(125)
      expect(citation.confidence).toBe(1.0)
    })

    it("should handle lowercase id.", () => {
      const token: Token = {
        text: "id. at 100",
        span: { cleanStart: 5, cleanEnd: 15 },
        type: "case",
        patternId: "id",
      }
      const transformationMap = createIdentityMap()

      const citation = extractId(token, transformationMap)

      expect(citation.type).toBe("id")
      expect(citation.pincite).toBe(100)
    })

    it("should translate positions with offset transformation map", () => {
      const token: Token = {
        text: "Id. at 253",
        span: { cleanStart: 10, cleanEnd: 20 },
        type: "case",
        patternId: "id",
      }
      const transformationMap = createOffsetMap(5)

      const citation = extractId(token, transformationMap)

      expect(citation.span.cleanStart).toBe(10)
      expect(citation.span.cleanEnd).toBe(20)
      expect(citation.span.originalStart).toBe(15) // +5 offset
      expect(citation.span.originalEnd).toBe(25) // +5 offset
    })

    it("should throw error on non-Id text", () => {
      const token: Token = {
        text: "Not an Id citation",
        span: { cleanStart: 0, cleanEnd: 18 },
        type: "case",
        patternId: "id",
      }
      const transformationMap = createIdentityMap()

      expect(() => extractId(token, transformationMap)).toThrow("Failed to parse Id. citation")
    })
  })

  describe("extractSupra", () => {
    it("should extract supra without pincite", () => {
      const token: Token = {
        text: "Smith, supra",
        span: { cleanStart: 10, cleanEnd: 22 },
        type: "case",
        patternId: "supra",
      }
      const transformationMap = createIdentityMap()

      const citation = extractSupra(token, transformationMap)

      expect(citation.type).toBe("supra")
      expect(citation.text).toBe("Smith, supra")
      expect(citation.matchedText).toBe("Smith, supra")
      expect(citation.partyName).toBe("Smith")
      expect(citation.pincite).toBeUndefined()
      expect(citation.confidence).toBe(0.9)
      expect(citation.span.cleanStart).toBe(10)
      expect(citation.span.cleanEnd).toBe(22)
    })

    it("should extract supra with pincite", () => {
      const token: Token = {
        text: "Smith, supra, at 460",
        span: { cleanStart: 10, cleanEnd: 30 },
        type: "case",
        patternId: "supra",
      }
      const transformationMap = createIdentityMap()

      const citation = extractSupra(token, transformationMap)

      expect(citation.type).toBe("supra")
      expect(citation.partyName).toBe("Smith")
      expect(citation.pincite).toBe(460)
      expect(citation.confidence).toBe(0.9)
    })

    it("should extract supra without comma before at", () => {
      const token: Token = {
        text: "Smith supra at 100",
        span: { cleanStart: 0, cleanEnd: 18 },
        type: "case",
        patternId: "supra",
      }
      const transformationMap = createIdentityMap()

      const citation = extractSupra(token, transformationMap)

      expect(citation.partyName).toBe("Smith")
      expect(citation.pincite).toBe(100)
    })

    it("should extract multi-word party names", () => {
      const token: Token = {
        text: "Smith v Jones, supra",
        span: { cleanStart: 0, cleanEnd: 20 },
        type: "case",
        patternId: "supra",
      }
      const transformationMap = createIdentityMap()

      const citation = extractSupra(token, transformationMap)

      expect(citation.partyName).toBe("Smith v Jones")
    })

    it("should handle party names with multiple words", () => {
      const token: Token = {
        text: "United States, supra, at 250",
        span: { cleanStart: 5, cleanEnd: 33 },
        type: "case",
        patternId: "supra",
      }
      const transformationMap = createIdentityMap()

      const citation = extractSupra(token, transformationMap)

      expect(citation.partyName).toBe("United States")
      expect(citation.pincite).toBe(250)
    })

    describe("multi-word party name capture (#301)", () => {
      it("captures `Thorn Americas, Inc., supra` (corporate suffix after comma)", () => {
        const text =
          "We followed Sprague v. Thorn Americas, Inc., 542 So. 2d 1242. Thorn Americas, Inc., supra, at 1245."
        const cites = extractCitations(text)
        const supra = cites.find((c) => c.type === "supra")
        expect(supra?.type).toBe("supra")
        if (supra?.type === "supra") {
          expect(supra.partyName).toBe("Thorn Americas, Inc.")
        }
      })

      it("captures `Walker & Horwich, supra` (ampersand-joined parties)", () => {
        const text = "See Walker & Horwich, 39 Cal.4th 660. Walker & Horwich, supra, at 670."
        const cites = extractCitations(text)
        const supra = cites.find((c) => c.type === "supra")
        expect(supra?.type).toBe("supra")
        if (supra?.type === "supra") {
          expect(supra.partyName).toBe("Walker & Horwich")
        }
      })

      // `In re X, supra` partyName is intentionally captured WITHOUT the
      // `In re` prefix here — the resolver's BKTree indexes full-cite
      // party names with `In re` stripped (#216), so preserving the prefix
      // on the supra side would break supra-to-fullcite resolution.
      // Handling that mismatch requires resolver-side normalization which
      // is out of scope for #301.
      it("`In re Foo, supra` strips `In re` to match resolver index (#216)", () => {
        const text = "In re Foo Litig., 100 F.3d 200. In re Foo, supra, at 205."
        const cites = extractCitations(text)
        const supra = cites.find((c) => c.type === "supra")
        expect(supra?.type).toBe("supra")
        if (supra?.type === "supra") {
          expect(supra.partyName).toBe("Foo")
        }
      })

      it("regression: single-word `Smith, supra` still works", () => {
        const text = "See Smith v. Doe, 100 F.3d 200. Smith, supra."
        const cites = extractCitations(text)
        const supra = cites.find((c) => c.type === "supra")
        expect(supra?.type).toBe("supra")
        if (supra?.type === "supra") {
          expect(supra.partyName).toBe("Smith")
        }
      })

      it("regression: `Smith v. Jones, supra` still captures both parties", () => {
        const text = "See Smith v. Jones, 100 F.3d 200. Smith v. Jones, supra."
        const cites = extractCitations(text)
        const supra = cites.find((c) => c.type === "supra")
        expect(supra?.type).toBe("supra")
        if (supra?.type === "supra") {
          expect(supra.partyName).toBe("Smith v. Jones")
        }
      })
    })

    it("should translate positions with offset transformation map", () => {
      const token: Token = {
        text: "Smith, supra, at 460",
        span: { cleanStart: 10, cleanEnd: 30 },
        type: "case",
        patternId: "supra",
      }
      const transformationMap = createOffsetMap(3)

      const citation = extractSupra(token, transformationMap)

      expect(citation.span.cleanStart).toBe(10)
      expect(citation.span.cleanEnd).toBe(30)
      expect(citation.span.originalStart).toBe(13) // +3 offset
      expect(citation.span.originalEnd).toBe(33) // +3 offset
    })

    it("should handle space before comma (HTML cleaning artifact)", () => {
      const token: Token = {
        text: "Twombly , supra, at 553",
        span: { cleanStart: 0, cleanEnd: 23 },
        type: "case",
        patternId: "supra",
      }
      const transformationMap = createIdentityMap()

      const citation = extractSupra(token, transformationMap)

      expect(citation.partyName).toBe("Twombly")
      expect(citation.pincite).toBe(553)
    })

    it("should handle space before comma without pincite", () => {
      const token: Token = {
        text: "Smith , supra",
        span: { cleanStart: 0, cleanEnd: 13 },
        type: "case",
        patternId: "supra",
      }
      const transformationMap = createIdentityMap()

      const citation = extractSupra(token, transformationMap)

      expect(citation.partyName).toBe("Smith")
      expect(citation.pincite).toBeUndefined()
    })

    it("should throw error on non-supra text", () => {
      const token: Token = {
        text: "Not a valid citation",
        span: { cleanStart: 0, cleanEnd: 20 },
        type: "case",
        patternId: "supra",
      }
      const transformationMap = createIdentityMap()

      expect(() => extractSupra(token, transformationMap)).toThrow("Failed to parse supra citation")
    })
  })

  describe("extractShortFormCase", () => {
    it("should extract short-form case with volume, reporter, and pincite", () => {
      const token: Token = {
        text: "500 F.2d at 125",
        span: { cleanStart: 10, cleanEnd: 25 },
        type: "case",
        patternId: "short-form-case",
      }
      const transformationMap = createIdentityMap()

      const citation = extractShortFormCase(token, transformationMap)

      expect(citation.type).toBe("shortFormCase")
      expect(citation.text).toBe("500 F.2d at 125")
      expect(citation.matchedText).toBe("500 F.2d at 125")
      expect(citation.volume).toBe(500)
      expect(citation.reporter).toBe("F.2d")
      expect(citation.pincite).toBe(125)
      expect(citation.confidence).toBe(0.7)
      expect(citation.span.cleanStart).toBe(10)
      expect(citation.span.cleanEnd).toBe(25)
    })

    it("should handle different reporter formats", () => {
      const token: Token = {
        text: "410 U.S. at 115",
        span: { cleanStart: 0, cleanEnd: 15 },
        type: "case",
        patternId: "short-form-case",
      }
      const transformationMap = createIdentityMap()

      const citation = extractShortFormCase(token, transformationMap)

      expect(citation.volume).toBe(410)
      expect(citation.reporter).toBe("U.S.")
      expect(citation.pincite).toBe(115)
    })

    it("should handle reporters with spaces", () => {
      const token: Token = {
        text: "123 So. 2d at 456",
        span: { cleanStart: 0, cleanEnd: 17 },
        type: "case",
        patternId: "short-form-case",
      }
      const transformationMap = createIdentityMap()

      const citation = extractShortFormCase(token, transformationMap)

      expect(citation.volume).toBe(123)
      expect(citation.reporter).toBe("So. 2d")
      expect(citation.pincite).toBe(456)
    })

    it("should handle reporters with edition numbers", () => {
      const token: Token = {
        text: "789 F.3d at 200",
        span: { cleanStart: 5, cleanEnd: 20 },
        type: "case",
        patternId: "short-form-case",
      }
      const transformationMap = createIdentityMap()

      const citation = extractShortFormCase(token, transformationMap)

      expect(citation.volume).toBe(789)
      expect(citation.reporter).toBe("F.3d")
      expect(citation.pincite).toBe(200)
    })

    it("should translate positions with offset transformation map", () => {
      const token: Token = {
        text: "500 F.2d at 125",
        span: { cleanStart: 10, cleanEnd: 25 },
        type: "case",
        patternId: "short-form-case",
      }
      const transformationMap = createOffsetMap(7)

      const citation = extractShortFormCase(token, transformationMap)

      expect(citation.span.cleanStart).toBe(10)
      expect(citation.span.cleanEnd).toBe(25)
      expect(citation.span.originalStart).toBe(17) // +7 offset
      expect(citation.span.originalEnd).toBe(32) // +7 offset
    })

    it("should throw error on non-short-form text", () => {
      const token: Token = {
        text: "Not a short form",
        span: { cleanStart: 0, cleanEnd: 16 },
        type: "case",
        patternId: "short-form-case",
      }
      const transformationMap = createIdentityMap()

      expect(() => extractShortFormCase(token, transformationMap)).toThrow(
        "Failed to parse short-form case citation",
      )
    })
  })

  describe("Id. with comma before pincite", () => {
    it("should extract pincite from 'Id., at 105'", () => {
      const token: Token = {
        text: "Id., at 105",
        span: { cleanStart: 0, cleanEnd: 11 },
        type: "case",
        patternId: "id",
      }
      const citation = extractId(token, createIdentityMap())

      expect(citation.type).toBe("id")
      expect(citation.pincite).toBe(105)
      expect(citation.text).toBe("Id., at 105")
    })

    it("should extract pincite from 'id., at 200'", () => {
      const token: Token = {
        text: "id., at 200",
        span: { cleanStart: 5, cleanEnd: 16 },
        type: "case",
        patternId: "id",
      }
      const citation = extractId(token, createIdentityMap())

      expect(citation.type).toBe("id")
      expect(citation.pincite).toBe(200)
    })
  })

  describe("Id./Ibid. punctuation tolerance (#305)", () => {
    it("tokenizes `Id . at 326` (space before period, OCR artifact)", () => {
      const cites = extractCitations("See Smith, 100 U.S. 1 (1990). Id . at 326.")
      const id = cites.find((c) => c.type === "id")
      expect(id?.type).toBe("id")
      if (id?.type === "id") {
        expect(id.pincite).toBe(326)
      }
    })

    it("tokenizes `Ibid .` (space before period)", () => {
      const cites = extractCitations("See Smith, 100 U.S. 1 (1990). Ibid .")
      const id = cites.find((c) => c.type === "id")
      expect(id?.type).toBe("id")
    })

    it("tokenizes `Id, at p. 1483` (comma instead of period — typo)", () => {
      const cites = extractCitations(
        "See Smith, 100 U.S. 1 (1990). Id, at p. 1483.",
      )
      const id = cites.find((c) => c.type === "id")
      expect(id?.type).toBe("id")
      if (id?.type === "id") {
        expect(id.pincite).toBe(1483)
        // Typo form gets reduced confidence
        expect(id.confidence).toBeLessThan(0.95)
      }
    })

    it("tokenizes `Id . at p. 1192` (space before period + CSM p. prefix)", () => {
      const cites = extractCitations(
        "See Smith, 100 U.S. 1 (1990). Id . at p. 1192.",
      )
      const id = cites.find((c) => c.type === "id")
      expect(id?.type).toBe("id")
      if (id?.type === "id") {
        expect(id.pincite).toBe(1192)
      }
    })

    it("does NOT match bare `Id,` in prose (no `at` follows)", () => {
      // `Id` appearing as a word in sentence prose, followed by comma but
      // not by `at` — should not match the typo form.
      const cites = extractCitations(
        "She showed her Id, but the guard waved her through.",
      )
      const id = cites.find((c) => c.type === "id")
      expect(id).toBeUndefined()
    })

    it("regression: canonical `Id. at 326` still works", () => {
      const cites = extractCitations("See Smith, 100 U.S. 1 (1990). Id. at 326.")
      const id = cites.find((c) => c.type === "id")
      expect(id?.type).toBe("id")
      if (id?.type === "id") {
        expect(id.pincite).toBe(326)
        expect(id.confidence).toBe(1.0)
      }
    })

    it("regression: canonical `Ibid.` still works", () => {
      const cites = extractCitations("See Smith, 100 U.S. 1 (1990). Ibid.")
      const id = cites.find((c) => c.type === "id")
      expect(id?.type).toBe("id")
    })

    // Direct extractId calls to pin the new regex group indices (group 5 =
    // pincite after the typo / canonical-comma renumbering; #305).

    it("extractId direct call on `Id, at p. 1483` (typo path)", () => {
      const token: Token = {
        text: "Id, at p. 1483",
        span: { cleanStart: 0, cleanEnd: 14 },
        type: "case",
        patternId: "id",
      }
      const citation = extractId(token, createIdentityMap())
      expect(citation.type).toBe("id")
      expect(citation.pincite).toBe(1483)
      expect(citation.confidence).toBeLessThanOrEqual(0.7)
    })

    it("extractId direct call on `Id .` (space-before-period, no pincite)", () => {
      const token: Token = {
        text: "Id .",
        span: { cleanStart: 0, cleanEnd: 4 },
        type: "case",
        patternId: "id",
      }
      const citation = extractId(token, createIdentityMap())
      expect(citation.type).toBe("id")
      expect(citation.pincite).toBeUndefined()
    })

    it("extractId direct call on canonical `Id., at 100` exercises post-period comma path", () => {
      const token: Token = {
        text: "Id., at 100",
        span: { cleanStart: 0, cleanEnd: 11 },
        type: "case",
        patternId: "id",
      }
      const citation = extractId(token, createIdentityMap())
      expect(citation.type).toBe("id")
      expect(citation.pincite).toBe(100)
      // Post-period comma reduces confidence to 0.9 (not the more-aggressive
      // 0.7 reserved for the typo `Id,` form).
      expect(citation.confidence).toBe(0.9)
    })

    it("extractId penalizes mid-sentence `Id.` context (existing #182 behavior)", () => {
      // Pin the mid-sentence-context penalty path — `Id.` preceded by a
      // lowercase word in a sentence (e.g., "The Id. card") gets confidence
      // capped at 0.4. The cleanedText parameter exercises the context
      // validation branch.
      const cleanedText = "He showed Id. at the gate."
      const idStart = cleanedText.indexOf("Id.")
      const token: Token = {
        text: "Id. at the",
        span: { cleanStart: idStart, cleanEnd: idStart + 10 },
        type: "case",
        patternId: "id",
      }
      const citation = extractId(token, createIdentityMap(), cleanedText)
      // Lowercase prose word before Id. → not a citation context → 0.4 cap
      expect(citation.confidence).toBeLessThanOrEqual(0.4)
    })
  })

  describe("supra with note number and pincite", () => {
    it("should extract pincite from 'Smith, supra note 5, at 130'", () => {
      const token: Token = {
        text: "Smith, supra note 5, at 130",
        span: { cleanStart: 0, cleanEnd: 27 },
        type: "case",
        patternId: "supra",
      }
      const citation = extractSupra(token, createIdentityMap())

      expect(citation.type).toBe("supra")
      expect(citation.partyName).toBe("Smith")
      expect(citation.pincite).toBe(130)
    })

    it("should extract hyphenated party name", () => {
      const token: Token = {
        text: "Martinez-Fernandez, supra, at 100",
        span: { cleanStart: 0, cleanEnd: 33 },
        type: "case",
        patternId: "supra",
      }
      const citation = extractSupra(token, createIdentityMap())

      expect(citation.partyName).toBe("Martinez-Fernandez")
      expect(citation.pincite).toBe(100)
    })

    it("should extract party name with apostrophe", () => {
      const token: Token = {
        text: "O'Brien, supra, at 100",
        span: { cleanStart: 0, cleanEnd: 22 },
        type: "case",
        patternId: "supra",
      }
      const citation = extractSupra(token, createIdentityMap())

      expect(citation.partyName).toBe("O'Brien")
      expect(citation.pincite).toBe(100)
    })

    it("should extract party name ending with period", () => {
      const token: Token = {
        text: "Bros., supra, at 100",
        span: { cleanStart: 0, cleanEnd: 20 },
        type: "case",
        patternId: "supra",
      }
      const citation = extractSupra(token, createIdentityMap())

      expect(citation.partyName).toBe("Bros.")
      expect(citation.pincite).toBe(100)
    })
  })

  describe("shortFormCase with 4th-series reporters", () => {
    it("should extract F.4th short-form", () => {
      const token: Token = {
        text: "74 F.4th at 30",
        span: { cleanStart: 0, cleanEnd: 14 },
        type: "case",
        patternId: "shortFormCase",
      }
      const citation = extractShortFormCase(token, createIdentityMap())

      expect(citation.type).toBe("shortFormCase")
      expect(citation.volume).toBe(74)
      expect(citation.reporter).toBe("F.4th")
      expect(citation.pincite).toBe(30)
    })

    it("should extract Cal.4th short-form", () => {
      const token: Token = {
        text: "500 Cal.4th at 120",
        span: { cleanStart: 0, cleanEnd: 18 },
        type: "case",
        patternId: "shortFormCase",
      }
      const citation = extractShortFormCase(token, createIdentityMap())

      expect(citation.volume).toBe(500)
      expect(citation.reporter).toBe("Cal.4th")
      expect(citation.pincite).toBe(120)
    })
  })

  describe("confidence scoring", () => {
    it("should assign confidence 1.0 to Id. citations", () => {
      const token: Token = {
        text: "Id. at 253",
        span: { cleanStart: 0, cleanEnd: 10 },
        type: "case",
        patternId: "id",
      }
      const citation = extractId(token, createIdentityMap())
      expect(citation.confidence).toBe(1.0)
    })

    it("should assign confidence 0.9 to supra citations", () => {
      const token: Token = {
        text: "Smith, supra, at 460",
        span: { cleanStart: 0, cleanEnd: 20 },
        type: "case",
        patternId: "supra",
      }
      const citation = extractSupra(token, createIdentityMap())
      expect(citation.confidence).toBe(0.9)
    })

    it("should assign confidence 0.7 to short-form case citations", () => {
      const token: Token = {
        text: "500 F.2d at 125",
        span: { cleanStart: 0, cleanEnd: 15 },
        type: "case",
        patternId: "short-form-case",
      }
      const citation = extractShortFormCase(token, createIdentityMap())
      expect(citation.confidence).toBe(0.7)
    })
  })

  describe("edge cases", () => {
    it("should handle empty pincite spaces in Id.", () => {
      const token: Token = {
        text: "Id.",
        span: { cleanStart: 0, cleanEnd: 3 },
        type: "case",
        patternId: "id",
      }
      const citation = extractId(token, createIdentityMap())
      expect(citation.pincite).toBeUndefined()
    })

    it("should handle empty pincite in supra", () => {
      const token: Token = {
        text: "Smith, supra",
        span: { cleanStart: 0, cleanEnd: 12 },
        type: "case",
        patternId: "supra",
      }
      const citation = extractSupra(token, createIdentityMap())
      expect(citation.pincite).toBeUndefined()
    })

    it("should trim whitespace from reporter in short-form", () => {
      const token: Token = {
        text: "100 F.   at 200",
        span: { cleanStart: 0, cleanEnd: 15 },
        type: "case",
        patternId: "short-form-case",
      }
      const citation = extractShortFormCase(token, createIdentityMap())
      expect(citation.reporter).toBe("F.")
    })
  })
})

describe("supra with HTML cleaning artifacts (integration)", () => {
  it("should match supra when HTML tags introduce space before comma", () => {
    const text = "In <em>Twombly</em>, supra, at 553"
    const citations = extractCitations(text)
    const supra = citations.find((c) => c.type === "supra")

    expect(supra).toBeDefined()
    if (supra?.type === "supra") {
      expect(supra.pincite).toBe(553)
    }
  })

  it("should match supra with space before comma in plain text", () => {
    const text = "Twombly , supra, at 553"
    const citations = extractCitations(text)
    const supra = citations.find((c) => c.type === "supra")

    expect(supra).toBeDefined()
    if (supra?.type === "supra") {
      expect(supra.partyName).toBe("Twombly")
      expect(supra.pincite).toBe(553)
    }
  })
})

describe("short-form recall improvements (integration)", () => {
  describe("Id. with comma before pincite", () => {
    it("should capture pincite from 'Id., at 105' in full text", () => {
      const text = "Smith v. Jones, 500 F.2d 100 (2d Cir. 1974). Id., at 105."
      const citations = extractCitations(text)
      const id = citations.find((c) => c.type === "id")

      expect(id).toBeDefined()
      if (id?.type === "id") {
        expect(id.pincite).toBe(105)
      }
    })

    it("should capture pincite from 'Id., at 105' across newline", () => {
      const text = "Smith v. Jones, 500 F.2d 100 (2d Cir. 1974).\nId., at 105."
      const citations = extractCitations(text)
      const id = citations.find((c) => c.type === "id")

      expect(id).toBeDefined()
      if (id?.type === "id") {
        expect(id.pincite).toBe(105)
      }
    })
  })

  describe("supra with newlines and note numbers", () => {
    it("should extract supra with newline before pincite", () => {
      const text = "Smith, supra,\nat 130"
      const citations = extractCitations(text)
      const supra = citations.find((c) => c.type === "supra")

      expect(supra).toBeDefined()
      if (supra?.type === "supra") {
        expect(supra.partyName).toBe("Smith")
        expect(supra.pincite).toBe(130)
        // Verify span points to correct location in original text
        expect(text.substring(supra.span.originalStart, supra.span.originalEnd)).toBe(text)
      }
    })

    it("should extract supra with note number and pincite", () => {
      const text = "Smith, supra note 5, at 130"
      const citations = extractCitations(text)
      const supra = citations.find((c) => c.type === "supra")

      expect(supra).toBeDefined()
      if (supra?.type === "supra") {
        expect(supra.partyName).toBe("Smith")
        expect(supra.pincite).toBe(130)
      }
    })

    it("should extract supra with hyphenated party name", () => {
      const text = "Martinez-Fernandez, supra, at 100"
      const citations = extractCitations(text)
      const supra = citations.find((c) => c.type === "supra")

      expect(supra).toBeDefined()
      if (supra?.type === "supra") {
        expect(supra.partyName).toBe("Martinez-Fernandez")
        expect(supra.pincite).toBe(100)
      }
    })

    it("should extract supra with apostrophe in party name", () => {
      const text = "O'Brien, supra, at 100"
      const citations = extractCitations(text)
      const supra = citations.find((c) => c.type === "supra")

      expect(supra).toBeDefined()
      if (supra?.type === "supra") {
        expect(supra.partyName).toBe("O'Brien")
        expect(supra.pincite).toBe(100)
      }
    })
  })

  describe("shortFormCase with 4th-series reporters", () => {
    it("should detect '74 F.4th at 30' as shortFormCase", () => {
      const text = "74 F.4th at 30"
      const citations = extractCitations(text)
      const shortForm = citations.find((c) => c.type === "shortFormCase")

      expect(shortForm).toBeDefined()
      if (shortForm?.type === "shortFormCase") {
        expect(shortForm.volume).toBe(74)
        expect(shortForm.reporter).toBe("F.4th")
        expect(shortForm.pincite).toBe(30)
      }
    })

    it("should detect '500 Cal.4th at 120' as shortFormCase", () => {
      const text = "500 Cal.4th at 120"
      const citations = extractCitations(text)
      const shortForm = citations.find((c) => c.type === "shortFormCase")

      expect(shortForm).toBeDefined()
      if (shortForm?.type === "shortFormCase") {
        expect(shortForm.volume).toBe(500)
        expect(shortForm.reporter).toBe("Cal.4th")
        expect(shortForm.pincite).toBe(120)
      }
    })

    it("should detect '563 U.S. at 735' as shortFormCase", () => {
      const text = "563 U.S. at 735"
      const citations = extractCitations(text)
      const shortForm = citations.find((c) => c.type === "shortFormCase")

      expect(shortForm).toBeDefined()
      if (shortForm?.type === "shortFormCase") {
        expect(shortForm.volume).toBe(563)
        expect(shortForm.reporter).toBe("U.S.")
        expect(shortForm.pincite).toBe(735)
      }
    })

    it("should detect '942 F.3d at 146' as shortFormCase", () => {
      const text = "942 F.3d at 146"
      const citations = extractCitations(text)
      const shortForm = citations.find((c) => c.type === "shortFormCase")

      expect(shortForm).toBeDefined()
      if (shortForm?.type === "shortFormCase") {
        expect(shortForm.volume).toBe(942)
        expect(shortForm.reporter).toBe("F.3d")
        expect(shortForm.pincite).toBe(146)
      }
    })
  })
})

describe("star-pagination pincite (#191)", () => {
  describe("Id. citations", () => {
    it("captures 'at *2' on Id. citations", () => {
      const text = `Smith v. Jones, 2020 NY Slip Op 00001, at *1 (2d Dep't 2020). Id. at *2.`
      const cits = extractCitations(text)
      const id = cits.find((c) => c.type === "id")
      expect(id).toBeDefined()
      if (id?.type === "id") {
        expect(id.text).toBe("Id. at *2")
        expect(id.pincite).toBe(2)
        expect(id.pinciteInfo?.starPage).toBe(true)
        expect(id.pinciteInfo?.raw).toBe("*2")
      }
    })

    it("captures 'at *3-5' star range on Id.", () => {
      const text = `Smith, 2020 NY Slip Op 00001, at *1 (2020). Id. at *3-5.`
      const cits = extractCitations(text)
      const id = cits.find((c) => c.type === "id")
      expect(id?.type).toBe("id")
      if (id?.type === "id") {
        expect(id.pincite).toBe(3)
        expect(id.pinciteInfo?.endPage).toBe(5)
        expect(id.pinciteInfo?.isRange).toBe(true)
        expect(id.pinciteInfo?.starPage).toBe(true)
      }
    })

    it("preserves numeric Id. pincite behavior (control)", () => {
      const text = `Foo v. Bar, 123 F.3d 456, 460 (2d Cir. 2020). Id. at 465.`
      const cits = extractCitations(text)
      const id = cits.find((c) => c.type === "id")
      expect(id?.type).toBe("id")
      if (id?.type === "id") {
        expect(id.text).toBe("Id. at 465")
        expect(id.pincite).toBe(465)
        expect(id.pinciteInfo?.starPage).toBeUndefined()
      }
    })
  })

  describe("supra citations", () => {
    it("captures 'at *4' on supra", () => {
      const text = `Smith v. Jones, 2020 NY Slip Op 00001, at *1 (2d Dep't 2020). Smith, supra, at *4.`
      const cits = extractCitations(text)
      const supra = cits.find((c) => c.type === "supra")
      expect(supra?.type).toBe("supra")
      if (supra?.type === "supra") {
        expect(supra.pincite).toBe(4)
        expect(supra.pinciteInfo?.starPage).toBe(true)
      }
    })
  })

  describe("full-cite star pincite (NY Slip Op)", () => {
    it("captures 'at *1' on a NY Slip Op neutral full cite", () => {
      const text = `Smith v. Jones, 2020 NY Slip Op 00001, at *1 (2d Dep't 2020).`
      const cits = extractCitations(text)
      const cs = cits.find((c) => c.type === "case")
      expect(cs?.type).toBe("case")
      if (cs?.type === "case") {
        expect(cs.pincite).toBe(1)
        expect(cs.pinciteInfo?.starPage).toBe(true)
      }
    })

    it("captures pincite on NY Slip Op shortform repeat without comma", () => {
      const text = `Smith, 2020 NY Slip Op 00001, at *1 (2020). Smith, 2020 NY Slip Op 00001 at *2.`
      const cits = extractCitations(text)
      // Classification quirk: NY Slip Op short-form isn't caught by the
      // shortFormCase pattern (which forbids a page between reporter and "at"),
      // so both occurrences come back as `case`. The pincite data is still
      // captured correctly on the second occurrence.
      const seconds = cits.filter(
        (c) => c.type === "case" && c.span.cleanStart > 40,
      )
      expect(seconds.length).toBeGreaterThanOrEqual(1)
      const second = seconds[0]
      if (second.type === "case") {
        expect(second.pincite).toBe(2)
        expect(second.pinciteInfo?.starPage).toBe(true)
      }
    })
  })

  describe("neutral citations (Westlaw, Lexis)", () => {
    it("captures 'at *3' on Westlaw neutrals", () => {
      const text = `Smith, 2020 WL 123456, at *3 (S.D.N.Y. Jan. 1, 2020).`
      const cits = extractCitations(text)
      const neutral = cits.find((c) => c.type === "neutral")
      expect(neutral?.type).toBe("neutral")
      if (neutral?.type === "neutral") {
        expect(neutral.pincite).toBe(3)
        expect(neutral.pinciteInfo?.starPage).toBe(true)
      }
    })

    it("captures 'at *7' on Lexis neutrals", () => {
      const text = `Smith v. Jones, 2020 U.S. Dist. LEXIS 12345, at *7 (S.D.N.Y. 2020).`
      const cits = extractCitations(text)
      const neutral = cits.find((c) => c.type === "neutral")
      expect(neutral?.type).toBe("neutral")
      if (neutral?.type === "neutral") {
        expect(neutral.pincite).toBe(7)
        expect(neutral.pinciteInfo?.starPage).toBe(true)
      }
    })

    it("also captures numeric pincites on neutrals (previously unsupported)", () => {
      const text = `Smith, 2020 WL 123456, at 3 (S.D.N.Y. 2020).`
      const cits = extractCitations(text)
      const neutral = cits.find((c) => c.type === "neutral")
      expect(neutral?.type).toBe("neutral")
      if (neutral?.type === "neutral") {
        expect(neutral.pincite).toBe(3)
        expect(neutral.pinciteInfo?.starPage).toBeUndefined()
      }
    })
  })

  /**
   * California Style Manual `at p.` / `at pp.` pincite forms (#236).
   *
   * CSM rule 1:1 uses `at p. <N>` for a single pincite and `at pp. <N-M>` for
   * a range — never bare `at <N>` as Bluebook does. Every CA `supra at p.`,
   * Id. at p., and short-form at-p. reference previously produced an
   * incomplete match with the pincite silently dropped.
   *
   * Coverage:
   *   - Supra with `, at p.` and `, at pp.` (ranges)
   *   - Supra with volume+reporter then `at p.` (short-form-ish)
   *   - Id. with `at p.` and `at pp.`
   *   - Short-form case with `at p.` and `at pp.`
   *   - Full case with trailing `, at p.` pincite
   *
   * Regression controls confirm existing Bluebook `at N` forms still work.
   */
  describe("California `at p.` / `at pp.` pincites (#236)", () => {
    describe("supra", () => {
      it("`Smith, supra, at p. 115`", () => {
        const cits = extractCitations("As Smith, supra, at p. 115 held.")
        const sup = cits.find((c) => c.type === "supra")
        expect(sup).toBeDefined()
        if (sup?.type === "supra") {
          expect(sup.pincite).toBe(115)
        }
      })

      it("`Smith, supra, at pp. 115-117` (range)", () => {
        const cits = extractCitations("See Smith, supra, at pp. 115-117 here.")
        const sup = cits.find((c) => c.type === "supra")
        expect(sup).toBeDefined()
        if (sup?.type === "supra") {
          expect(sup.pincite).toBe(115)
          expect(sup.pinciteInfo?.endPage).toBe(117)
          expect(sup.pinciteInfo?.isRange).toBe(true)
        }
      })
    })

    describe("Id.", () => {
      it("`Id. at p. 125`", () => {
        const text =
          "Smith v. Jones, 50 Cal.3d 100, 110 (Cal. 1990). Id. at p. 125."
        const cits = extractCitations(text)
        const id = cits.find((c) => c.type === "id")
        expect(id).toBeDefined()
        if (id?.type === "id") {
          expect(id.pincite).toBe(125)
        }
      })

      it("`Id. at pp. 125-130` (range)", () => {
        const text =
          "Smith v. Jones, 50 Cal.3d 100, 110 (Cal. 1990). Id. at pp. 125-130."
        const cits = extractCitations(text)
        const id = cits.find((c) => c.type === "id")
        expect(id).toBeDefined()
        if (id?.type === "id") {
          expect(id.pincite).toBe(125)
          expect(id.pinciteInfo?.endPage).toBe(130)
        }
      })
    })

    describe("short-form case", () => {
      it("`(Davis, supra, 18 Cal.4th at p. 717.)`", () => {
        // Should produce a Davis supra AND a short-form case with the Cal.4th
        // reporter intact (not absorbed as `Cal.4th at p.`).
        const cits = extractCitations("(Davis, supra, 18 Cal.4th at p. 717.)")
        const sf = cits.find((c) => c.type === "shortFormCase")
        expect(sf).toBeDefined()
        if (sf?.type === "shortFormCase") {
          expect(sf.volume).toBe(18)
          expect(sf.reporter).toBe("Cal.4th")
          expect(sf.pincite).toBe(717)
        }
      })

      it("`50 Cal.3d at pp. 115-117` range", () => {
        const cits = extractCitations(
          "(Smith, supra, 50 Cal.3d at pp. 115-117 held.)",
        )
        const sf = cits.find((c) => c.type === "shortFormCase")
        expect(sf).toBeDefined()
        if (sf?.type === "shortFormCase") {
          expect(sf.volume).toBe(50)
          expect(sf.reporter).toBe("Cal.3d")
          expect(sf.pincite).toBe(115)
          expect(sf.pinciteInfo?.endPage).toBe(117)
        }
      })
    })

    describe("full case with trailing at p. pincite", () => {
      it("`People v. Smith (1990) 50 Cal.3d 100, at p. 115`", () => {
        const cits = extractCitations(
          "People v. Smith (1990) 50 Cal.3d 100, at p. 115.",
        )
        const cases = cits.filter((c) => c.type === "case")
        expect(cases).toHaveLength(1)
        if (cases[0].type === "case") {
          expect(cases[0].pincite).toBe(115)
        }
      })

      it("`People v. Smith (1990) 50 Cal.3d 100, at pp. 115-118` range", () => {
        const cits = extractCitations(
          "People v. Smith (1990) 50 Cal.3d 100, at pp. 115-118.",
        )
        const cases = cits.filter((c) => c.type === "case")
        expect(cases).toHaveLength(1)
        if (cases[0].type === "case") {
          expect(cases[0].pincite).toBe(115)
          expect(cases[0].pinciteInfo?.endPage).toBe(118)
        }
      })
    })

    describe("regression controls — Bluebook `at N` still works", () => {
      it("`Id. at 125` (Bluebook)", () => {
        const text =
          "Smith v. Jones, 50 F.3d 100, 110 (2d Cir. 1995). Id. at 125."
        const cits = extractCitations(text)
        const id = cits.find((c) => c.type === "id")
        expect(id).toBeDefined()
        if (id?.type === "id") {
          expect(id.pincite).toBe(125)
        }
      })

      it("`Smith, supra, at 460` (Bluebook)", () => {
        const cits = extractCitations("See Smith, supra, at 460 held.")
        const sup = cits.find((c) => c.type === "supra")
        expect(sup).toBeDefined()
        if (sup?.type === "supra") {
          expect(sup.pincite).toBe(460)
        }
      })

      it("`50 F.2d at 125` (Bluebook short-form)", () => {
        const text = "Smith v. Jones, 50 F.2d 100 (1990). 50 F.2d at 125."
        const cits = extractCitations(text)
        const sf = cits.find((c) => c.type === "shortFormCase")
        expect(sf).toBeDefined()
        if (sf?.type === "shortFormCase") {
          expect(sf.volume).toBe(50)
          expect(sf.reporter).toBe("F.2d")
          expect(sf.pincite).toBe(125)
        }
      })
    })
  })
})

/**
 * Supra party-name signal-leak (#216).
 *
 * `SUPRA_PATTERN`'s party-name group greedily captures any sequence of
 * capitalized words before `supra`, so a citation that starts with a citation
 * signal (`See`, `Cf.`, `Compare`) or a sentence-initial connector (`In`,
 * `Also`, `Then`) bleeds that leading word into the captured `partyName`,
 * preventing `DocumentResolver` from matching the supra back to its full-cite
 * antecedent.
 *
 * Suite covers the issue's title fixtures (`Then Gall`, `See Gall`), the
 * issue's enumerated signal list (See / But see / But cf. / Compare / Cf. /
 * Accord / Also / E.g. / In), and the `In re` regression — `In re Smith`
 * must NOT lose the `In` because the `re` is part of the prefix.
 */
describe("supra party-name signal-leak (#216)", () => {
  describe("citation signals stripped from partyName", () => {
    it("`See Gall, supra` → partyName = 'Gall'", () => {
      const text =
        "Bd. v. FirstService, 193 A.D.3d 672 (2d Dep't 2021). See Gall, supra, at 700."
      const cits = extractCitations(text)
      const sup = cits.find((c) => c.type === "supra")
      expect(sup).toBeDefined()
      if (sup?.type === "supra") {
        expect(sup.partyName).toBe("Gall")
      }
    })

    it("`See also Gall, supra` → partyName = 'Gall'", () => {
      const cits = extractCitations(
        "Foo v. Bar, 1 F.3d 2 (1990). See also Gall, supra, at 700.",
      )
      const sup = cits.find((c) => c.type === "supra")
      expect(sup).toBeDefined()
      if (sup?.type === "supra") {
        expect(sup.partyName).toBe("Gall")
      }
    })

    it("`Compare Gall, supra` → partyName = 'Gall'", () => {
      const cits = extractCitations(
        "Foo v. Bar, 1 F.3d 2 (1990). Compare Gall, supra, at 700.",
      )
      const sup = cits.find((c) => c.type === "supra")
      expect(sup).toBeDefined()
      if (sup?.type === "supra") {
        expect(sup.partyName).toBe("Gall")
      }
    })

    it("`Cf. Gall, supra` → partyName = 'Gall'", () => {
      const cits = extractCitations(
        "Foo v. Bar, 1 F.3d 2 (1990). Cf. Gall, supra, at 700.",
      )
      const sup = cits.find((c) => c.type === "supra")
      expect(sup).toBeDefined()
      if (sup?.type === "supra") {
        expect(sup.partyName).toBe("Gall")
      }
    })

    it("`Accord Gall, supra` → partyName = 'Gall'", () => {
      const cits = extractCitations(
        "Foo v. Bar, 1 F.3d 2 (1990). Accord Gall, supra, at 700.",
      )
      const sup = cits.find((c) => c.type === "supra")
      expect(sup).toBeDefined()
      if (sup?.type === "supra") {
        expect(sup.partyName).toBe("Gall")
      }
    })
  })

  describe("sentence-initial connectors stripped from partyName", () => {
    it("`Then Gall, supra` → partyName = 'Gall'", () => {
      const text =
        "Bd. v. FirstService, 193 A.D.3d 672 (2d Dep't 2021). Then Gall, supra, at 700."
      const cits = extractCitations(text)
      const sup = cits.find((c) => c.type === "supra")
      expect(sup).toBeDefined()
      if (sup?.type === "supra") {
        expect(sup.partyName).toBe("Gall")
      }
    })

    it("`Also Gall, supra` → partyName = 'Gall'", () => {
      const cits = extractCitations(
        "Foo v. Bar, 1 F.3d 2 (1990). Also Gall, supra, at 700.",
      )
      const sup = cits.find((c) => c.type === "supra")
      expect(sup).toBeDefined()
      if (sup?.type === "supra") {
        expect(sup.partyName).toBe("Gall")
      }
    })

    it("`In Gall, supra` → partyName = 'Gall' (but NOT 'In Gall')", () => {
      const cits = extractCitations(
        "Foo v. Bar, 1 F.3d 2 (1990). In Gall, supra, at 700.",
      )
      const sup = cits.find((c) => c.type === "supra")
      expect(sup).toBeDefined()
      if (sup?.type === "supra") {
        expect(sup.partyName).toBe("Gall")
      }
    })
  })

  describe("regression controls — must preserve real party names", () => {
    it("`In re Smith, supra` → partyName = 'Smith'", () => {
      const cits = extractCitations(
        "Foo v. Bar, 1 F.3d 2 (1990). In re Smith, supra, at 700.",
      )
      const sup = cits.find((c) => c.type === "supra")
      expect(sup).toBeDefined()
      if (sup?.type === "supra") {
        expect(sup.partyName).toBe("Smith")
      }
    })

    it("`Gall, supra` (no prefix) → partyName = 'Gall'", () => {
      const cits = extractCitations(
        "Foo v. Bar, 1 F.3d 2 (1990). Gall, supra, at 700.",
      )
      const sup = cits.find((c) => c.type === "supra")
      expect(sup).toBeDefined()
      if (sup?.type === "supra") {
        expect(sup.partyName).toBe("Gall")
      }
    })

    it("`Smith v. Jones, supra` (multi-word) → partyName = 'Smith v. Jones'", () => {
      const cits = extractCitations(
        "Foo v. Bar, 1 F.3d 2 (1990). Smith v. Jones, supra, at 460.",
      )
      const sup = cits.find((c) => c.type === "supra")
      expect(sup).toBeDefined()
      if (sup?.type === "supra") {
        expect(sup.partyName).toBe("Smith v. Jones")
      }
    })

    it("`See Smith v. Jones, supra` (signal + v.) → partyName = 'Smith v. Jones'", () => {
      const cits = extractCitations(
        "Foo v. Bar, 1 F.3d 2 (1990). See Smith v. Jones, supra, at 460.",
      )
      const sup = cits.find((c) => c.type === "supra")
      expect(sup).toBeDefined()
      if (sup?.type === "supra") {
        expect(sup.partyName).toBe("Smith v. Jones")
      }
    })
  })
})

/**
 * Paragraph-marker pincites on short-form references (#204). The Id., supra,
 * and short-form case patterns must accept `¶ 12`, `¶¶ 12-14`, `para. 12`,
 * `paras. 12-14` after their respective anchors, with and without the `at`
 * keyword.
 */
describe("paragraph-marker pincites on short-forms (#204)", () => {
  describe("Id.", () => {
    it("`Id. at ¶ 12` (with `at`)", () => {
      const text = "Foo v. Bar, 1 F.3d 2 (1990). Id. at ¶ 12."
      const cits = extractCitations(text)
      const id = cits.find((c) => c.type === "id")
      expect(id).toBeDefined()
      if (id?.type === "id") {
        expect(id.pinciteInfo?.paragraph).toBe(12)
      }
    })

    it("`Id. ¶ 12` (no `at`)", () => {
      const text = "Foo v. Bar, 1 F.3d 2 (1990). Id. ¶ 12."
      const cits = extractCitations(text)
      const id = cits.find((c) => c.type === "id")
      expect(id).toBeDefined()
      if (id?.type === "id") {
        expect(id.pinciteInfo?.paragraph).toBe(12)
      }
    })

    it("`Id. ¶¶ 12-14` (range, no `at`)", () => {
      const text = "Foo v. Bar, 1 F.3d 2 (1990). Id. ¶¶ 12-14."
      const cits = extractCitations(text)
      const id = cits.find((c) => c.type === "id")
      if (id?.type === "id") {
        expect(id.pinciteInfo?.paragraph).toBe(12)
        expect(id.pinciteInfo?.endParagraph).toBe(14)
      }
    })
  })

  describe("supra", () => {
    it("`Smith, supra, ¶ 12`", () => {
      const text = "Foo v. Bar, 1 F.3d 2 (1990). Smith, supra, ¶ 12."
      const cits = extractCitations(text)
      const sup = cits.find((c) => c.type === "supra")
      expect(sup).toBeDefined()
      if (sup?.type === "supra") {
        expect(sup.pinciteInfo?.paragraph).toBe(12)
      }
    })

    it("`Smith, supra, at ¶ 12`", () => {
      const text = "Foo v. Bar, 1 F.3d 2 (1990). Smith, supra, at ¶ 12."
      const cits = extractCitations(text)
      const sup = cits.find((c) => c.type === "supra")
      if (sup?.type === "supra") {
        expect(sup.pinciteInfo?.paragraph).toBe(12)
      }
    })

    it("`Smith, supra, paras. 12-14`", () => {
      const text =
        "Foo v. Bar, 1 F.3d 2 (1990). Smith, supra, paras. 12-14."
      const cits = extractCitations(text)
      const sup = cits.find((c) => c.type === "supra")
      if (sup?.type === "supra") {
        expect(sup.pinciteInfo?.paragraph).toBe(12)
        expect(sup.pinciteInfo?.endParagraph).toBe(14)
      }
    })
  })
})

/**
 * Short-form case back-reference party name (#278).
 *
 * Bluebook short-forms commonly include a leading back-reference name
 * (`Smith, 500 F.2d at 125`). Previously the tokenizer recognized only
 * `vol reporter at page`, dropping the disambiguating name entirely — the
 * resolver then matched purely on volume + reporter, so two cases sharing
 * those values silently lost the distinguishing signal.
 *
 * Coverage:
 *   - Bare `500 F.2d at 125` still works (regression).
 *   - `Smith, 500 F.2d at 125` captures `partyName: "Smith"`.
 *   - Signal-stripped: `See Smith, 500 F.2d at 125` → `Smith` (reuses
 *     `stripSupraPartyPrefix` from #216).
 *   - Multi-word: `Smith v. Jones, 500 F.2d at 125` → `Smith v. Jones`.
 *   - Resolver: when two earlier full cites share vol+reporter, the short-
 *     form with `partyName` resolves to the matching antecedent (not the
 *     most-recent one).
 */
describe("short-form case party-name back-reference (#278)", () => {
  describe("regex captures leading party name", () => {
    it("`Smith, 500 F.2d at 125` → partyName='Smith'", () => {
      const text =
        "Smith v. Jones, 500 F.2d 100 (9th Cir. 1990). Smith, 500 F.2d at 125."
      const cits = extractCitations(text)
      const sf = cits.find((c) => c.type === "shortFormCase")
      expect(sf).toBeDefined()
      if (sf?.type === "shortFormCase") {
        expect(sf.partyName).toBe("Smith")
        expect(sf.volume).toBe(500)
        expect(sf.reporter).toBe("F.2d")
        expect(sf.pincite).toBe(125)
      }
    })

    it("`See Smith, 500 F.2d at 125` strips `See` from partyName", () => {
      const text =
        "Smith v. Jones, 500 F.2d 100 (9th Cir. 1990). See Smith, 500 F.2d at 125."
      const cits = extractCitations(text)
      const sf = cits.find((c) => c.type === "shortFormCase")
      expect(sf).toBeDefined()
      if (sf?.type === "shortFormCase") {
        expect(sf.partyName).toBe("Smith")
      }
    })

    it("`Smith v. Jones, 500 F.2d at 125` captures both parties", () => {
      const text =
        "Smith v. Jones, 500 F.2d 100 (9th Cir. 1990). Smith v. Jones, 500 F.2d at 125."
      const cits = extractCitations(text)
      const sf = cits.find((c) => c.type === "shortFormCase")
      expect(sf).toBeDefined()
      if (sf?.type === "shortFormCase") {
        expect(sf.partyName).toBe("Smith v. Jones")
      }
    })

    it("bare `500 F.2d at 125` has no partyName (regression)", () => {
      const text = "Smith v. Jones, 500 F.2d 100 (9th Cir. 1990). 500 F.2d at 125."
      const cits = extractCitations(text)
      const sf = cits.find((c) => c.type === "shortFormCase")
      expect(sf).toBeDefined()
      if (sf?.type === "shortFormCase") {
        expect(sf.partyName).toBeUndefined()
        expect(sf.volume).toBe(500)
        expect(sf.pincite).toBe(125)
      }
    })
  })

  describe("resolver uses partyName for disambiguation", () => {
    it("two cases share vol+reporter — partyName picks the right antecedent", () => {
      const text = [
        "Smith v. Jones, 500 F.2d 100 (9th Cir. 1990).",
        "Then we cited Brown v. Doe, 500 F.2d 100 (2d Cir. 1995).",
        "But in Smith, 500 F.2d at 125, the rule was settled.",
      ].join(" ")
      const cits = extractCitations(text, { resolve: true })
      const sf = cits.find((c) => c.type === "shortFormCase")
      expect(sf).toBeDefined()
      if (sf?.type === "shortFormCase") {
        // Find the Smith v. Jones full-cite index
        const smithIdx = cits.findIndex(
          (c) =>
            c.type === "case" &&
            c.plaintiff === "Smith" &&
            c.defendant === "Jones",
        )
        expect(smithIdx).toBeGreaterThanOrEqual(0)
        expect(sf.resolution?.resolvedTo).toBe(smithIdx)
      }
    })

    it("no partyName → falls back to recency (most recent vol+reporter wins)", () => {
      const text = [
        "Smith v. Jones, 500 F.2d 100 (9th Cir. 1990).",
        "Then we cited Brown v. Doe, 500 F.2d 100 (2d Cir. 1995).",
        "But 500 F.2d at 125 settled the rule.",
      ].join(" ")
      const cits = extractCitations(text, { resolve: true })
      const sf = cits.find((c) => c.type === "shortFormCase")
      expect(sf).toBeDefined()
      if (sf?.type === "shortFormCase") {
        // No partyName → recency: most recent matching full is Brown v. Doe
        const brownIdx = cits.findIndex(
          (c) =>
            c.type === "case" &&
            c.plaintiff === "Brown" &&
            c.defendant === "Doe",
        )
        expect(sf.resolution?.resolvedTo).toBe(brownIdx)
      }
    })
  })
})

describe("trailing parenthetical capture on short-form cites (#303)", () => {
  describe("Id.", () => {
    it("captures `Id. at 770 (Marsh)` — short-form case identifier", () => {
      const text =
        "We followed In re Marriage Cases (Marsh), 43 Cal.4th 757. Id. at 770 (Marsh)."
      const cites = extractCitations(text)
      const id = cites.find((c) => c.type === "id")
      expect(id?.type).toBe("id")
      if (id?.type === "id") {
        expect(id.pincite).toBe(770)
        expect(id.parenthetical).toBe("Marsh")
      }
    })

    it("captures `Id. at 770 (citation omitted)` — drop-citation marker", () => {
      const cites = extractCitations("The court agreed. Id. at 770 (citation omitted).")
      const id = cites.find((c) => c.type === "id")
      expect(id?.type).toBe("id")
      if (id?.type === "id") {
        expect(id.parenthetical).toBe("citation omitted")
      }
    })

    it("regression: `Id. at 100` (no paren) has no parenthetical field", () => {
      const cites = extractCitations("See Smith v. Jones, 100 F.3d 200. Id. at 100.")
      const id = cites.find((c) => c.type === "id")
      expect(id?.type).toBe("id")
      if (id?.type === "id") {
        expect(id.parenthetical).toBeUndefined()
      }
    })
  })

  describe("supra", () => {
    it("captures `Smith, supra, at 200 (holding ...)` — explanatory paren", () => {
      const text =
        "We followed Smith v. Doe, 100 F.3d 200. Smith, supra, at 200 (holding that the rule applies)."
      const cites = extractCitations(text)
      const supra = cites.find((c) => c.type === "supra")
      expect(supra?.type).toBe("supra")
      if (supra?.type === "supra") {
        expect(supra.parenthetical).toBe("holding that the rule applies")
      }
    })

    it("regression: `Smith, supra, at 460` (no paren) has no parenthetical field", () => {
      const cites = extractCitations(
        "See Smith v. Jones, 100 F.3d 200. Smith, supra, at 460.",
      )
      const supra = cites.find((c) => c.type === "supra")
      expect(supra?.type).toBe("supra")
      if (supra?.type === "supra") {
        expect(supra.parenthetical).toBeUndefined()
      }
    })
  })

  describe("short-form case", () => {
    it("captures `100 F.3d at 770 (citations omitted)`", () => {
      const text =
        "See Smith v. Jones, 100 F.3d 200. Plaintiff relies on the 100 F.3d at 770 (citations omitted)."
      const cites = extractCitations(text)
      const sf = cites.find((c) => c.type === "shortFormCase")
      expect(sf?.type).toBe("shortFormCase")
      if (sf?.type === "shortFormCase") {
        expect(sf.parenthetical).toBe("citations omitted")
      }
    })
  })
})
