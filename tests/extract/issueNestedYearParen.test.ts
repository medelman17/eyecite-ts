import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("nested year parenthetical does not leak into court (#682)", () => {
  it("`(1990 (en banc))` → court undefined, year=1990", () => {
    const [c] = cases("Smith, 100 F.2d 1 (1990 (en banc))")
    expect(c.court).toBeUndefined()
    expect(c.year).toBe(1990)
  })

  it("`(9th Cir. 1990 (en banc))` → court='9th Cir.', year=1990", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. 1990 (en banc))")
    expect(c.court).toBe("9th Cir.")
    expect(c.year).toBe(1990)
  })

  it("`(1990 (per curiam))` does not leak", () => {
    const [c] = cases("Smith, 100 F.2d 1 (1990 (per curiam))")
    expect(c.court).toBeUndefined()
    expect(c.year).toBe(1990)
  })

  it("regression: simple `(9th Cir. 1990)` still works", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. 1990)")
    expect(c.court).toBe("9th Cir.")
    expect(c.year).toBe(1990)
  })
})
