import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("approximate-year + typo prefixes do not pollute court field", () => {
  it.each([
    ["circa abbreviated", "Smith, 100 F.2d 1 (c. 1990)"],
    ["circa spelled out", "Smith, 100 F.2d 1 (circa 1990)"],
    ["approximate `about`", "Smith, 100 F.2d 1 (about 1990)"],
    ["approximate `approx.`", "Smith, 100 F.2d 1 (approx. 1990)"],
    ["typo `cir.`", "Smith, 100 F.2d 1 (cir. 1990)"],
    ["tilde", "Smith, 100 F.2d 1 (~1990)"],
  ])("`%s` does not pollute court", (_, input) => {
    const [c] = cases(input)
    expect(c.court).toBeUndefined()
    expect(c.year).toBe(1990)
  })

  it("regression: real court still extracts", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. 1990)")
    expect(c.court).toBe("9th Cir.")
  })

  it("regression: existing date-modifier (filed) still rejected", () => {
    const [c] = cases("Smith, 100 F.2d 1 (filed Jan. 15, 1990)")
    expect(c.court).toBeUndefined()
  })
})
