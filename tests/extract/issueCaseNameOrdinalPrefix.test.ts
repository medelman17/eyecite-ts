import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("case-name backscan preserves ordinal-prefix party names", () => {
  it.each([
    ["21st Century Fox v. Smith", "21st Century Fox v. Smith"],
    ["1st National Bank v. Smith", "1st National Bank v. Smith"],
    ["100th Anniversary v. Smith", "100th Anniversary v. Smith"],
    ["23rd Street Realty v. Smith", "23rd Street Realty v. Smith"],
    ["2nd Circuit Partners v. Smith", "2nd Circuit Partners v. Smith"],
  ])("`%s` preserves the ordinal prefix", (_, plaintiff) => {
    const [c] = cases(`${plaintiff}, 100 F.2d 1 (1990)`)
    expect(c?.caseName).toBe(plaintiff)
  })

  it("regression: bare-number prefix (`12 Lincoln Square`) still preserved", () => {
    const [c] = cases("12 Lincoln Square v. Smith, 100 F.2d 1")
    expect(c.caseName).toBe("12 Lincoln Square v. Smith")
  })

  it("regression: no-prefix case names still work", () => {
    const [c] = cases("Smith v. Jones, 100 F.2d 1")
    expect(c.caseName).toBe("Smith v. Jones")
  })
})
