import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #701 — stripHtmlTags fused words across block-element boundaries. A
 * tag run between word chars became a single space, so a heading and the
 * following paragraph merged into one string and the case-name backscan
 * swallowed the heading (`<h2>Case</h2><p>Smith v. Jones` → "Case Smith v.
 * Jones"). When the boundary followed a `.` the run became "" instead, fusing
 * `para.Brown`.
 *
 * Block-level boundaries (`p`, `div`, `h1`-`h6`, `li`, `tr`/`td`, etc.) now
 * collapse to a sentence boundary so the backscan stops there. `<br>` stays a
 * space (an in-flow line break — #693) and inline tags (`<b>`, `<i>`, `<a>`)
 * keep the word-fusion-only behavior.
 */
const caseName = (t: string): string | undefined => {
  const c = extractCitations(t).find((x) => x.type === "case") as { caseName?: string } | undefined
  return c?.caseName
}

describe("Issue #701 - HTML block-element word fusion", () => {
  it("heading then paragraph does not fuse into the caption", () => {
    expect(caseName("<div><h2>Case</h2><p>Smith v. Jones, 100 F.2d 1.</p></div>")).toBe(
      "Smith v. Jones",
    )
  })

  it("paragraph boundary after a period does not fuse (`para.Brown`)", () => {
    expect(caseName("<p>First para.</p><p>Brown v. Board, 347 U.S. 483.</p>")).toBe(
      "Brown v. Board",
    )
  })

  it("table cells do not fuse across the boundary", () => {
    expect(caseName("<tr><td>Foo</td><td>Smith v. Jones, 100 F.2d 1</td></tr>")).toBe(
      "Smith v. Jones",
    )
  })

  it("list items do not fuse across the boundary", () => {
    expect(caseName("<ul><li>Heading</li><li>Smith v. Jones, 100 F.2d 1</li></ul>")).toBe(
      "Smith v. Jones",
    )
  })

  // Regression guards — these must keep their current correct behavior.
  it("`<br>` line breaks still traverse the caption (#693)", () => {
    expect(caseName("Smith<br>v.<br>Jones, 100 F.2d 1")).toBe("Smith v. Jones")
  })

  it("inline tags inside a caption do not break it", () => {
    expect(caseName("<b>Smith</b> v. <i>Jones</i>, 100 F.2d 1")).toBe("Smith v. Jones")
  })
})
