import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("case-name backscan accepts colon in case name (subtitles)", () => {
  it("`Smith v. Jones: Continued` extracts case name with colon", () => {
    const [c] = cases("Smith v. Jones: Continued, 100 F.2d 1")
    expect(c?.caseName).toBe("Smith v. Jones: Continued")
  })

  it("`Smith v. Jones: A Sequel` extracts", () => {
    const [c] = cases("Smith v. Jones: A Sequel, 100 F.2d 1")
    expect(c?.caseName).toBe("Smith v. Jones: A Sequel")
  })

  it("regression: case names without colon still work", () => {
    const [c] = cases("Smith v. Jones, 100 F.2d 1")
    expect(c.caseName).toBe("Smith v. Jones")
  })

  it("regression: case names with hyphen still work", () => {
    const [c] = cases("Smith v. Jones - Continued, 100 F.2d 1")
    expect(c.caseName).toBe("Smith v. Jones - Continued")
  })
})
