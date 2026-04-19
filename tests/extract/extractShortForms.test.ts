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
})
