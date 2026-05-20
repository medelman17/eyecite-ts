/**
 * Tests for stripHtmlTags handling of <script>/<style> bodies and CDATA
 * sections (#559, #561).
 *
 * Before these fixes:
 * - <script>...</script> bodies leaked into cleaned text as raw JS source,
 *   yielding phantom citations from string literals (#559).
 * - <![CDATA[...]]> sections were treated as a single greedy "tag" by the
 *   tag regex, so the citation inside the section was deleted (#561).
 */
import { describe, expect, it } from "vitest"
import { stripHtmlTags } from "../../src/clean/cleaners"
import { extractCitations } from "../../src/index"

describe("stripHtmlTags — script/style body removal (#559)", () => {
  it("removes <script> body entirely (no phantom citations from JS literals)", () => {
    const input = '<script>x = "999 F.2d 999";</script><p>500 F.2d 123</p>'
    expect(stripHtmlTags(input)).not.toContain("999")
  })

  it("removes <script> body across newlines", () => {
    const input = '<script>\n  var x = "999 F.2d 999";\n</script><p>500 F.2d 123</p>'
    expect(stripHtmlTags(input)).not.toContain("999")
  })

  it("removes <script> with attributes", () => {
    const input =
      '<script type="text/javascript" src="x.js">x = "999 F.2d 999";</script><p>500 F.2d 123</p>'
    expect(stripHtmlTags(input)).not.toContain("999")
  })

  it("removes <style> body entirely", () => {
    const input = '<style>a { content: "888 F.2d 888"; }</style><p>500 F.2d 123</p>'
    expect(stripHtmlTags(input)).not.toContain("888")
  })

  it("removes <style> body across newlines", () => {
    const input = '<style>\n  a {\n    content: "888 F.2d 888";\n  }\n</style><p>500 F.2d 123</p>'
    expect(stripHtmlTags(input)).not.toContain("888")
  })

  it("removes <STYLE> uppercase", () => {
    const input = '<STYLE>a { content: "888 F.2d 888"; }</STYLE><p>500 F.2d 123</p>'
    expect(stripHtmlTags(input)).not.toContain("888")
  })

  it("end-to-end: script-leaked phantom citation does not appear in extraction", () => {
    const input = '<script>x = "999 F.2d 999";</script><p>500 F.2d 123</p>'
    const cites = extractCitations(input)
    expect(cites.map((c) => c.matchedText)).not.toContain("999 F.2d 999")
    expect(cites.map((c) => c.matchedText)).toContain("500 F.2d 123")
  })

  it("end-to-end: style-leaked phantom citation does not appear in extraction", () => {
    const input = '<style>a { content: "888 F.2d 888"; }</style><p>500 F.2d 123</p>'
    const cites = extractCitations(input)
    expect(cites.map((c) => c.matchedText)).not.toContain("888 F.2d 888")
    expect(cites.map((c) => c.matchedText)).toContain("500 F.2d 123")
  })

  it("does not strip plain text that mentions 'script' or 'style'", () => {
    const input = "the script of the play and the style of writing"
    expect(stripHtmlTags(input)).toBe(input)
  })

  it("script with unclosed body is tolerant — leftover tag still stripped", () => {
    // Pathological case: <script> without </script>. We don't want to
    // delete the entire rest of the document. The script-body remover
    // should be non-greedy and only fire when a matching close exists;
    // otherwise we fall back to plain tag stripping for the opener.
    const input = '<script>x = "999 F.2d 999";<p>500 F.2d 123</p>'
    const result = stripHtmlTags(input)
    // Either behavior (delete-until-end or keep-body-strip-tag) is defensible.
    // We assert the LESS destructive one: the real citation must survive.
    expect(result).toContain("500 F.2d 123")
  })
})

describe("stripHtmlTags — CDATA sections (#561)", () => {
  it("keeps citation inside CDATA section", () => {
    const input = "<p>cite <![CDATA[500 F.2d 123]]> end.</p>"
    const cleaned = stripHtmlTags(input)
    expect(cleaned).toContain("500 F.2d 123")
  })

  it("strips CDATA markers but keeps body", () => {
    const input = "<![CDATA[hello world]]>"
    expect(stripHtmlTags(input)).toBe("hello world")
  })

  it("CDATA across newlines", () => {
    const input = "<![CDATA[\n  500 F.2d 123\n]]>"
    const cleaned = stripHtmlTags(input)
    expect(cleaned).toContain("500 F.2d 123")
  })

  it("end-to-end: citation inside CDATA survives extraction", () => {
    const input = "<p>cite <![CDATA[500 F.2d 123]]> end.</p>"
    const cites = extractCitations(input)
    expect(cites.map((c) => c.matchedText)).toContain("500 F.2d 123")
  })
})
