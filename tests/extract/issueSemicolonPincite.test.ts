import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #525 (semicolon-pincite sub-issue) — OCR'd older opinions
 * sometimes use a semicolon between page and pincite
 * (`256 F.Supp. 572; 573-574 (court year)`). The comma-only
 * separator in LOOKAHEAD_PINCITE_REGEX + LOOKAHEAD_PAREN_REGEX
 * dropped both the pincite AND the trailing year/court paren.
 */
describe("Issue #525 - semicolon between page and pincite", () => {
  it("`256 F.Supp. 572; 573-574 (S.D.N.Y. 1966)` extracts pincite + year + court", () => {
    const cs = extractCitations(`256 F.Supp. 572; 573-574 (S.D.N.Y. 1966)`).filter(
      (c) => c.type === "case",
    )
    expect(cs).toHaveLength(1)
    const c = cs[0] as { pincite?: number; year?: number; court?: string }
    expect(c.pincite).toBe(573)
    expect(c.year).toBe(1966)
    expect(c.court).toBe("S.D.N.Y.")
  })

  it("`Smith, 100 F.2d 1; 5-7 (9th Cir. 1990)` works with case name", () => {
    const cs = extractCitations(
      `Smith v. Jones, 100 F.2d 1; 5-7 (9th Cir. 1990)`,
    ).filter((c) => c.type === "case")
    expect(cs).toHaveLength(1)
    const c = cs[0] as { pincite?: number; year?: number; court?: string }
    expect(c.pincite).toBe(5)
    expect(c.year).toBe(1990)
  })

  it("canonical `, 573` form still works (regression)", () => {
    const cs = extractCitations(`256 F.Supp. 572, 573 (S.D.N.Y. 1966)`).filter(
      (c) => c.type === "case",
    )
    expect(cs).toHaveLength(1)
    const c = cs[0] as { pincite?: number; year?: number }
    expect(c.pincite).toBe(573)
    expect(c.year).toBe(1966)
  })

  it("` at 573` form still works (regression)", () => {
    const cs = extractCitations(`256 F.Supp. 572 at 573 (S.D.N.Y. 1966)`).filter(
      (c) => c.type === "case",
    )
    expect(cs).toHaveLength(1)
    const c = cs[0] as { pincite?: number; year?: number }
    expect(c.pincite).toBe(573)
    expect(c.year).toBe(1966)
  })
})
