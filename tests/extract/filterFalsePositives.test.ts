/**
 * Tests for false positive citation filtering.
 *
 * Filters non-US and historical citations using a static blocklist
 * and year plausibility heuristic.
 */

import { describe, expect, it } from "vitest"
import { applyFalsePositiveFilters } from "@/extract/filterFalsePositives"
import type { FullCaseCitation, JournalCitation } from "@/types/citation"
import type { Span } from "@/types/span"

/** Helper to create a minimal case citation */
function makeCase(reporter: string, year?: number): FullCaseCitation {
  const span: Span = { cleanStart: 0, cleanEnd: 10, originalStart: 0, originalEnd: 10 }
  return {
    type: "case",
    text: "",
    span,
    confidence: 0.8,
    matchedText: "",
    processTimeMs: 0,
    patternsChecked: 1,
    volume: 100,
    reporter,
    page: 1,
    year,
  }
}

/** Helper to create a minimal journal citation */
function makeJournal(abbreviation: string, year?: number): JournalCitation {
  const span: Span = { cleanStart: 0, cleanEnd: 10, originalStart: 0, originalEnd: 10 }
  return {
    type: "journal",
    text: "",
    span,
    confidence: 0.6,
    matchedText: "",
    processTimeMs: 0,
    patternsChecked: 1,
    journal: abbreviation,
    abbreviation,
    year,
  }
}

describe("applyFalsePositiveFilters", () => {
  describe("blocklist — penalize mode (remove: false)", () => {
    it("flags I.C.J. as false positive", () => {
      const cit = makeCase("I.C.J.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result).toHaveLength(1)
      expect(result[0].confidence).toBe(0.1)
      expect(result[0].warnings).toBeDefined()
      expect(result[0].warnings?.[0].message).toContain("non-US")
    })

    it("flags U.N.T.S. as false positive", () => {
      const cit = makeCase("U.N.T.S.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("flags Co. Rep. as false positive", () => {
      const cit = makeCase("Co. Rep.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("flags Edw. as false positive", () => {
      const cit = makeCase("Edw.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("does NOT flag Edw. Ch. (valid US reporter)", () => {
      const cit = makeCase("Edw. Ch.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.8) // unchanged
      expect(result[0].warnings).toBeUndefined()
    })

    it("does NOT flag valid US reporters", () => {
      const cit1 = makeCase("F.2d")
      const cit2 = makeCase("U.S.")
      const cit3 = makeCase("S. Ct.")
      const result = applyFalsePositiveFilters([cit1, cit2, cit3], false)
      expect(result[0].confidence).toBe(0.8)
      expect(result[1].confidence).toBe(0.8)
      expect(result[2].confidence).toBe(0.8)
    })

    it("flags journal citations by abbreviation", () => {
      const cit = makeJournal("All E.R.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("blocklist is case-insensitive", () => {
      const cit = makeCase("i.c.j.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.1)
    })
  })

  describe("year plausibility — penalize mode (remove: false)", () => {
    it("flags year 1297 as implausible", () => {
      const cit = makeCase("Edw.", 1297)
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.1)
      // "Edw." also hits the blocklist, so the year warning may not be first
      const yearWarning = result[0].warnings?.find((w) => w.message.includes("1750"))
      expect(yearWarning).toBeDefined()
    })

    it("flags year 1610 as implausible", () => {
      const cit = makeCase("Some Rep.", 1610)
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("does NOT flag year 1850", () => {
      const cit = makeCase("Some Rep.", 1850)
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.8)
    })

    it("does NOT flag citations without a year", () => {
      const cit = makeCase("Some Rep.")
      const result = applyFalsePositiveFilters([cit], false)
      expect(result[0].confidence).toBe(0.8)
    })
  })

  describe("remove mode (remove: true)", () => {
    it("removes blocklisted citations", () => {
      const blocked = makeCase("I.C.J.")
      const valid = makeCase("F.2d")
      const result = applyFalsePositiveFilters([blocked, valid], true)
      expect(result).toHaveLength(1)
      expect(result[0].type === "case" && result[0].reporter === "F.2d").toBe(true)
    })

    it("removes year-flagged citations", () => {
      const old = makeCase("Edw.", 1297)
      const modern = makeCase("F.2d", 2020)
      const result = applyFalsePositiveFilters([old, modern], true)
      expect(result).toHaveLength(1)
    })

    it("returns empty array when all filtered", () => {
      const cit = makeCase("I.C.J.")
      const result = applyFalsePositiveFilters([cit], true)
      expect(result).toHaveLength(0)
    })

    it("preserves string cite group metadata on remaining members", () => {
      const blocked = makeCase("I.C.J.")
      blocked.stringCitationGroupId = "sc-0"
      blocked.stringCitationIndex = 0
      blocked.stringCitationGroupSize = 2

      const valid = makeCase("F.2d")
      valid.stringCitationGroupId = "sc-0"
      valid.stringCitationIndex = 1
      valid.stringCitationGroupSize = 2

      const result = applyFalsePositiveFilters([blocked, valid], true)
      expect(result).toHaveLength(1)
      // Group metadata is preserved as-is — the groupSize reflects the
      // original grouping, not the post-filter count
      expect(result[0].stringCitationGroupId).toBe("sc-0")
      expect(result[0].stringCitationIndex).toBe(1)
      expect(result[0].stringCitationGroupSize).toBe(2)
    })
  })

  describe("idempotency", () => {
    it("does not duplicate warnings when penalize mode runs twice", () => {
      const cit = makeCase("I.C.J.")
      applyFalsePositiveFilters([cit], false)
      expect(cit.warnings).toHaveLength(1)
      expect(cit.confidence).toBe(0.1)

      // Run again — should not add another warning
      applyFalsePositiveFilters([cit], false)
      expect(cit.warnings).toHaveLength(1)
      expect(cit.confidence).toBe(0.1)
    })
  })

  describe("short-form citations", () => {
    it("does not filter shortFormCase citations (they reference an antecedent)", () => {
      const shortForm = {
        type: "shortFormCase" as const,
        text: "",
        span: { cleanStart: 0, cleanEnd: 10, originalStart: 0, originalEnd: 10 },
        confidence: 0.7,
        matchedText: "",
        processTimeMs: 0,
        patternsChecked: 1,
        reporter: "I.C.J.",
        volume: 1986,
        page: 14,
        antecedent: undefined,
      }
      const result = applyFalsePositiveFilters([shortForm], false)
      expect(result[0].confidence).toBe(0.7) // unchanged
    })
  })

  describe("implausible reporter detection (#121)", () => {
    it("flags reporter containing blocklisted word 'Court'", () => {
      const cite = makeCase(
        "Court dismissed the complaint for failure to state a claim under Rule",
      )
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.1)
    })

    it("removes implausible reporter in remove mode", () => {
      const cite = makeCase(
        "Court dismissed the complaint for failure to state a claim under Rule",
      )
      const result = applyFalsePositiveFilters([cite], true)
      expect(result).toHaveLength(0)
    })

    it("does not flag real reporters with periods", () => {
      const cite = makeCase("Cal. App. 4th")
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.8)
    })

    it("does not flag short period-less reporters", () => {
      const cite = makeCase("Cal")
      const result = applyFalsePositiveFilters([cite], false)
      expect(result[0].confidence).toBe(0.8)
    })
  })
})
