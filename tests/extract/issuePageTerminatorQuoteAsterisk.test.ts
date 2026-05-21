import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"

describe("page terminator accepts trailing quote, asterisk, angle brackets", () => {
  it.each([
    ['straight quote `"`', 'Smith, 100 F.2d 1"'],
    ["curly closing quote", "Smith, 100 F.2d 1”"],
    ["curly opening quote", "Smith, 100 F.2d 1“"],
    ["markdown asterisk", "Smith, 100 F.2d 1*"],
    ["angle bracket >", "Smith, 100 F.2d 1>"],
    ["angle bracket <", "Smith, 100 F.2d 1<"],
  ])("`%s` still extracts the citation", (_, input) => {
    const cs = extractCitations(input)
    expect(cs.length).toBeGreaterThan(0)
    expect(cs[0].type).toBe("case")
    expect(cs[0].matchedText).toBe("100 F.2d 1")
  })

  it("regression: bare digit page still requires space terminator (not greedy)", () => {
    const cs = extractCitations("Smith, 100 F.2d 1234")
    expect(cs[0].matchedText).toBe("100 F.2d 1234")
  })

  it("regression: U.S. reporter with quote trailing extracts", () => {
    const cs = extractCitations('Smith, 100 U.S. 5"')
    expect(cs[0]?.matchedText).toBe("100 U.S. 5")
  })
})
