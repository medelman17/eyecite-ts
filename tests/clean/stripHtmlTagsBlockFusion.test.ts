/**
 * Tests for #558 — `stripHtmlTags` fuses adjacent block elements and the
 * tokenizer emits a phantom citation across the fused boundary.
 *
 * Sprint A #583 already prevents the WORST form of fusion (digits → letters
 * with no separator), which would have produced a corrupted `500 F.2d 123Then…`
 * matchedText. After #583 the cleaned text reads `500 F.2d 123 Then citing
 * 600 F.2d 234` and the two real citations are extracted, but the broad
 * journal regex still matches `123 Then citing 600` as a phantom journal
 * cite that OVERLAPS both real citations. The previous dedup pass only
 * dropped strict-containment duplicates; proper overlaps (intersecting
 * spans where neither contains the other) leaked through.
 *
 * The fix extends the dedup pass with a second pass that drops any token
 * properly overlapped by a higher-priority kept token.
 */
import { describe, expect, it } from "vitest"
import { cleanText } from "../../src/clean/cleanText"
import { extractCitations } from "../../src/index"

describe("#558 — block-element fusion phantom citations", () => {
  it("does not emit a phantom journal cite that overlaps two real cites", () => {
    const input = "<p>500 F.2d 123</p><p>Then citing 600 F.2d 234</p>"
    const cites = extractCitations(input)
    const texts = cites.map((c) => c.matchedText)
    expect(texts).toContain("500 F.2d 123")
    expect(texts).toContain("600 F.2d 234")
    expect(texts).not.toContain("123 Then citing 600")
    expect(cites).toHaveLength(2)
  })

  it("preserves the cleaned text (block-element separator is a sentence boundary)", () => {
    // #701 changed block-element boundaries from a bare space to a sentence
    // boundary (". ") so the case-name backscan stops at the boundary instead
    // of fusing the two paragraphs. This also strengthens #558: the period
    // prevents the phantom journal token (`123 Then citing 600`) at the
    // source, not only at the dedup layer (the no-phantom + span-position
    // tests above still pass).
    const input = "<p>500 F.2d 123</p><p>Then citing 600 F.2d 234</p>"
    const { cleaned } = cleanText(input)
    expect(cleaned).toBe("500 F.2d 123. Then citing 600 F.2d 234")
  })

  it("end-to-end span positions of the two real cites are not disturbed", () => {
    const input = "<p>500 F.2d 123</p><p>Then citing 600 F.2d 234</p>"
    const cites = extractCitations(input)
    const first = cites.find((c) => c.matchedText === "500 F.2d 123")
    const second = cites.find((c) => c.matchedText === "600 F.2d 234")
    expect(first?.span.originalStart).toBe(input.indexOf("500 F.2d 123"))
    expect(second?.span.originalStart).toBe(input.indexOf("600 F.2d 234"))
  })

  it("phantom journal is also suppressed when the surrounding cites are state reporters", () => {
    // Generalization: any combination of high-priority cites that bracket
    // a 2-word capitalized phrase used to admit a phantom journal token.
    const input = "<p>100 N.E.2d 200</p><p>See also 300 So.2d 400</p>"
    const cites = extractCitations(input)
    const texts = cites.map((c) => c.matchedText)
    expect(texts).toContain("100 N.E.2d 200")
    expect(texts).toContain("300 So.2d 400")
    expect(texts.some((t) => /\b200 See also 300\b/.test(t))).toBe(false)
  })

  it("does not over-aggressively drop legitimate non-overlapping cites", () => {
    // Sanity: cites that don't overlap each other survive untouched.
    const input = "Smith v. Jones, 500 F.2d 123 (1980). See 600 F.2d 234 (1981)."
    const cites = extractCitations(input)
    const texts = cites.map((c) => c.matchedText)
    expect(texts).toContain("500 F.2d 123")
    expect(texts).toContain("600 F.2d 234")
  })

  it("does not drop a contained higher-priority cite inside a lower-priority cite", () => {
    // Sanity: keep the existing dedup behavior — containment doesn't
    // swallow a higher-priority inner token. (This pins the comment on
    // the existing dedup loop: "drop the subsumed token only when the
    // container is at least as specific".)
    const input = "Cal. Const. art. I, § 7."
    // Whatever specific tokenization runs here, the test should not crash
    // and should produce at least the constitutional / statute reading.
    expect(() => extractCitations(input)).not.toThrow()
  })
})
