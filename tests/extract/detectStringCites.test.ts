/**
 * Tests for string citation grouping (semicolon-separated citations).
 *
 * String citations group multiple authorities supporting the same proposition.
 * Detection runs as a post-extract phase on the Citation[] array.
 */

import { describe, expect, it } from "vitest"
import { detectStringCitations } from "@/extract/detectStringCites"
import type { Citation, FullCaseCitation } from "@/types/citation"
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
      const cleaned =
        "Smith v. Jones, 500 F.2d 123 (2020); Doe v. Green, 600 F.3d 456 (2021)."
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
      const cleaned =
        "Smith v. Jones, 500 F.2d 123 (2020), Doe v. Green, 600 F.3d 456 (2021)."
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
      const cleaned =
        "Smith v. Jones, 500 F.2d 123 (2020), aff'd, 600 F.3d 456 (2021)."
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
})
