import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"
import { normalizeReporterSpacing } from "@/clean/cleaners"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("cleaner preserves space in `<X>. <N>th Cir.` court parentheticals", () => {
  it("`B.A.P. 9th Cir.` keeps the space", () => {
    expect(normalizeReporterSpacing("B.A.P. 9th Cir.")).toBe("B.A.P. 9th Cir.")
  })

  it("`Bankr. 9th Cir.` keeps the space (hypothetical)", () => {
    expect(normalizeReporterSpacing("Bankr. 9th Cir.")).toBe("Bankr. 9th Cir.")
  })

  it("`Smith, 100 F.2d 1 (B.A.P. 9th Cir. 1990)` court=`B.A.P. 9th Cir.`", () => {
    const [c] = cases("Smith, 100 F.2d 1 (B.A.P. 9th Cir. 1990)")
    expect(c.court).toBe("B.A.P. 9th Cir.")
  })

  it("regression: reporter editions still collapse (`Wis. 2d` → `Wis.2d`)", () => {
    expect(normalizeReporterSpacing("Wis. 2d")).toBe("Wis.2d")
  })

  it("regression: `F. Supp. 2d 100` cleaned correctly", () => {
    expect(normalizeReporterSpacing("100 F. Supp. 2d 100")).toBe("100 F.Supp.2d 100")
  })

  it("regression: `9th Cir.` standalone still extracts as court", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. 1990)")
    expect(c.court).toBe("9th Cir.")
  })
})
