/**
 * Integration tests for false positive citation filtering.
 * Tests the full pipeline with real false positive inputs.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

describe("false positive filtering (integration)", () => {
  describe("default mode (penalize + warn)", () => {
    it("penalizes I.C.J. citation", () => {
      const text = "1986 I.C.J. 14 (June 27)"
      const citations = extractCitations(text)
      expect(citations.length).toBeGreaterThanOrEqual(1)

      const flagged = citations.find((c) => c.confidence <= 0.1)
      expect(flagged).toBeDefined()
      expect(flagged?.warnings).toBeDefined()
      expect(flagged?.warnings?.some((w) => w.message.includes("non-US"))).toBe(true)
    })

    it("penalizes historical citation with old year", () => {
      const text = "3 Edw. 1, ch. 29 (1297)"
      const citations = extractCitations(text)
      const flagged = citations.find((c) => c.confidence <= 0.1)
      expect(flagged).toBeDefined()
    })

    it("does not penalize valid US citations", () => {
      const text = "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)"
      const citations = extractCitations(text)
      const caseCite = citations.find((c) => c.type === "case")
      expect(caseCite).toBeDefined()
      expect(caseCite?.confidence).toBeGreaterThan(0.1)
    })
  })

  describe("remove mode (filterFalsePositives: true)", () => {
    it("removes I.C.J. citation entirely", () => {
      const text = "1986 I.C.J. 14 (June 27)"
      const citations = extractCitations(text, { filterFalsePositives: true })
      expect(citations).toHaveLength(0)
    })

    it("removes U.N.T.S. citation entirely", () => {
      const text = "1155 U.N.T.S. 331"
      const citations = extractCitations(text, { filterFalsePositives: true })
      expect(citations).toHaveLength(0)
    })

    it("removes historical citation entirely", () => {
      const text = "8 Co. Rep. 114 (C.P. 1610)"
      const citations = extractCitations(text, { filterFalsePositives: true })
      expect(citations).toHaveLength(0)
    })

    it("keeps valid US citations when filtering", () => {
      const text = "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020); 1986 I.C.J. 14 (June 27)."
      const citations = extractCitations(text, { filterFalsePositives: true })
      expect(citations.length).toBeGreaterThanOrEqual(1)
      expect(citations.every((c) => c.confidence > 0.1)).toBe(true)
    })
  })
})
