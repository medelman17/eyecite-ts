import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #613 — `inheritSubsequentHistoryCaseName` mutated caseName onto
 * subsequent-history child citations after `buildCaseCitation` had
 * already locked in their confidence score, so the +0.15 caseName
 * bonus never fired for the child. Mirror of #556's fix on the
 * parallel-cite path.
 */
describe("Issue #613 - subsequent-history child confidence recomputed", () => {
  it("aff'd child inherits parent caseName + gets confidence bonus", () => {
    const text = `Smith v. Jones, 100 F.2d 1 (9th Cir. 1990), aff'd, 200 U.S. 5 (1991).`
    const cs = extractCitations(text).filter((c) => c.type === "case")
    expect(cs.length).toBeGreaterThanOrEqual(2)
    const child = cs.find(
      (c) =>
        (c as { subsequentHistoryOf?: unknown }).subsequentHistoryOf !== undefined,
    ) as { caseName?: string; confidence?: number; reporter?: string } | undefined
    expect(child).toBeDefined()
    expect(child?.caseName).toBe("Smith v. Jones")
    // U.S. + year + court are all present, so the child base score is already
    // high. The caseName bonus should push it solidly above 0.9.
    expect(child?.confidence).toBeGreaterThan(0.9)
  })

  it("rev'd child also inherits caseName and re-scores", () => {
    const text = `Smith v. Jones, 100 F.2d 1 (9th Cir. 1990), rev'd, 200 U.S. 5 (1991).`
    const cs = extractCitations(text).filter((c) => c.type === "case")
    const child = cs.find(
      (c) =>
        (c as { subsequentHistoryOf?: unknown }).subsequentHistoryOf !== undefined,
    ) as { caseName?: string; confidence?: number } | undefined
    expect(child?.caseName).toBe("Smith v. Jones")
    expect(child?.confidence).toBeGreaterThan(0.9)
  })

  it("standalone (non-history) cite unaffected", () => {
    const text = `Smith v. Jones, 100 F.2d 1`
    const cs = extractCitations(text).filter((c) => c.type === "case")
    expect(cs).toHaveLength(1)
    // No subsequent-history relationship → confidence comes from
    // buildCaseCitation directly, unchanged by this fix.
    expect(cs[0].confidence).toBeGreaterThan(0.6)
  })
})
