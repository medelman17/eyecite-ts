// apps/annotator/tests/kappa.test.ts
// Unit tests for src/kappa.ts — no DB dependency.
import { describe, expect, it } from "vitest"
import { canonicalCategory, cohenKappa } from "../src/kappa.js"

// ── canonicalCategory ─────────────────────────────────────────────────────────

describe("canonicalCategory", () => {
  it("antecedent → 'antecedent:<citationId>'", () => {
    expect(canonicalCategory({ type: "antecedent", citationId: "c0" })).toBe("antecedent:c0")
  })

  it("abstain → 'abstain'", () => {
    expect(canonicalCategory({ type: "abstain" })).toBe("abstain")
  })

  it("flag → 'flag'", () => {
    expect(canonicalCategory({ type: "flag" })).toBe("flag")
  })

  it("ambiguous → 'ambiguous:<ids sorted, comma-joined>'", () => {
    expect(canonicalCategory({ type: "ambiguous", citationIds: ["c2", "c1"] })).toBe("ambiguous:c1,c2")
  })

  it("ambiguous already sorted → same result as sorted", () => {
    expect(canonicalCategory({ type: "ambiguous", citationIds: ["c1", "c2"] })).toBe("ambiguous:c1,c2")
  })

  it("ambiguous 3 ids unsorted → sorts all three", () => {
    expect(canonicalCategory({ type: "ambiguous", citationIds: ["c3", "c1", "c2"] })).toBe(
      "ambiguous:c1,c2,c3",
    )
  })
})

// ── cohenKappa ────────────────────────────────────────────────────────────────

describe("cohenKappa", () => {
  it("empty pairs → kappa null, po 0, pe 0, n 0", () => {
    const result = cohenKappa([])
    expect(result.kappa).toBeNull()
    expect(result.po).toBe(0)
    expect(result.pe).toBe(0)
    expect(result.n).toBe(0)
  })

  it("perfect agreement, single category (all same) → kappa 1, po 1", () => {
    const pairs: Array<[string, string]> = Array.from({ length: 5 }, () => ["x", "x"])
    const result = cohenKappa(pairs)
    expect(result.kappa).toBe(1)
    expect(result.po).toBe(1)
    expect(result.n).toBe(5)
  })

  it("perfect agreement, mixed categories → kappa 1, po 1", () => {
    const pairs: Array<[string, string]> = [
      ["x", "x"],
      ["y", "y"],
      ["x", "x"],
      ["z", "z"],
    ]
    const result = cohenKappa(pairs)
    expect(result.kappa).toBe(1)
    expect(result.po).toBe(1)
    expect(result.n).toBe(4)
  })

  it("known-value fixture: po=0.7, pe=0.5, kappa=0.4", () => {
    // 20× ["yes","yes"] + 15× ["no","no"] + 10× ["yes","no"] + 5× ["no","yes"] = 50 total
    // agreements = 35, po = 35/50 = 0.7
    // A marginals: P(A=yes) = 30/50 = 0.6,  P(A=no) = 20/50 = 0.4
    // B marginals: P(B=yes) = 25/50 = 0.5,  P(B=no) = 25/50 = 0.5
    // pe = 0.6*0.5 + 0.4*0.5 = 0.3 + 0.2 = 0.5
    // kappa = (0.7 - 0.5) / (1 - 0.5) = 0.2 / 0.5 = 0.4
    const pairs: Array<[string, string]> = [
      ...Array.from({ length: 20 }, () => ["yes", "yes"] as [string, string]),
      ...Array.from({ length: 15 }, () => ["no", "no"] as [string, string]),
      ...Array.from({ length: 10 }, () => ["yes", "no"] as [string, string]),
      ...Array.from({ length: 5 }, () => ["no", "yes"] as [string, string]),
    ]
    const result = cohenKappa(pairs)
    expect(result.n).toBe(50)
    expect(result.po).toBeCloseTo(0.7, 10)
    expect(result.pe).toBeCloseTo(0.5, 10)
    expect(result.kappa).not.toBeNull()
    expect(result.kappa!).toBeCloseTo(0.4, 10)
  })

  it("all abstain (single category, perfect agreement) → kappa 1 (degenerate 1-pe=0 branch)", () => {
    // Both annotators always pick "abstain" → pe = 1*1 = 1, 1-pe = 0
    // po = 1 → kappa = 1 (special case)
    const pairs: Array<[string, string]> = Array.from({ length: 4 }, () => [
      "abstain",
      "abstain",
    ])
    const result = cohenKappa(pairs)
    expect(result.kappa).toBe(1)
    expect(result.po).toBe(1)
    expect(result.pe).toBeCloseTo(1, 10)
    expect(result.n).toBe(4)
  })
})
