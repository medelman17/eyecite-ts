import { describe, expect, it } from "vitest"
import { analyzeDocument, extractCitations } from "@/index"

describe("analyzeDocument (end-to-end)", () => {
  it("returns a Document with all expected fields", () => {
    const text = "Intro. Smith v. Jones, 100 F.2d 50 (1990). Id."
    const cites = extractCitations(text, { resolve: true })
    const doc = analyzeDocument(text, cites)

    expect(doc.citations).toBe(cites)
    expect(Array.isArray(doc.proseSpans)).toBe(true)
    expect(doc.precedingProse).toBeInstanceOf(Map)
    expect(doc.followingProse).toBeInstanceOf(Map)
    expect(Array.isArray(doc.quoteAttributions)).toBe(true)
    expect(doc.citationGraph.nodes).toHaveLength(cites.length)
    expect(Array.isArray(doc.citationGraph.edges)).toBe(true)
  })

  it("footnoteZones is undefined when no footnote tagging is present", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990)."
    const cites = extractCitations(text)
    const doc = analyzeDocument(text, cites)
    expect(doc.footnoteZones).toBeUndefined()
  })

  it("works on an empty citations array", () => {
    const text = "Just prose."
    const doc = analyzeDocument(text, [])
    expect(doc.citations).toEqual([])
    expect(doc.proseSpans).toHaveLength(1)
    expect(doc.citationGraph.nodes).toEqual([])
    expect(doc.citationGraph.edges).toEqual([])
    expect(doc.quoteAttributions).toEqual([])
  })

  it("works on text with no citations or prose", () => {
    const doc = analyzeDocument("", [])
    expect(doc.proseSpans).toEqual([])
    expect(doc.citationGraph.nodes).toEqual([])
  })
})
