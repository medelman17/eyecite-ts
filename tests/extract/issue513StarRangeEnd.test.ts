import { describe, expect, it } from "vitest"
import { extractCitations } from "../../src"

/**
 * Issue #513: Star-pincite range with star on END dropped in full-case extraction.
 *
 * `LOOKAHEAD_PINCITE_REGEX` page body `\*?\d+(?:-\d+)?` only allowed `*` on the
 * START of the range. Short-form already accepts `\*?\d+[-–—]\*?\d+` (per #201).
 * Aligning the full-case pattern lets `*10-*11` star ranges parse.
 */
describe("issue #513: star-pincite range with star on END", () => {
  it("captures `at *10-*11` star range pincite (full-case)", () => {
    const cites = extractCitations(
      "2012 PA Super 169 at *10-*11 (Pa.Super.Ct. 2012)",
    )
    expect(cites.length).toBeGreaterThan(0)
    const cite = cites[0]
    expect(cite.pincite).toBeDefined()
    expect(cite.pincite).toBe(10)
    expect(cite.pinciteInfo?.endPage).toBe(11)
    expect(cite.pinciteInfo?.starPage).toBe(true)
    expect(cite.pinciteInfo?.isRange).toBe(true)
  })

  it("still accepts star on start only (`*10-11`)", () => {
    const cites = extractCitations("2012 PA Super 169 at *10-11")
    expect(cites.length).toBeGreaterThan(0)
    const cite = cites[0]
    expect(cite.pincite).toBe(10)
    expect(cite.pinciteInfo?.endPage).toBe(11)
    expect(cite.pinciteInfo?.starPage).toBe(true)
  })

  it("still accepts plain numeric range (`100-105`)", () => {
    const cites = extractCitations("500 F.2d 100, 100-105")
    const cite = cites.find((c) => c.type === "case")
    expect(cite).toBeDefined()
    if (cite?.type === "case") {
      expect(cite.pincite).toBe(100)
      expect(cite.pinciteInfo?.endPage).toBe(105)
    }
  })
})
