import { describe, expect, it } from "vitest"
import { detectHtmlFootnotes } from "@/footnotes/htmlDetector"

describe("detectHtmlFootnotes", () => {
  it("returns empty array for plain text", () => {
    expect(detectHtmlFootnotes("No HTML here.")).toEqual([])
  })

  it("returns empty array for HTML without footnotes", () => {
    expect(detectHtmlFootnotes("<p>Hello <b>world</b></p>")).toEqual([])
  })

  it("detects <footnote> elements", () => {
    const html = 'Body text.<footnote label="1">See Smith v. Jones, 500 F.2d 123.</footnote>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
    expect(html.slice(zones[0].start, zones[0].end)).toContain("Smith v. Jones")
  })

  it("detects <fn> elements", () => {
    const html = "Body.<fn>1. Citation here, 200 U.S. 100.</fn>"
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("detects elements with class='footnote'", () => {
    const html = '<p>Body.</p><div class="footnote"><p>1. See 42 U.S.C. § 1983.</p></div>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("detects elements with id starting with 'fn' or 'footnote'", () => {
    const html = '<p>Body.</p><div id="fn1"><p>Citation text.</p></div>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("detects multiple footnotes in order", () => {
    const html =
      '<p>Body.</p><footnote label="1">First note.</footnote><footnote label="2">Second note.</footnote>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(2)
    expect(zones[0].footnoteNumber).toBe(1)
    expect(zones[1].footnoteNumber).toBe(2)
    expect(zones[0].start).toBeLessThan(zones[1].start)
  })

  it("extracts footnote number from label attribute", () => {
    const html = '<footnote label="3">Note content.</footnote>'
    const zones = detectHtmlFootnotes(html)
    expect(zones[0].footnoteNumber).toBe(3)
  })

  it("extracts footnote number from id attribute", () => {
    const html = '<div id="fn7"><p>Note content.</p></div>'
    const zones = detectHtmlFootnotes(html)
    expect(zones[0].footnoteNumber).toBe(7)
  })

  it("extracts footnote number from leading digit in content", () => {
    const html = '<div class="footnote">5. Some citation text.</div>'
    const zones = detectHtmlFootnotes(html)
    expect(zones[0].footnoteNumber).toBe(5)
  })

  it("handles self-closing tags inside footnotes", () => {
    const html = '<footnote label="1">See <br/>Smith v. Jones, 500 F.2d 123.</footnote>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(html.slice(zones[0].start, zones[0].end)).toContain("Smith v. Jones")
  })

  it("handles nested elements inside footnotes", () => {
    const html = '<footnote label="1"><p><em>See</em> Smith v. Jones, 500 F.2d 123.</p></footnote>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
  })

  it("does not treat bare <sup> in body as footnotes", () => {
    const html = "<p>The 2<sup>nd</sup> Circuit held that...</p>"
    const zones = detectHtmlFootnotes(html)
    expect(zones).toEqual([])
  })

  it("detects <sup> inside a footnote container", () => {
    const html = '<div class="footnote"><sup>1</sup> See 500 F.2d 123.</div>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("assigns sequential number when no number can be extracted", () => {
    const html = '<div class="footnote">Some note without a number.</div>'
    const zones = detectHtmlFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })
})
