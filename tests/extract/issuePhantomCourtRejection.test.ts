/**
 * Regression tests for phantom `court` field values harvested from
 * non-court trailing parenthetical content. Each input was found by the
 * LLM judge in real opinions; the parenthetical content should NOT be
 * routed to the `court` field.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"

const caseOf = (text: string): FullCaseCitation | undefined =>
  extractCitations(text).find((c): c is FullCaseCitation => c.type === "case")

describe("phantom `court` field rejection", () => {
  describe("bibliography markers (already handled via parentheticals)", () => {
    // The current parser routes `(citations omitted)` and similar
    // bibliography parentheticals to `parentheticals[]` rather than
    // `court`. These assertions document the invariant: the bibliography
    // text should never appear in the `court` field.
    it("`(additional citations omitted)` does not pollute court field", () => {
      const c = caseOf("Foo v. Bar, 99 L.Ed.2d 534 (additional citations omitted)")
      expect(c?.court).not.toBe("additional citations omitted")
      expect(c?.court).not.toContain("additional")
    })

    it("`(citations omitted)` does not pollute court field", () => {
      const c = caseOf("Foo v. Bar, 99 L.Ed.2d 534 (citations omitted)")
      expect(c?.court).not.toBe("citations omitted")
    })
  })

  describe("dissent / concurring attributions", () => {
    it("`(dis. opn. of Shenk, J.)` not absorbed as court", () => {
      const c = caseOf("Foo v. Bar, 299 P.2d 850 (dis. opn. of Shenk, J.)")
      expect(c?.court).toBeUndefined()
    })

    it("`(conc. opn. of Werdegar, J.)` not absorbed", () => {
      const c = caseOf("Foo v. Bar, 100 Cal.4th 200 (conc. opn. of Werdegar, J.)")
      expect(c?.court).toBeUndefined()
    })
  })

  describe("quotation parentheticals", () => {
    it('`("A fundamental and longstanding principle...")` does not pollute court', () => {
      const c = caseOf(
        'Foo v. Bar, 99 L.Ed.2d 534 ("A fundamental and longstanding principle of judicial restraint requires...")',
      )
      expect(c?.court).not.toContain("fundamental")
      expect(c?.court).not.toContain("principle")
    })

    it('leading quote rejected as court (no period gate)', () => {
      const c = caseOf('Foo v. Bar, 100 U.S. 1 ("quoted material from the opinion")')
      expect(c?.court).not.toContain("quoted material")
    })
  })

  describe("Legitimate courts preserved (regression)", () => {
    it("`(9th Cir. 1990)` → court=9th Cir.", () => {
      const c = caseOf("Smith v. Jones, 500 F.2d 100 (9th Cir. 1990)")
      expect(c?.court).toBe("9th Cir.")
    })

    it("`(S.D.N.Y. 2020)` → court=S.D.N.Y.", () => {
      const c = caseOf("Smith v. Jones, 500 F. Supp. 100 (S.D.N.Y. 2020)")
      expect(c?.court).toBe("S.D.N.Y.")
    })

    it("`(D.C. Cir. 2015)` → court=D.C. Cir.", () => {
      const c = caseOf("Smith v. Jones, 500 F.3d 100 (D.C. Cir. 2015)")
      expect(c?.court).toBe("D.C. Cir.")
    })

    it("`(Cal. Ct. App. 2018)` → court=Cal. Ct. App.", () => {
      const c = caseOf("Smith v. Jones, 100 Cal.App.5th 200 (Cal. Ct. App. 2018)")
      expect(c?.court).toBe("Cal. Ct. App.")
    })
  })
})
