import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { Citation } from "@/types/citation"

const cs = (text: string): Citation[] => extractCitations(text)

describe("page terminators should accept common trailing punctuation", () => {
  it.each([
    ["em dash without space", "Smith, 100 F.2d 1—a notable case"],
    ["en dash without space", "Smith, 100 F.2d 1–a notable case"],
    ["possessive `'s`", "Smith, 100 F.2d 1's holding"],
    ["exclamation", "Smith, 100 F.2d 1!"],
    ["question mark", "Smith, 100 F.2d 1?"],
    ["em dash + space", "Smith, 100 F.2d 1 — a notable case"],
  ])("`%s` still extracts the citation", (_, input) => {
    const found = cs(input)
    expect(found.length).toBeGreaterThan(0)
    expect(found[0].type).toBe("case")
    expect(found[0].matchedText).toBe("100 F.2d 1")
  })

  it("U.S. reporter with em dash trailing also extracts", () => {
    const found = cs("Smith v. Jones, 100 U.S. 5—a landmark")
    expect(found.length).toBeGreaterThan(0)
    expect(found[0].matchedText).toBe("100 U.S. 5")
  })

  it("regression: existing terminators still work (space, comma, paren, period, semicolon)", () => {
    for (const t of [
      "Smith, 100 F.2d 1 (1990)",
      "Smith, 100 F.2d 1, 5",
      "Smith, 100 F.2d 1.",
      "Smith, 100 F.2d 1;",
    ]) {
      const found = cs(t)
      expect(found.length).toBeGreaterThan(0)
    }
  })
})
