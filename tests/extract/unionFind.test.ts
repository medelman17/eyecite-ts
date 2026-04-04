import { describe, expect, it } from "vitest"
import { UnionFind } from "@/extract/unionFind"

describe("UnionFind", () => {
  it("initializes each element as its own root", () => {
    const uf = new UnionFind(5)
    for (let i = 0; i < 5; i++) {
      expect(uf.find(i)).toBe(i)
    }
  })

  it("unions two elements with lower index as root", () => {
    const uf = new UnionFind(5)
    uf.union(2, 4)
    expect(uf.find(2)).toBe(2)
    expect(uf.find(4)).toBe(2)
    expect(uf.connected(2, 4)).toBe(true)
  })

  it("preserves lower-index root regardless of union order", () => {
    const uf = new UnionFind(5)
    uf.union(4, 1) // higher first, lower second
    expect(uf.find(4)).toBe(1)
    expect(uf.find(1)).toBe(1)
  })

  it("handles transitive closure: union(0,1) + union(1,2) → connected(0,2)", () => {
    const uf = new UnionFind(5)
    uf.union(0, 1)
    uf.union(1, 2)
    expect(uf.connected(0, 2)).toBe(true)
    expect(uf.find(2)).toBe(0)
  })

  it("keeps unrelated elements disconnected", () => {
    const uf = new UnionFind(5)
    uf.union(0, 1)
    uf.union(3, 4)
    expect(uf.connected(0, 3)).toBe(false)
    expect(uf.connected(1, 4)).toBe(false)
  })

  it("handles union of already-connected elements", () => {
    const uf = new UnionFind(3)
    uf.union(0, 1)
    uf.union(0, 1) // duplicate
    expect(uf.find(0)).toBe(0)
    expect(uf.find(1)).toBe(0)
  })

  it("returns correct components", () => {
    const uf = new UnionFind(6)
    uf.union(0, 1)
    uf.union(1, 2)
    uf.union(3, 4)

    const components = uf.components()
    expect(components.get(0)).toEqual([0, 1, 2])
    expect(components.get(3)).toEqual([3, 4])
    expect(components.get(5)).toEqual([5]) // singleton
  })

  it("handles long chain: 0→1→2→3→4", () => {
    const uf = new UnionFind(5)
    uf.union(0, 1)
    uf.union(1, 2)
    uf.union(2, 3)
    uf.union(3, 4)

    for (let i = 0; i < 5; i++) {
      expect(uf.find(i)).toBe(0)
    }
    expect(uf.components().get(0)).toEqual([0, 1, 2, 3, 4])
  })

  it("handles single element", () => {
    const uf = new UnionFind(1)
    expect(uf.find(0)).toBe(0)
    expect(uf.components().get(0)).toEqual([0])
  })

  it("root is always the lowest index in the set", () => {
    const uf = new UnionFind(10)
    // Union in various orders
    uf.union(5, 3)
    uf.union(7, 3)
    uf.union(1, 5)
    uf.union(9, 1)

    // All should have root 1 (lowest in the set)
    for (const idx of [1, 3, 5, 7, 9]) {
      expect(uf.find(idx)).toBe(1)
    }
  })

  it("components partition all elements exactly once", () => {
    const uf = new UnionFind(8)
    uf.union(0, 2)
    uf.union(2, 4)
    uf.union(1, 3)

    const components = uf.components()
    const allMembers: number[] = []
    for (const members of components.values()) {
      allMembers.push(...members)
    }
    allMembers.sort((a, b) => a - b)
    expect(allMembers).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })
})
