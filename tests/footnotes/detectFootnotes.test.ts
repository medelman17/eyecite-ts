import { describe, expect, it } from "vitest"
import { detectFootnotes } from "@/footnotes/detectFootnotes"

describe("detectFootnotes", () => {
  it("returns empty array for text with no footnotes", () => {
    expect(detectFootnotes("No footnotes here.")).toEqual([])
  })

  it("uses HTML detection when input contains HTML tags", () => {
    const html =
      '<p>Body text.</p><footnote label="1">See Smith v. Jones, 500 F.2d 123.</footnote>'
    const zones = detectFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("uses plain-text detection when input has no HTML tags", () => {
    const text = ["Body.", "", "----------", "1. See 500 F.2d 123."].join("\n")
    const zones = detectFootnotes(text)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("falls back to plain-text when HTML has no footnote elements", () => {
    const text = [
      "<p>Body text.</p>",
      "",
      "----------",
      "1. See 500 F.2d 123.",
    ].join("\n")
    const zones = detectFootnotes(text)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("prefers HTML detection over plain-text when both could match", () => {
    const html = [
      '<p>Body.</p><footnote label="1">HTML footnote.</footnote>',
      "",
      "----------",
      "1. Text footnote.",
    ].join("\n")
    const zones = detectFootnotes(html)
    expect(zones).toHaveLength(1)
    expect(html.slice(zones[0].start, zones[0].end)).toContain("HTML footnote")
  })

  it("returns zones sorted by start position", () => {
    const html = [
      '<footnote label="2">Second.</footnote>',
      '<footnote label="1">First.</footnote>',
    ].join("")
    const zones = detectFootnotes(html)
    expect(zones[0].start).toBeLessThan(zones[1].start)
  })
})
