import { describe, it, expect } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

describe("Id. citation confidence scoring (issue #129)", () => {
  function getIdConfidence(text: string): number | undefined {
    const cits = extractCitations(text)
    const id = cits.find((c) => c.type === "id")
    return id?.confidence
  }

  describe("standard form — confidence 1.0", () => {
    it("bare Id.", () => {
      expect(getIdConfidence("See 500 F.2d 100 (1974). Id.")).toBe(1.0)
    })

    it("Id. at pincite", () => {
      expect(getIdConfidence("See 500 F.2d 100 (1974). Id. at 253")).toBe(1.0)
    })

    it("after semicolon (string citation)", () => {
      expect(getIdConfidence("500 F.2d 100; Id. at 105")).toBe(1.0)
    })

    it("after close parenthetical", () => {
      expect(getIdConfidence("(2d Cir. 1974) Id. at 5")).toBe(1.0)
    })
  })

  describe("comma variant — confidence 0.9", () => {
    it("Id., at pincite", () => {
      expect(getIdConfidence("See 500 F.2d 100 (1974). Id., at 28")).toBe(0.9)
    })

    it("Id., at range", () => {
      expect(getIdConfidence("See 500 F.2d 100 (1974). Id., at 108-109")).toBe(0.9)
    })
  })

  describe("lowercase — confidence 0.85", () => {
    it("bare id.", () => {
      expect(getIdConfidence("See 500 F.2d 100 (1974). id.")).toBe(0.85)
    })

    it("id. at pincite", () => {
      expect(getIdConfidence("See 500 F.2d 100 (1974). id. at 5")).toBe(0.85)
    })

    it("id., at pincite (lowercase + comma)", () => {
      expect(getIdConfidence("See 500 F.2d 100 (1974). id., at 10")).toBe(0.85)
    })
  })

  describe("context validation — non-citation contexts penalized", () => {
    it("mid-sentence 'The Id. card' gets low confidence", () => {
      const conf = getIdConfidence("The Id. card was invalid.")
      expect(conf).toBeLessThanOrEqual(0.4)
    })

    it("mid-sentence 'His Id.' gets low confidence", () => {
      const conf = getIdConfidence("His Id. showed his age.")
      expect(conf).toBeLessThanOrEqual(0.4)
    })
  })
})
