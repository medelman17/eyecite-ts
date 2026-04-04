import { describe, expect, it } from "vitest"
import { detectParagraphBoundaries, isWithinBoundary } from "@/resolve/scopeBoundary"
import type { Citation } from "@/types/citation"

describe("detectParagraphBoundaries", () => {
  it("detects paragraphs separated by double newline", () => {
    const text = "Paragraph 1 text.\n\nParagraph 2 text.\n\nParagraph 3 text."

    const citations: Citation[] = [
      {
        type: "case",
        text: "citation1",
        span: { originalStart: 5, originalEnd: 10, cleanStart: 5, cleanEnd: 10 },
        matchedText: "cite1",
        confidence: 1.0,
        processTimeMs: 0,
        patternsChecked: 0,
        volume: 100,
        reporter: "F.2d",
        page: 100,
      },
      {
        type: "case",
        text: "citation2",
        span: { originalStart: 25, originalEnd: 30, cleanStart: 25, cleanEnd: 30 },
        matchedText: "cite2",
        confidence: 1.0,
        processTimeMs: 0,
        patternsChecked: 0,
        volume: 200,
        reporter: "F.2d",
        page: 200,
      },
      {
        type: "case",
        text: "citation3",
        span: { originalStart: 50, originalEnd: 55, cleanStart: 50, cleanEnd: 55 },
        matchedText: "cite3",
        confidence: 1.0,
        processTimeMs: 0,
        patternsChecked: 0,
        volume: 300,
        reporter: "F.2d",
        page: 300,
      },
    ]

    const map = detectParagraphBoundaries(text, citations)

    expect(map.get(0)).toBe(0) // First citation in paragraph 0
    expect(map.get(1)).toBe(1) // Second citation in paragraph 1
    expect(map.get(2)).toBe(2) // Third citation in paragraph 2
  })

  it("assigns all citations to same paragraph when no boundaries", () => {
    const text = "Single paragraph with multiple citations."

    const citations: Citation[] = [
      {
        type: "case",
        text: "citation1",
        span: { originalStart: 5, originalEnd: 10, cleanStart: 5, cleanEnd: 10 },
        matchedText: "cite1",
        confidence: 1.0,
        processTimeMs: 0,
        patternsChecked: 0,
        volume: 100,
        reporter: "F.2d",
        page: 100,
      },
      {
        type: "case",
        text: "citation2",
        span: { originalStart: 20, originalEnd: 25, cleanStart: 20, cleanEnd: 25 },
        matchedText: "cite2",
        confidence: 1.0,
        processTimeMs: 0,
        patternsChecked: 0,
        volume: 200,
        reporter: "F.2d",
        page: 200,
      },
    ]

    const map = detectParagraphBoundaries(text, citations)

    expect(map.get(0)).toBe(0)
    expect(map.get(1)).toBe(0) // Both in same paragraph
  })

  it("handles custom boundary pattern", () => {
    const text = "Section 1.|Section 2.|Section 3."

    const citations: Citation[] = [
      {
        type: "case",
        text: "citation1",
        span: { originalStart: 5, originalEnd: 10, cleanStart: 5, cleanEnd: 10 },
        matchedText: "cite1",
        confidence: 1.0,
        processTimeMs: 0,
        patternsChecked: 0,
        volume: 100,
        reporter: "F.2d",
        page: 100,
      },
      {
        type: "case",
        text: "citation2",
        span: { originalStart: 15, originalEnd: 20, cleanStart: 15, cleanEnd: 20 },
        matchedText: "cite2",
        confidence: 1.0,
        processTimeMs: 0,
        patternsChecked: 0,
        volume: 200,
        reporter: "F.2d",
        page: 200,
      },
    ]

    const map = detectParagraphBoundaries(text, citations, /\|/g)

    expect(map.get(0)).toBe(0) // Before first |
    expect(map.get(1)).toBe(1) // After first |
  })
})

describe("detectParagraphBoundaries — binary search edge cases", () => {
  function makeCitation(originalStart: number): Citation {
    return {
      type: "case",
      text: "cite",
      span: { originalStart, originalEnd: originalStart + 4, cleanStart: originalStart, cleanEnd: originalStart + 4 },
      matchedText: "cite",
      confidence: 1.0,
      processTimeMs: 0,
      patternsChecked: 0,
      volume: 100,
      reporter: "F.2d",
      page: 100,
    }
  }

  it("assigns citation at position 0 to paragraph 0", () => {
    const text = "Start.\n\nEnd."
    const map = detectParagraphBoundaries(text, [makeCitation(0)])
    expect(map.get(0)).toBe(0)
  })

  it("assigns citation at exact boundary start to that paragraph", () => {
    // "Hello.\n\nWorld." — boundary at position 8
    const text = "Hello.\n\nWorld."
    const map = detectParagraphBoundaries(text, [makeCitation(8)])
    expect(map.get(0)).toBe(1) // paragraph 1 starts at position 8
  })

  it("assigns citation near end of document to last paragraph", () => {
    const text = "A.\n\nB.\n\nC."
    const map = detectParagraphBoundaries(text, [makeCitation(8)])
    expect(map.get(0)).toBe(2) // last paragraph
  })

  it("handles two citations in the same paragraph", () => {
    const text = "First citation and second citation.\n\nOther."
    const map = detectParagraphBoundaries(text, [makeCitation(0), makeCitation(20)])
    expect(map.get(0)).toBe(0)
    expect(map.get(1)).toBe(0)
  })
})

describe("isWithinBoundary", () => {
  it("returns true for citations in same paragraph", () => {
    const map = new Map<number, number>([
      [0, 0],
      [1, 0],
    ])

    expect(isWithinBoundary(0, 1, map, "paragraph")).toBe(true)
  })

  it("returns false for citations in different paragraphs", () => {
    const map = new Map<number, number>([
      [0, 0],
      [1, 1],
    ])

    expect(isWithinBoundary(0, 1, map, "paragraph")).toBe(false)
  })

  it("returns true for none strategy regardless of paragraph", () => {
    const map = new Map<number, number>([
      [0, 0],
      [1, 5], // Different paragraph
    ])

    expect(isWithinBoundary(0, 1, map, "none")).toBe(true)
  })

  it("returns true if paragraph mapping is undefined", () => {
    const map = new Map<number, number>()

    expect(isWithinBoundary(0, 1, map, "paragraph")).toBe(true)
  })

  it("section strategy behaves same as paragraph", () => {
    const map = new Map<number, number>([
      [0, 0],
      [1, 0],
      [2, 1],
    ])

    expect(isWithinBoundary(0, 1, map, "section")).toBe(true)
    expect(isWithinBoundary(0, 2, map, "section")).toBe(false)
  })

  it("footnote strategy behaves same as paragraph", () => {
    const map = new Map<number, number>([
      [0, 0],
      [1, 0],
      [2, 1],
    ])

    expect(isWithinBoundary(0, 1, map, "footnote")).toBe(true)
    expect(isWithinBoundary(0, 2, map, "footnote")).toBe(false)
  })
})
