import { describe, expect, it } from "vitest"
import { computeAxes } from "@/score/axes"
import type { CaseFeatures, IdFeatures, ResolutionFeatures } from "@/score/features"

describe("computeAxes", () => {
  it("case with all positive signals yields high extraction + completeness", () => {
    const f: CaseFeatures = {
      type: "case",
      patternId: "federal-reporter",
      knownReporter: true,
      reporterAmbiguous: false,
      yearPresent: true,
      yearPlausible: true,
      caseNamePresent: true,
      courtIdentified: true,
      blankPage: false,
      metadataExpected: 7,
      metadataPopulated: 7,
    }
    const axes = computeAxes(f)
    // base 0.2 + 0.3 + 0.2 + 0.15 + 0.1 = 0.95
    expect(axes.extraction).toBeCloseTo(0.95, 2)
    expect(axes.metadata).toBeCloseTo(1.0, 2)
  })

  it("case with no signals stays near base", () => {
    const f: CaseFeatures = {
      type: "case",
      patternId: "state-reporter",
      knownReporter: false,
      reporterAmbiguous: false,
      yearPresent: false,
      yearPlausible: false,
      caseNamePresent: false,
      courtIdentified: false,
      blankPage: false,
      metadataExpected: 7,
      metadataPopulated: 2,
    }
    const axes = computeAxes(f)
    expect(axes.extraction).toBeCloseTo(0.2, 2)
    expect(axes.metadata).toBeCloseTo(2 / 7, 2)
  })

  it("case with blank page floors extraction at 0.5", () => {
    const f: CaseFeatures = {
      type: "case",
      patternId: "federal-reporter",
      knownReporter: false,
      reporterAmbiguous: false,
      yearPresent: false,
      yearPlausible: false,
      caseNamePresent: false,
      courtIdentified: false,
      blankPage: true,
      metadataExpected: 7,
      metadataPopulated: 3,
    }
    const axes = computeAxes(f)
    expect(axes.extraction).toBeCloseTo(0.5, 2)
  })

  it("case with ambiguous reporter applies soft penalty", () => {
    const base: CaseFeatures = {
      type: "case",
      patternId: "federal-reporter",
      knownReporter: true,
      reporterAmbiguous: true,
      yearPresent: true,
      yearPlausible: true,
      caseNamePresent: false,
      courtIdentified: false,
      blankPage: false,
      metadataExpected: 7,
      metadataPopulated: 4,
    }
    const axes = computeAxes(base)
    // 0.2 + 0.3 - 0.1 + 0.2 = 0.6
    expect(axes.extraction).toBeCloseTo(0.6, 2)
  })

  it("id with lowercase + comma applies multiplicative caps", () => {
    const f: IdFeatures = {
      type: "id",
      patternId: "id-citation",
      lowercase: true,
      hasComma: true,
      typoComma: false,
      inCitationContext: true,
    }
    const axes = computeAxes(f)
    // min(1.0, 0.85, 0.9) = 0.85
    expect(axes.extraction).toBeCloseTo(0.85, 2)
    // metadata always 1.0 for short-forms (no expected fields)
    expect(axes.metadata).toBe(1.0)
  })

  it("id mid-sentence drops extraction to 0.4", () => {
    const f: IdFeatures = {
      type: "id",
      patternId: "id-citation",
      lowercase: false,
      hasComma: false,
      typoComma: false,
      inCitationContext: false,
    }
    const axes = computeAxes(f)
    expect(axes.extraction).toBeCloseTo(0.4, 2)
  })

  it("resolution axis computed from ResolutionFeatures (id exact match)", () => {
    const r: ResolutionFeatures = {
      patternId: "id-resolution",
      exactMatch: true,
      similarity: 1.0,
      windowMismatch: false,
      inScope: true,
    }
    const axes = computeAxes(
      {
        type: "id",
        patternId: "id-citation",
        lowercase: false,
        hasComma: false,
        typoComma: false,
        inCitationContext: true,
      },
      r,
    )
    expect(axes.resolution).toBe(1.0)
  })

  it("resolution axis drops to 0.75 with window mismatch", () => {
    const r: ResolutionFeatures = {
      patternId: "id-resolution",
      exactMatch: true,
      similarity: 1.0,
      windowMismatch: true,
      inScope: true,
    }
    const axes = computeAxes(
      {
        type: "id",
        patternId: "id-citation",
        lowercase: false,
        hasComma: false,
        typoComma: false,
        inCitationContext: true,
      },
      r,
    )
    expect(axes.resolution).toBe(0.75)
  })

  it("supra resolution uses similarity directly", () => {
    const r: ResolutionFeatures = {
      patternId: "supra-resolution",
      exactMatch: false,
      similarity: 0.87,
      windowMismatch: false,
      inScope: true,
    }
    const axes = computeAxes(
      {
        type: "supra",
        patternId: "supra",
        partyName: true,
        bracketed: false,
        standalone: false,
      },
      r,
    )
    expect(axes.resolution).toBeCloseTo(0.87, 2)
  })
})
