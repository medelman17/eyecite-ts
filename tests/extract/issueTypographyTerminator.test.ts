import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"

describe("page terminator accepts typography / footnote-marker characters", () => {
  it.each([
    ["dagger †", "Smith, 100 F.2d 1†"],
    ["double dagger ‡", "Smith, 100 F.2d 1‡"],
    ["section §", "Smith, 100 F.2d 1§"],
    ["pilcrow ¶", "Smith, 100 F.2d 1¶"],
    ["copyright ©", "Smith, 100 F.2d 1©"],
    ["degree °", "Smith, 100 F.2d 1°"],
  ])("`%s` still extracts the citation", (_, input) => {
    const cs = extractCitations(input)
    expect(cs.length).toBeGreaterThan(0)
    expect(cs[0].matchedText).toBe("100 F.2d 1")
  })

  it("regression: bare digit page still requires terminator", () => {
    const cs = extractCitations("Smith, 100 F.2d 1234")
    expect(cs[0].matchedText).toBe("100 F.2d 1234")
  })
})
