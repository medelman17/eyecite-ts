/**
 * Tests for string citation grouping (semicolon-separated citations).
 *
 * String citations group multiple authorities supporting the same proposition.
 * Detection runs as a post-extract phase on the Citation[] array.
 */

import { describe, expect, it } from "vitest"
import { detectStringCitations } from "@/extract/detectStringCites"
import type { Citation, FullCaseCitation, StatuteCitation } from "@/types/citation"
import type { Span } from "@/types/span"

/** Helper to create a minimal case citation for testing */
function makeCase(overrides: {
  cleanStart: number
  cleanEnd: number
  fullSpanStart?: number
  fullSpanEnd?: number
  subsequentHistoryOf?: { index: number; signal: "affirmed" }
}): FullCaseCitation {
  const span: Span = {
    cleanStart: overrides.cleanStart,
    cleanEnd: overrides.cleanEnd,
    originalStart: overrides.cleanStart,
    originalEnd: overrides.cleanEnd,
  }
  const fullSpan =
    overrides.fullSpanStart !== undefined
      ? {
          cleanStart: overrides.fullSpanStart,
          cleanEnd: overrides.fullSpanEnd ?? overrides.cleanEnd,
          originalStart: overrides.fullSpanStart,
          originalEnd: overrides.fullSpanEnd ?? overrides.cleanEnd,
        }
      : undefined
  return {
    type: "case",
    text: "",
    span,
    confidence: 0.8,
    matchedText: "",
    processTimeMs: 0,
    patternsChecked: 1,
    volume: 500,
    reporter: "F.2d",
    page: 123,
    fullSpan,
    subsequentHistoryOf: overrides.subsequentHistoryOf,
  }
}

