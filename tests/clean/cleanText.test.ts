import { describe, expect, it } from "vitest"
import {
  cleanText,
  fixSmartQuotes,
  normalizeDashes,
  normalizeTypography,
  normalizeWhitespace,
  stripDiacritics,
  stripHtmlTags,
} from "../../src/clean"

describe("cleanText position tracking", () => {
  it("should maintain identity transformation when no changes occur", () => {
    const input = "Smith v. Doe, 500 F.2d 123"
    const result = cleanText(input, []) // No cleaners applied

    // Text should be unchanged
    expect(result.cleaned).toBe(input)

    // Positions should map 1:1
    expect(result.transformationMap.cleanToOriginal.get(14)).toBe(14)
    expect(result.transformationMap.originalToClean.get(14)).toBe(14)

    // All positions should map to themselves
    for (let i = 0; i <= input.length; i++) {
      expect(result.transformationMap.cleanToOriginal.get(i)).toBe(i)
      expect(result.transformationMap.originalToClean.get(i)).toBe(i)
    }
  })

  it("should track positions after HTML tag removal", () => {
    const input = "Smith v. <b>Doe</b>, 500 F.2d 123"
    const expected = "Smith v. Doe, 500 F.2d 123"
    const result = cleanText(input, [stripHtmlTags])

    expect(result.cleaned).toBe(expected)

    // The "D" in "Doe" is at position 9 in cleaned, but position 12 in original (after "<b>")
    const cleanPosOfD = 9
    const originalPosOfD = 12
    expect(result.transformationMap.cleanToOriginal.get(cleanPosOfD)).toBe(originalPosOfD)

    // The "," after "Doe" is at position 12 in cleaned, but position 19 in original (after "</b>")
    const cleanPosOfComma = 12
    const originalPosOfComma = 19
    expect(result.transformationMap.cleanToOriginal.get(cleanPosOfComma)).toBe(originalPosOfComma)
  })

  it("should track positions after whitespace normalization", () => {
    const input = "Smith  v.  Doe,   500 F.2d 123" // Multiple spaces
    const expected = "Smith v. Doe, 500 F.2d 123"
    const result = cleanText(input, [normalizeWhitespace])

    expect(result.cleaned).toBe(expected)

    // "Doe" starts at position 11 in cleaned
    // In original: "Smith  v.  Doe..." - D is at position 11 + 2 extra spaces = 13
    const cleanPosOfDoe = 11
    const originalPosOfDoe = 13 // Not 15 - there are only 2 extra spaces before "Doe"
    expect(result.transformationMap.cleanToOriginal.get(cleanPosOfDoe)).toBe(originalPosOfDoe)

    // "500" starts at position 16 in cleaned
    // In original: "Smith  v.  Doe,   500..." - 5 is at position 16 + 2 + 2 = 20
    const cleanPosOf500 = 16
    const originalPosOf500 = 20 // Not 24
    expect(result.transformationMap.cleanToOriginal.get(cleanPosOf500)).toBe(originalPosOf500)
  })

  it("should track positions through combined cleaners", () => {
    const input = "<p>Smith v. Doe, 500 F.2d 123</p>" // HTML + spaces
    const expected = "Smith v. Doe, 500 F.2d 123"
    const result = cleanText(input, [stripHtmlTags, normalizeWhitespace])

    expect(result.cleaned).toBe(expected)

    // Find "500 F.2d 123" in cleaned text
    const citationStart = expected.indexOf("500 F.2d 123")
    expect(citationStart).toBe(14) // Position in cleaned text

    // Get original position via transformation map
    const originalStart = result.transformationMap.cleanToOriginal.get(citationStart)
    expect(originalStart).toBeDefined()
    expect(originalStart).toBe(17) // After "<p>"

    // For end position, we need to be careful about how we calculate it
    // The cleanToOriginal map tracks character positions, not ranges
    // Get the position right after the last character
    const citationEnd = citationStart + "500 F.2d 123".length
    const originalEnd = result.transformationMap.cleanToOriginal.get(citationEnd)

    expect(originalEnd).toBeDefined()
    // The end position maps to 33 (after "3", before "</p>") which is actually
    // outside the citation range. This is expected - we map the position AFTER the text.
    // But for substring extraction, we should use the last char's position + 1
    const lastCharOriginalPos = result.transformationMap.cleanToOriginal.get(citationEnd - 1)
    expect(lastCharOriginalPos).toBe(28) // Position of "3"

    // Verify extraction using position of last character + 1
    const extractedFromOriginal = input.substring(
      originalStart,
      (lastCharOriginalPos ?? originalStart) + 1,
    )
    expect(extractedFromOriginal).toBe("500 F.2d 123")
  })

  it("should handle custom cleaner functions", () => {
    const input = "Smith v. Doe, 500 F.2d 123 [REDACTED]"
    const customCleaner = (text: string) => text.replace(/\[REDACTED\]/g, "")
    const expected = "Smith v. Doe, 500 F.2d 123 "

    const result = cleanText(input, [customCleaner])

    expect(result.cleaned).toBe(expected)

    // Position tracking should work with custom cleaner
    const cleanPosOfCitation = 14
    const originalPosOfCitation = 14
    expect(result.transformationMap.cleanToOriginal.get(cleanPosOfCitation)).toBe(
      originalPosOfCitation,
    )
  })

  it("should handle smart quotes transformation", () => {
    const input = "\u201CSmith\u201D v. \u2018Doe\u2019, 500 F.2d 123"
    const expected = "\"Smith\" v. 'Doe', 500 F.2d 123"
    const result = cleanText(input, [fixSmartQuotes])

    expect(result.cleaned).toBe(expected)

    // Positions should still track correctly after quote replacement
    const cleanPosOfV = expected.indexOf("v.")
    const originalPosOfV = input.indexOf("v.")
    expect(result.transformationMap.cleanToOriginal.get(cleanPosOfV)).toBe(originalPosOfV)
  })

  it("should handle default cleaner pipeline", () => {
    const input = "<p>Smith v. <b>Doe</b>, 500 F.2d 123</p>"
    const result = cleanText(input) // Default cleaners

    // Should remove HTML, normalize whitespace, normalize unicode, fix smart quotes
    expect(result.cleaned).toContain("Smith v. Doe")
    expect(result.cleaned).toContain("500 F.2d 123")
    expect(result.cleaned).not.toContain("<")
    expect(result.cleaned).not.toContain(">")

    // Should have transformation map
    expect(result.transformationMap.cleanToOriginal.size).toBeGreaterThan(0)
    expect(result.transformationMap.originalToClean.size).toBeGreaterThan(0)

    // Should have empty warnings
    expect(result.warnings).toEqual([])
  })

  it("should handle empty string", () => {
    const result = cleanText("")

    expect(result.cleaned).toBe("")
    expect(result.transformationMap.cleanToOriginal.get(0)).toBe(0)
    expect(result.transformationMap.originalToClean.get(0)).toBe(0)
  })

  it("should handle text with only HTML tag removals", () => {
    const input = "<div><span>text</span></div>"
    const result = cleanText(input, [stripHtmlTags])

    expect(result.cleaned).toBe("text")

    // First character 't' is at position 0 in cleaned, position 11 in original (after "<div><span>")
    expect(result.transformationMap.cleanToOriginal.get(0)).toBe(11)
  })
})

