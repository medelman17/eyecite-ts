import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("court parenthetical with year + trailing modifier strips correctly", () => {
  it.each([
    ["mem.", "Smith, 100 F.2d 1 (9th Cir. 1990 mem.)"],
    ["unpublished", "Smith, 100 F.2d 1 (9th Cir. 1990 unpublished)"],
    ["unpub.", "Smith, 100 F.2d 1 (9th Cir. 1990 unpub.)"],
    ["per curiam", "Smith, 100 F.2d 1 (9th Cir. 1990 per curiam)"],
    ["en banc", "Smith, 100 F.2d 1 (9th Cir. 1990 en banc)"],
  ])("`%s` after year does not leak into court field", (_, input) => {
    const [c] = cases(input)
    expect(c.court).toBe("9th Cir.")
    expect(c.year).toBe(1990)
  })

  it("regression: standard `(9th Cir. 1990)` still works", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. 1990)")
    expect(c.court).toBe("9th Cir.")
    expect(c.year).toBe(1990)
  })

  it("regression: month + day + year + trailing word", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. Jan. 15, 1990 per curiam)")
    expect(c.court).toBe("9th Cir.")
    expect(c.year).toBe(1990)
  })
})
