import { describe, expect, it } from "vitest"
import { toReporterKey, toReporterKeys } from "../../src/utils"
import type { FullCaseCitation } from "../../src/types/citation"

/**
 * Helper to build a minimal FullCaseCitation for testing.
 * Only includes fields relevant to reporter key formatting.
 */
function makeCitation(
  overrides: Partial<FullCaseCitation> & Pick<FullCaseCitation, "volume" | "reporter">,
): FullCaseCitation {
  return {
    type: "case",
    text: "",
    matchedText: "",
    span: { cleanStart: 0, cleanEnd: 0, originalStart: 0, originalEnd: 0 },
    confidence: 1,
    processTimeMs: 0,
    patternsChecked: 0,
    ...overrides,
  }
}

describe("toReporterKey", () => {
  it("formats a standard case citation", () => {
    const cite = makeCitation({ volume: 550, reporter: "U.S.", page: 544 })
    expect(toReporterKey(cite)).toBe("550 U.S. 544")
  })

  it("uses normalizedReporter when available", () => {
    const cite = makeCitation({
      volume: 500,
      reporter: "F. 2d",
      normalizedReporter: "F.2d",
      page: 123,
    })
    expect(toReporterKey(cite)).toBe("500 F.2d 123")
  })

  it("falls back to reporter when normalizedReporter is absent", () => {
    const cite = makeCitation({ volume: 500, reporter: "F.2d", page: 123 })
    expect(toReporterKey(cite)).toBe("500 F.2d 123")
  })

  it("handles string volume", () => {
    const cite = makeCitation({ volume: "2024-1", reporter: "F.4th", page: 100 })
    expect(toReporterKey(cite)).toBe("2024-1 F.4th 100")
  })

  it("omits page for blank-page citations", () => {
    const cite = makeCitation({
      volume: 500,
      reporter: "F.2d",
      hasBlankPage: true,
    })
    expect(toReporterKey(cite)).toBe("500 F.2d")
  })

  it("omits page when page is undefined", () => {
    const cite = makeCitation({ volume: 500, reporter: "F.2d" })
    expect(toReporterKey(cite)).toBe("500 F.2d")
  })
})

describe("toReporterKeys", () => {
  it("returns single-element array for citation without parallels", () => {
    const cite = makeCitation({ volume: 550, reporter: "U.S.", page: 544 })
    expect(toReporterKeys(cite)).toEqual(["550 U.S. 544"])
  })

  it("includes parallel citations", () => {
    const cite = makeCitation({
      volume: 410,
      reporter: "U.S.",
      page: 113,
      parallelCitations: [{ volume: 93, reporter: "S. Ct.", page: 705 }],
    })
    expect(toReporterKeys(cite)).toEqual(["410 U.S. 113", "93 S. Ct. 705"])
  })

  it("includes multiple parallel citations", () => {
    const cite = makeCitation({
      volume: 410,
      reporter: "U.S.",
      page: 113,
      parallelCitations: [
        { volume: 93, reporter: "S. Ct.", page: 705 },
        { volume: 35, reporter: "L. Ed. 2d", page: 147 },
      ],
    })
    expect(toReporterKeys(cite)).toEqual([
      "410 U.S. 113",
      "93 S. Ct. 705",
      "35 L. Ed. 2d 147",
    ])
  })

  it("returns single-element array when parallelCitations is empty", () => {
    const cite = makeCitation({
      volume: 550,
      reporter: "U.S.",
      page: 544,
      parallelCitations: [],
    })
    expect(toReporterKeys(cite)).toEqual(["550 U.S. 544"])
  })
})
