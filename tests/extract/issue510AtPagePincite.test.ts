import { describe, expect, it } from "vitest"
import { extractCitations } from "../../src"

/**
 * Issue #510: Full-case extractor doesn't accept `at page N` / `at pages N-M`.
 *
 * `LOOKAHEAD_PINCITE_REGEX` only allowed `pp?\.` as a spelled-out prefix, not
 * `pages?`. The short-form extractor already accepts `pages?` (#344), so this
 * brings the full-case path in line.
 */
describe("issue #510: full-case `at page N` pincite", () => {
  it("captures pincite with `, at page 655`", () => {
    const cites = extractCitations("90 A.2d 653, at page 655")
    const cite = cites.find((c) => c.type === "case" && c.page === 653)
    expect(cite).toBeDefined()
    if (cite?.type === "case") {
      expect(cite.pincite).toBe(655)
    }
  })

  it("captures pincite with `, at page 664` and trailing court parenthetical", () => {
    const cites = extractCitations("90 A.2d 660, at page 664 (Del. Sup. Ct. 1952)")
    const cite = cites.find((c) => c.type === "case" && c.page === 660)
    expect(cite).toBeDefined()
    if (cite?.type === "case") {
      expect(cite.pincite).toBe(664)
      expect(cite.year).toBe(1952)
    }
  })

  it("captures pincite with `, at pages 100-105` (plural + range)", () => {
    const cites = extractCitations("90 A.2d 100, at pages 100-105")
    const cite = cites.find((c) => c.type === "case" && c.page === 100)
    expect(cite).toBeDefined()
    if (cite?.type === "case") {
      expect(cite.pincite).toBe(100)
      expect(cite.pinciteInfo?.endPage).toBe(105)
      expect(cite.pinciteInfo?.isRange).toBe(true)
    }
  })

  it("still accepts the existing `at p. 115` short form (no regression)", () => {
    const cites = extractCitations("90 A.2d 100, at p. 115")
    const cite = cites.find((c) => c.type === "case" && c.page === 100)
    expect(cite).toBeDefined()
    if (cite?.type === "case") {
      expect(cite.pincite).toBe(115)
    }
  })
})
