import { describe, expect, it } from "vitest"
import { BKTree } from "@/resolve/bkTree"
import { levenshteinDistance } from "@/resolve/levenshtein"

describe("BKTree", () => {
  it("returns empty results for an empty tree", () => {
    const tree = new BKTree(levenshteinDistance)
    expect(tree.query("anything", 5)).toHaveLength(0)
  })

  it("finds exact matches (distance 0)", () => {
    const tree = new BKTree(levenshteinDistance)
    tree.insert("smith")
    tree.insert("jones")

    const results = tree.query("smith", 0)
    expect(results).toHaveLength(1)
    expect(results[0].key).toBe("smith")
    expect(results[0].distance).toBe(0)
  })

  it("finds fuzzy matches within threshold", () => {
    const tree = new BKTree(levenshteinDistance)
    tree.insert("smith")
    tree.insert("smyth")
    tree.insert("jones")

    const results = tree.query("smith", 1)
    expect(results).toHaveLength(2)
    expect(results.map((r) => r.key).sort()).toEqual(["smith", "smyth"])
  })

  it("excludes candidates beyond threshold", () => {
    const tree = new BKTree(levenshteinDistance)
    tree.insert("smith")
    tree.insert("jones")

    const results = tree.query("smith", 1)
    expect(results.map((r) => r.key)).not.toContain("jones")
  })

  it("skips duplicate keys (first insertion wins)", () => {
    const tree = new BKTree(levenshteinDistance)
    tree.insert("smith")
    tree.insert("smith") // duplicate — should be ignored

    const results = tree.query("smith", 0)
    expect(results).toHaveLength(1)
    expect(results[0].insertionOrder).toBe(0)
  })

  it("sorts results by distance, then insertion order", () => {
    const tree = new BKTree(levenshteinDistance)
    tree.insert("abc") // order 0
    tree.insert("abd") // order 1, distance 1 from "abc"
    tree.insert("aec") // order 2, distance 1 from "abc"
    tree.insert("xyz") // order 3, distance 3 from "abc"

    const results = tree.query("abc", 3)
    expect(results[0]).toMatchObject({ key: "abc", distance: 0 })
    // Both "abd" and "aec" are distance 1 — order by insertion order
    expect(results[1].distance).toBe(1)
    expect(results[2].distance).toBe(1)
    expect(results[1].insertionOrder).toBeLessThan(results[2].insertionOrder)
    expect(results[3]).toMatchObject({ key: "xyz", distance: 3 })
  })

  it("handles maxDistance = 0 (exact match only)", () => {
    const tree = new BKTree(levenshteinDistance)
    tree.insert("abc")
    tree.insert("abd")

    expect(tree.query("abc", 0)).toHaveLength(1)
    expect(tree.query("xyz", 0)).toHaveLength(0)
  })

  it("handles large maxDistance (returns everything)", () => {
    const tree = new BKTree(levenshteinDistance)
    const words = ["smith", "jones", "brown", "davis", "miller"]
    for (const w of words) tree.insert(w)

    const results = tree.query("smith", 100)
    expect(results).toHaveLength(words.length)
  })
})

describe("BKTree — completeness (no false negatives)", () => {
  it("finds all matches that a linear scan would find", () => {
    const words = [
      "smith",
      "smyth",
      "jones",
      "brown",
      "davis",
      "miller",
      "national association of machinists",
      "national assoc. of machinists",
      "international brotherhood of teamsters",
    ]

    const tree = new BKTree(levenshteinDistance)
    for (const w of words) tree.insert(w)

    for (const query of words) {
      for (const maxDist of [0, 1, 2, 3, 5, 10]) {
        const treeResults = new Set(tree.query(query, maxDist).map((r) => r.key))
        // Linear scan for ground truth
        for (const w of words) {
          const d = levenshteinDistance(query, w)
          if (d <= maxDist) {
            expect(treeResults.has(w)).toBe(true)
          }
        }
      }
    }
  })
})

describe("BKTree — soundness (no false positives)", () => {
  it("every returned result is within maxDistance", () => {
    const words = ["smith", "smyth", "jones", "brown", "davis", "miller"]
    const tree = new BKTree(levenshteinDistance)
    for (const w of words) tree.insert(w)

    for (const query of words) {
      for (const maxDist of [0, 1, 2, 3]) {
        const results = tree.query(query, maxDist)
        for (const r of results) {
          expect(r.distance).toBeLessThanOrEqual(maxDist)
          expect(r.distance).toBe(levenshteinDistance(query, r.key))
        }
      }
    }
  })
})

describe("BKTree — party name edge cases", () => {
  it("handles single-character party names", () => {
    const tree = new BKTree(levenshteinDistance)
    tree.insert("a")
    tree.insert("b")

    expect(tree.query("a", 0)).toHaveLength(1)
    expect(tree.query("a", 1)).toHaveLength(2)
  })

  it("handles very long institutional party names", () => {
    const tree = new BKTree(levenshteinDistance)
    const long1 = "national association of regulatory utility commissioners"
    const long2 = "national association of regulatory utility commisioners" // typo
    tree.insert(long1)
    tree.insert(long2)

    const results = tree.query(long1, 1)
    expect(results).toHaveLength(2) // exact + typo
  })

  it("handles substring party names", () => {
    const tree = new BKTree(levenshteinDistance)
    tree.insert("smith")
    tree.insert("smith & associates")

    // "smith" and "smith & associates" have distance 13
    expect(tree.query("smith", 0)).toHaveLength(1)
    expect(tree.query("smith", 15)).toHaveLength(2)
  })
})
