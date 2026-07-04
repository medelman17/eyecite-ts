import { describe, expect, it } from "vitest"
import { CitationParseError, extractCitations } from "@/extract"

/**
 * #881: `extractCitations` must never throw an uncaught exception on real input.
 * When the tokenizer admits a candidate the extractor's stricter re-parse regex
 * cannot parse (a tokenizer/extractor divergence), the candidate is declined
 * (its token skipped) — not crashed on.
 */
describe("extractCitations declines unparseable candidates (#881)", () => {
  // Faithful minimal snippet from CourtListener opinion 4708001: the broad
  // journal tokenizer pattern matches the caption/docket fragment, but
  // extractJournal's `[A-Za-z.\s]` name class rejects the apostrophe in
  // KELLEY'S, so the extractor's re-parse fails.
  const KELLEY = "  4\n\f                   KELLEY'S SECOND 60-1507 "

  it("does not throw on a token the extractor cannot re-parse", () => {
    expect(() => extractCitations(KELLEY)).not.toThrow()
    expect(Array.isArray(extractCitations(KELLEY))).toBe(true)
  })

  it("declines only the bad candidate — other citations in the document survive", () => {
    const text = "Smith v. Jones, 100 F.3d 1 (2d Cir. 1990). 4\n\f      KELLEY'S SECOND 60-1507 next."
    const cites = extractCitations(text)
    expect(cites.some((c) => c.matchedText.includes("100 F.3d 1"))).toBe(true)
  })

  it("exports CitationParseError as a named Error subclass", () => {
    const e = new CitationParseError("Failed to parse journal citation: x")
    expect(e).toBeInstanceOf(Error)
    expect(e.name).toBe("CitationParseError")
  })
})
