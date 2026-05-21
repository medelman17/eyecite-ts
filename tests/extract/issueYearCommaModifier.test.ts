import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("court parenthetical with year+comma+modifier strips correctly", () => {
  it.each([
    ["en banc", "Smith, 100 F.2d 1 (9th Cir. 1990, en banc)"],
    ["per curiam", "Smith, 100 F.2d 1 (9th Cir. 1990, per curiam)"],
    ["mem.", "Smith, 100 F.2d 1 (1990, mem.)"],
    ["unpub.", "Smith, 100 F.2d 1 (1990, unpub.)"],
  ])("`%s` after `1990,` does not leak", (_, input) => {
    const [c] = cases(input)
    // Either undefined (no court) or doesn't contain "1990"
    if (c.court !== undefined) {
      expect(c.court).not.toContain("1990")
    }
    expect(c.year).toBe(1990)
  })

  it("`(9th Cir. 1990, en banc)` extracts court=`9th Cir.`", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. 1990, en banc)")
    expect(c.court).toBe("9th Cir.")
  })

  it("regression: PR #704 space-form `(9th Cir. 1990 mem.)` still works", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. 1990 mem.)")
    expect(c.court).toBe("9th Cir.")
    expect(c.year).toBe(1990)
  })
})
