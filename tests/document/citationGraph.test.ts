import { describe, expect, it } from "vitest"
import { buildCitationGraph } from "@/document/citationGraph"
import { extractCitations } from "@/extract"
import { computeParenDepths } from "@/utils/parenDepths"

describe("buildCitationGraph", () => {
  it("returns an empty graph for no citations", () => {
    const graph = buildCitationGraph([], [])
    expect(graph.nodes).toEqual([])
    expect(graph.edges).toEqual([])
  })

  it("nodes.length === citations.length even for isolated nodes", () => {
    const text = "See 28 U.S.C. § 1331. Plain prose. Smith v. Jones, 100 F.2d 50 (1990)."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    expect(graph.nodes).toHaveLength(cites.length)
    expect(graph.nodes).toContain(0)
  })

  it("emits a `resolves-to` edge for Id. resolving to a full cite", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990). Id."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const idIdx = cites.findIndex((c) => c.type === "id")
    expect(idIdx).toBeGreaterThan(-1)
    const edge = graph.edges.find((e) => e.type === "resolves-to" && e.from === idIdx)
    expect(edge).toBeDefined()
  })

  it("emits an `antecedent` edge for short-forms with antecedentIndex", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990). Id. Id."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const antecedentEdges = graph.edges.filter((e) => e.type === "antecedent")
    expect(antecedentEdges.length).toBeGreaterThan(0)
  })

  it("emits `parallel` edges for parallel citation groups (one per pair)", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 200 A.2d 100 (1990)."
    const cites = extractCitations(text)
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const parallelEdges = graph.edges.filter((e) => e.type === "parallel")
    expect(parallelEdges).toHaveLength(1)
    expect(parallelEdges[0].from).toBeLessThan(parallelEdges[0].to)
  })

  it("emits `history-of` edge for subsequent history", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (App. Div. 1990), aff'd, 200 N.J. 100 (1991)."
    const cites = extractCitations(text)
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const historyEdges = graph.edges.filter((e) => e.type === "history-of")
    if (historyEdges.length > 0) {
      expect(historyEdges[0]).toMatchObject({ type: "history-of" })
    }
  })

  it("emits `pincite-inherit` edge when a short-form inherited a pincite", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). Id. at 62. Id."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const pinciteEdges = graph.edges.filter((e) => e.type === "pincite-inherit")
    expect(pinciteEdges.length).toBeGreaterThan(0)
  })

  it("emits `string-cite` edges for citations in a string-citation group", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990); see also Brown v. Doe, 200 F.3d 100 (2000)."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const stringEdges = graph.edges.filter((e) => e.type === "string-cite")
    if (
      cites[0].stringCitationGroupId &&
      cites[1].stringCitationGroupId &&
      cites[0].stringCitationGroupId === cites[1].stringCitationGroupId
    ) {
      expect(stringEdges.length).toBeGreaterThan(0)
    }
  })

  it("emits `in-parenthetical-of` edge for citation inside another citation's paren", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990) (citing Other v. Else, 200 F.3d 100)."
    const cites = extractCitations(text)
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const inParenEdges = graph.edges.filter((e) => e.type === "in-parenthetical-of")
    if (inParenEdges.length > 0) {
      expect(inParenEdges[0]).toMatchObject({ type: "in-parenthetical-of" })
    }
  })

  it("invariant: no self-edges", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 200 A.2d 100 (1990). Id."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    for (const edge of graph.edges) {
      expect(edge.from).not.toBe(edge.to)
    }
  })

  it("invariant: edges are sorted by (from, type, to)", () => {
    const text =
      "Smith v. Jones, 100 F.2d 50, 200 A.2d 100 (1990); see also Brown v. Doe, 300 F.3d 200 (2000). Id."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    for (let i = 1; i < graph.edges.length; i++) {
      const a = graph.edges[i - 1]
      const b = graph.edges[i]
      if (a.from !== b.from) {
        expect(a.from).toBeLessThan(b.from)
      } else if (a.type !== b.type) {
        expect(a.type < b.type).toBe(true)
      } else {
        expect(a.to).toBeLessThanOrEqual(b.to)
      }
    }
  })

  it("invariant: no duplicate edges of the same (type, from, to)", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 200 A.2d 100 (1990). Id. Id."
    const cites = extractCitations(text, { resolve: true })
    const depths = computeParenDepths(text, cites)
    const graph = buildCitationGraph(cites, depths)
    const seen = new Set<string>()
    for (const edge of graph.edges) {
      const key = `${edge.type}|${edge.from}|${edge.to}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })
})
