import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

describe("subsequent history linking (#73)", () => {
  it("links parent to child with subsequentHistoryOf", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991)",
    )
    expect(citations.length).toBeGreaterThanOrEqual(2)
    expect(citations[0].type).toBe("case")
    expect(citations[1].type).toBe("case")
    if (citations[0].type === "case" && citations[1].type === "case") {
      // Parent has entries
      expect(citations[0].subsequentHistoryEntries).toHaveLength(1)
      expect(citations[0].subsequentHistoryEntries?.[0].signal).toBe("affirmed")
      // Child points back to parent (index retained; #849 adds id-based priorId)
      expect(citations[1].subsequentHistoryOf).toMatchObject({ index: 0, signal: "affirmed" })
      expect(citations[1].subsequentHistoryOf?.priorId).toBe(citations[0].id)
    }
  })

  it("links chained history — each entry stays on its immediate parent (#527)", () => {
    // Chain semantics: in `<root>, aff'd, <A>, cert. denied, <B>`, A is the
    // affirmance of the root, and B is the cert. denial OF A (not of root).
    // Each chain link's signal entry therefore belongs to the immediately-
    // preceding cite, not to the original chain root. Before the #527 fix,
    // Union-Find collapsed everything onto the root.
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991), cert. denied, 502 U.S. 2 (1992)",
    )
    expect(citations.length).toBeGreaterThanOrEqual(3)
    expect(citations[0].type).toBe("case")
    if (citations[0].type === "case") {
      // Root has only its own direct child signal (affirmed) — NOT cert_denied.
      expect(citations[0].subsequentHistoryEntries).toHaveLength(1)
      expect(citations[0].subsequentHistoryEntries?.[0].signal).toBe("affirmed")
      expect(citations[0].subsequentHistoryEntries?.[0].order).toBe(0)
    }
    // 501 U.S. 1 is the affirming cite; its own scanner-captured entries hold
    // the downstream `cert. denied`.
    expect(citations[1].type).toBe("case")
    if (citations[1].type === "case") {
      expect(citations[1].subsequentHistoryOf).toMatchObject({ index: 0, signal: "affirmed" })
      expect(citations[1].subsequentHistoryOf?.priorId).toBe(citations[0].id)
      expect(citations[1].subsequentHistoryEntries).toHaveLength(1)
      expect(citations[1].subsequentHistoryEntries?.[0].signal).toBe("cert_denied")
    }
    // 502 U.S. 2 (the cert. denied result) points at the AFFIRMING cite (1),
    // not the original root (0).
    expect(citations[2].type).toBe("case")
    if (citations[2].type === "case") {
      expect(citations[2].subsequentHistoryOf).toMatchObject({ index: 1, signal: "cert_denied" })
      expect(citations[2].subsequentHistoryOf?.priorId).toBe(citations[1].id)
    }
  })

  it("citations without history are unaffected", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2020). Doe v. City, 600 F.3d 456 (2021).",
    )
    for (const c of citations) {
      if (c.type === "case") {
        expect(c.subsequentHistoryEntries).toBeUndefined()
        expect(c.subsequentHistoryOf).toBeUndefined()
      }
    }
  })

  it("child citation retains its own metadata", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991)",
    )
    expect(citations[1]?.type).toBe("case")
    if (citations[1]?.type === "case") {
      expect(citations[1].volume).toBe(501)
      expect(citations[1].reporter).toBe("U.S.")
      expect(citations[1].page).toBe(1)
      expect(citations[1].year).toBe(1991)
    }
  })
})
