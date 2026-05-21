import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("non-court parentheticals must not pollute the court field", () => {
  it.each([
    ["(n.d.)", "Smith, 100 F.2d 1 (n.d.)"],
    ["(no date)", "Smith, 100 F.2d 1 (no date)"],
    ["(year omitted)", "Smith, 100 F.2d 1 (year omitted)"],
    ["(unpub.)", "Smith, 100 F.2d 1 (unpub.)"],
    ["(unpublished)", "Smith, 100 F.2d 1 (unpublished)"],
    ["(slip op.)", "Smith, 100 F.2d 1 (slip op.)"],
    ["(table)", "Smith, 100 F.2d 1 (table)"],
    ["(Smith, J., dissenting)", "Smith, 100 F.2d 1 (Smith, J., dissenting)"],
    ["(Jones, J., concurring)", "Smith, 100 F.2d 1 (Jones, J., concurring)"],
  ])("`%s` does not pollute court", (_, input) => {
    const [c] = cases(input)
    expect(c.court).toBeUndefined()
  })

  it("real court parenthetical still extracts court", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. 1990)")
    expect(c.court).toBe("9th Cir.")
  })

  it("known signal words remain rejected", () => {
    const [c] = cases("Smith, 100 F.2d 1 (citations omitted)")
    expect(c.court).toBeUndefined()
  })
})
