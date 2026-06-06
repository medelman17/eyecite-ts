import { beforeAll, describe, expect, it } from "vitest"
import { loadReporters } from "@/data/reporters"
import {
  computeCaseConfidence,
  interpretCaseReporterSemantics,
  resolveNormalizedReporter,
} from "@/extract/caseReporterSemantics"

describe("case reporter semantics", () => {
  beforeAll(async () => {
    await loadReporters()
  })

  it("computes confidence from reporter, year, case name, court, and blank-page signals", () => {
    expect(
      computeCaseConfidence({
        reporter: "A.",
        year: 2020,
        caseName: "Smith v. Jones",
        court: undefined,
        hasBlankPage: false,
      }),
    ).toBe(0.85)

    expect(
      computeCaseConfidence({
        reporter: "NotAReporter",
        year: undefined,
        caseName: undefined,
        court: undefined,
        hasBlankPage: true,
      }),
    ).toBe(0.5)
  })

  it("normalizes reporters through reporters-db and preserves unknown reporters as absent", () => {
    expect(resolveNormalizedReporter("Black.", 1862)).toBe("Black")
    expect(resolveNormalizedReporter("Black.", 1840)).toBe("Blackf.")
    expect(resolveNormalizedReporter("NotAReporter", 2020)).toBeUndefined()
  })

  it("interprets reporter-derived court, normalized court, normalized reporter, and confidence", () => {
    expect(
      interpretCaseReporterSemantics({
        reporter: "U.S.",
        year: 2020,
        caseName: undefined,
        court: undefined,
        hasBlankPage: false,
      }),
    ).toEqual({
      court: "scotus",
      normalizedCourt: "scotus",
      normalizedReporter: "U.S.",
      inferredCourt: {
        level: "supreme",
        jurisdiction: "federal",
        confidence: 1.0,
      },
      confidence: 0.8,
    })
  })
})
