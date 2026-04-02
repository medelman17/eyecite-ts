import { describe, expect, it } from "vitest"
import { getSurroundingContext } from "../../src/utils"

describe("getSurroundingContext", () => {
  describe("sentence mode (default)", () => {
    it("extracts sentence containing the span", () => {
      const text = "First sentence. In Smith v. Doe, 500 F.2d 123 (2020), the Court held X. Third sentence."
      // The citation span: "500 F.2d 123 (2020)"
      const span = { start: 33, end: 52 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("In Smith v. Doe, 500 F.2d 123 (2020), the Court held X.")
    })

    it("handles citation at start of text", () => {
      const text = "500 F.2d 123 (2020) established the standard. Next sentence."
      const span = { start: 0, end: 19 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("500 F.2d 123 (2020) established the standard.")
    })

    it("handles citation at end of text", () => {
      const text = "The Court cited 500 F.2d 123"
      const span = { start: 16, end: 28 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("The Court cited 500 F.2d 123")
    })

    it("does not split on period in Corp.", () => {
      const text = "Previously, in Bell Atl. Corp. v. Twombly, 550 U.S. 544 (2007), the Court held that a complaint must plead plausible facts. Next."
      const span = { start: 43, end: 62 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toContain("Bell Atl. Corp. v. Twombly")
      expect(result.text).toContain("plausible facts")
    })

    it("does not split on period in U.S.", () => {
      const text = "See 550 U.S. 544 for details. Another sentence."
      const span = { start: 4, end: 16 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("See 550 U.S. 544 for details.")
    })

    it("does not split on period in F.3d", () => {
      const text = "Prior case. The ruling in 300 F.3d 456 was significant. After."
      const span = { start: 26, end: 38 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("The ruling in 300 F.3d 456 was significant.")
    })

    it("does not split on period in No.", () => {
      const text = "In Case No. 12-345, the court ruled favorably. End."
      const span = { start: 3, end: 19 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("In Case No. 12-345, the court ruled favorably.")
    })

    it("does not split on period in v.", () => {
      const text = "First. In Smith v. Jones, the holding was clear. Last."
      const span = { start: 7, end: 24 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("In Smith v. Jones, the holding was clear.")
    })

    it("handles question mark as sentence boundary", () => {
      const text = "Did 500 F.2d 123 apply? The court said yes."
      const span = { start: 4, end: 16 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("Did 500 F.2d 123 apply?")
    })

    it("handles exclamation mark as sentence boundary", () => {
      const text = "Remarkable! See 500 F.2d 123 for details. End."
      const span = { start: 16, end: 28 }
      const result = getSurroundingContext(text, span)
      expect(result.text).toBe("See 500 F.2d 123 for details.")
    })

    it("returns correct span offsets", () => {
      const text = "First sentence. The citation 500 F.2d 123 matters. Third."
      const span = { start: 29, end: 41 }
      const result = getSurroundingContext(text, span)
      expect(result.span.start).toBe(16)
      expect(result.span.end).toBe(50)
      expect(text.slice(result.span.start, result.span.end)).toBe(result.text)
    })

    it("respects maxLength by trimming to sentence boundary", () => {
      const text = "A".repeat(300) + ". See 500 F.2d 123 here. End."
      const span = { start: 306, end: 318 }
      const result = getSurroundingContext(text, span, { maxLength: 50 })
      expect(result.text.length).toBeLessThanOrEqual(50)
    })
  })

  describe("paragraph mode", () => {
    it("extracts paragraph containing the span", () => {
      const text = "First paragraph.\n\nIn the second paragraph, see 500 F.2d 123 for the holding.\n\nThird paragraph."
      const span = { start: 48, end: 60 }
      const result = getSurroundingContext(text, span, { type: "paragraph" })
      expect(result.text).toBe("In the second paragraph, see 500 F.2d 123 for the holding.")
    })

    it("handles single paragraph (no breaks)", () => {
      const text = "Only one paragraph with 500 F.2d 123 in it."
      const span = { start: 24, end: 36 }
      const result = getSurroundingContext(text, span, { type: "paragraph" })
      expect(result.text).toBe("Only one paragraph with 500 F.2d 123 in it.")
    })
  })
})
