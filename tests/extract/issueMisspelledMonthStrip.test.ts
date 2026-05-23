import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("misspelled / OCR-mangled month names stripped from court (#717)", () => {
  it.each([
    ["Jaunary (typo Jan)", "Smith, 100 F.2d 1 (9th Cir. Jaunary 15, 2020)"],
    ["Ferbuary (typo Feb)", "Smith, 100 F.2d 1 (9th Cir. Ferbuary 2020)"],
    ["Marc (truncated March)", "Smith, 100 F.2d 1 (9th Cir. Marc 15, 2020)"],
    ["Septmber (typo Sept)", "Smith, 100 F.2d 1 (9th Cir. Septmber 15, 2020)"],
    ["Octber (typo Oct)", "Smith, 100 F.2d 1 (9th Cir. Octber 15, 2020)"],
  ])("`%s` strips correctly, court=`9th Cir.`", (_, input) => {
    const [c] = cases(input)
    expect(c.court).toBe("9th Cir.")
    expect(c.year).toBe(2020)
  })

  it("regression: canonical month names still strip", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. January 15, 2020)")
    expect(c.court).toBe("9th Cir.")
  })

  it("regression: `9th Cir.` alone (no month) still works", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. 2020)")
    expect(c.court).toBe("9th Cir.")
  })

  it("regression: court-abbrev tokens not mistakenly stripped", () => {
    // `App` is in NO_STRIP_TRAILING — should never be removed
    const [c] = cases("Smith, 100 F.2d 1 (Ill. App. 2020)")
    expect(c.court).toContain("App")
  })
})
