import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"

const cases = (text: string): FullCaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as FullCaseCitation[]

describe("page range with hyphen extracts when followed by year paren (#705 partial)", () => {
  it.each([
    ["federal", "Smith v. Jones, 100 F.2d 1-5 (1990)"],
    ["U.S.", "Smith v. Jones, 100 U.S. 1-5 (1990)"],
    ["state", "Smith v. Jones, 100 Cal.4th 1-5 (1990)"],
    ["bare federal + year", "100 F.2d 1-5 (1990)"],
    ["wide range", "100 F.2d 1234-5678 (1990)"],
  ])("`%s` extracts citation with page range", (_, input) => {
    const [c] = cases(input)
    expect(c).toBeDefined()
    expect(c.matchedText).toContain("-")
  })

  it("regression: K.S.A. statute `K.S.A. 1988 Supp. 44-556` still extracts as statute (not phantom case)", () => {
    const cs = extractCitations("See K.S.A. 1988 Supp. 44-556.")
    const statutes = cs.filter((c) => c.type === "statute")
    expect(statutes.length).toBeGreaterThan(0)
  })

  it("regression: K.S.A. with subsection `K.S.A. 2009 Supp. 44-501(d)(2)` still extracts as statute", () => {
    const cs = extractCitations("See K.S.A. 2009 Supp. 44-501(d)(2).")
    const statutes = cs.filter((c) => c.type === "statute")
    expect(statutes.length).toBe(1)
  })

  it("regression: standard single-page citation still works", () => {
    const [c] = cases("100 F.2d 5 (1990)")
    expect(c.matchedText).toBe("100 F.2d 5")
  })
})
