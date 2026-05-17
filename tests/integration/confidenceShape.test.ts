import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

describe("Confidence struct shape across citation types", () => {
  it("case citation has full Confidence with axes", () => {
    const text = "See Smith v. Doe, 500 F.3d 123 (9th Cir. 2020)."
    const [c] = extractCitations(text)
    expect(c).toBeDefined()
    expect(c.confidence.score).toBeGreaterThan(0.5)
    expect(c.confidence.level).toBe("certain")
    expect(c.confidence.axes.extraction).toBeGreaterThan(0)
    expect(c.confidence.axes.metadata).toBeGreaterThan(0)
    expect(c.confidence.axes.resolution).toBeUndefined() // not a short-form
    expect(c.confidence.reasons).toContain("known_reporter")
  })

  it("Id. with no resolution has no axes.resolution", () => {
    const text = "Smith, 500 F.3d 123. Id. at 125."
    const citations = extractCitations(text)
    const id = citations.find((c) => c.type === "id")
    expect(id).toBeDefined()
    expect(id!.confidence.axes.resolution).toBeUndefined()
  })

  it("resolved Id. has axes.resolution populated", () => {
    const text = "Smith, 500 F.3d 123. Id. at 125."
    const citations = extractCitations(text, { resolve: true })
    const id = citations.find((c) => c.type === "id")
    expect(id).toBeDefined()
    expect(id!.confidence.axes.resolution).toBeDefined()
    expect(id!.confidence.axes.resolution).toBeGreaterThan(0.5)
  })

  it("score = extraction * resolution for resolved short-form", () => {
    const text = "Smith, 500 F.3d 123. Id. at 125."
    const citations = extractCitations(text, { resolve: true })
    const id = citations.find((c) => c.type === "id")!
    const expected =
      Math.round(id.confidence.axes.extraction * id.confidence.axes.resolution! * 100) / 100
    expect(id.confidence.score).toBeCloseTo(expected, 2)
  })

  it("score = extraction for full citation (no resolution axis)", () => {
    const text = "See 42 U.S.C. § 1983."
    const [c] = extractCitations(text)
    expect(c.confidence.score).toBeCloseTo(c.confidence.axes.extraction, 2)
  })

  it("reasons is always an array", () => {
    const text = "Smith v. Doe, 500 F.3d 123 (2020); See 42 U.S.C. § 1983; Id. at 125."
    for (const c of extractCitations(text)) {
      expect(Array.isArray(c.confidence.reasons)).toBe(true)
    }
  })

  it("level matches deriveLevel for the score", () => {
    const text = "Smith v. Doe, 500 F.3d 123 (9th Cir. 2020). See 42 U.S.C. § 1983(a)."
    for (const c of extractCitations(text)) {
      const expectedLevel =
        c.confidence.score >= 0.95
          ? "certain"
          : c.confidence.score >= 0.8
            ? "high"
            : c.confidence.score >= 0.5
              ? "medium"
              : "low"
      expect(c.confidence.level).toBe(expectedLevel)
    }
  })

  it("explanation is undefined by default", () => {
    const [c] = extractCitations("500 F.3d 123 (2020)")
    expect(c.confidence.explanation).toBeUndefined()
  })
})
