/**
 * Tests for issue #146: Short-form and id citation extraction
 * captures sentence fragments and document headers.
 *
 * Root cause: filterFalsePositives.getReporter() only checks type "case",
 * so shortFormCase citations bypass all reporter validation.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

describe("issue #146: short-form false positives", () => {
  describe("shortFormCase — prose 'at' keyword false positives", () => {
    it("flags prose 'at' as false positive (paragraph number + text + at + number)", () => {
      const cits = extractCitations(
        "15 The Court concluded that the regulation at 3 was applicable.",
      )
      const sf = cits.find((c) => c.type === "shortFormCase")
      if (sf) {
        expect(sf.confidence).toBeLessThanOrEqual(0.1)
      }
    })

    it("flags numbered list item with 'at' in prose", () => {
      const cits = extractCitations(
        "10 Members of the Committee objected at 2 of the hearings.",
      )
      const sf = cits.find((c) => c.type === "shortFormCase")
      if (sf) {
        expect(sf.confidence).toBeLessThanOrEqual(0.1)
      }
    })

    it("removes prose short-form FPs with filterFalsePositives: true", () => {
      const cits = extractCitations(
        "15 The Court concluded that the regulation at 3 was applicable.",
        { filterFalsePositives: true },
      )
      const sf = cits.find((c) => c.type === "shortFormCase")
      expect(sf).toBeUndefined()
    })
  })

  describe("shortFormCase — real short-form citations preserved", () => {
    it("preserves real short-form with common reporter", () => {
      const cits = extractCitations("597 U.S., at 721")
      const sf = cits.find((c) => c.type === "shortFormCase")
      expect(sf).toBeDefined()
      expect(sf!.confidence).toBeGreaterThanOrEqual(0.6)
    })

    it("preserves real short-form with federal reporter", () => {
      const cits = extractCitations("500 F.3d at 130")
      const sf = cits.find((c) => c.type === "shortFormCase")
      expect(sf).toBeDefined()
      expect(sf!.confidence).toBeGreaterThanOrEqual(0.6)
    })
  })
})
