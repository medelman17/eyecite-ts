import { describe, expect, it } from "vitest"
import { extractCitations } from "../../src"
import { parsePincite } from "../../src/extract/pincite"

/**
 * Issue #516: Tilde (`~`) not recognized as pincite range separator.
 *
 * Likely OCR-driven (some PDF dehyphenators emit `~` for hyphens). Low
 * priority but trivial — add `~` alongside `-`, `–`, `—` in the range
 * separator class for pincite regexes. Depends on #513 having shipped first
 * so star-on-end is already valid in the page body.
 */
describe("issue #516: tilde as pincite range separator", () => {
  it("captures `at *10~*11` star range pincite with tilde", () => {
    const cites = extractCitations("2012 PA Super 169 at *10~*11")
    expect(cites.length).toBeGreaterThan(0)
    const cite = cites[0]
    expect(cite.pincite).toBe(10)
    expect(cite.pinciteInfo?.endPage).toBe(11)
    expect(cite.pinciteInfo?.starPage).toBe(true)
    expect(cite.pinciteInfo?.isRange).toBe(true)
  })

  it("captures `, 999~1000` numeric range with tilde", () => {
    const cites = extractCitations("500 F.2d 999, 999~1000")
    const cite = cites.find((c) => c.type === "case")
    expect(cite).toBeDefined()
    if (cite?.type === "case") {
      expect(cite.pincite).toBe(999)
      expect(cite.pinciteInfo?.endPage).toBe(1000)
      expect(cite.pinciteInfo?.isRange).toBe(true)
    }
  })

  it("parsePincite handles tilde in raw pincite text", () => {
    const info = parsePincite("100~105")
    expect(info?.page).toBe(100)
    expect(info?.endPage).toBe(105)
    expect(info?.isRange).toBe(true)
  })

  it("parsePincite handles tilde in paragraph range", () => {
    const info = parsePincite("¶¶ 10~12")
    expect(info?.paragraph).toBe(10)
    expect(info?.endParagraph).toBe(12)
    expect(info?.isRange).toBe(true)
  })
})
