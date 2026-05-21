import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("date-modifier verbs in court parenthetical do not pollute court field", () => {
  it.each([
    ["filed", "Smith, 100 F.2d 1 (filed Jan. 15, 1990)"],
    ["decided", "Smith, 100 F.2d 1 (decided Mar. 15, 1990)"],
    ["argued", "Smith, 100 F.2d 1 (argued Apr. 1, 1990)"],
    ["argued+decided", "Smith, 100 F.2d 1 (argued Apr. 1, 1990, decided Jun. 15, 1990)"],
    ["effective", "Smith, 100 F.2d 1 (effective Jan. 1, 1990)"],
    ["entered", "Smith, 100 F.2d 1 (entered Jan. 1, 1990)"],
    ["submitted", "Smith, 100 F.2d 1 (submitted Jan. 1, 1990)"],
    ["heard", "Smith, 100 F.2d 1 (heard Jan. 1, 1990)"],
    ["filed-in", "Smith, 100 F.2d 1 (filed in Jan. 1990)"],
  ])("`%s` does not pollute court", (_, input) => {
    const [c] = cases(input)
    expect(c.court).toBeUndefined()
    expect(c.year).toBe(1990)
  })

  it("real court + date modifier still extracts the court (court before verb)", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. 1990) (filed Jan. 15, 1990)")
    expect(c.court).toBe("9th Cir.")
    expect(c.year).toBe(1990)
  })
})
