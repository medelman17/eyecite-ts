import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #694 (#2) — state statute extractors (`named-code` for
 * `Cal. Civ. Code ...` / `Cal. Penal Code ...`, and `caBareCode` for
 * `Civ. Code ...`) dropped the subsection-range trailer `-(c)` because:
 *   1. The tokenizer regex didn't capture the `-(c)` (no trailer alt)
 *   2. The extractor regex didn't capture it either
 *   3. The extractor destructured `{section, subsection, hasEtSeq}` from
 *      parseBody — it ignored the already-supported `subsectionRangeEnd`
 *   4. The returned StatuteCitation didn't include `subsectionRange`
 *
 * Fixed all four sites symmetric with the federal USC pattern.
 */
describe("Issue #694 - state statute subsection range", () => {
  it("`Cal. Civ. Code §§ 1714.5(a)-(c)` populates subsectionRange", () => {
    const cs = extractCitations(`Cal. Civ. Code §§ 1714.5(a)-(c)`).filter(
      (c) => c.type === "statute",
    )
    expect(cs).toHaveLength(1)
    const c = cs[0] as {
      subsection?: string
      subsectionRange?: { start: string; end: string }
    }
    expect(c.subsection).toBe("(a)")
    expect(c.subsectionRange).toEqual({ start: "(a)", end: "(c)" })
  })

  it("`Cal. Penal Code § 148(b)-(d)` populates subsectionRange", () => {
    const cs = extractCitations(`Cal. Penal Code § 148(b)-(d)`).filter(
      (c) => c.type === "statute",
    )
    expect(cs).toHaveLength(1)
    expect(
      (cs[0] as { subsectionRange?: { start: string; end: string } }).subsectionRange,
    ).toEqual({ start: "(b)", end: "(d)" })
  })

  it("`42 U.S.C. § 1983(a)-(c)` (federal control) unchanged", () => {
    const cs = extractCitations(`42 U.S.C. § 1983(a)-(c)`).filter(
      (c) => c.type === "statute",
    )
    expect(cs).toHaveLength(1)
    expect(
      (cs[0] as { subsectionRange?: { start: string; end: string } }).subsectionRange,
    ).toEqual({ start: "(a)", end: "(c)" })
  })

  it("single subsection `Cal. Civ. Code § 1714.5(a)` unaffected", () => {
    const cs = extractCitations(`Cal. Civ. Code § 1714.5(a)`).filter(
      (c) => c.type === "statute",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { subsection?: string }).subsection).toBe("(a)")
    expect(
      (cs[0] as { subsectionRange?: unknown }).subsectionRange,
    ).toBeUndefined()
  })
})
