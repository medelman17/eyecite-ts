import { describe, expect, it } from "vitest"
import { extractFootnoteZones } from "@/document/footnoteZones"
import { extractCitations } from "@/extract"

describe("extractFootnoteZones", () => {
  it("returns undefined when no citations carry footnote tagging", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990)."
    const cites = extractCitations(text)
    expect(extractFootnoteZones(cites)).toBeUndefined()
  })

  it("returns zones grouped by footnote number", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990)."
    const cites = extractCitations(text)
    if (cites.length > 0) {
      cites[0].inFootnote = true
      cites[0].footnoteNumber = 1
      const zones = extractFootnoteZones(cites)
      expect(zones).toBeDefined()
      expect(zones).toHaveLength(1)
      expect(zones?.[0].footnoteNumber).toBe(1)
      expect(zones?.[0].citationIndices).toContain(0)
    }
  })
})
