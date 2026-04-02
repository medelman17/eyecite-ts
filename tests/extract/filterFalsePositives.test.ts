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
  })
})
