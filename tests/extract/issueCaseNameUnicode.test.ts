import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("case-name backscan handles Unicode characters", () => {
  it.each([
    ["umlaut (German)", "Müller v. Schmidt, 100 F.2d 1 (1990)", "Müller v. Schmidt"],
    ["accents (French)", "Société Générale v. Banque, 100 F.2d 1 (1990)", "Société Générale v. Banque"],
    ["acute accent (Spanish)", "Pérez v. González, 100 F.2d 1 (1990)", "Pérez v. González"],
    ["cedilla", "Çelik v. Banque, 100 F.2d 1 (1990)", "Çelik v. Banque"],
    ["mixed ASCII + accent", "Smith v. Müller, 100 F.2d 1 (1990)", "Smith v. Müller"],
  ])("`%s` extracts case name with non-ASCII letters", (_, input, expected) => {
    const [c] = cases(input)
    expect(c?.caseName).toBe(expected)
  })

  it("regression: plain ASCII case name still works", () => {
    const [c] = cases("Smith v. Jones, 100 F.2d 1 (1990)")
    expect(c.caseName).toBe("Smith v. Jones")
  })
})
