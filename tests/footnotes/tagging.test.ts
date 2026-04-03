import { describe, expect, it } from "vitest"
import { tagCitationsWithFootnotes } from "@/footnotes/tagging"
import type { FullCaseCitation } from "@/types/citation"
import type { FootnoteMap } from "@/footnotes/types"

function mockCitation(cleanStart: number, cleanEnd: number): FullCaseCitation {
  return {
    type: "case",
    text: "cite",
    span: { cleanStart, cleanEnd, originalStart: cleanStart, originalEnd: cleanEnd },
    matchedText: "cite",
    confidence: 1.0,
    processTimeMs: 0,
    patternsChecked: 0,
    volume: 100,
    reporter: "F.2d",
    page: 100,
  }
}

describe("tagCitationsWithFootnotes", () => {
  it("does nothing when footnoteMap is empty", () => {
    const citations = [mockCitation(10, 20)]
    tagCitationsWithFootnotes(citations, [])
    expect(citations[0].inFootnote).toBeUndefined()
    expect(citations[0].footnoteNumber).toBeUndefined()
  })

  it("tags citation inside a footnote zone", () => {
    const zones: FootnoteMap = [{ start: 100, end: 200, footnoteNumber: 1 }]
    const citations = [mockCitation(120, 150)]
    tagCitationsWithFootnotes(citations, zones)
    expect(citations[0].inFootnote).toBe(true)
    expect(citations[0].footnoteNumber).toBe(1)
  })

  it("does not tag citation outside all footnote zones", () => {
    const zones: FootnoteMap = [{ start: 100, end: 200, footnoteNumber: 1 }]
    const citations = [mockCitation(10, 50)]
    tagCitationsWithFootnotes(citations, zones)
    expect(citations[0].inFootnote).toBeUndefined()
    expect(citations[0].footnoteNumber).toBeUndefined()
  })

  it("assigns correct footnote number from multiple zones", () => {
    const zones: FootnoteMap = [
      { start: 100, end: 200, footnoteNumber: 1 },
      { start: 300, end: 400, footnoteNumber: 2 },
    ]
    const citations = [mockCitation(50, 80), mockCitation(150, 180), mockCitation(350, 380)]
    tagCitationsWithFootnotes(citations, zones)

    expect(citations[0].inFootnote).toBeUndefined()
    expect(citations[1].inFootnote).toBe(true)
    expect(citations[1].footnoteNumber).toBe(1)
    expect(citations[2].inFootnote).toBe(true)
    expect(citations[2].footnoteNumber).toBe(2)
  })

  it("handles citation at exact zone boundary (start inclusive)", () => {
    const zones: FootnoteMap = [{ start: 100, end: 200, footnoteNumber: 1 }]
    const citations = [mockCitation(100, 120)]
    tagCitationsWithFootnotes(citations, zones)
    expect(citations[0].inFootnote).toBe(true)
  })

  it("handles citation at exact zone boundary (end exclusive)", () => {
    const zones: FootnoteMap = [{ start: 100, end: 200, footnoteNumber: 1 }]
    const citations = [mockCitation(200, 220)]
    tagCitationsWithFootnotes(citations, zones)
    expect(citations[0].inFootnote).toBeUndefined()
  })
})
