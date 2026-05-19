import { describe, expect, it } from "vitest"
import { detectQuoteZones } from "@/utils/detectQuoteZones"

describe("detectQuoteZones", () => {
  it("returns an empty array for text with no quotes", () => {
    expect(detectQuoteZones("plain prose with no quotes")).toEqual([])
  })

  it("detects a paired ASCII double-quote zone", () => {
    const text = `He said "the rule applies" and walked away.`
    const zones = detectQuoteZones(text)
    expect(zones).toHaveLength(1)
    expect(zones[0].start).toBe(text.indexOf(`"`))
    expect(zones[0].end).toBe(text.indexOf(`"`, zones[0].start + 1) + 1)
  })

  it("detects a paired typographic quote zone", () => {
    const text = `He said “the rule applies” and walked away.`
    const zones = detectQuoteZones(text)
    expect(zones).toHaveLength(1)
  })

  it("detects a markdown blockquote", () => {
    const text = `Some intro.\n> blockquote line one\n> blockquote line two\nNext paragraph.`
    const zones = detectQuoteZones(text)
    expect(zones.length).toBeGreaterThanOrEqual(1)
  })

  it("ignores orphan ASCII close-quote (mid-doc paste)", () => {
    const text = `use." Smith v. Jones, 100 F.2d 50, 55 (1990).`
    const zones = detectQuoteZones(text)
    expect(zones).toEqual([])
  })
})