describe("normalizeDashes (issue #54)", () => {
  it("converts en-dash to single hyphen", () => {
    expect(normalizeDashes("105\u2013107")).toBe("105-107")
  })

  it("converts em-dash to triple hyphen for blank page matching", () => {
    expect(normalizeDashes("500 F.4th \u2014 (2024)")).toBe("500 F.4th --- (2024)")
  })

  it("handles mixed dashes", () => {
    expect(normalizeDashes("100\u2013200 and \u2014")).toBe("100-200 and ---")
  })

  it("leaves regular hyphens unchanged", () => {
    expect(normalizeDashes("105-107")).toBe("105-107")
  })

  it("converts horizontal bar (U+2015) to triple hyphen", () => {
    expect(normalizeDashes("500 F.4th \u2015 (2024)")).toBe("500 F.4th --- (2024)")
  })

  it("converts Unicode hyphen (U+2010) to ASCII hyphen", () => {
    expect(normalizeDashes("105\u2010107")).toBe("105-107")
  })

  it("converts figure dash (U+2012) to ASCII hyphen", () => {
    expect(normalizeDashes("105\u2012107")).toBe("105-107")
  })
})

describe("normalizeWhitespace — Unicode whitespace (issue #11)", () => {
  it("converts non-breaking space (U+00A0) to regular space", () => {
    expect(normalizeWhitespace("42\u00A0U.S.C.")).toBe("42 U.S.C.")
  })

  it("collapses consecutive non-breaking spaces", () => {
    expect(normalizeWhitespace("42\u00A0\u00A0U.S.C.")).toBe("42 U.S.C.")
  })

  it("converts thin space (U+2009) to regular space", () => {
    expect(normalizeWhitespace("500\u2009F.2d")).toBe("500 F.2d")
  })

  it("converts en space (U+2002) and em space (U+2003) to regular space", () => {
    expect(normalizeWhitespace("500\u2002F.2d\u2003123")).toBe("500 F.2d 123")
  })

  it("converts narrow no-break space (U+202F) to regular space", () => {
    expect(normalizeWhitespace("§\u202F1983")).toBe("§ 1983")
  })

  it("converts ideographic space (U+3000) to regular space", () => {
    expect(normalizeWhitespace("500\u3000F.2d")).toBe("500 F.2d")
  })
})

