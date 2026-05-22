import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("adverb-prefixed disposition tokens don't pollute court (#719)", () => {
  it.each([
    ["now reversed", "Smith, 100 F.2d 1 (now reversed, 1990)"],
    ["now vacated", "Smith, 100 F.2d 1 (now vacated, 1990)"],
    ["previously reversed", "Smith, 100 F.2d 1 (previously reversed, 1990)"],
    ["formerly aff'd", "Smith, 100 F.2d 1 (formerly aff'd, 1990)"],
    ["since overruled", "Smith, 100 F.2d 1 (since overruled, 1990)"],
    ["since overruled by", "Smith, 100 F.2d 1 (since overruled by, 1990)"],
  ])("`%s` does not pollute court", (_, input) => {
    const [c] = cases(input)
    expect(c.court).toBeUndefined()
    expect(c.year).toBe(1990)
  })

  it("regression: bare `rev'd` still rejected", () => {
    const [c] = cases("Smith, 100 F.2d 1 (rev'd 1990)")
    expect(c.court).toBeUndefined()
  })

  it("regression: real court still extracts", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. 1990)")
    expect(c.court).toBe("9th Cir.")
  })
})
