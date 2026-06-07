import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { ResolvedCitation } from "@/resolve/types"
import type { FullCaseCitation } from "@/types/citation"

const QUOTING =
  "Smith v. Jones, 200 F.3d 100, 105 (2d Cir. 2000) (quoting Doe v. City, 100 F.2d 1, 3)."

describe("recursive Parenthetical (#851)", () => {
  describe("default — additive nesting, children stay top-level (non-breaking)", () => {
    it("nests the (quoting …) citation on Parenthetical.citations while keeping it top-level", () => {
      const citations = extractCitations(QUOTING)

      // Non-breaking: both cites stay at the top level. Bluebook Rule 10.9(a) —
      // a case first cited in a parenthetical may still anchor a later case
      // short form — so the nested cite remains a resolvable top-level peer by
      // default. (Strict exclusion is opt-in; see below.)
      expect(citations).toHaveLength(2)
      const parent = citations.find(
        (c) => c.type === "case" && (c as FullCaseCitation).caseName === "Smith v. Jones",
      ) as FullCaseCitation
      const topLevelChild = citations.find(
        (c) => c.type === "case" && (c as FullCaseCitation).caseName === "Doe v. City",
      ) as FullCaseCitation
      expect(parent).toBeDefined()
      expect(topLevelChild).toBeDefined()

      // The quoting parenthetical additionally carries the nested child — the
      // same citation, by stable id (the `in-parenthetical-of` edge).
      const paren = parent.parentheticals?.[0]
      expect(paren?.type).toBe("quoting")
      expect(paren?.text).toBe("quoting Doe v. City, 100 F.2d 1, 3") // raw text KEPT
      expect(paren?.citations).toHaveLength(1)

      const nested = paren?.citations?.[0] as FullCaseCitation
      expect(nested.caseName).toBe("Doe v. City")
      expect(nested.reporter).toBe("F.2d")
      expect(nested.pincite).toBe(3)
      expect(nested.id).toBe(topLevelChild.id) // same citation, reachable both ways
    })
  })

  describe("with { excludeParentheticalChildren: true } — strict subordinate model", () => {
    it("removes the nested citation from the top-level array, reachable only as a child", () => {
      const citations = extractCitations(QUOTING, { excludeParentheticalChildren: true })

      // Strict model: only the host remains at the top level.
      expect(citations).toHaveLength(1)
      const parent = citations[0] as FullCaseCitation
      expect(parent.caseName).toBe("Smith v. Jones")
      expect(
        citations.some((c) => c.type === "case" && (c as FullCaseCitation).caseName === "Doe v. City"),
      ).toBe(false)

      // The child is still reachable as a parenthetical node, with its own id.
      const child = parent.parentheticals?.[0]?.citations?.[0] as FullCaseCitation
      expect(child.caseName).toBe("Doe v. City")
      expect(child.pincite).toBe(3)
      expect(child.id).toBeDefined()
    })

    it("hides the child from the resolver: Id. after A (quoting B) resolves to A, not B", () => {
      const text =
        "Smith v. Jones, 200 F.3d 100 (2d Cir. 2000) (quoting Doe v. City, 100 F.2d 1). Id. at 110."
      const citations = extractCitations(text, {
        excludeParentheticalChildren: true,
        resolve: true,
      }) as ResolvedCitation[]

      // B (Doe) is gone from the top level entirely…
      expect(
        citations.some((c) => c.type === "case" && (c as FullCaseCitation).caseName === "Doe v. City"),
      ).toBe(false)
      // …so Id. structurally cannot bind to it — it resolves to the host A.
      const id = citations.find((c) => c.type === "id")
      const smith = citations.find(
        (c) => c.type === "case" && (c as FullCaseCitation).caseName === "Smith v. Jones",
      )
      expect(id?.resolution?.resolvedTo).toBe(citations.indexOf(smith as ResolvedCitation))
    })
  })

  describe("edge cases", () => {
    it("recursively nests A (citing B (quoting C)) — C under B, B under A (smallest enclosing)", () => {
      const text =
        "Top v. Case, 100 F.2d 1 (1990) (citing Mid v. Case, 200 F.3d 2 (1995) (quoting Inner v. Case, 300 F.4th 3 (2000)))."
      const citations = extractCitations(text)
      const top = citations.find(
        (c) => c.type === "case" && (c as FullCaseCitation).caseName === "Top v. Case",
      ) as FullCaseCitation
      expect(top).toBeDefined()

      const mid = top.parentheticals?.[0]?.citations?.[0] as FullCaseCitation
      expect(mid?.caseName).toBe("Mid v. Case")
      // C sits inside BOTH parens; it lands on the innermost (Mid's), not Top's.
      const inner = mid?.parentheticals?.[0]?.citations?.[0] as FullCaseCitation
      expect(inner?.caseName).toBe("Inner v. Case")
    })

    it("does not add a citations array to a parenthetical with no nested citation", () => {
      const text = "Smith v. Jones, 100 F.2d 1 (1990) (holding that the rule applies)."
      const citations = extractCitations(text)
      const smith = citations[0] as FullCaseCitation
      expect(smith.parentheticals?.[0]?.type).toBe("holding")
      expect(smith.parentheticals?.[0]?.citations).toBeUndefined()
    })

    it("nests a bare (quoting <reporter>) citation that has no case name", () => {
      const text = "Smith v. Jones, 200 F.3d 100 (2d Cir. 2000) (quoting 100 F.2d 1)."
      const citations = extractCitations(text)
      const smith = citations.find(
        (c) => c.type === "case" && (c as FullCaseCitation).caseName === "Smith v. Jones",
      ) as FullCaseCitation
      const child = smith.parentheticals?.[0]?.citations?.[0] as FullCaseCitation
      expect(child?.reporter).toBe("F.2d")
      expect(child?.page).toBe(1)
    })
  })
})
