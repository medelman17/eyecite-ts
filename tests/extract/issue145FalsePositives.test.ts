/**
 * Tests for issue #145: False positive case citations from zip codes,
 * docket numbers, and footnote markers.
 *
 * Four root causes:
 * 1. Confidence scoring uses substring match for common reporters
 * 2. isSuspiciousSingleDigitVolume too narrow (1-9 only, skips period reporters)
 * 3. No volume magnitude check (5-digit zip codes pass through)
 * 4. No docket-number pattern detection in hyphenated volumes
 */

import { beforeAll, describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import { applyFalsePositiveFilters } from "@/extract/filterFalsePositives"
import { loadReporters } from "@/data/reporters"
import type { FullCaseCitation } from "@/types/citation"
import type { Span } from "@/types/span"

/** Helper to create a minimal case citation for unit tests */
function makeCase(
  reporter: string,
  volume: number | string = 100,
  page: number = 1,
): FullCaseCitation {
  const span: Span = { cleanStart: 0, cleanEnd: 10, originalStart: 0, originalEnd: 10 }
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

describe("issue #145: false positive case citations", () => {
  beforeAll(async () => {
    await loadReporters()
  })

  // ── Root Cause 1: Confidence substring match ──────────────────────────
  describe("confidence scoring — no false boosts from substring reporter matches", () => {
    it("does not boost confidence for reporter containing 'A.' as substring (e.g., TCPA.)", () => {
      // "The FCC is the implementing agency of TCPA." contains "A." as substring
      // which falsely matches the Atlantic Reporter "A." in commonReporters
      const cits = extractCitations("6 The FCC is the implementing agency of TCPA. 47")
      const cite = cits[0]
      expect(cite).toBeDefined()
      // Should NOT get the +0.3 boost from "common reporter" match
      expect(cite.confidence).toBeLessThanOrEqual(0.5)
    })

    it("does not boost confidence for 'R. Civ. P.' matching 'P.' substring", () => {
      const cits = extractCitations("15 R. Civ. P. 54")
      const cite = cits[0]
      expect(cite).toBeDefined()
      expect(cite.confidence).toBeLessThanOrEqual(0.5)
    })

    it("still boosts confidence for actual common reporters", () => {
      const cits = extractCitations("500 F.2d 123")
      const cite = cits[0]
      expect(cite).toBeDefined()
      expect(cite.confidence).toBeGreaterThanOrEqual(0.8)
    })

    it("still boosts confidence for actual P. reporter", () => {
      const cits = extractCitations("123 P. 456")
      const cite = cits[0]
      expect(cite).toBeDefined()
      expect(cite.confidence).toBeGreaterThanOrEqual(0.8)
    })
  })

  // ── Root Cause 2: Single-digit-volume check too narrow ────────────────
  describe("footnote/paragraph marker detection — expanded volume range and period handling", () => {
    it("flags 'Fed. R. Civ. P.' as false positive despite containing periods", () => {
      // Volume 3, reporter "Fed. R. Civ. P." — not a real reporter
      const cite = makeCase("Fed. R. Civ. P.", 3)
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("flags 'R. Civ. P.' as false positive despite containing periods", () => {
      const cite = makeCase("R. Civ. P.", 15)
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("flags small volume with unrecognized period-containing reporter", () => {
      // Volume 6, reporter "The FCC ... TCPA." is not a real reporter
      const cite = makeCase("The FCC is the implementing agency of TCPA.", 6)
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("does NOT flag small volume with real period-containing reporter", () => {
      // Volume 5, reporter "F.2d" — a real reporter
      const cite = makeCase("F.2d", 5)
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.8) // unchanged
    })

    it("does NOT flag small volume with real P. reporter", () => {
      const cite = makeCase("P.", 3)
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.8) // unchanged
    })
  })

  // ── Root Cause 3: No volume magnitude check ───────────────────────────
  describe("volume plausibility — reject implausibly large volumes", () => {
    it("flags 5-digit volume as false positive (zip code pattern)", () => {
      const cite = makeCase("Counsel for Appellants", 20006)
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("flags another 5-digit volume even with period-containing reporter", () => {
      const cite = makeCase("Cal. App.", 17120)
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("does NOT flag volume 999 (plausible)", () => {
      const cite = makeCase("F.3d", 999)
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.8)
    })

    it("does NOT flag volume 600 (common for F. Supp. 3d)", () => {
      const cite = makeCase("F. Supp. 3d", 600)
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.8)
    })
  })

  // ── Root Cause 4: No docket-number pattern detection ──────────────────
  describe("docket number volumes — reject docket-style hyphenated volumes", () => {
    it("flags '24-30706' as docket-number false positive", () => {
      const cite = makeCase("Cal. App.", "24-30706")
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("flags '23-12345' as docket-number false positive", () => {
      const cite = makeCase("Cal. App.", "23-12345")
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("does NOT flag real hyphenated volume '1984-1'", () => {
      const cite = makeCase("Cal. App.", "1984-1")
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.8)
    })

    it("does NOT flag real hyphenated volume '2004-2'", () => {
      const cite = makeCase("Cal. App.", "2004-2")
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.8)
    })
  })

  // ── Integration: full pipeline ────────────────────────────────────────
  describe("full pipeline integration", () => {
    it("flags zip code text as false positive", () => {
      const cits = extractCitations("Washington, DC 20006 Counsel for Appellants 20004")
      expect(cits.every((c) => c.confidence <= 0.1)).toBe(true)
    })

    it("flags footnote marker 'Fed. R. Civ. P.' as false positive", () => {
      const cits = extractCitations("3 Fed. R. Civ. P. 50")
      expect(cits.every((c) => c.confidence <= 0.1)).toBe(true)
    })

    it("removes footnote markers with filterFalsePositives: true", () => {
      const cits = extractCitations("3 Fed. R. Civ. P. 50", { filterFalsePositives: true })
      expect(cits).toHaveLength(0)
    })

    it("preserves real citations alongside false positives", () => {
      const text =
        "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020). Washington, DC 20006 Counsel 20004."
      const cits = extractCitations(text, { filterFalsePositives: true })
      const real = cits.filter((c) => c.type === "case" && c.confidence > 0.1)
      expect(real.length).toBeGreaterThanOrEqual(1)
    })
  })
})
