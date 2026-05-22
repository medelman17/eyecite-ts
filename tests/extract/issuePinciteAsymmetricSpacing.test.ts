import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("pincite range accepts asymmetric spacing around hyphen (#722)", () => {
  it.each([
    ["5- 7 (space after only)", "Smith, 100 F.2d 1, 5- 7"],
    ["5 -7 (space before only)", "Smith, 100 F.2d 1, 5 -7"],
    ["5 - 7 (both spaces)", "Smith, 100 F.2d 1, 5 - 7"],
    ["5-7 (no spaces)", "Smith, 100 F.2d 1, 5-7"],
  ])("`%s` captures pincite=5", (_, input) => {
    const [c] = cases(input)
    expect(c?.pincite).toBe(5)
  })

  it("regression: comma + page-only (no range) still works", () => {
    const [c] = cases("Smith, 100 F.2d 1, 5")
    expect(c?.pincite).toBe(5)
  })
})
