import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #321 (part: bare article Arabic numerals) — the `bare-article`
 * pattern required Roman numerals (`Art. I, § 8`), missing the
 * common-in-modern-state-codes Arabic form (`Art. 1, § 10`). Fixed by
 * extending the numeral capture to `([IVX]+|\d+)`. The mandatory `§ N`
 * requirement keeps false-positive risk low — `Art. 1 of the treaty`
 * (no section) still won't match.
 */
describe("Issue #321 - bare-article Arabic numerals", () => {
  it("`Art. 1, § 10` extracts as constitutional", () => {
    const cs = extractCitations(`Art. 1, § 10`).filter((c) => c.type === "constitutional")
    expect(cs).toHaveLength(1)
    const c = cs[0] as { article?: number; section?: string }
    expect(c.article).toBe(1)
    expect(c.section).toBe("10")
  })

  it("`Art. I, § 8` (Roman, regression control) unchanged", () => {
    const cs = extractCitations(`Art. I, § 8`).filter((c) => c.type === "constitutional")
    expect(cs).toHaveLength(1)
    const c = cs[0] as { article?: number; section?: string }
    expect(c.article).toBe(1)
    expect(c.section).toBe("8")
  })

  it("`Art. III, § 2, cl. 1` (Roman + clause) unchanged", () => {
    const cs = extractCitations(`Art. III, § 2, cl. 1`).filter((c) => c.type === "constitutional")
    expect(cs).toHaveLength(1)
    const c = cs[0] as { article?: number; section?: string; clause?: number }
    expect(c.article).toBe(3)
    expect(c.section).toBe("2")
    expect(c.clause).toBe(1)
  })

  it("`Art. 42 of the treaty` (no section) does NOT match", () => {
    const cs = extractCitations(`Art. 42 of the treaty`).filter((c) => c.type === "constitutional")
    expect(cs).toHaveLength(0)
  })

  it("Arabic article in mid-prose context: `see Art. 42, §3 of the treaty`", () => {
    const cs = extractCitations(`see Art. 42, §3 of the treaty`).filter(
      (c) => c.type === "constitutional",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { article?: number }).article).toBe(42)
  })
})
