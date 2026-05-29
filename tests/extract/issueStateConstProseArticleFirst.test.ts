import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #321 (article-first prose form) — `article XII, section 5
 * of the California Constitution` (article-first ordering) wasn't
 * recognized. The pre-existing `state-const-prose-section-article`
 * pattern handled the section-first form (`Section 5, Article IV
 * of the Ohio Constitution`) only.
 *
 * Added a new `state-const-prose-article-first` pattern + extractor
 * branch covering 50 US states.
 */
describe("Issue #321 - state-const prose article-first form", () => {
  it("`article XII, section 5 of the California Constitution`", () => {
    const cs = extractCitations(
      `article XII, section 5 of the California Constitution`,
    ).filter((c) => c.type === "constitutional")
    expect(cs).toHaveLength(1)
    const c = cs[0] as { article?: number; section?: string; jurisdiction?: string }
    expect(c.article).toBe(12)
    expect(c.section).toBe("5")
    expect(c.jurisdiction).toBe("CA")
  })

  it("`article VI, section 10, of the California Constitution` (extra comma)", () => {
    const cs = extractCitations(
      `article VI, section 10, of the California Constitution`,
    ).filter((c) => c.type === "constitutional")
    expect(cs).toHaveLength(1)
    const c = cs[0] as { article?: number; section?: string; jurisdiction?: string }
    expect(c.article).toBe(6)
    expect(c.section).toBe("10")
    expect(c.jurisdiction).toBe("CA")
  })

  it("regression: section-first `Section 5(B), Article IV of the Ohio Constitution` still works", () => {
    const cs = extractCitations(
      `Section 5(B), Article IV of the Ohio Constitution`,
    ).filter((c) => c.type === "constitutional")
    expect(cs).toHaveLength(1)
    const c = cs[0] as { article?: number; section?: string; jurisdiction?: string }
    expect(c.article).toBe(4)
    expect(c.section).toBe("5(B)")
    expect(c.jurisdiction).toBe("OH")
  })

  it("regression: `art. 14 of the Massachusetts Declaration of Rights` still works", () => {
    const cs = extractCitations(
      `art. 14 of the Massachusetts Declaration of Rights`,
    ).filter((c) => c.type === "constitutional")
    expect(cs).toHaveLength(1)
    const c = cs[0] as { article?: number; jurisdiction?: string }
    expect(c.article).toBe(14)
    expect(c.jurisdiction).toBe("MA")
  })
})
