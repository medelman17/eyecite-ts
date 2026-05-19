import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import { computeParenDepths } from "@/utils/parenDepths"

describe("computeParenDepths", () => {
  it("returns all zeros for citations outside any parenthetical", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990). Brown v. Doe, 200 F.3d 100 (2000)."
    const cites = extractCitations(text)
    const depths = computeParenDepths(text, cites)
    expect(depths).toEqual(new Array(cites.length).fill(0))
  })

  it("returns depth > 0 for citations inside an explanatory parenthetical", () => {
    const text = "Smith v. Jones, 100 F.2d 50 (1990) (citing Other v. Else, 200 F.3d 100)."
    const cites = extractCitations(text)
    const depths = computeParenDepths(text, cites)
    expect(depths.length).toBe(cites.length)
    const otherIdx = cites.findIndex((c) => c.text.includes("200 F.3d 100"))
    if (otherIdx !== -1) {
      expect(depths[otherIdx]).toBeGreaterThan(0)
    }
  })

  it("returns empty array for empty citation list", () => {
    expect(computeParenDepths("anything", [])).toEqual([])
  })
})
