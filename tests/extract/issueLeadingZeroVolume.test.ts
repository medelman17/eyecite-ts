import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"

const cases = (text: string): FullCaseCitation[] =>
  extractCitations(text).filter((c) => c.type === "case") as FullCaseCitation[]

describe("leading-zero volumes consistently parse as integers (#703)", () => {
  // Removed the bare `0 F.2d 1` test case — #673 hard-rejects vol=0 as
  // implausibly garbage. Leading-zero forms (`01`, `001`) still parse
  // to their integer value.
  it.each([
    ["01", "01 F.2d 1", 1],
    ["001", "001 F.2d 1", 1],
    ["00100", "00100 F.2d 1", 100],
    ["01 U.S.", "01 U.S. 1", 1],
  ])("`%s` parses to number, not string", (_, input, expected) => {
    const [c] = cases(input)
    expect(typeof c.volume).toBe("number")
    expect(c.volume).toBe(expected)
  })

  it("`0 F.2d 1` (true zero volume) is filtered as implausible (#673)", () => {
    expect(cases("0 F.2d 1")).toHaveLength(0)
  })

  it("regression: hyphenated volume `1984-1` stays as string", () => {
    const [c] = cases("1984-1 F.2d 1")
    expect(typeof c.volume).toBe("string")
    expect(c.volume).toBe("1984-1")
  })

  it("regression: bare number `100` still parses as number", () => {
    const [c] = cases("100 F.2d 1")
    expect(typeof c.volume).toBe("number")
    expect(c.volume).toBe(100)
  })
})
