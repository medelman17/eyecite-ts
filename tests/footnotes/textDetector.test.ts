import { describe, expect, it } from "vitest"
import { detectTextFootnotes } from "@/footnotes/textDetector"

describe("detectTextFootnotes", () => {
  it("returns empty array for text without footnotes", () => {
    expect(detectTextFootnotes("Just a regular paragraph.")).toEqual([])
  })

  it("detects footnotes after separator line (dashes)", () => {
    const text = [
      "Body text with a citation.",
      "",
      "----------",
      "1. See Smith v. Jones, 500 F.2d 123.",
      "2. See Doe v. Roe, 300 U.S. 45.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(2)
    expect(zones[0].footnoteNumber).toBe(1)
    expect(zones[1].footnoteNumber).toBe(2)
    expect(text.slice(zones[0].start, zones[0].end)).toContain("Smith v. Jones")
    expect(text.slice(zones[1].start, zones[1].end)).toContain("Doe v. Roe")
  })

  it("detects footnotes after separator line (underscores)", () => {
    const text = ["Body text.", "", "__________", "1. First footnote."].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("detects FN-style markers", () => {
    const text = [
      "Body text.",
      "",
      "___________",
      "FN1. See 42 U.S.C. § 1983.",
      "FN2. See 28 U.S.C. § 1331.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(2)
    expect(zones[0].footnoteNumber).toBe(1)
    expect(zones[1].footnoteNumber).toBe(2)
  })

  it("detects bracket-style markers", () => {
    const text = [
      "Body text.",
      "",
      "----------",
      "[1] See Smith v. Jones, 500 F.2d 123.",
      "[2] See Doe v. Roe, 300 U.S. 45.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(2)
    expect(zones[0].footnoteNumber).toBe(1)
    expect(zones[1].footnoteNumber).toBe(2)
  })

  it("detects n.-style markers", () => {
    const text = [
      "Body text.",
      "",
      "----------",
      "n.1 See Smith v. Jones, 500 F.2d 123.",
      "n.2 See Doe v. Roe, 300 U.S. 45.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(2)
    expect(zones[0].footnoteNumber).toBe(1)
    expect(zones[1].footnoteNumber).toBe(2)
  })

  it("each zone extends from marker to next marker", () => {
    const text = [
      "Body.",
      "",
      "----------",
      "1. First footnote content.",
      "Some continuation.",
      "2. Second footnote content.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(2)
    expect(text.slice(zones[0].start, zones[0].end)).toContain("Some continuation.")
    expect(text.slice(zones[1].start, zones[1].end)).not.toContain("Some continuation.")
  })

  it("last zone extends to end of text", () => {
    const text = ["Body.", "", "----------", "1. Only footnote with trailing text."].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(1)
    expect(zones[0].end).toBe(text.length)
  })

  it("does not detect numbered lists in body text (no separator)", () => {
    const text = [
      "The court considered:",
      "1. The first factor.",
      "2. The second factor.",
      "3. The third factor.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toEqual([])
  })

  it("handles mixed marker styles after separator", () => {
    const text = [
      "Body.",
      "",
      "----------",
      "FN1. First footnote.",
      "FN2. Second footnote.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(2)
  })
})
