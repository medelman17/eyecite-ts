import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("date-strip handles multiple numeric formats", () => {
  it.each([
    ["MM-DD-YYYY", "Smith, 100 F.2d 1 (9th Cir. 02-15-2020)"],
    ["MM/DD/YYYY", "Smith, 100 F.2d 1 (9th Cir. 2/15/2020)"],
    ["YYYY/MM/DD", "Smith, 100 F.2d 1 (9th Cir. 2020/02/15)"],
    ["YYYY-MM-DD", "Smith, 100 F.2d 1 (9th Cir. 2020-02-15)"],
  ])("`%s` date does not leak into court", (_, input) => {
    const [c] = cases(input)
    expect(c.court).toBe("9th Cir.")
    expect(c.year).toBe(2020)
  })

  it("regression: standard `(Mar. 15, 1990)` still strips", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. Mar. 15, 1990)")
    expect(c.court).toBe("9th Cir.")
    expect(c.year).toBe(1990)
  })

  it("regression: bare year `(9th Cir. 1990)` still strips", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. 1990)")
    expect(c.court).toBe("9th Cir.")
    expect(c.year).toBe(1990)
  })
})
