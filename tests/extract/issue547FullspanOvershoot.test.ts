/**
 * Tests for issue #547: fullSpan overshoots into preceding prose on regex
 * false-positive citations.
 *
 * Three CAP audit repros where the broad state-reporter regex matches
 * `\d+\s+Capitalized+\s+\d+` shapes that straddle a hard line break in
 * the original text:
 *   1. f-supp-3d/232 0695-01: "1-602 Applications\nOn October 19"
 *      — section-heading + body sentence concatenated by cleaner
 *   2. frd/231 0550-01:       "5713 Monona Drive\nMonona WI 53716"
 *      — form-field address spanning lines
 *   3. f-supp-3d/150 0228-01: "56\nFed. R. Civ.' P. 56"
 *      — section heading + smart-quote-artifact rule reference
 *
 * Root cause: the cleaner collapses `\n` to space, hiding the line break in
 * cleaned text. The broad state-reporter tokenizer happily matches across
 * the (now-invisible) line break. The case-name backward scanner then pulls
 * the preceding heading/form-label line into `caseName` / `fullSpan`.
 *
 * Fix: a `case` (or `shortFormCase`) citation whose original-text span
 * contains `\n` is a structural false positive. Real reporter abbreviations
 * are atomic — they never wrap a hard line break, and the body of a single
 * citation (volume + reporter + page) is short enough to fit on one line in
 * any reasonable formatting. (Truly wrapped citations are stitched by
 * `rejoinHyphenatedWords` before whitespace normalization.)
 *
 * Across 758 case citations in 100 random CAP opinions, exactly 3 cross a
 * newline — and all 3 are obvious false positives (confidence ≤ 0.2 before
 * this fix). Zero observed false negatives.
 */

