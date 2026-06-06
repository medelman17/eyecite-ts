import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation } from "@/types/citation"
import type { Span } from "@/types/span"
import { toDurableLocator, toDurableLocators } from "@/utils/durableLocator"
import { tokenBoundedIndexes } from "@/utils/tokenBounded"

/** Minimal citation stub for controlled unit tests. The builder only reads
 *  `span`, `matchedText`, and the absence of `fullSpan`. */
function fakeCitation(span: Span, matchedText: string): Citation {
  return { type: "id", text: matchedText, matchedText, span, confidence: 1 } as unknown as Citation
}

describe("toDurableLocator", () => {
  it("produces a W3C-shaped, version-1 locator for a unique citation", () => {
    const text = "We cite 410 U.S. 113 today."
    const loc = toDurableLocator(extractCitations(text)[0]!, text)
    expect(loc.v).toBe(1)
    expect(loc.space).toBe("original")
    expect(loc.quote.exact).toBe("410 U.S. 113")
    expect(loc.occurrence).toBe(0)
    expect(loc.contentHash).toMatch(/^[0-9a-f]{16}$/)
  })

  it("sets position to the selected span offsets", () => {
    const text = "We rely on 410 U.S. 113 here."
    const cite = extractCitations(text)[0]!
    const loc = toDurableLocator(cite, text)
    expect(loc.position).toEqual({
      start: cite.span.originalStart,
      end: cite.span.originalEnd,
    })
  })

  it("clamps each context side to contextLength characters", () => {
    const text =
      "In the matter of the very long preliminary discussion that precedes it, 410 U.S. 113 controls."
    const loc = toDurableLocator(extractCitations(text)[0]!, text)
    expect(loc.quote.prefix!.length).toBe(32)
  })

  it("does not let the prefix cross a sentence boundary", () => {
    const text = "Short prior. The court in 410 U.S. 113 ruled."
    const loc = toDurableLocator(extractCitations(text)[0]!, text)
    expect(loc.quote.prefix).toBe("The court in ")
    expect(loc.quote.prefix).not.toContain("prior")
  })

  it("omits an empty prefix when the citation starts its sentence", () => {
    const text = "410 U.S. 113 was a landmark ruling."
    const loc = toDurableLocator(extractCitations(text)[0]!, text)
    expect(loc.quote.prefix).toBeUndefined()
    expect(loc.quote.suffix).toBeDefined()
  })

  it("omits an empty suffix at end-of-text with no trailing punctuation", () => {
    const text = "The controlling authority is 410 U.S. 113"
    const loc = toDurableLocator(extractCitations(text)[0]!, text)
    expect(loc.quote.suffix).toBeUndefined()
  })

  it("reads original offsets for original space and clean offsets for clean space", () => {
    const span = { originalStart: 10, originalEnd: 13, cleanStart: 4, cleanEnd: 7 }
    const cite = fakeCitation(span, "abc")
    const o = toDurableLocator(cite, "0123456789abcdef ghij", { space: "original" })
    expect(o.position).toEqual({ start: 10, end: 13 })
    expect(o.quote.exact).toBe("abc")
    const c = toDurableLocator(cite, "see XYZ stuff here now", { space: "clean" })
    expect(c.position).toEqual({ start: 4, end: 7 })
    expect(c.quote.exact).toBe("XYZ")
    expect(c.space).toBe("clean")
  })

  it("uses fullSpan when fullSpan:true and the citation has one", () => {
    const text = "Smith v. Jones, 100 F.2d 50, 55 (1990)."
    const loc = toDurableLocator(extractCitations(text)[0]!, text, { fullSpan: true })
    expect(loc.quote.exact.startsWith("Smith v. Jones")).toBe(true)
    expect(loc.quote.exact).toContain("(1990)")
  })

  it("falls back to the core span when fullSpan:true but none exists", () => {
    const text = "See 28 U.S.C. § 1331."
    const cite = extractCitations(text)[0]!
    const loc = toDurableLocator(cite, text, { fullSpan: true })
    expect(loc.quote.exact).toBe(cite.matchedText)
  })

  it("stamps occurrence as the document-order ordinal among identical hits", () => {
    const source = "Id. x Id. y Id." // "Id." at 0, 6, 12 — target is the middle one
    const cite = fakeCitation(
      { cleanStart: 6, cleanEnd: 9, originalStart: 6, originalEnd: 9 },
      "Id.",
    )
    expect(toDurableLocator(cite, source).occurrence).toBe(1)
  })

  it("throws when the span is out of range for the source", () => {
    const cite = fakeCitation(
      { cleanStart: 0, cleanEnd: 5, originalStart: 0, originalEnd: 5 },
      "12345",
    )
    expect(() => toDurableLocator(cite, "123")).toThrow(/out of range/)
  })

  it("throws on an empty (zero-length) span", () => {
    const cite = fakeCitation(
      { cleanStart: 2, cleanEnd: 2, originalStart: 2, originalEnd: 2 },
      "",
    )
    expect(() => toDurableLocator(cite, "abcdef")).toThrow(/nothing to anchor/)
  })

  it("throws when source text does not match the citation (original core-span)", () => {
    const text = "See 410 U.S. 113 (1973) for the holding."
    const cite = extractCitations(text)[0]!
    const wrong = "z".repeat(text.length + 10)
    expect(() => toDurableLocator(cite, wrong)).toThrow(/does not equal/)
  })
})

describe("toDurableLocators", () => {
  it("maps over many citations sharing one source", () => {
    const text = "First, 410 U.S. 113. Second, 5 U.S. 137."
    const cites = extractCitations(text)
    const locs = toDurableLocators(cites, text)
    expect(locs.length).toBe(cites.length)
    expect(locs.length).toBeGreaterThan(0)
  })

  it("every located occurrence round-trips to its position (key invariant)", () => {
    const text =
      "See Roe v. Wade, 410 U.S. 113 (1973). Id. at 114. Later, 5 U.S. 137 (1803). Id. at 138."
    const cites = extractCitations(text)
    const locs = toDurableLocators(cites, text)
    expect(locs.length).toBe(cites.length)
    for (const loc of locs) {
      if (loc.occurrence === undefined) continue
      expect(tokenBoundedIndexes(text, loc.quote.exact)[loc.occurrence]).toBe(loc.position.start)
    }
  })
})
