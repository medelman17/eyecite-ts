import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("pincite parser accepts typography terminator (†, ‡, §, ¶, ©, °)", () => {
  it.each([
    ["dagger", "Smith, 100 F.2d 1, 5†"],
    ["double dagger", "Smith, 100 F.2d 1, 5‡"],
    ["section", "Smith, 100 F.2d 1, 5§"],
    ["pilcrow", "Smith, 100 F.2d 1, 5¶"],
    ["copyright", "Smith, 100 F.2d 1, 5©"],
    ["degree", "Smith, 100 F.2d 1, 5°"],
  ])("`%s` after pincite digit still captures pincite", (_, input) => {
    const [c] = cases(input)
    expect(c?.pincite).toBe(5)
  })

  it("regression: bare pincite without trailing marker still works", () => {
    const [c] = cases("Smith, 100 F.2d 1, 5")
    expect(c?.pincite).toBe(5)
  })

  it("regression: pincite followed by period still works", () => {
    const [c] = cases("Smith, 100 F.2d 1, 5.")
    expect(c?.pincite).toBe(5)
  })
})
