/**
 * Tests for A.L.R. annotation extraction (#581).
 *
 * Verifies that A.L.R. citations (e.g. `100 A.L.R.2d 1234`) are extracted
 * as `annotation` rather than mis-typed as `case`.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"

describe("extractAnnotation (#581)", () => {
  describe("bare A.L.R. series", () => {
    it("parses 100 A.L.R.2d 1234", () => {
      const cites = extractCitations("100 A.L.R.2d 1234").filter((c) => c.type === "annotation")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "annotation") {
        expect(cites[0].volume).toBe(100)
        expect(cites[0].series).toBe("A.L.R.2d")
        expect(cites[0].page).toBe(1234)
        expect(cites[0].confidence).toBe(0.95)
      }
    })

    it("parses 50 A.L.R.3d 250", () => {
      const cites = extractCitations("See 50 A.L.R.3d 250 for a survey.").filter(
        (c) => c.type === "annotation",
      )
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "annotation") {
        expect(cites[0].series).toBe("A.L.R.3d")
        expect(cites[0].volume).toBe(50)
        expect(cites[0].page).toBe(250)
      }
    })

    it("parses 1 A.L.R. 500 (first series, no ordinal)", () => {
      const cites = extractCitations("1 A.L.R. 500").filter((c) => c.type === "annotation")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "annotation") {
        expect(cites[0].series).toBe("A.L.R.")
      }
    })
  })

  describe("federal series", () => {
    it("parses 23 A.L.R. Fed. 456", () => {
      const cites = extractCitations("23 A.L.R. Fed. 456").filter((c) => c.type === "annotation")
      expect(cites).toHaveLength(1)
      if (cites[0]?.type === "annotation") {
        expect(cites[0].series).toBe("A.L.R.Fed.")
        expect(cites[0].volume).toBe(23)
        expect(cites[0].page).toBe(456)
      }
    })
  })

  describe("regression vs case classification", () => {
    it("does NOT extract A.L.R. as case (was {type: 'case', reporter: 'A.L.R.2d'})", () => {
      const cites = extractCitations("100 A.L.R.2d 1234")
      const cases = cites.filter((c) => c.type === "case")
      expect(cases).toHaveLength(0)
    })

    it("does NOT extract A.L.R. Fed. as case", () => {
      const cites = extractCitations("23 A.L.R. Fed. 456")
      const cases = cites.filter((c) => c.type === "case")
      expect(cases).toHaveLength(0)
    })
  })

  describe("position tracking", () => {
    it("preserves span positions", () => {
      const cites = extractCitations("See 100 A.L.R.2d 1234 generally.")
      const a = cites.find((c) => c.type === "annotation")
      expect(a).toBeDefined()
      if (a) {
        expect(a.span.originalStart).toBe(4)
        expect(a.span.originalEnd).toBe(21)
      }
    })
  })
})
