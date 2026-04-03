import { describe, expect, it } from "vitest"
import { DocumentResolver } from "@/resolve/DocumentResolver"
import type { Citation } from "@/types/citation"

function mockCase(start: number, end: number, overrides: Record<string, unknown> = {}): Citation {
  return {
    type: "case",
    text: `cite-${start}`,
    span: { cleanStart: start, cleanEnd: end, originalStart: start, originalEnd: end },
    matchedText: `cite-${start}`,
    confidence: 1.0,
    processTimeMs: 0,
    patternsChecked: 0,
    volume: 500,
    reporter: "F.2d",
    page: 123,
    ...overrides,
  } as Citation
}

function mockId(start: number, end: number): Citation {
  return {
    type: "id",
    text: "Id.",
    span: { cleanStart: start, cleanEnd: end, originalStart: start, originalEnd: end },
    matchedText: "Id.",
    confidence: 1.0,
    processTimeMs: 0,
    patternsChecked: 0,
  } as Citation
}

function mockSupra(start: number, end: number, partyName: string): Citation {
  return {
    type: "supra",
    text: `${partyName}, supra`,
    span: { cleanStart: start, cleanEnd: end, originalStart: start, originalEnd: end },
    matchedText: `${partyName}, supra`,
    confidence: 1.0,
    processTimeMs: 0,
    patternsChecked: 0,
    partyName,
  } as Citation
}

describe("Footnote-aware resolution", () => {
  // Body: 0-99, Footnote 1: 100-199, Footnote 2: 200-299
  const footnoteMap = [
    { start: 100, end: 200, footnoteNumber: 1 },
    { start: 200, end: 300, footnoteNumber: 2 },
  ]

  const text = "x".repeat(300)

  describe("Id. resolution with footnote scope", () => {
    it("Id. in footnote 1 resolves to case in same footnote", () => {
      const citations = [mockCase(110, 140), mockId(160, 163)]
      const resolver = new DocumentResolver(citations, text, {
        scopeStrategy: "footnote",
        footnoteMap,
        autoDetectParagraphs: false,
      })
      const resolved = resolver.resolve()
      expect(resolved[1].resolution?.resolvedTo).toBe(0)
    })

    it("Id. in footnote 1 does NOT resolve to case in body", () => {
      const citations = [mockCase(10, 40), mockId(160, 163)]
      const resolver = new DocumentResolver(citations, text, {
        scopeStrategy: "footnote",
        footnoteMap,
        autoDetectParagraphs: false,
      })
      const resolved = resolver.resolve()
      expect(resolved[1].resolution?.resolvedTo).toBeUndefined()
    })

    it("Id. in footnote 1 does NOT resolve to case in footnote 2", () => {
      const citations = [mockCase(210, 240), mockId(160, 163)]
      const resolver = new DocumentResolver(citations, text, {
        scopeStrategy: "footnote",
        footnoteMap,
        autoDetectParagraphs: false,
      })
      const resolved = resolver.resolve()
      expect(resolved[1].resolution?.resolvedTo).toBeUndefined()
    })

    it("Id. in body resolves to case in body", () => {
      const citations = [mockCase(10, 40), mockId(50, 53)]
      const resolver = new DocumentResolver(citations, text, {
        scopeStrategy: "footnote",
        footnoteMap,
        autoDetectParagraphs: false,
      })
      const resolved = resolver.resolve()
      expect(resolved[1].resolution?.resolvedTo).toBe(0)
    })
  })

  describe("supra resolution with footnote scope", () => {
    it("supra in footnote resolves to case in body (cross-zone allowed)", () => {
      const citations = [
        mockCase(10, 40, { defendant: "Jones", defendantNormalized: "jones" }),
        mockSupra(160, 175, "Jones"),
      ]
      const resolver = new DocumentResolver(citations, text, {
        scopeStrategy: "footnote",
        footnoteMap,
        autoDetectParagraphs: false,
      })
      const resolved = resolver.resolve()
      expect(resolved[1].resolution?.resolvedTo).toBe(0)
    })

    it("supra in footnote 1 does NOT resolve to case in footnote 2", () => {
      const citations = [
        mockCase(210, 240, { defendant: "Jones", defendantNormalized: "jones" }),
        mockSupra(160, 175, "Jones"),
      ]
      const resolver = new DocumentResolver(citations, text, {
        scopeStrategy: "footnote",
        footnoteMap,
        autoDetectParagraphs: false,
      })
      const resolved = resolver.resolve()
      expect(resolved[1].resolution?.resolvedTo).toBeUndefined()
    })
  })

  describe("fallback behavior", () => {
    it("falls back to paragraph scope when footnoteMap is not provided", () => {
      const longText = "Paragraph 1.\n\nParagraph 2."
      const citations = [mockCase(0, 10), mockId(15, 18)]
      const resolver = new DocumentResolver(citations, longText, {
        scopeStrategy: "footnote",
      })
      const resolved = resolver.resolve()
      expect(resolved[1].resolution?.resolvedTo).toBeUndefined()
    })
  })
})
