import { describe, expect, it } from "vitest"
import { computeProseOffsets } from "@/document/proseOffsets"
import { extractCitations } from "@/extract"

describe("computeProseOffsets", () => {
  it("returns no prose spans for empty text", () => {
    const result = computeProseOffsets("", [])
    expect(result.proseSpans).toEqual([])
    expect(result.precedingProse.size).toBe(0)
    expect(result.followingProse.size).toBe(0)
  })

  it("returns one prose span covering the whole text when no citations", () => {
    const text = "just prose, no citations at all here"
    const result = computeProseOffsets(text, [])
    expect(result.proseSpans).toHaveLength(1)
    expect(result.proseSpans[0].originalStart).toBe(0)
    expect(result.proseSpans[0].originalEnd).toBe(text.length)
  })

  it("returns no prose spans when text is entirely a single citation", () => {
    const text = "100 F.2d 50"
    const cites = extractCitations(text)
    if (cites.length === 1) {
      const result = computeProseOffsets(text, cites)
      expect(result.proseSpans).toEqual([])
    }
  })

  it("emits prose before, between, and after citations", () => {
    const text =
      "Intro prose. Smith v. Jones, 100 F.2d 50 (1990). Middle prose. Brown v. Doe, 200 F.3d 100 (2000). Closing prose."
    const cites = extractCitations(text)
    expect(cites).toHaveLength(2)
    const result = computeProseOffsets(text, cites)
    expect(result.proseSpans).toHaveLength(3)
    const firstSpanText = text.slice(
      result.proseSpans[0].originalStart,
      result.proseSpans[0].originalEnd,
    )
    expect(firstSpanText).toContain("Intro prose")
  })

  it("uses fullSpan, not span, to bound citations (case names are not prose)", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 55 (1990). End."
    const cites = extractCitations(text)
    const result = computeProseOffsets(text, cites)
    expect(result.proseSpans.length).toBeGreaterThan(0)
    const lastSpan = result.proseSpans[result.proseSpans.length - 1]
    const lastText = text.slice(lastSpan.originalStart, lastSpan.originalEnd)
    expect(lastText).toContain("End")
    if (result.proseSpans[0].originalStart === 0) {
      const firstText = text.slice(
        result.proseSpans[0].originalStart,
        result.proseSpans[0].originalEnd,
      )
      expect(firstText).not.toContain("Smith")
    }
  })

  it("populates precedingProse and followingProse per citation", () => {
    const text =
      "Intro. Smith v. Jones, 100 F.2d 50 (1990). Middle. Brown v. Doe, 200 F.3d 100 (2000). End."
    const cites = extractCitations(text)
    expect(cites).toHaveLength(2)
    const result = computeProseOffsets(text, cites)

    expect(result.precedingProse.has(0)).toBe(true)
    expect(result.followingProse.has(0)).toBe(true)
    expect(result.precedingProse.has(1)).toBe(true)
    expect(result.followingProse.has(1)).toBe(true)
  })

  it("sets cleanStart === originalStart when no transformationMap is provided", () => {
    const text = "Intro. Smith v. Jones, 100 F.2d 50 (1990). End."
    const cites = extractCitations(text)
    const result = computeProseOffsets(text, cites)
    for (const span of result.proseSpans) {
      expect(span.cleanStart).toBe(span.originalStart)
      expect(span.cleanEnd).toBe(span.originalEnd)
    }
  })
})
