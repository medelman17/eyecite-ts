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

  // #539 — last footnote zone runs greedy to end-of-text
  it("caps last footnote zone at subsequent ALL-CAPS section heading", () => {
    const text = [
      "Body 100 U.S. 200.",
      "",
      "----------",
      "",
      "1. See 200 F.3d 100.",
      "",
      "GOVERNMENT BRIEF",
      "",
      "The court further holds that 400 F.3d 500 controls.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(1)
    // The footnote zone should NOT extend into the post-footnote section
    expect(text.slice(zones[0].start, zones[0].end)).not.toContain("GOVERNMENT BRIEF")
    expect(text.slice(zones[0].start, zones[0].end)).not.toContain("400 F.3d 500")
  })

  // #540 — indented `N.` lines were being read as new markers, splitting
  // one footnote into multiple spurious zones.
  it("does not treat indented numbered sub-list items as new markers", () => {
    const text = [
      "Body text.",
      "",
      "----------",
      "",
      "1. The first footnote contains:",
      "  1. Sub-list item one.",
      "  2. Another sub-list item.",
      "2. The second real footnote.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(2)
    expect(zones[0].footnoteNumber).toBe(1)
    expect(zones[1].footnoteNumber).toBe(2)
    // The sub-list items belong to footnote 1, not separate zones
    expect(text.slice(zones[0].start, zones[0].end)).toContain("Sub-list item one.")
    expect(text.slice(zones[0].start, zones[0].end)).toContain("Another sub-list item.")
  })

  // #541 — short separators (`-----`) early in the document followed by a
  // numbered list are NOT footnote sections (e.g., signature blocks).
  it("does not treat a separator + numbered list near top of doc as footnotes", () => {
    const text = [
      "Signed,",
      "/s/ Judge Smith",
      "",
      "-----",
      "",
      "1. The first issue is whether 200 F.3d 100 controls.",
      "2. The second issue is 300 F.3d 200.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toEqual([])
  })

  // #541 corollary — guard does not strip legitimate footnote sections where
  // the separator appears later in the document.
  it("still detects real footnote sections (separator after substantial body)", () => {
    // Body that pushes the separator past the 25% threshold
    const body = "The court holds that 100 F.2d 50 (1st Cir. 2020) controls. ".repeat(20)
    const text = [body, "", "----------", "", "1. See 200 F.3d 100."].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(1)
    expect(zones[0].footnoteNumber).toBe(1)
  })

  it("caps last footnote zone at a subsequent separator line", () => {
    const text = [
      "Body 100 U.S. 200.",
      "",
      "----------",
      "",
      "1. See 200 F.3d 100.",
      "",
      "----------",
      "",
      "Closing remarks reference 400 F.3d 500.",
    ].join("\n")
    const zones = detectTextFootnotes(text)
    expect(zones).toHaveLength(1)
    expect(text.slice(zones[0].start, zones[0].end)).not.toContain("400 F.3d 500")
  })
})
