import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { SupraCitation } from "@/types/citation"

const supras = (text: string): SupraCitation[] =>
  extractCitations(text).filter((c) => c.type === "supra") as SupraCitation[]

describe("supra partyName strips leading sentence-initial connectors", () => {
  it.each([
    ["But", "But Smith, supra, at 7", "Smith"],
    ["However", "However Smith, supra, at 7", "Smith"],
    ["Moreover", "Moreover Smith, supra, at 7", "Smith"],
    ["Therefore", "Therefore Smith, supra, at 7", "Smith"],
    ["Indeed", "Indeed Smith, supra, at 7", "Smith"],
    ["Contra", "Contra Smith, supra, at 7", "Smith"],
  ])("`%s` is stripped", (_, input, expected) => {
    const [c] = supras(input)
    expect(c?.partyName).toBe(expected)
  })

  it("regression: `Smith, supra` preserves partyName=`Smith`", () => {
    const [c] = supras("Smith, supra, at 7")
    expect(c.partyName).toBe("Smith")
  })

  it("note: `In re Smith, supra` captures only `Smith` as partyName (tokenizer drops `In re`)", () => {
    // The SUPRA_PATTERN tokenizer doesn't recognize procedural prefixes
    // like `In re`, so the partyName is just `Smith`. Documenting current
    // behavior here to catch any future regression.
    const [c] = supras("In re Smith, supra, at 7")
    expect(c.partyName).toBe("Smith")
  })

  it("regression: `See Smith, supra` strips See", () => {
    const [c] = supras("See Smith, supra, at 7")
    expect(c.partyName).toBe("Smith")
  })
})
