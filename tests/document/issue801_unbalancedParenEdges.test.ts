/**
 * Issue #801: the citation graph's `in-parenthetical-of` edges were derived
 * purely from `computeParenDepths` (a global `(`/`)` counter), so dropped or
 * unbalanced parentheses (OCR/PDF) corrupted them:
 *   - dropped opening paren → nested cite had depth 0 → edge missing;
 *   - dropped closing paren → depth never returned to 0 → every following
 *     top-level cite got a spurious edge.
 *
 * Follow-up to #798; reuses the same trigger-anchored aside signal.
 */

import { describe, expect, it } from "vitest"
import { analyzeDocument } from "@/document"
import { extractCitations } from "@/extract"

const ipEdges = (text: string) => {
  const cites = extractCitations(text)
  return analyzeDocument(text, cites).citationGraph.edges.filter(
    (e) => e.type === "in-parenthetical-of",
  )
}

describe("Issue #801: in-parenthetical-of edges tolerate unbalanced parens", () => {
  it("regression: balanced aside keeps the edge", () => {
    expect(ipEdges("Foo, 2020 IL 12345 (quoting Bar v. Baz, 100 N.E.3d 200).")).toEqual([
      { type: "in-parenthetical-of", from: 1, to: 0 },
    ])
  })

  it("dropped opening paren: edge still present (trigger-anchored)", () => {
    expect(ipEdges("Foo, 2020 IL 12345 quoting Bar v. Baz, 100 N.E.3d 200).")).toEqual([
      { type: "in-parenthetical-of", from: 1, to: 0 },
    ])
  })

  it("dropped closing paren: following top-level cite is NOT in-parenthetical", () => {
    const edges = ipEdges(
      "Foo, 2020 IL 12345 (quoting Bar v. Baz, 100 N.E.3d 200. Qux v. Quux, 5 U.S. 5.",
    )
    // Bar (1) is inside Foo's aside; Qux (2) must NOT get a spurious edge.
    expect(edges).toContainEqual({ type: "in-parenthetical-of", from: 1, to: 0 })
    expect(edges.some((e) => e.from === 2)).toBe(false)
  })
})
