import { describe, expect, it } from "vitest"
import { SegmentMap } from "@/clean/segmentMap"

describe("SegmentMap.identity", () => {
  it("maps every position to itself", () => {
    const sm = SegmentMap.identity(100)
    expect(sm.lookup(0)).toBe(0)
    expect(sm.lookup(50)).toBe(50)
    expect(sm.lookup(100)).toBe(100)
  })

  it("produces a single segment", () => {
    const sm = SegmentMap.identity(10)
    expect(sm.segments).toHaveLength(1)
    expect(sm.segments[0]).toEqual({ cleanPos: 0, origPos: 0, len: 11 })
  })
})

describe("SegmentMap.fromMap", () => {
  it("compresses identity map to single segment", () => {
    const map = new Map<number, number>()
    for (let i = 0; i <= 100; i++) map.set(i, i)
    const sm = SegmentMap.fromMap(map)
    expect(sm.segments).toHaveLength(1)
    expect(sm.lookup(50)).toBe(50)
  })

  it("compresses map with deletion into two segments", () => {
    // "hello world" → "helloworld": space at orig position 5 removed
    const map = new Map<number, number>()
    for (let i = 0; i < 5; i++) map.set(i, i) // 0-4 identity
    for (let i = 5; i <= 10; i++) map.set(i, i + 1) // 5-10 → 6-11 (offset +1)
    const sm = SegmentMap.fromMap(map)
    expect(sm.segments).toHaveLength(2)
    expect(sm.lookup(4)).toBe(4)
    expect(sm.lookup(5)).toBe(6)
    expect(sm.lookup(9)).toBe(10)
  })

  it("handles empty map", () => {
    const sm = SegmentMap.fromMap(new Map())
    expect(sm.segments).toHaveLength(0)
    expect(sm.lookup(5)).toBe(5) // fallback
  })

  it("handles unsorted map entries", () => {
    const map = new Map<number, number>()
    map.set(5, 6)
    map.set(0, 0)
    map.set(3, 3)
    map.set(1, 1)
    map.set(4, 4)
    map.set(2, 2)
    const sm = SegmentMap.fromMap(map)
    expect(sm.lookup(0)).toBe(0)
    expect(sm.lookup(4)).toBe(4)
    expect(sm.lookup(5)).toBe(6)
  })
})

describe("SegmentMap.lookup", () => {
  it("handles simple deletion (HTML tag removed)", () => {
    // Original: "abc<b>def</b>ghi" (17 chars)
    // Clean:    "abcdefghi" (9 chars)
    // Positions 0-2 identity, 3-5 → 6-8, 6-8 → 13-15
    const sm = new SegmentMap([
      { cleanPos: 0, origPos: 0, len: 3 },
      { cleanPos: 3, origPos: 6, len: 3 },
      { cleanPos: 6, origPos: 13, len: 4 },
    ])
    expect(sm.lookup(0)).toBe(0)
    expect(sm.lookup(2)).toBe(2)
    expect(sm.lookup(3)).toBe(6)
    expect(sm.lookup(5)).toBe(8)
    expect(sm.lookup(6)).toBe(13)
    expect(sm.lookup(9)).toBe(16)
  })

  it("handles position beyond all segments", () => {
    const sm = new SegmentMap([{ cleanPos: 0, origPos: 0, len: 5 }])
    // Extrapolate: 10 → 0 + (10 - 0) = 10
    expect(sm.lookup(10)).toBe(10)
  })

  it("handles many segments (binary search stress)", () => {
    // Create 100 segments, each length 10
    const segments = []
    for (let i = 0; i < 100; i++) {
      segments.push({ cleanPos: i * 10, origPos: i * 10 + i, len: 10 })
    }
    const sm = new SegmentMap(segments)

    // Check first segment
    expect(sm.lookup(0)).toBe(0)
    expect(sm.lookup(9)).toBe(9)

    // Check middle segment (50th, cleanPos 500, origPos 550)
    expect(sm.lookup(500)).toBe(550)
    expect(sm.lookup(505)).toBe(555)

    // Check last segment (99th, cleanPos 990, origPos 1089)
    expect(sm.lookup(990)).toBe(1089)
  })
})

describe("SegmentMap — structural invariants", () => {
  it("segments are sorted by cleanPos", () => {
    const map = new Map<number, number>()
    for (let i = 0; i <= 20; i++) map.set(i, i < 10 ? i : i + 5)
    const sm = SegmentMap.fromMap(map)

    for (let i = 1; i < sm.segments.length; i++) {
      expect(sm.segments[i].cleanPos).toBeGreaterThan(sm.segments[i - 1].cleanPos)
    }
  })

  it("segments are contiguous (no gaps)", () => {
    const map = new Map<number, number>()
    for (let i = 0; i <= 50; i++) map.set(i, i < 20 ? i : i + 10)
    const sm = SegmentMap.fromMap(map)

    for (let i = 1; i < sm.segments.length; i++) {
      const prev = sm.segments[i - 1]
      expect(sm.segments[i].cleanPos).toBe(prev.cleanPos + prev.len)
    }
  })

  it("lookup matches original Map for all positions", () => {
    // Build a realistic map (simulate HTML removal + whitespace normalization)
    const map = new Map<number, number>()
    let offset = 0
    for (let i = 0; i <= 100; i++) {
      if (i === 20) offset += 15 // simulate 15-char HTML tag removal
      if (i === 50) offset += 3 // simulate whitespace collapse
      map.set(i, i + offset)
    }

    const sm = SegmentMap.fromMap(map)

    // Every position should match
    for (const [cleanPos, origPos] of map) {
      expect(sm.lookup(cleanPos)).toBe(origPos)
    }
  })
})
