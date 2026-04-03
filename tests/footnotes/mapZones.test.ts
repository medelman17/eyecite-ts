import { describe, expect, it } from "vitest"
import { mapFootnoteZones } from "@/footnotes/mapZones"
import type { FootnoteMap } from "@/footnotes/types"
import type { TransformationMap } from "@/types/span"

function identityMap(length: number): TransformationMap {
  const cleanToOriginal = new Map<number, number>()
  const originalToClean = new Map<number, number>()
  for (let i = 0; i <= length; i++) {
    cleanToOriginal.set(i, i)
    originalToClean.set(i, i)
  }
  return { cleanToOriginal, originalToClean }
}

function offsetMap(length: number, offset: number): TransformationMap {
  const cleanToOriginal = new Map<number, number>()
  const originalToClean = new Map<number, number>()
  for (let i = 0; i <= length; i++) {
    cleanToOriginal.set(i, i + offset)
    originalToClean.set(i + offset, i)
  }
  return { cleanToOriginal, originalToClean }
}

describe("mapFootnoteZones", () => {
  it("returns same zones when transformation is identity", () => {
    const zones: FootnoteMap = [{ start: 10, end: 50, footnoteNumber: 1 }]
    const mapped = mapFootnoteZones(zones, identityMap(100))
    expect(mapped).toEqual([{ start: 10, end: 50, footnoteNumber: 1 }])
  })

  it("translates zones through offset transformation", () => {
    const zones: FootnoteMap = [{ start: 20, end: 40, footnoteNumber: 1 }]
    const mapped = mapFootnoteZones(zones, offsetMap(50, 10))
    expect(mapped[0].start).toBe(10)
    expect(mapped[0].end).toBe(30)
    expect(mapped[0].footnoteNumber).toBe(1)
  })

  it("preserves multiple zones and their order", () => {
    const zones: FootnoteMap = [
      { start: 10, end: 30, footnoteNumber: 1 },
      { start: 50, end: 70, footnoteNumber: 2 },
    ]
    const mapped = mapFootnoteZones(zones, identityMap(100))
    expect(mapped).toHaveLength(2)
    expect(mapped[0].start).toBeLessThan(mapped[1].start)
  })

  it("returns empty array for empty input", () => {
    expect(mapFootnoteZones([], identityMap(10))).toEqual([])
  })

  it("falls back to original positions when mapping entry is missing", () => {
    const zones: FootnoteMap = [{ start: 999, end: 1000, footnoteNumber: 1 }]
    const mapped = mapFootnoteZones(zones, identityMap(10))
    expect(mapped[0].start).toBe(999)
  })
})
