/**
 * Regression test for #560 — greedy `<[^>]+>` regex deletes text between
 * bare `<` and `>` chars in prose (mathematical comparisons, code samples).
 *
 * Already fixed by #603 (the tag-shape tightening for #546), which now
 * requires the character following `<` to be a letter, `/`, or `!` for
 * the match to fire. This file pins that behavior so a future
 * relaxation cannot silently re-introduce the bug.
 */
import { describe, expect, it } from "vitest"
import { cleanText } from "../../src/clean/cleanText"
import { stripHtmlTags } from "../../src/clean/cleaners"
import { extractCitations } from "../../src/index"

describe("stripHtmlTags — bare-angle-bracket prose (#560, pinned via #603)", () => {
  it("does not delete citation sandwiched between bare `<` and `>` in prose", () => {
    const input = "In 1974, value < 500 F.2d 123. And later, count > 5."
    const result = stripHtmlTags(input)
    expect(result).toBe(input)
  })

  it("end-to-end: citation between bare angle brackets is extracted", () => {
    const input = "In 1974, value < 500 F.2d 123. And later, count > 5."
    const cites = extractCitations(input)
    expect(cites.map((c) => c.matchedText)).toContain("500 F.2d 123")
  })

  it("default cleanText pipeline preserves citation between bare angles", () => {
    const input = "In 1974, value < 500 F.2d 123. And later, count > 5."
    const { cleaned } = cleanText(input)
    expect(cleaned).toContain("500 F.2d 123")
    expect(cleaned).toContain("value <")
    expect(cleaned).toContain("count >")
  })

  it("works with multiple comparisons", () => {
    const input = "if x < y and y > z, see 500 F.2d 123 for the rule"
    const cites = extractCitations(input)
    expect(cites.map((c) => c.matchedText)).toContain("500 F.2d 123")
  })

  it("works when `<` is followed by a digit (a typical comparison form)", () => {
    const input = "x < 3 then 500 F.2d 123"
    const result = stripHtmlTags(input)
    expect(result).toBe(input)
  })

  it("works when `<` is followed by whitespace", () => {
    const input = "x < 3 then 500 F.2d 123 > 0"
    const result = stripHtmlTags(input)
    expect(result).toBe(input)
  })
})
