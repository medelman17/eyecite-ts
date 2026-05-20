import { describe, expect, it } from "vitest"
import { extractCitations } from "../../src"

/**
 * Issue #505: Pincite terminator character set incomplete.
 *
 * `LOOKAHEAD_PINCITE_REGEX` previously required the page-number capture to end at
 * `[.,;)(\]]` or whitespace+non-capital. It didn't accept `:`, `[`, `»`, or curly
 * quotes — common in real-world citations (block-quote intros, parallel-citation
 * brackets, OCR artifacts, smart-quote opinions). Frequency ~6–10 per 1,000 cites.
 */
describe("issue #505: pincite terminator characters", () => {
  it("accepts colon (`579:`) as pincite terminator before a quoted block intro", () => {
    const cites = extractCitations(
      `376 N.E.2d 578, 579: "Judgments..."`,
    )
    const fullCase = cites.find((c) => c.type === "case")
    expect(fullCase).toBeDefined()
    if (fullCase?.type === "case") {
      expect(fullCase.pincite).toBe(579)
    }
  })

  it("accepts open bracket (`570[`) as pincite terminator before bracketed parallel", () => {
    const cites = extractCitations(
      "135 Md.App. 563, 570[, 763 A.2d 252] (2000)",
    )
    const md = cites.find(
      (c) => c.type === "case" && c.reporter === "Md.App.",
    )
    expect(md).toBeDefined()
    if (md?.type === "case") {
      expect(md.pincite).toBe(570)
    }
  })

  it("accepts colon (`193:`) as pincite terminator before next case body", () => {
    const cites = extractCitations("9 Humph. 187, 193: Love v. Smith")
    const cite = cites.find((c) => c.type === "case" && c.page === 187)
    expect(cite).toBeDefined()
    if (cite?.type === "case") {
      expect(cite.pincite).toBe(193)
    }
  })

  it("accepts guillemet (`713»`) as pincite terminator (OCR artifact)", () => {
    const cites = extractCitations("38 F. C. C. 683, 713» Id., 713-730")
    const cite = cites.find((c) => c.type === "case" && c.page === 683)
    expect(cite).toBeDefined()
    if (cite?.type === "case") {
      expect(cite.pincite).toBe(713)
    }
  })

  it("accepts straight double-quote (`579\"`) as pincite terminator", () => {
    const cites = extractCitations(`376 N.E.2d 578, 579"Judgments..."`)
    const cite = cites.find((c) => c.type === "case" && c.page === 578)
    expect(cite).toBeDefined()
    if (cite?.type === "case") {
      expect(cite.pincite).toBe(579)
    }
  })

  it("accepts curly double-quote as pincite terminator (smart quotes)", () => {
    const cites = extractCitations(`376 N.E.2d 578, 579“Judgments...”`)
    const cite = cites.find((c) => c.type === "case" && c.page === 578)
    expect(cite).toBeDefined()
    if (cite?.type === "case") {
      expect(cite.pincite).toBe(579)
    }
  })

  it("accepts curly single-quote as pincite terminator", () => {
    const cites = extractCitations(`376 N.E.2d 578, 579‘foo’`)
    const cite = cites.find((c) => c.type === "case" && c.page === 578)
    expect(cite).toBeDefined()
    if (cite?.type === "case") {
      expect(cite.pincite).toBe(579)
    }
  })
})
