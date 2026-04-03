import { describe, expect, it } from "vitest"
import type { FootnoteMap, FootnoteZone } from "@/footnotes/types"

describe("FootnoteZone type", () => {
  it("satisfies the FootnoteZone interface", () => {
    const zone: FootnoteZone = {
      start: 100,
      end: 200,
      footnoteNumber: 1,
    }
    expect(zone.start).toBe(100)
    expect(zone.end).toBe(200)
    expect(zone.footnoteNumber).toBe(1)
  })

  it("FootnoteMap is an array of FootnoteZone", () => {
    const map: FootnoteMap = [
      { start: 0, end: 50, footnoteNumber: 1 },
      { start: 60, end: 120, footnoteNumber: 2 },
    ]
    expect(map).toHaveLength(2)
    expect(map[0].footnoteNumber).toBe(1)
    expect(map[1].footnoteNumber).toBe(2)
  })
})
