import { describe, expect, it } from "vitest"
import { attributeQuotes } from "@/document/quoteAttribution"
import { extractCitations } from "@/extract"
import { detectQuoteZones } from "@/utils/detectQuoteZones"

describe("attributeQuotes", () => {
  it("returns empty array when no quote zones exist", () => {
    const text = "Plain prose with no quotes. Smith v. Jones, 100 F.2d 50 (1990)."
    const cites = extractCitations(text)
    const zones = detectQuoteZones(text)
    const result = attributeQuotes(text, zones, cites)
    expect(result).toEqual([])
  })

  it("attributes an adjacent inline quote to the following citation", () => {
    const text = `The court held "the rule applies" in Smith v. Jones, 100 F.2d 50 (1990).`
    const cites = extractCitations(text)
    const zones = detectQuoteZones(text)
    const result = attributeQuotes(text, zones, cites)
    expect(result.length).toBeGreaterThan(0)
    const attribution = result[0]
    expect(attribution.attributionKind).toBe("adjacent")
    expect(attribution.citationIndex).toBe(0)
    expect(attribution.quoteText).toContain("rule")
    expect(attribution.confidence).toBe(0.85)
  })

  it("attributes a block-quote to the following citation", () => {
    const text = `> the rule applies in all cases of prescriptive easement, the court held\n\nSmith v. Jones, 100 F.2d 50 (1990).`
    const cites = extractCitations(text)
    const zones = detectQuoteZones(text)
    const result = attributeQuotes(text, zones, cites)
    const blockAttribution = result.find((a) => a.attributionKind === "block-quote")
    expect(blockAttribution).toBeDefined()
    expect(blockAttribution?.citationIndex).toBe(0)
  })

  it("attributes a quote inside a parenthetical to the enclosing citation", () => {
    const text = `Smith v. Jones, 100 F.2d 50 (1990) (quoting "the rule applies" from prior precedent).`
    const cites = extractCitations(text)
    const zones = detectQuoteZones(text)
    const result = attributeQuotes(text, zones, cites)
    const parenAttribution = result.find((a) => a.attributionKind === "parenthetical")
    expect(parenAttribution).toBeDefined()
    expect(parenAttribution?.citationIndex).toBe(0)
    expect(parenAttribution?.confidence).toBe(0.95)
  })

  it("emits unattributed entry when no citation is nearby", () => {
    const text = `He said "the rule applies" and walked away with no citation.`
    const cites = extractCitations(text)
    const zones = detectQuoteZones(text)
    const result = attributeQuotes(text, zones, cites)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].citationIndex).toBeUndefined()
    expect(result[0].attributionKind).toBeUndefined()
  })

  it("does not attribute inline quote when sentence-terminating period intervenes", () => {
    const text = `He said "the rule applies." Then a new sentence. Smith v. Jones, 100 F.2d 50 (1990).`
    const cites = extractCitations(text)
    const zones = detectQuoteZones(text)
    const result = attributeQuotes(text, zones, cites)
    const inlineAttribution = result.find((a) => a.attributionKind === "adjacent")
    expect(inlineAttribution).toBeUndefined()
  })

  it("populates quoteText with the verbatim text between marks", () => {
    const text = `The court held "the rule applies" in Smith v. Jones, 100 F.2d 50 (1990).`
    const cites = extractCitations(text)
    const zones = detectQuoteZones(text)
    const result = attributeQuotes(text, zones, cites)
    expect(result[0].quoteText).toBe("the rule applies")
  })
})