describe("normalizeTypography (issue #11)", () => {
  it("converts prime mark (U+2032) to apostrophe", () => {
    expect(normalizeTypography("Doe\u2032s")).toBe("Doe's")
  })

  it("converts reversed prime (U+2035) to apostrophe", () => {
    expect(normalizeTypography("Doe\u2035s")).toBe("Doe's")
  })

  it("strips zero-width space (U+200B)", () => {
    expect(normalizeTypography("500\u200BF.2d")).toBe("500F.2d")
  })

  it("strips word joiner (U+2060)", () => {
    expect(normalizeTypography("42\u2060 U.S.C.")).toBe("42 U.S.C.")
  })

  it("strips BOM/ZWNBSP (U+FEFF) inline", () => {
    expect(normalizeTypography("\uFEFF500 F.2d 123")).toBe("500 F.2d 123")
  })

  it("strips zero-width non-joiner (U+200C) and joiner (U+200D)", () => {
    expect(normalizeTypography("F.\u200C2d")).toBe("F.2d")
    expect(normalizeTypography("F.\u200D2d")).toBe("F.2d")
  })

  it("leaves normal text unchanged", () => {
    expect(normalizeTypography("Smith v. Doe, 500 F.2d 123")).toBe("Smith v. Doe, 500 F.2d 123")
  })
})

describe("stripDiacritics — opt-in OCR cleaner (issue #11)", () => {
  it("strips acute accents (é → e)", () => {
    expect(stripDiacritics("Hernández")).toBe("Hernandez")
  })

  it("strips umlauts (ü → u)", () => {
    expect(stripDiacritics("Müller")).toBe("Muller")
  })

  it("strips cedilla (ç → c)", () => {
    expect(stripDiacritics("François")).toBe("Francois")
  })

  it("strips tilde (ñ → n)", () => {
    expect(stripDiacritics("Muñoz")).toBe("Munoz")
  })

  it("handles multiple diacritics in one string", () => {
    expect(stripDiacritics("Hérnandéz v. García")).toBe("Hernandez v. Garcia")
  })

  it("leaves ASCII text unchanged", () => {
    expect(stripDiacritics("Smith v. Doe, 500 F.2d 123")).toBe("Smith v. Doe, 500 F.2d 123")
  })

  it("preserves section symbols and other non-diacritic Unicode", () => {
    expect(stripDiacritics("42 U.S.C. § 1983")).toBe("42 U.S.C. § 1983")
  })
})

describe("full pipeline — OCR-like legal text (issue #11)", () => {
  it("normalizes Unicode whitespace and dashes in default pipeline", () => {
    // Simulates OCR text with NBSP, em-dash placeholder, and en-dash range
    const input = "See Smith v. Doe, 500\u00A0F.4th\u00A0\u2014 (2024), 105\u2013107"
    const result = cleanText(input)
    expect(result.cleaned).toContain("500 F.4th --- (2024)")
    expect(result.cleaned).toContain("105-107")
  })

  it("strips zero-width characters that would break patterns", () => {
    const input = "500\u200B F.2d 123"
    const result = cleanText(input)
    expect(result.cleaned).toBe("500 F.2d 123")
  })

  it("handles horizontal bar as blank page placeholder", () => {
    const input = "500 F.4th \u2015 (2024)"
    const result = cleanText(input)
    expect(result.cleaned).toContain("500 F.4th --- (2024)")
  })

  it("supports opt-in stripDiacritics in custom pipeline", () => {
    const input = "Hernández v. García, 500 F.2d 123"
    const result = cleanText(input, [stripDiacritics])
    expect(result.cleaned).toBe("Hernandez v. Garcia, 500 F.2d 123")
  })

  it("tracks positions correctly through typography normalization", () => {
    // Prime mark (1 char) → apostrophe (1 char) = same-length replacement
    const input = "Doe\u2032s case, 500 F.2d 123"
    const result = cleanText(input, [normalizeTypography])
    expect(result.cleaned).toBe("Doe's case, 500 F.2d 123")

    // Position of "5" in "500" should be preserved
    const cleanPos = result.cleaned.indexOf("500")
    const originalPos = result.transformationMap.cleanToOriginal.get(cleanPos)
    expect(originalPos).toBe(input.indexOf("500"))
  })
})
