import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #321 (plural-amendments sub-issue) — `U.S. Const. amends. V, XIV`
 * (plural `amends.` form) wasn't tokenized at all. Even after enabling
 * the plural form, only the first amendment was extracted — the
 * comma-separated continuation `, XIV` was dropped.
 *
 * Fix has two parts:
 * 1. ARTICLE_OR_AMENDMENT regex accepts `arts?` / `amends?` / `amdts?`
 *    plural forms.
 * 2. expandChainedConstitutional accepts a bare-numeral continuation
 *    (`, XIV` / ` and XIV`) inheriting the article-or-amendment type
 *    from the head cite.
 */
describe("Issue #321 - plural amends/arts chain expansion", () => {
  it("`U.S. Const. amends. V, XIV` extracts 2 amendments", () => {
    const cs = extractCitations(`U.S. Const. amends. V, XIV`).filter(
      (c) => c.type === "constitutional",
    )
    expect(cs).toHaveLength(2)
    expect((cs[0] as { amendment?: number }).amendment).toBe(5)
    expect((cs[1] as { amendment?: number }).amendment).toBe(14)
  })

  it("`U.S. Const. amends. V and XIV` extracts 2 amendments (and-form)", () => {
    const cs = extractCitations(`U.S. Const. amends. V and XIV`).filter(
      (c) => c.type === "constitutional",
    )
    expect(cs).toHaveLength(2)
    expect((cs[0] as { amendment?: number }).amendment).toBe(5)
    expect((cs[1] as { amendment?: number }).amendment).toBe(14)
  })

  it("`U.S. Const. arts. I, II, III` extracts 3 articles", () => {
    const cs = extractCitations(`U.S. Const. arts. I, II, III`).filter(
      (c) => c.type === "constitutional",
    )
    expect(cs).toHaveLength(3)
    expect((cs[0] as { article?: number }).article).toBe(1)
    expect((cs[1] as { article?: number }).article).toBe(2)
    expect((cs[2] as { article?: number }).article).toBe(3)
  })

  it("singular `U.S. Const. amend. V` still works (regression)", () => {
    const cs = extractCitations(`U.S. Const. amend. V`).filter(
      (c) => c.type === "constitutional",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { amendment?: number }).amendment).toBe(5)
  })
})
