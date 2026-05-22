import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("volume / page reference parens not parsed as court (#700)", () => {
  it.each([
    ["Vol. 100", "Smith, 100 F.2d 1 (Vol. 100)"],
    ["vol. 100", "Smith, 100 F.2d 1 (vol. 100)"],
    ["Vol 100", "Smith, 100 F.2d 1 (Vol 100)"],
    ["p. 5", "Smith, 100 F.2d 1 (p. 5)"],
    ["pp. 5-10", "Smith, 100 F.2d 1 (pp. 5-10)"],
    ["at 7", "Smith, 100 F.2d 1 (at 7)"],
    ["n. 7", "Smith, 100 F.2d 1 (n. 7)"],
    ["note 7", "Smith, 100 F.2d 1 (note 7)"],
  ])("`%s` does not pollute court", (_, input) => {
    const [c] = cases(input)
    expect(c.court).toBeUndefined()
  })

  it("regression: real court still extracts", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. 1990)")
    expect(c.court).toBe("9th Cir.")
  })
})
