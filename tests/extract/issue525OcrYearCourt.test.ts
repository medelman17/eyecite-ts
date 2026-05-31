import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #525 — OCR artifacts block year/court extraction. The spaced-court
 * (`S. D. N. Y.`) and `;`-pincite forms were fixed in #769. This covers the
 * two remaining forms, both caused by a stray bare number (an OCR'd pincite
 * with a missing comma, or a space-separated pincite range) sitting between
 * the page and the `(court year)` parenthetical and blocking the lookahead:
 *
 *   - `128 F.2d 645 648 (4th Cir. 1942)` — missing comma before `648`.
 *   - `300 U.S. 342, 347 351 (1937)` — `347 351` OCR'd from `347-351`.
 *
 * LOOKAHEAD_PAREN_REGEX now tolerates one stray ` N` before the paren. The
 * trailing `(` is the false-positive guard — a stray number followed by a
 * reporter (a new citation) still won't match.
 */
const caseOf = (t: string) =>
  extractCitations(t).filter((c) => c.type === "case") as Array<{
    volume?: number | string
    year?: number
    court?: string
  }>

describe("Issue #525 - OCR year/court (stray pincite number)", () => {
  it("missing comma before pincite: `128 F.2d 645 648 (4th Cir. 1942)`", () => {
    const [c] = caseOf("128 F.2d 645 648 (4th Cir. 1942)")
    expect(c.year).toBe(1942)
    expect(c.court).toBe("4th Cir.")
  })

  it("space-separated OCR pincite range: `300 U.S. 342, 347 351 (1937)`", () => {
    const [c] = caseOf("300 U.S. 342, 347 351 (1937)")
    expect(c.year).toBe(1937)
  })

  // Regression controls — the canonical forms must stay correct.
  it("normal comma pincite still parses: `128 F.2d 645, 648 (4th Cir. 1942)`", () => {
    const [c] = caseOf("128 F.2d 645, 648 (4th Cir. 1942)")
    expect(c.year).toBe(1942)
    expect(c.court).toBe("4th Cir.")
  })

  it("normal hyphen range still parses: `300 U.S. 342, 347-351 (1937)`", () => {
    const [c] = caseOf("300 U.S. 342, 347-351 (1937)")
    expect(c.year).toBe(1937)
  })

  // False-positive guards — a bare number before a *reporter* must not fuse.
  it("space-separated string cite does not fuse: `100 F.2d 1 200 F.3d 2`", () => {
    const cs = caseOf("100 F.2d 1 200 F.3d 2")
    expect(cs).toHaveLength(2)
    expect(cs[0].year).toBeUndefined()
    expect(cs.map((c) => c.volume)).toEqual([100, 200])
  })

  it("pincite then new cite does not fuse: `100 U.S. 1, 5 200 U.S. 2`", () => {
    const cs = caseOf("100 U.S. 1, 5 200 U.S. 2")
    expect(cs).toHaveLength(2)
    expect(cs[0].year).toBeUndefined()
  })
})
