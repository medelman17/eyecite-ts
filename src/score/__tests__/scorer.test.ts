import { describe, expect, it } from "vitest"
import type { CaseFeatures, IdFeatures, ResolutionFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"

describe("scoreCitation", () => {
  it("produces full Confidence struct for well-populated case", () => {
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
    const c = scoreCitation(f)
    expect(c.axes.extraction).toBeCloseTo(0.95, 2)
    expect(c.axes.metadata).toBeCloseTo(1.0, 2)
    expect(c.axes.resolution).toBeUndefined()
    // score = axes.extraction for full citations
    expect(c.score).toBeCloseTo(0.95, 2)
    expect(c.level).toBe("certain")
    expect(c.reasons).toContain("known_reporter")
  })

  it("score = extraction × resolution for resolved short-forms", () => {
    const f: IdFeatures = {
      type: "id",
      patternId: "id-citation",
      lowercase: false,
      hasComma: false,
      typoComma: false,
      inCitationContext: true,
    }
    const r: ResolutionFeatures = {
      patternId: "id-resolution",
      exactMatch: true,
      similarity: 1.0,
      windowMismatch: true, // forces resolution to 0.75
      inScope: true,
    }
    const c = scoreCitation(f, r)
    expect(c.axes.extraction).toBeCloseTo(1.0, 2)
    expect(c.axes.resolution).toBe(0.75)
    expect(c.score).toBeCloseTo(0.75, 2) // 1.0 × 0.75
  })

  it("omits explanation when not requested", () => {
    const f: CaseFeatures = {
      type: "case",
      patternId: "federal-reporter",
      knownReporter: true,
      reporterAmbiguous: false,
      yearPresent: true,
      yearPlausible: true,
      caseNamePresent: false,
      courtIdentified: false,
      blankPage: false,
      metadataExpected: 7,
      metadataPopulated: 3,
    }
    const c = scoreCitation(f)
    expect(c.explanation).toBeUndefined()
  })

  it("populates explanation when requested", () => {
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
    const c = scoreCitation(f, undefined, { explain: true })
    expect(c.explanation).toBeDefined()
    expect(c.explanation?.value).toBeCloseTo(c.score, 2)
    expect(c.explanation?.details?.length).toBeGreaterThan(0)
  })
})
