import { describe, expect, it } from "vitest"
import { CASE_WEIGHTS, getWeights, ID_WEIGHTS } from "@/score/weights"

describe("scoring weights", () => {
  it("CASE_WEIGHTS preserves the current additive structure", () => {
    // Mirror of extractCase.ts:2932-2960 deltas
    expect(CASE_WEIGHTS.base).toBe(0.2)
    expect(CASE_WEIGHTS.knownReporter).toBe(0.3)
    expect(CASE_WEIGHTS.yearPlausible).toBe(0.2)
    expect(CASE_WEIGHTS.caseNamePresent).toBe(0.15)
    expect(CASE_WEIGHTS.courtIdentified).toBe(0.1)
    expect(CASE_WEIGHTS.blankPageFloor).toBe(0.5)
  })

  it("ID_WEIGHTS preserves the current subtractive structure", () => {
    // Mirror of extractShortForms.ts:162-181 caps
    expect(ID_WEIGHTS.base).toBe(1.0)
    expect(ID_WEIGHTS.lowercase).toBe(0.85)
    expect(ID_WEIGHTS.hasComma).toBe(0.9)
    expect(ID_WEIGHTS.typoComma).toBe(0.7)
    expect(ID_WEIGHTS.notInCitationContext).toBe(0.4)
  })

  it("getWeights returns the right table per type", () => {
    expect(getWeights("case")).toBe(CASE_WEIGHTS)
    expect(getWeights("id")).toBe(ID_WEIGHTS)
  })
})
