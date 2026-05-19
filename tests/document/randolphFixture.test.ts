import { describe, expect, it } from "vitest"
import { analyzeDocument, extractCitations } from "@/index"

describe("Document fixture — Randolph passage end-to-end", () => {
  const text = `The prescriptive period in New Jersey is not twenty years, as was formerly assumed, but thirty years for developed land (or sixty years for woodlands or uncultivated tracts), by analogy to the adverse-possession periods set forth in N.J.S.A. 2A:14-30. Randolph Town Ctr., L.P. v. County of Morris, 374 N.J. Super. 448, 453–55, 864 A.2d 1191 (App. Div. 2005), aff'd in part, 186 N.J. 78, 891 A.2d 1202 (2006); see also Yellen v. Kassin, 416 N.J. Super. 113, 120, 3 A.3d 584 (App. Div. 2010).`

  it("Document has all expected fields populated", () => {
    const cites = extractCitations(text, { resolve: true })
    const doc = analyzeDocument(text, cites)
    expect(doc.citations.length).toBeGreaterThan(0)
    expect(doc.proseSpans.length).toBeGreaterThan(0)
    expect(doc.citationGraph.nodes.length).toBe(cites.length)
    expect(doc.citationGraph.edges.length).toBeGreaterThan(0)
  })

  it("citationGraph contains parallel edges for the three pairs", () => {
    const cites = extractCitations(text, { resolve: true })
    const doc = analyzeDocument(text, cites)
    const parallelEdges = doc.citationGraph.edges.filter((e) => e.type === "parallel")
    expect(parallelEdges.length).toBeGreaterThanOrEqual(3)
  })

  it("citationGraph contains a history-of edge for the affirmance", () => {
    const cites = extractCitations(text, { resolve: true })
    const doc = analyzeDocument(text, cites)
    const historyEdges = doc.citationGraph.edges.filter((e) => e.type === "history-of")
    expect(historyEdges.length).toBeGreaterThan(0)
  })

  it("proseSpans cover the intro text before Randolph", () => {
    const cites = extractCitations(text, { resolve: true })
    const doc = analyzeDocument(text, cites)
    expect(doc.proseSpans[0].originalStart).toBe(0)
    const firstProseText = text.slice(
      doc.proseSpans[0].originalStart,
      doc.proseSpans[0].originalEnd,
    )
    expect(firstProseText).toContain("prescriptive period")
  })
})
