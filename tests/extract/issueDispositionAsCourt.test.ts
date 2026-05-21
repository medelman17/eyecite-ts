import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { CaseCitation } from "@/types/citation"

const cases = (text: string): CaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as CaseCitation[]

describe("disposition tokens should not pollute the court field", () => {
  it("`(rev'd 1990)` does not set court='rev'd'", () => {
    const [c] = cases("Smith, 100 F.2d 1 (rev'd 1990)")
    expect(c.court).toBeUndefined()
    expect(c.year).toBe(1990)
  })

  it("`(aff'd 1990)` does not set court='aff'd'", () => {
    const [c] = cases("Smith, 100 F.2d 1 (aff'd 1990)")
    expect(c.court).toBeUndefined()
    expect(c.year).toBe(1990)
  })

  it("`(per curiam 1990)` does not set court='per curiam'", () => {
    const [c] = cases("Smith, 100 F.2d 1 (per curiam 1990)")
    expect(c.court).toBeUndefined()
    expect(c.year).toBe(1990)
  })

  it("`(en banc)` (no year) does not set court='en banc'", () => {
    const [c] = cases("Smith, 100 F.2d 1 (en banc)")
    expect(c.court).toBeUndefined()
  })

  it("`(cert. denied 1990)` does not set court='cert. denied'", () => {
    const [c] = cases("Smith, 100 F.2d 1 (cert. denied 1990)")
    expect(c.court).toBeUndefined()
    expect(c.year).toBe(1990)
  })

  it("`(dismissed 1990)` does not set court='dismissed'", () => {
    const [c] = cases("Smith, 100 F.2d 1 (dismissed 1990)")
    expect(c.court).toBeUndefined()
    expect(c.year).toBe(1990)
  })

  it("real court with no disposition leaks through unchanged", () => {
    const [c] = cases("Smith, 100 F.2d 1 (9th Cir. 1990)")
    expect(c.court).toBe("9th Cir.")
    expect(c.year).toBe(1990)
  })

  it("disposition + court still extracts court (en banc trailing)", () => {
    const cs = cases("Smith, 100 F.2d 1 (9th Cir. 1990) (en banc)")
    expect(cs[0].court).toBe("9th Cir.")
  })
})