describe("detectStringCitations", () => {
  describe("basic grouping", () => {
    it("groups two case citations separated by semicolon", () => {
      //   "Smith v. Jones, 500 F.2d 123 (2020); Doe v. Green, 600 F.3d 456 (2021)."
      const cleaned = "Smith v. Jones, 500 F.2d 123 (2020); Doe v. Green, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 16,
        cleanEnd: 28,
        fullSpanStart: 0,
        fullSpanEnd: 35,
      })
      const cit2 = makeCase({
        cleanStart: 53,
        cleanEnd: 65,
        fullSpanStart: 37,
        fullSpanEnd: 71,
      })
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeDefined()
      expect(cit2.stringCitationGroupId).toBe(cit1.stringCitationGroupId)
      expect(cit1.stringCitationIndex).toBe(0)
      expect(cit2.stringCitationIndex).toBe(1)
      expect(cit1.stringCitationGroupSize).toBe(2)
      expect(cit2.stringCitationGroupSize).toBe(2)
    })

    it("groups three citations in a chain", () => {
      const cleaned = "A, 500 F.2d 1 (2020); B, 600 F.3d 2 (2021); C, 700 F.4th 3 (2022)."
      const cit1 = makeCase({
        cleanStart: 3,
        cleanEnd: 14,
        fullSpanStart: 0,
        fullSpanEnd: 20,
      })
      const cit2 = makeCase({
        cleanStart: 25,
        cleanEnd: 36,
        fullSpanStart: 22,
        fullSpanEnd: 42,
      })
      const cit3 = makeCase({
        cleanStart: 47,
        cleanEnd: 59,
        fullSpanStart: 44,
        fullSpanEnd: 65,
      })
      const citations: Citation[] = [cit1, cit2, cit3]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeDefined()
      expect(cit2.stringCitationGroupId).toBe(cit1.stringCitationGroupId)
      expect(cit3.stringCitationGroupId).toBe(cit1.stringCitationGroupId)
      expect(cit1.stringCitationIndex).toBe(0)
      expect(cit2.stringCitationIndex).toBe(1)
      expect(cit3.stringCitationIndex).toBe(2)
      expect(cit1.stringCitationGroupSize).toBe(3)
      expect(cit2.stringCitationGroupSize).toBe(3)
      expect(cit3.stringCitationGroupSize).toBe(3)
    })

    it("does not group citations separated by period + prose", () => {
      const cleaned =
        "Smith v. Jones, 500 F.2d 123 (2020). The court noted Doe v. Green, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 16,
        cleanEnd: 28,
        fullSpanStart: 0,
        fullSpanEnd: 35,
      })
      const cit2 = makeCase({
        cleanStart: 70,
        cleanEnd: 82,
        fullSpanStart: 53,
        fullSpanEnd: 88,
      })
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeUndefined()
      expect(cit2.stringCitationGroupId).toBeUndefined()
    })

    it("does not group when no semicolon in gap", () => {
      const cleaned = "Smith v. Jones, 500 F.2d 123 (2020), Doe v. Green, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 16,
        cleanEnd: 28,
        fullSpanStart: 0,
        fullSpanEnd: 35,
      })
      const cit2 = makeCase({
        cleanStart: 54,
        cleanEnd: 66,
        fullSpanStart: 38,
        fullSpanEnd: 72,
      })
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeUndefined()
      expect(cit2.stringCitationGroupId).toBeUndefined()
    })

    it("excludes subsequent history citations from grouping", () => {
      const cleaned = "Smith v. Jones, 500 F.2d 123 (2020), aff'd, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 16,
        cleanEnd: 28,
        fullSpanStart: 0,
        fullSpanEnd: 35,
      })
      const cit2 = makeCase({
        cleanStart: 45,
        cleanEnd: 57,
        fullSpanStart: 45,
        fullSpanEnd: 63,
        subsequentHistoryOf: { index: 0, signal: "affirmed" },
      })
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeUndefined()
      expect(cit2.stringCitationGroupId).toBeUndefined()
    })

    it("handles single citation (no groups)", () => {
      const cleaned = "Smith v. Jones, 500 F.2d 123 (2020)."
      const cit1 = makeCase({
        cleanStart: 16,
        cleanEnd: 28,
        fullSpanStart: 0,
        fullSpanEnd: 35,
      })
      const citations: Citation[] = [cit1]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeUndefined()
    })

    it("handles empty citation array", () => {
      const citations: Citation[] = []
      detectStringCitations(citations, "some text")
      expect(citations.length).toBe(0)
    })

    it("assigns unique group IDs for separate groups", () => {
      // Group 1: A; B.  Group 2: C; D.
      const cleaned =
        "A, 100 F.2d 1 (2020); B, 200 F.3d 2 (2021). C, 300 F.4th 3 (2022); D, 400 F.4th 4 (2023)."
      const cit1 = makeCase({
        cleanStart: 3,
        cleanEnd: 13,
        fullSpanStart: 0,
        fullSpanEnd: 20,
      })
      const cit2 = makeCase({
        cleanStart: 25,
        cleanEnd: 35,
        fullSpanStart: 22,
        fullSpanEnd: 42,
      })
      const cit3 = makeCase({
        cleanStart: 47,
        cleanEnd: 58,
        fullSpanStart: 44,
        fullSpanEnd: 65,
      })
      const cit4 = makeCase({
        cleanStart: 70,
        cleanEnd: 81,
        fullSpanStart: 67,
        fullSpanEnd: 88,
      })
      const citations: Citation[] = [cit1, cit2, cit3, cit4]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeDefined()
      expect(cit2.stringCitationGroupId).toBe(cit1.stringCitationGroupId)
      expect(cit3.stringCitationGroupId).toBeDefined()
      expect(cit4.stringCitationGroupId).toBe(cit3.stringCitationGroupId)
      expect(cit1.stringCitationGroupId).not.toBe(cit3.stringCitationGroupId)
    })
  })

  describe("mid-group signal detection", () => {
    it("captures mid-group 'see also' signal", () => {
      const cleaned = "A, 500 F.2d 123 (2020); see also B, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 3,
        cleanEnd: 15,
        fullSpanStart: 0,
        fullSpanEnd: 22,
      })
      const cit2 = makeCase({
        cleanStart: 36,
        cleanEnd: 48,
        fullSpanStart: 33,
        fullSpanEnd: 55,
      })
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeDefined()
      expect(cit2.stringCitationGroupId).toBe(cit1.stringCitationGroupId)
      expect(cit2.signal).toBe("see also")
    })

    it("captures mid-group 'but see' signal", () => {
      const cleaned = "A, 500 F.2d 123 (2020); but see B, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 3,
        cleanEnd: 15,
        fullSpanStart: 0,
        fullSpanEnd: 22,
      })
      const cit2 = makeCase({
        cleanStart: 35,
        cleanEnd: 47,
        fullSpanStart: 32,
        fullSpanEnd: 54,
      })
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit2.signal).toBe("but see")
    })

    it("captures mid-group 'cf.' signal with trailing period", () => {
      const cleaned = "A, 500 F.2d 123 (2020); cf. B, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 3,
        cleanEnd: 15,
        fullSpanStart: 0,
        fullSpanEnd: 22,
      })
      const cit2 = makeCase({
        cleanStart: 31,
        cleanEnd: 43,
        fullSpanStart: 28,
        fullSpanEnd: 50,
      })
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit1.stringCitationGroupId).toBeDefined()
      expect(cit2.stringCitationGroupId).toBe(cit1.stringCitationGroupId)
      expect(cit2.signal).toBe("cf")
    })

    it("captures mid-group 'accord' signal", () => {
      const cleaned = "A, 500 F.2d 123 (2020); accord B, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 3,
        cleanEnd: 15,
        fullSpanStart: 0,
        fullSpanEnd: 22,
      })
      const cit2 = makeCase({
        cleanStart: 34,
        cleanEnd: 46,
        fullSpanStart: 31,
        fullSpanEnd: 53,
      })
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit2.signal).toBe("accord")
    })

    it("captures mid-group 'see generally' signal", () => {
      const cleaned = "A, 500 F.2d 123 (2020); see generally B, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 3,
        cleanEnd: 15,
        fullSpanStart: 0,
        fullSpanEnd: 22,
      })
      const cit2 = makeCase({
        cleanStart: 41,
        cleanEnd: 53,
        fullSpanStart: 38,
        fullSpanEnd: 60,
      })
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit2.signal).toBe("see generally")
    })

    it("does not overwrite signal already set by extractCase", () => {
      const cleaned = "A, 500 F.2d 123 (2020); see also B, 600 F.3d 456 (2021)."
      const cit1 = makeCase({
        cleanStart: 3,
        cleanEnd: 15,
        fullSpanStart: 0,
        fullSpanEnd: 22,
      })
      const cit2 = makeCase({
        cleanStart: 36,
        cleanEnd: 48,
        fullSpanStart: 33,
        fullSpanEnd: 55,
      })
      // Simulate extractCase having already set the signal
      cit2.signal = "cf"
      const citations: Citation[] = [cit1, cit2]

      detectStringCitations(citations, cleaned)

      expect(cit2.signal).toBe("cf") // Not overwritten
    })
  })

  describe("leading signal detection for non-case citations", () => {
    it("detects leading signal for statute as first group member", () => {
      const cleaned = "See 42 U.S.C. 1983; Smith v. Jones, 500 F.2d 123 (2020)."
      const statute: StatuteCitation = {
        type: "statute",
        text: "42 U.S.C. 1983",
        span: { cleanStart: 4, cleanEnd: 18, originalStart: 4, originalEnd: 18 },
        confidence: 0.8,
        matchedText: "42 U.S.C. 1983",
        processTimeMs: 0,
        patternsChecked: 1,
        code: "U.S.C.",
        section: "1983",
      }
      const caseCite = makeCase({
        cleanStart: 36,
        cleanEnd: 48,
        fullSpanStart: 20,
        fullSpanEnd: 55,
      })
      const citations: Citation[] = [statute, caseCite]

      detectStringCitations(citations, cleaned)

      expect(statute.signal).toBe("see")
      expect(statute.stringCitationGroupId).toBeDefined()
    })
  })
})
