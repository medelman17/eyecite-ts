import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #653 — parallel-cite caseName propagation requires a shared
 * closing parenthetical (typically the year-paren). When the chain
 * ends at sentence-end punctuation (`.` or `;`) without a year-paren,
 * caseName was not propagating to the secondary cite. Common in older
 * opinions citing parallel reporters without a year.
 *
 * Fix: `isParallelChainTerminator` accepts `.` or `;` (followed by
 * space/EOF) as an alternate chain terminator. EOF alone is still
 * rejected — that's the pre-existing test asserting strict behavior.
 */
describe("Issue #653 - parallel cite without year-paren", () => {
  it("`Kauffman v. Griesemer, 26 Pa. 407, 67 Am. Dec. 437.` propagates caseName", () => {
    const text = `Kauffman v. Griesemer, 26 Pa. 407, 67 Am. Dec. 437.`
    const cs = extractCitations(text).filter((c) => c.type === "case")
    expect(cs).toHaveLength(2)
    for (const c of cs) {
      expect((c as { caseName?: string }).caseName).toBe("Kauffman v. Griesemer")
    }
  })

  it("sentence-end `;` also terminates parallel chain", () => {
    const text = `Smith v. Jones, 100 F.2d 1, 200 F. Supp. 5; other text follows.`
    const cs = extractCitations(text).filter((c) => c.type === "case")
    expect(cs).toHaveLength(2)
    for (const c of cs) {
      expect((c as { caseName?: string }).caseName).toBe("Smith v. Jones")
    }
  })

  it("existing year-paren behavior preserved", () => {
    const text = `Smith v. Jones, 100 F.2d 1, 200 F.2d 5 (1990).`
    const cs = extractCitations(text).filter((c) => c.type === "case")
    expect(cs).toHaveLength(2)
    for (const c of cs) {
      expect((c as { caseName?: string }).caseName).toBe("Smith v. Jones")
    }
  })

  it("no terminator (EOF only) still NOT grouped (regression control)", () => {
    // Pre-existing detectParallel.test.ts asserts this strict behavior.
    // We confirm the change doesn't flip it.
    const text = `Smith v. Jones, 100 F.2d 1, 200 F. Supp. 456`
    const cs = extractCitations(text).filter((c) => c.type === "case")
    // The primary still has caseName, but the secondary does not.
    expect((cs[0] as { caseName?: string }).caseName).toBe("Smith v. Jones")
    expect((cs[1] as { caseName?: unknown }).caseName).toBeUndefined()
  })
})
