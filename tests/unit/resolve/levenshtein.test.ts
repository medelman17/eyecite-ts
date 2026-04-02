import { describe, expect, it } from "vitest"
import { levenshteinDistance, normalizedLevenshteinDistance } from "@/resolve/levenshtein"

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("hello", "hello")).toBe(0)
    expect(levenshteinDistance("", "")).toBe(0)
  })

  it("returns length for empty string comparison", () => {
    expect(levenshteinDistance("", "hello")).toBe(5)
    expect(levenshteinDistance("world", "")).toBe(5)
  })

  it("calculates single character operations", () => {
    // Single insertion
    expect(levenshteinDistance("cat", "cats")).toBe(1)

    // Single deletion
    expect(levenshteinDistance("cats", "cat")).toBe(1)

    // Single substitution
    expect(levenshteinDistance("cat", "car")).toBe(1)
  })

  it("calculates multiple operations", () => {
    // kitten -> sitten -> sittin -> sitting (3 operations)
    expect(levenshteinDistance("kitten", "sitting")).toBe(3)

    // Saturday -> Sunday (3 operations)
    expect(levenshteinDistance("Saturday", "Sunday")).toBe(3)
  })

  it("is case-sensitive", () => {
    expect(levenshteinDistance("Hello", "hello")).toBe(1)
  })

  it("handles complex party names", () => {
    // Common typo: extra/missing space
    expect(levenshteinDistance("United States", "UnitedStates")).toBe(1)

    // Abbreviated vs full
    expect(levenshteinDistance("Smith", "Smithson")).toBe(3)
  })
})

describe("normalizedLevenshteinDistance", () => {
  it("returns 1.0 for identical strings", () => {
    expect(normalizedLevenshteinDistance("hello", "hello")).toBe(1.0)
    expect(normalizedLevenshteinDistance("", "")).toBe(1.0)
  })

  it("is case-insensitive", () => {
    expect(normalizedLevenshteinDistance("Hello", "hello")).toBe(1.0)
    expect(normalizedLevenshteinDistance("SMITH", "smith")).toBe(1.0)
  })

  it("returns 0.0 for completely different strings", () => {
    expect(normalizedLevenshteinDistance("abc", "xyz")).toBe(0.0)
  })

  it("calculates normalized similarity for party names", () => {
    // Smith vs Smithson: 3 edits, max length 8 -> 1 - (3/8) = 0.625
    const similarity = normalizedLevenshteinDistance("Smith", "Smithson")
    expect(similarity).toBeCloseTo(0.625, 2)
  })

  it("handles very similar party names", () => {
    // United States vs United State: 1 edit, max length 13 -> 1 - (1/13) = 0.923
    const similarity = normalizedLevenshteinDistance("United States", "United State")
    expect(similarity).toBeGreaterThan(0.9)
  })

  it("returns high similarity for common typos", () => {
    // Missing space: 1 edit
    const similarity = normalizedLevenshteinDistance("United States", "UnitedStates")
    expect(similarity).toBeGreaterThan(0.9)
  })

  it("calculates reasonable threshold for matching", () => {
    // Similar enough to match (should be > 0.8 threshold)
    expect(normalizedLevenshteinDistance("Johnson", "Jonson")).toBeGreaterThan(0.8)
    expect(normalizedLevenshteinDistance("McDonald", "MacDonald")).toBeGreaterThan(0.8)

    // Too different to match (should be < 0.8 threshold)
    expect(normalizedLevenshteinDistance("Smith", "Jones")).toBeLessThan(0.8)
    expect(normalizedLevenshteinDistance("Apple", "Microsoft")).toBeLessThan(0.8)
  })
})
