import { describe, expect, it } from "vitest"
import { rejoinHyphenatedWords } from "@/clean/cleaners"
import { extractCitations } from "@/index"

/**
 * Issue #681 — Soft-wrapped pincite ranges (`5-\n7`) lost the hyphen,
 * fusing the two digits into a fabricated `57` pincite. `rejoinHyphenatedWords`
 * now preserves the hyphen when both sides are digits, so the pincite
 * parser sees the range correctly.
 */
describe("Issue #681 - soft-wrapped pincite range preserved", () => {
  it("preserves hyphen when both sides of wrap are digits", () => {
    expect(rejoinHyphenatedWords(`5-\n7`)).toBe(`5-7`)
    expect(rejoinHyphenatedWords(`123-\n456`)).toBe(`123-456`)
  })

  it("strips hyphen when at least one side is a letter (word wrap)", () => {
    expect(rejoinHyphenatedWords(`Dil-\nlinger`)).toBe(`Dillinger`)
    expect(rejoinHyphenatedWords(`F. Sup-\np. 3d`)).toBe(`F. Supp. 3d`)
  })

  it("preserves digit-hyphen-letter mix as character collapse (rare)", () => {
    // Digit + letter rejoin — treat as word wrap (no hyphen)
    expect(rejoinHyphenatedWords(`A5-\nb`)).toBe(`A5b`)
  })

  it("end-to-end: pincite range survives soft wrap", () => {
    const text = `The defendant cited Smith v. Jones,
100 F.2d 1, 5-
7 (9th Cir. 1990).`
    const cs = extractCitations(text).filter((c) => c.type === "case")
    expect(cs).toHaveLength(1)
    const c = cs[0] as {
      pincite?: number
      pinciteInfo?: { page?: number; endPage?: number; isRange?: boolean; raw?: string }
    }
    expect(c.pincite).toBe(5)
    expect(c.pinciteInfo?.endPage).toBe(7)
    expect(c.pinciteInfo?.isRange).toBe(true)
    expect(c.pinciteInfo?.raw).toBe("5-7")
  })

  it("end-to-end: word-wrap in party name still rejoins", () => {
    const text = `In Dil-
linger Foundation v. Smith, 500 F.2d 100`
    const cs = extractCitations(text).filter((c) => c.type === "case")
    expect(cs).toHaveLength(1)
    expect((cs[0] as { caseName?: string }).caseName).toContain("Dillinger")
  })
})
