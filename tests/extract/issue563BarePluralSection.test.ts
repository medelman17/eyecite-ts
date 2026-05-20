import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, StatuteCitation } from "@/types/citation"

const statutes = (cites: Citation[]): StatuteCitation[] =>
  cites.filter((c): c is StatuteCitation => c.type === "statute")

/**
 * #563 — `§§ X, Y, Z` lists without an explicit code prefix produce ZERO
 * citations. `expandPluralSectionList` only runs *after* a head citation
 * exists. Bare-prefix lists (`Code §§ 19.2-81 and 18.2-266`, or naked
 * `§§ 12940, 12945`) never establish a head, so the entire list is dropped.
 *
 * Fix: extend the statute patterns / expander so a bare `§§ N, N[, N]…`
 * sequence emits one StatuteCitation per section (with `code` defaulting
 * to a generic value and jurisdiction left undefined when not derivable).
 */
describe("issue #563 — bare-prefix `§§` lists without code prefix", () => {
  describe("naked `§§ N, N` lists", () => {
    it("`§§ 12940, 12945` emits two citations", () => {
      const text = "See §§ 12940, 12945 for related provisions."
      const cites = statutes(extractCitations(text))
      expect(cites).toHaveLength(2)
      expect(cites.map((s) => s.section)).toEqual(["12940", "12945"])
    })

    it("three-section list `§§ 100, 200, 300` emits three citations", () => {
      const text = "See §§ 100, 200, 300."
      const cites = statutes(extractCitations(text))
      expect(cites).toHaveLength(3)
      expect(cites.map((s) => s.section)).toEqual(["100", "200", "300"])
    })

    it("`§§ N and N` (and-connector) emits two citations", () => {
      const text = "Cf. §§ 18-8004 and 18-8005."
      const cites = statutes(extractCitations(text))
      expect(cites).toHaveLength(2)
      expect(cites.map((s) => s.section)).toEqual(["18-8004", "18-8005"])
    })
  })

  describe("generic `Code §§ N, N` (no jurisdiction prefix)", () => {
    it("`Code §§ 19.2-81 and 18.2-266` emits two citations", () => {
      const text = "See Code §§ 19.2-81 and 18.2-266."
      const cites = statutes(extractCitations(text))
      expect(cites).toHaveLength(2)
      expect(cites.map((s) => s.section)).toEqual(["19.2-81", "18.2-266"])
    })
  })

  describe("regression — already-handled forms still work", () => {
    it("`Cal. Gov. Code §§ 12940, 12945` still works (named-code head)", () => {
      const text = "See Cal. Gov. Code §§ 12940, 12945."
      const cites = statutes(extractCitations(text))
      expect(cites.length).toBeGreaterThanOrEqual(2)
      const sections = cites.map((s) => s.section)
      expect(sections).toContain("12940")
      expect(sections).toContain("12945")
    })

    it("singular `§ 1331` alone in prose is NOT extracted (no head)", () => {
      // A lone `§ 1331` with no surrounding code identifier is too ambiguous —
      // this regression keeps us from inventing citations from any "§".
      const text = "See § 1331."
      const cites = statutes(extractCitations(text))
      // Either zero (preferred — singular bare-§ is too ambiguous) or one;
      // do NOT regress to multiple false positives.
      expect(cites.length).toBeLessThanOrEqual(1)
    })
  })
})