import { beforeAll, describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import { applyFalsePositiveFilters } from "@/extract/filterFalsePositives"
import { loadReporters } from "@/data/reporters"
import type { FullCaseCitation } from "@/types/citation"
import type { Span } from "@/types/span"

/** Helper to create a minimal case citation with explicit original-text span */
function makeCaseAt(
  reporter: string,
  volume: number | string,
  page: number,
  originalStart: number,
  originalEnd: number,
): FullCaseCitation {
  const span: Span = {
    cleanStart: originalStart,
    cleanEnd: originalEnd,
    originalStart,
    originalEnd,
  }
  return {
    type: "case",
    text: "",
    span,
    confidence: 0.8,
    matchedText: "",
    processTimeMs: 0,
    patternsChecked: 1,
    volume,
    reporter,
    page,
  }
}

describe("issue #547: fullSpan overshoots on line-crossing false positives", () => {
  beforeAll(async () => {
    await loadReporters()
  })

  describe("unit: applyFalsePositiveFilters detects newline in cite span", () => {
    it("flags a case cite whose original-text slice contains \\n (penalize mode)", () => {
      const text = "foo 100 Bar\nBaz 5 qux"
      // matched: "100 Bar\nBaz 5" at offsets [4, 17]
      const cit = makeCaseAt("Bar Baz", 100, 5, 4, 17)
      const result = applyFalsePositiveFilters([cit], false, text)
      expect(result).toHaveLength(1)
      expect(result[0].confidence).toBe(0.1)
      const lineWarning = result[0].warnings?.find((w) =>
        w.message.toLowerCase().includes("line break"),
      )
      expect(lineWarning, "should attach a line-break warning").toBeDefined()
    })

    it("removes a line-crossing cite in remove mode", () => {
      // text positions matter: lineCrossing spans the \n; the clean F.2d
      // cite (offsets [27, 39]) lives entirely AFTER the \n on a single line.
      const text = "foo 100 Bar\nBaz 5 quxxxxxxx 500 F.2d 123 (1990)"
      //            0         1         2         3         4
      //            0123456789012345678901234567890123456789012345678
      const lineCrossing = makeCaseAt("Bar Baz", 100, 5, 4, 17)
      const valid = makeCaseAt("F.2d", 500, 123, 28, 40)
      // sanity: confirm test fixture spans
      expect(text.slice(4, 17)).toContain("\n")
      expect(text.slice(28, 40)).toBe("500 F.2d 123")
      const result = applyFalsePositiveFilters([lineCrossing, valid], true, text)
      expect(result).toHaveLength(1)
      expect((result[0] as FullCaseCitation).reporter).toBe("F.2d")
    })

    it("does NOT flag a cite whose original-text slice has no newline", () => {
      const text = "Smith v. Jones, 500 F.2d 123 (1990)"
      const cit = makeCaseAt("F.2d", 500, 123, 16, 28)
      const result = applyFalsePositiveFilters([cit], false, text)
      expect(result[0].confidence).toBe(0.8)
      expect(result[0].warnings ?? []).toHaveLength(0)
    })

    it("strips fullSpan from a flagged line-crossing cite (penalize mode)", () => {
      const text = "foo 100 Bar\nBaz 5 qux"
      const cit = makeCaseAt("Bar Baz", 100, 5, 4, 17)
      cit.fullSpan = {
        cleanStart: 0,
        cleanEnd: 17,
        originalStart: 0,
        originalEnd: 17,
      }
      const result = applyFalsePositiveFilters([cit], false, text)
      expect(result[0].confidence).toBe(0.1)
      expect((result[0] as FullCaseCitation).fullSpan).toBeUndefined()
    })

    it("preserves fullSpan on non-flagged cites", () => {
      const text = "Smith v. Jones, 500 F.2d 123 (1990)"
      const cit = makeCaseAt("F.2d", 500, 123, 16, 28)
      cit.fullSpan = {
        cleanStart: 0,
        cleanEnd: 35,
        originalStart: 0,
        originalEnd: 35,
      }
      const result = applyFalsePositiveFilters([cit], false, text)
      expect((result[0] as FullCaseCitation).fullSpan).toBeDefined()
    })
  })

  describe("integration: repro 1 — section heading + body sentence", () => {
    // From f-supp-3d/232 → json/0695-01.json
    const text =
      "SUMF ¶¶ 67, 70.\n" +
      "2. Denials of 1-⅕85 and 1-602 Applications\n" +
      "On October 19, 2015, USCIS issued Notices of Intent."

    it("flags the line-crossing cite to confidence ≤ 0.1", () => {
      const cits = extractCitations(text)
      const phantom = cits.find((c) =>
        c.matchedText.includes("1-602 Applications"),
      )
      expect(phantom, "phantom cite should be extracted under broad regex").toBeDefined()
      expect(phantom!.confidence).toBeLessThanOrEqual(0.1)
    })

    it("strips fullSpan from the flagged phantom (no preceding prose leaks)", () => {
      const cits = extractCitations(text)
      const phantom = cits.find((c) =>
        c.matchedText.includes("1-602 Applications"),
      )
      expect(phantom).toBeDefined()
      expect((phantom as FullCaseCitation).fullSpan).toBeUndefined()
    })

    it("removes the phantom entirely when filterFalsePositives is true", () => {
      const cits = extractCitations(text, { filterFalsePositives: true })
      const phantom = cits.find((c) =>
        c.matchedText.includes("1-602 Applications"),
      )
      expect(phantom).toBeUndefined()
    })
  })

  describe("integration: repro 2 — form-field address spanning lines", () => {
    // From frd/231 → json/0550-01.json
    const text =
      "EMPLOYER’S NAME: The Ultimate Spa Salon\n" +
      "EMPLOYER’S ADDRESS: 5713 Monona Drive\n" +
      "Monona WI 53716\n" +
      "You have 60 days from the date of this notification."

    it("flags the address-shaped phantom", () => {
      const cits = extractCitations(text)
      const phantom = cits.find((c) =>
        c.matchedText.includes("5713 Monona Drive"),
      )
      expect(phantom).toBeDefined()
      expect(phantom!.confidence).toBeLessThanOrEqual(0.1)
    })

    it("does not surface address text in fullSpan", () => {
      const cits = extractCitations(text)
      const phantom = cits.find((c) =>
        c.matchedText.includes("5713 Monona Drive"),
      )
      expect((phantom as FullCaseCitation).fullSpan).toBeUndefined()
    })
  })

  describe("integration: repro 3 — section heading + FRCP rule with smart-quote artifact", () => {
    // From f-supp-3d/150 → json/0228-01.json
    const text =
      "the parties’ dispute despite the fact that it finds that it is permitted.\n" +
      "2. Fed. R. Civ. P. 56\n" +
      "Fed. R. Civ.’ P. 56(a) provides that a court may grant summary judgment."

    it("flags the smart-quote-artifact FRCP phantom (was conf 0.45 before fix)", () => {
      const cits = extractCitations(text)
      // Smart-quote `’` is normalized to `'` by the cleaner, so the matchedText
      // contains "Fed. R. Civ.' P." (ASCII apostrophe).
      const phantom = cits.find(
        (c) => c.type === "case" && c.matchedText.includes("Fed. R. Civ.' P."),
      )
      expect(phantom, "phantom cite from FRCP rule should extract under broad regex").toBeDefined()
      expect(phantom!.confidence).toBeLessThanOrEqual(0.1)
    })

    it("strips fullSpan so heading line above does not leak", () => {
      const cits = extractCitations(text)
      const phantom = cits.find(
        (c) => c.type === "case" && c.matchedText.includes("Fed. R. Civ.' P."),
      )
      expect((phantom as FullCaseCitation).fullSpan).toBeUndefined()
    })
  })

  describe("regression: a real citation that happens to sit on a line boundary", () => {
    it("does NOT flag a real cite that lives entirely on one line", () => {
      // A wrapped paragraph where the cite is intact on one line.
      const text =
        "The court relied on Smith v. Jones, 500 F.2d 123 (2d Cir. 1980),\n" +
        "which held that the doctrine applies broadly."
      const cits = extractCitations(text)
      const cite = cits.find(
        (c) => c.type === "case" && (c as FullCaseCitation).reporter === "F.2d",
      )
      expect(cite).toBeDefined()
      // The matched text for the core cite should NOT cross a newline.
      const slice = text.slice(cite!.span.originalStart, cite!.span.originalEnd)
      expect(slice.includes("\n")).toBe(false)
      // Confidence stays high.
      expect(cite!.confidence).toBeGreaterThan(0.5)
    })
  })
})
