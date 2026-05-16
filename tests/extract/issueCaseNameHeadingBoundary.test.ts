import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"

const findFirstCase = (text: string): FullCaseCitation | undefined => {
  const cites = extractCitations(text)
  return cites.find((c): c is FullCaseCitation => c.type === "case")
}

describe("caseName backward search does not span section heading", () => {
  describe("heading + body with same case name", () => {
    it("`Des Roches v. ... Is Distinguishable\\nIn Des Roches v. ..., 320 F.R.D. 486`", () => {
      const text = `Des Roches v. California Physicians' Service Is Distinguishable
In Des Roches v. California Physicians' Service, 320 F.R.D. 486 (N.D. Cal. 2017), the court certified...`
      const cite = findFirstCase(text)
      expect(cite?.caseName).toBe("Des Roches v. California Physicians' Service")
      expect(cite?.plaintiff).toBe("Des Roches")
      expect(cite?.defendant).toBe("California Physicians' Service")
    })

    it("`Smith v. Jones Is Inapposite\\nThe Smith v. Jones, 100 F.2d 50 (1990) holding`", () => {
      const text = `Smith v. Jones Is Inapposite
The court in Smith v. Jones, 100 F.2d 50 (1990) held...`
      const cite = findFirstCase(text)
      expect(cite?.caseName).toBe("Smith v. Jones")
      expect(cite?.defendant).toBe("Jones")
    })

    it("heading with `Are` boundary: `... Are Distinguishable`", () => {
      const text = `Foo v. Bar Are Distinguishable
In Foo v. Bar, 100 F.2d 50 (1990), ...`
      const cite = findFirstCase(text)
      expect(cite?.caseName).toBe("Foo v. Bar")
      expect(cite?.defendant).toBe("Bar")
    })
  })

  describe("regressions", () => {
    it("real defendant `Anthem, Inc.` not truncated", () => {
      const text = "Collins v. Anthem, Inc., 100 F.2d 50 (1990)"
      const cite = findFirstCase(text)
      expect(cite?.defendant).toBe("Anthem, Inc.")
    })

    it("single citation with no heading still works", () => {
      const text = "Smith v. Jones, 100 F.2d 50 (1990)"
      const cite = findFirstCase(text)
      expect(cite?.defendant).toBe("Jones")
    })

    it("California year-first form preserved", () => {
      const text = "People v. Smith (1990) 50 Cal.3d 100"
      const cite = findFirstCase(text)
      expect(cite?.caseName).toBe("People v. Smith")
    })

    it("consolidated captions still trim at comma", () => {
      const text = "Smith v. Doe, et al. v. Jones, 100 F.2d 50 (1990)"
      const cite = findFirstCase(text)
      // The "consolidated caption" recovery truncates at first comma.
      expect(cite?.defendant).toBeDefined()
      expect(cite?.defendant?.includes(" v. ")).toBe(false)
    })
  })
})
