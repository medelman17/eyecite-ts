import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #620 — `inheritSubsequentHistoryCaseName` worked by lucky array
 * order: a multi-link chain like `<root>, aff'd, <A>, cert. denied, <B>`
 * propagated caseName correctly only because A was processed before B.
 * Any future re-ordering would silently break multi-link propagation.
 * Fixed by running the inheritance loop until quiescence (fixed-point
 * iteration) — robust to array order, bounded by chain depth.
 */
describe("Issue #620 - multi-link subsequent-history inheritance", () => {
  it("two-link chain: root → A (aff'd) → B (cert. denied)", () => {
    const text = `Smith v. Jones, 100 F.2d 1 (9th Cir. 1990), aff'd, 200 U.S. 5 (1991), cert. denied, 300 U.S. 10 (1992).`
    const cs = extractCitations(text).filter((c) => c.type === "case")
    expect(cs.length).toBeGreaterThanOrEqual(3)
    for (const cite of cs) {
      // Every chain link should resolve to the same root caption.
      expect((cite as { caseName?: string }).caseName).toBe("Smith v. Jones")
    }
  })

  it("single-link chain: root → A still works (regression control)", () => {
    const text = `Smith v. Jones, 100 F.2d 1 (1990), aff'd, 200 U.S. 5 (1991).`
    const cs = extractCitations(text).filter((c) => c.type === "case")
    expect(cs.length).toBeGreaterThanOrEqual(2)
    for (const cite of cs) {
      expect((cite as { caseName?: string }).caseName).toBe("Smith v. Jones")
    }
  })

  it("standalone cite without history is unaffected", () => {
    const text = `Smith v. Jones, 100 F.2d 1`
    const cs = extractCitations(text).filter((c) => c.type === "case")
    expect(cs).toHaveLength(1)
    expect((cs[0] as { caseName?: string }).caseName).toBe("Smith v. Jones")
  })
})
