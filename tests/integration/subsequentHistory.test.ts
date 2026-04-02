import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

describe("subsequent history linking (#73)", () => {
  it("links parent to child with subsequentHistoryOf", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991)",
    )
    expect(citations.length).toBeGreaterThanOrEqual(2)
    const parent = citations[0]
    const child = citations[1]
    if (parent.type === "case" && child.type === "case") {
      // Parent has entries
      expect(parent.subsequentHistoryEntries).toHaveLength(1)
      expect(parent.subsequentHistoryEntries![0].signal).toBe("affirmed")
      // Child points back to parent
      expect(child.subsequentHistoryOf).toEqual({ index: 0, signal: "affirmed" })
    }
  })

  it("links chained history — all entries on original parent", () => {
    const citations = extractCitations(
      "Smith v. Jones, 500 F.2d 123 (2d Cir. 1990), aff'd, 501 U.S. 1 (1991), cert. denied, 502 U.S. 2 (1992)",
    )
    expect(citations.length).toBeGreaterThanOrEqual(3)
    const parent = citations[0]
    if (parent.type === "case") {
      expect(parent.subsequentHistoryEntries).toHaveLength(2)
      expect(parent.subsequentHistoryEntries![0].signal).toBe("affirmed")
      expect(parent.subsequentHistoryEntries![0].order).toBe(0)
      expect(parent.subsequentHistoryEntries![1].signal).toBe("cert_denied")
      expect(parent.subsequentHistoryEntries![1].order).toBe(1)
    }
    // Both children point back to parent
    if (citations[1].type === "case") {
      expect(citations[1].subsequentHistoryOf).toEqual({ index: 0, signal: "affirmed" })
    }
    if (citations[2].type === "case") {
      expect(citations[2].subsequentHistoryOf).toEqual({ index: 0, signal: "cert_denied" })
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
    if (citations[1]?.type === "case") {
      expect(citations[1].volume).toBe(501)
      expect(citations[1].reporter).toBe("U.S.")
      expect(citations[1].page).toBe(1)
      expect(citations[1].year).toBe(1991)
    }
  })
})
