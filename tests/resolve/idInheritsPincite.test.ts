import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation, IdCitation } from "@/types/citation"

const findId = (cites: Citation[]): IdCitation | undefined =>
  cites.find((c): c is IdCitation => c.type === "id")

describe("Id. inherits pincite from antecedent (Bluebook 4.1)", () => {
  describe("basic inheritance", () => {
    it("`Id.` after `Smith, 100 F.2d 50, 55` inherits pincite=55", () => {
      const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id."
      const cites = extractCitations(text, { resolve: true })
      const id = findId(cites)
      expect(id?.pincite).toBe(55)
    })

    it("`Id.` after pincite-range `50, 55-58` inherits pincite=55 head", () => {
      const text = "Smith v. Jones, 100 F.2d 50, 55-58 (1990). Id."
      const cites = extractCitations(text, { resolve: true })
      const id = findId(cites)
      expect(id?.pincite).toBe(55)
    })

    it("`Id.` after pincite-range inherits structured pinciteInfo", () => {
      const text = "Smith v. Jones, 100 F.2d 50, 55-58 (1990). Id."
      const cites = extractCitations(text, { resolve: true })
      const id = findId(cites)
      expect(id?.pinciteInfo?.page).toBe(55)
      expect(id?.pinciteInfo?.endPage).toBe(58)
      expect(id?.pinciteInfo?.isRange).toBe(true)
    })

    it("`Ibid.` inherits pincite just like `Id.`", () => {
      const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Ibid."
      const cites = extractCitations(text, { resolve: true })
      const id = findId(cites)
      expect(id?.pincite).toBe(55)
    })
  })

  describe("explicit Id. pincite overrides antecedent", () => {
    it("`Id. at 62` keeps 62, does NOT inherit antecedent's 55", () => {
      const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 62."
      const cites = extractCitations(text, { resolve: true })
      const id = findId(cites)
      expect(id?.pincite).toBe(62)
    })

    it("`Id. at 62-65` keeps the range, does NOT inherit", () => {
      const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 62-65."
      const cites = extractCitations(text, { resolve: true })
      const id = findId(cites)
      expect(id?.pincite).toBe(62)
      expect(id?.pinciteInfo?.endPage).toBe(65)
    })
  })

  describe("no-op cases", () => {
    it("antecedent has NO pincite → `Id.` stays without pincite", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990). Id."
      const cites = extractCitations(text, { resolve: true })
      const id = findId(cites)
      expect(id?.pincite).toBeUndefined()
    })

    it("`Id.` with no resolution (no antecedent) stays without pincite", () => {
      const text = "Id."
      const cites = extractCitations(text, { resolve: true })
      const id = findId(cites)
      expect(id?.pincite).toBeUndefined()
    })

    it("`resolve: false` (default) leaves `Id.` unchanged", () => {
      const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id."
      const cites = extractCitations(text)
      const id = findId(cites)
      // Without resolve, no antecedent linkage — no inheritance.
      expect(id?.pincite).toBeUndefined()
    })
  })

  describe("chained Id. citations", () => {
    it("two consecutive `Id.` both inherit the same pincite", () => {
      const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. Id."
      const cites = extractCitations(text, { resolve: true })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(2)
      expect(ids[0].pincite).toBe(55)
      expect(ids[1].pincite).toBe(55)
    })

    it("`Id. at 62.` then `Id.` — second Id. inherits 62 from immediate predecessor (Rule 4.1)", () => {
      // Bluebook Rule 4.1 / Indigo Book R6.2.2: `Id.` refers to the
      // immediately preceding cited authority. A bare `Id.` after
      // `Id. at 62.` inherits the pincite of that immediate predecessor
      // (62), NOT the terminal full citation's pincite (55).
      // See docs/research/2026-05-19-pincite-inheritance.md.
      const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 62. Id."
      const cites = extractCitations(text, { resolve: true })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(2)
      expect(ids[0].pincite).toBe(62)
      expect(ids[1].pincite).toBe(62)
      expect(ids[1].pinciteInherited).toBe(true)
      // Index of ids[0] in cites[]: full citation is index 0, ids[0] is index 1.
      expect(ids[1].pinciteInheritedFrom).toBe(1)
    })
  })

  describe("statute antecedents", () => {
    it("`Id.` after `28 U.S.C. § 1331` (no pincite) stays without pincite", () => {
      const text = "See 28 U.S.C. § 1331. Id."
      const cites = extractCitations(text, { resolve: true })
      const id = findId(cites)
      expect(id?.pincite).toBeUndefined()
    })
  })

  describe("Rule 4.1 parenthetical exception", () => {
    it("`Id.` after `Smith, at 100 (citing Other, 2 F.3d 1, 5)` inherits Smith's 100", () => {
      // Bluebook Rule 4.1 explicitly excludes parenthetical-nested cites
      // ("citing", "quoting", etc.) from the "intervening authority" rule.
      // The Id. inherits from Smith (the host citation), not from Other.
      const text =
        "Smith v. Jones, 100 F.2d 50, 100 (1990) (citing Other v. Else, 2 F.3d 1, 5). Id."
      const cites = extractCitations(text, { resolve: true })
      const id = findId(cites)
      expect(id?.pincite).toBe(100)
      expect(id?.pinciteInherited).toBe(true)
    })
  })

  describe("chains with intermediate pincite changes (Rule 4.1)", () => {
    it("Smith, at 55 → Id. at 115 → Id. at 200 → bare Id. inherits 200", () => {
      const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 115. Id. at 200. Id."
      const cites = extractCitations(text, { resolve: true })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(3)
      expect(ids[0].pincite).toBe(115)
      expect(ids[1].pincite).toBe(200)
      expect(ids[2].pincite).toBe(200)
      expect(ids[2].pinciteInherited).toBe(true)
    })

    it("Smith, at 55 → Id. at 115 → bare Id. → bare Id. — both bare Id.s inherit 115", () => {
      const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 115. Id. Id."
      const cites = extractCitations(text, { resolve: true })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(3)
      expect(ids[0].pincite).toBe(115)
      expect(ids[1].pincite).toBe(115)
      expect(ids[1].pinciteInherited).toBe(true)
      expect(ids[2].pincite).toBe(115)
      expect(ids[2].pinciteInherited).toBe(true)
      // Provenance: the third Id. inherits from the second (which itself
      // inherited from `Id. at 115`). pinciteInheritedFrom values are
      // adjacent indices in cites[].
      expect(ids[2].pinciteInheritedFrom).toBe((ids[1].pinciteInheritedFrom ?? 0) + 1)
    })
  })

  describe("authority boundaries break the chain", () => {
    it("Smith → Id. at 115 → Other, at 50 → bare Id. inherits 50 (Other is new authority)", () => {
      const text =
        "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 115. Other v. Else, 200 F.3d 1, 50 (1991). Id."
      const cites = extractCitations(text, { resolve: true })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(2)
      // ids[0] is `Id. at 115` referring to Smith — keeps its explicit 115.
      expect(ids[0].pincite).toBe(115)
      // ids[1] is the bare `Id.` referring to Other — inherits Other's 50.
      expect(ids[1].pincite).toBe(50)
      expect(ids[1].pinciteInherited).toBe(true)
    })

    it("Smith → Id. at 115 → Other (no pincite) → bare Id. — no inheritance", () => {
      const text =
        "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 115. Other v. Else, 200 F.3d 1 (1991). Id."
      const cites = extractCitations(text, { resolve: true })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(2)
      expect(ids[0].pincite).toBe(115)
      // Bare Id. after Other (which has no pincite) — no inheritance,
      // and chain cannot cross back to Smith because Other is an
      // authority boundary.
      expect(ids[1].pincite).toBeUndefined()
      expect(ids[1].pinciteInherited).toBeUndefined()
    })
  })

  describe("supra and short-form-case as intermediates", () => {
    it("Smith → Other → Smith, supra, at 50 → bare Id. inherits 50 from supra", () => {
      const text =
        "Smith v. Jones, 100 F.2d 50, 55 (1990). Other v. Else, 200 F.3d 1 (1991). Smith, supra, at 50. Id."
      const cites = extractCitations(text, { resolve: true })
      const id = findId(cites)
      expect(id?.pincite).toBe(50)
      expect(id?.pinciteInherited).toBe(true)
    })

    it("Smith → Smith, 100 F.2d at 115 → bare Id. inherits 115 from short-form", () => {
      const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Smith, 100 F.2d at 115. Id."
      const cites = extractCitations(text, { resolve: true })
      const id = findId(cites)
      expect(id?.pincite).toBe(115)
      expect(id?.pinciteInherited).toBe(true)
    })
  })

  describe("signals do not break Id. chains", () => {
    it("Smith → see also Id. at 115 → see Id. — bare Id. inherits 115", () => {
      const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). See also Id. at 115. See Id."
      const cites = extractCitations(text, { resolve: true })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(2)
      expect(ids[0].pincite).toBe(115)
      expect(ids[1].pincite).toBe(115)
      expect(ids[1].pinciteInherited).toBe(true)
    })
  })

  describe("footnote-aware chains", () => {
    it("chain with detectFootnotes enabled still inherits correctly", () => {
      // The footnote scope strategy gates resolution boundaries; inheritance
      // runs after resolution, so any chain that the resolver accepts also
      // inherits correctly. This test exercises the option compatibility
      // (no crash, behavior preserved) more than footnote-specific semantics
      // — those live in tests/footnotes/.
      const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 115. Id."
      const cites = extractCitations(text, {
        resolve: true,
        detectFootnotes: true,
      })
      const ids = cites.filter((c): c is IdCitation => c.type === "id")
      expect(ids).toHaveLength(2)
      expect(ids[1].pincite).toBe(115)
      expect(ids[1].pinciteInherited).toBe(true)
    })
  })
})
