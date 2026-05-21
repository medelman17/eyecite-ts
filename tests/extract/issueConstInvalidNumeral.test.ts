import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { ConstitutionalCitation } from "@/types/citation"

const cons = (text: string): ConstitutionalCitation[] =>
  extractCitations(text).filter((c) => c.type === "constitutional") as ConstitutionalCitation[]

describe("invalid Roman numerals in constitutional citations get low confidence", () => {
  it.each([
    ["IIII (non-standard 4)", "U.S. Const. amend. IIII"],
    ["IIIIIII (invalid)", "U.S. Const. amend. IIIIIII"],
  ])("`%s` confidence drops to 0.1 when no numeral parses", (_, input) => {
    const [c] = cons(input)
    expect(c).toBeDefined()
    expect(c.amendment).toBeUndefined()
    expect(c.article).toBeUndefined()
    expect(c.confidence).toBe(0.1)
  })

  it("regression: valid Roman numeral keeps high confidence", () => {
    const [c] = cons("U.S. Const. amend. XIV")
    expect(c.amendment).toBe(14)
    expect(c.confidence).toBeGreaterThan(0.8)
  })

  it("regression: valid article numeral keeps high confidence", () => {
    const [c] = cons("U.S. Const. art. III")
    expect(c.article).toBe(3)
    expect(c.confidence).toBeGreaterThan(0.8)
  })

  it("regression: too-high article number (XXVIII / 28) gets low confidence", () => {
    const [c] = cons("U.S. Const. art. XXVIII")
    // XXVIII doesn't parse as a valid roman numeral by current rules
    expect(c.confidence).toBe(0.1)
  })
})
