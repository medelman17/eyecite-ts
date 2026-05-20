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

  it("should track positions across long HTML tags (issue #154)", () => {
    // Tags longer than 20 characters caused corrupted position maps — many clean
    // positions collapsed to the same original position (zero-length spans).
    const input = '<span class="citation" data-id="1">500 F.2d 123</span> (2020)'
    const result = cleanText(input, [stripHtmlTags])

    expect(result.cleaned).toBe("500 F.2d 123 (2020)")

    // "500" must map to its actual position in the original (after the 35-char tag)
    const cleanStart = result.cleaned.indexOf("500")
    const expectedOrigStart = input.indexOf("500")
    expect(result.transformationMap.cleanToOriginal.get(cleanStart)).toBe(expectedOrigStart)

    // End of "123" must map FORWARD from start — not collapse to the same point
    const cleanEnd = result.cleaned.indexOf("123") + 3
    const origStart = result.transformationMap.cleanToOriginal.get(cleanStart)
    const origEnd = result.transformationMap.cleanToOriginal.get(cleanEnd)
    expect(origStart).toBeDefined()
    expect(origEnd).toBeDefined()
    expect(origEnd).toBeGreaterThan(origStart as number)

    // No clean position within the citation should map to a position inside the tag
    const tagEnd = input.indexOf(">") + 1 // end of opening tag
    for (let i = cleanStart; i < cleanEnd; i++) {
      const orig = result.transformationMap.cleanToOriginal.get(i)
      expect(orig).toBeDefined()
      expect(orig).toBeGreaterThanOrEqual(tagEnd)
    }
  })

  it("should not produce false matches when em-dashes expand near hyphens (issue #161)", () => {
    // normalizeDashes converts — (1 char) to --- (3 chars). The old lookahead
    // would greedily match the "-" against a "-" in a nearby page range,
    // corrupting all subsequent position mappings.
    const input = "the power\u2014as used in 110-115\u2014means oversight, 500 U.S. 200"
    const result = cleanText(input, [normalizeDashes])

    expect(result.cleaned).toContain("500 U.S. 200")

    const cleanIdx = result.cleaned.indexOf("500")
    const expectedOrigIdx = input.indexOf("500")
    expect(result.transformationMap.cleanToOriginal.get(cleanIdx)).toBe(expectedOrigIdx)

    // Citation span must have non-zero length in original
    const cleanEnd = result.cleaned.indexOf("200") + 3
    const origStart = result.transformationMap.cleanToOriginal.get(cleanIdx)
    const origEnd = result.transformationMap.cleanToOriginal.get(cleanEnd)
    expect(origStart).toBeDefined()
    expect(origEnd).toBeDefined()
    expect(origEnd).toBeGreaterThan(origStart as number)
  })

  it("should produce non-zero original spans for citations in heavy HTML (issue #154)", () => {
    // Full pipeline regression: repeated citations inside long HTML tags must
    // produce originalStart < originalEnd, never zero-length.
    const html =
      '<p>' +
      Array(10)
        .fill('<span class="citation" data-id="x">500 F.2d 123</span> (2020); ')
        .join("") +
      "</p>"

    const result = cleanText(html, [stripHtmlTags])

    // Every "5" of "500" must map to a unique, increasing original position
    const offsets: number[] = []
    let searchFrom = 0
    for (let i = 0; i < 10; i++) {
      const idx = result.cleaned.indexOf("500", searchFrom)
      const orig = result.transformationMap.cleanToOriginal.get(idx)
      const origEnd = result.transformationMap.cleanToOriginal.get(idx + 12) // past "500 F.2d 123"
      expect(orig).toBeDefined()
      expect(origEnd).toBeDefined()
      expect(origEnd).toBeGreaterThan(orig as number)
      offsets.push(orig)
      searchFrom = idx + 1
    }

    // Each citation's original position must be strictly increasing
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]).toBeGreaterThan(offsets[i - 1])
    }
  })

  it("should handle text with only HTML tag removals", () => {
    const input = "<div><span>text</span></div>"
    const result = cleanText(input, [stripHtmlTags])

    expect(result.cleaned).toBe("text")

    // First character 't' is at position 0 in cleaned, position 11 in original (after "<div><span>")
    expect(result.transformationMap.cleanToOriginal.get(0)).toBe(11)
  })

  // #542 — adjacent word characters separated by a stripped HTML tag must
  // not be fused into a single token.
  it("inserts a space when stripping a tag between adjacent word characters", () => {
    const input = '100 F.3d 200<footnote label="3">200 F.3d 300</footnote>'
    const result = cleanText(input, [stripHtmlTags])

    // Cleaner must NOT produce the fused string "100 F.3d 200200 F.3d 300"
    expect(result.cleaned).not.toContain("200200")
    expect(result.cleaned).toContain("100 F.3d 200")
    expect(result.cleaned).toContain("200 F.3d 300")

    // Position of "100" must map to original "100"
    const oneHundred = result.cleaned.indexOf("100")
    expect(result.transformationMap.cleanToOriginal.get(oneHundred)).toBe(
      input.indexOf("100"),
    )

    // Position of the second-zone "200 F.3d 300" must map to original
    const twoHundred = result.cleaned.indexOf("200 F.3d 300")
    expect(twoHundred).toBeGreaterThanOrEqual(0)
    const origStart = result.transformationMap.cleanToOriginal.get(twoHundred)
    expect(origStart).toBe(input.indexOf("200 F.3d 300"))
  })

  it("does not insert a space when tag sits between non-word characters", () => {
    // Spaces and punctuation outside a tag are word-boundary friendly already;
    // the cleaner must not introduce extra spaces here.
    const input = "Smith v. <b>Doe</b>, 500 F.2d 123"
    const result = cleanText(input, [stripHtmlTags])
    expect(result.cleaned).toBe("Smith v. Doe, 500 F.2d 123")
  })

  // #546 — TransformationMap catastrophic collapse.
  //
  // Two failure modes both produce the same downstream symptom (originalStart ===
  // originalEnd, downstream slice returns empty string or unrelated text):
  //   1. `stripHtmlTags` greedily matches a stray `<` … `>` across thousands of
  //      chars of legitimate prose (OCR artifacts in CAP opinions).
  //   2. `rebuildPositionMaps` lookahead picks a false-positive alignment when
  //      adjacent tag deletions sit back-to-back (e.g. `<span>A</span><span>B</span>`).
  describe("issue #546: TransformationMap catastrophic collapse", () => {
    it("stripHtmlTags does not eat prose between stray `<` and `>`", () => {
      // Two stray angle brackets several hundred chars apart should not be
      // treated as one giant tag — they're OCR/typesetter artifacts. The
      // current greedy regex deletes everything in between (~hundreds of
      // chars). The fix requires the first char after `<` to be a letter
      // or `/`, otherwise it isn't a tag.
      const filler = "a".repeat(200) + " plaintiff " + "b".repeat(200)
      const input = `prefix te< waive ${filler} da> suffix`

      const result = cleanText(input, [stripHtmlTags])

      // Cleaner must not delete the prose between the stray brackets.
      expect(result.cleaned).toContain("waive")
      expect(result.cleaned).toContain("plaintiff")
      expect(result.cleaned).toContain("suffix")
      // Length should be unchanged (no real tags to strip).
      expect(result.cleaned.length).toBe(input.length)
    })

    it("stripHtmlTags is still permissive for real tags with attributes", () => {
      // Legit HTML must still strip correctly. The proposed fix tightens the
      // regex but keeps `<letter or /...>` patterns valid.
      const input = '<span class="citation" data-id="x">500 F.2d 123</span>'
      const result = cleanText(input, [stripHtmlTags])
      expect(result.cleaned).toBe("500 F.2d 123")
    })

    it("position map remains intact through adjacent same-tag deletions", () => {
      // The cal-app-2d/222 pattern: every Nth word wrapped in
      // `<span class="word">…</span>`. With adjacent tag deletions, the
      // CONFIRM_LEN=3 check inside the lookahead fails (because the char
      // right after a correct alignment is `<` — the start of the next
      // deleted tag), so the algorithm picks a far-away false-positive
      // match and collapses hundreds of clean positions to one orphan
      // origPos.
      const text =
        "BRAY, P. J. In a consolidated appeal in three cases, appellants " +
        "in each respective case, who were plaintiffs or petitioners " +
        "therein, appeal from adverse judgments in favor of the respective " +
        "defendants on the action between the parties hereto."
      let count = 0
      const html = text.replace(/\b(\w+)\b/g, (m) => {
        count++
        return count % 3 === 0 ? `<span class="word">${m}</span>` : m
      })

      const result = cleanText(html, [stripHtmlTags])

      // Sanity: cleaning yielded the original prose.
      expect(result.cleaned).toBe(text)

      // No origPos should be the target of more than a handful of clean
      // positions. A truly correct map yields ~3-5 collisions max around
      // word/tag boundaries — the bug produces single origPositions with
      // 100+ clean positions mapped to them.
      const counts = new Map<number, number>()
      for (const [, orig] of result.transformationMap.cleanToOriginal) {
        counts.set(orig, (counts.get(orig) ?? 0) + 1)
      }
      const maxCollision = Math.max(...counts.values())
      expect(maxCollision).toBeLessThanOrEqual(10)

      // Every clean position should map to a strictly increasing origPos
      // (within the small slack permitted by adjacent-deletion collisions).
      let prev = -1
      for (let i = 0; i < result.cleaned.length; i++) {
        const orig = result.transformationMap.cleanToOriginal.get(i)
        expect(orig).toBeDefined()
        // Original positions must be monotonically non-decreasing — the
        // catastrophic-collapse bug produces huge backwards/forwards jumps.
        expect(orig as number).toBeGreaterThanOrEqual(prev)
        prev = orig as number
      }
    })

    it("clean→original mapping never points to an unrelated region", () => {
      // Heavier variant of the cal-app-2d/222 pattern — every 3rd word in
      // a multi-paragraph passage is wrapped in `<span class="word">…</span>`.
      // The current bug produces collapsed `cleanToOriginal` mappings for
      // ~all of the prose after a few hundred chars, sending downstream
      // text slicing to a completely unrelated paragraph.
      const text =
        "BRAY, P. J. In a consolidated appeal in three cases, appellants " +
        "in each respective case, who were plaintiffs or petitioners " +
        "therein, appeal from adverse judgments in favor of the respective " +
        "defendants on the action between the parties hereto. See " +
        "500 F.2d 123 (5th Cir. 1974) and 81 Cal.App.2d 811 and 203 Cal. 665 " +
        "and 265 P. 806 supra. Compare 100 F.3d 50 (9th Cir. 1996)."
      let count = 0
      const html = text.replace(/\b(\w+)\b/g, (m) => {
        count++
        return count % 3 === 0 ? `<span class="word">${m}</span>` : m
      })

      // Default cleaner pipeline (what extractCitations uses).
      const result = cleanText(html)
      expect(result.cleaned).toBe(text)

      // For every clean position, the mapped origPos must point to a
      // location whose 30-char window in the original HTML contains the
      // cleaned character (tag-stripped) at that index. The bug sends
      // clean positions to far-away regions where the corresponding char
      // does not appear.
      const errors: string[] = []
      for (let cleanIdx = 0; cleanIdx < result.cleaned.length; cleanIdx++) {
        const orig =
          result.transformationMap.cleanToOriginal.get(cleanIdx) ?? -1
        const expectedChar = result.cleaned[cleanIdx]
        const window = html.slice(Math.max(0, orig - 5), orig + 30)
        // Strip tags from the window to see prose only.
        const proseWindow = window.replace(/<[^>]*>/g, "")
        if (!proseWindow.includes(expectedChar)) {
          errors.push(
            `clean[${cleanIdx}]=${JSON.stringify(expectedChar)} → origPos=${orig}, ` +
              `but ${JSON.stringify(proseWindow.slice(0, 30))} does not contain it`,
          )
          if (errors.length >= 3) break
        }
      }
      expect(errors).toEqual([])
    })
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

  // #333 \u2014 in-word em-dash \u2192 single hyphen (Illinois Revised Statutes
  // paragraph subdivisions, docket-number separators, page-range pincites)
  it("converts in-word em-dash between digits to a single hyphen", () => {
    expect(normalizeDashes("par. 13\u2014214(a)")).toBe("par. 13-214(a)")
  })

  it("converts in-word em-dash in page range to a single hyphen", () => {
    expect(normalizeDashes("at 875\u2014877")).toBe("at 875-877")
  })

  it("converts adjacent em-dashes in docket separators (one pass)", () => {
    expect(normalizeDashes("No. 84\u2014C\u20144508")).toBe("No. 84-C-4508")
  })

  it("preserves standalone em-dash (blank-page placeholder) as triple hyphen", () => {
    expect(normalizeDashes("500 F.4th \u2014 (2024)")).toBe("500 F.4th --- (2024)")
  })

  it("mixed input: in-word em-dash hyphenated, standalone preserved", () => {
    expect(
      normalizeDashes("par. 13\u2014214 and 500 F.4th \u2014 (2024)"),
    ).toBe("par. 13-214 and 500 F.4th --- (2024)")
  })

  it("in-word horizontal bar (U+2015) also converts to hyphen", () => {
    expect(normalizeDashes("13\u2015214")).toBe("13-214")
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

  // #548 — horizontal ellipsis (U+2026) must collapse to the ASCII 3-dot
  // form explicitly (and NOT a 10-dot leader). The expansion still inflates
  // the cleaned length, but cap it at the standard Bluebook 3-dot ellipsis
  // so downstream span math stays bounded.
  it("converts horizontal ellipsis (U+2026) to three ASCII dots (#548)", () => {
    expect(normalizeTypography("foo…bar")).toBe("foo...bar")
  })

  it("converts consecutive ellipses to runs of three dots each (#548)", () => {
    expect(normalizeTypography("………")).toBe(".........")
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
