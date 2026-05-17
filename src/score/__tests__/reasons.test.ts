import { describe, expect, it } from "vitest"
import type { CaseFeatures, IdFeatures, ResolutionFeatures } from "@/score/features"
import { collectReasonCodes } from "@/score/reasons"

describe("collectReasonCodes", () => {
  it("emits positive case reasons for well-populated citation", () => {
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
    const reasons = collectReasonCodes(f)
    expect(reasons).toContain("known_reporter")
    expect(reasons).toContain("year_plausible")
    expect(reasons).toContain("case_name_present")
    expect(reasons).toContain("court_identified")
  })

  it("emits negative reasons for missing metadata", () => {
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
    const reasons = collectReasonCodes(f)
    expect(reasons).toContain("reporter_unknown")
    expect(reasons).toContain("missing_year")
    expect(reasons).toContain("missing_case_name")
    expect(reasons).toContain("missing_court")
  })

  it("emits ambiguous when reporter has multiple matches", () => {
    const f: CaseFeatures = {
      type: "case",
      patternId: "state-reporter",
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
    expect(collectReasonCodes(f)).toContain("reporter_ambiguous")
  })

  it("emits blank_page reason when blank page detected", () => {
    const f: CaseFeatures = {
      type: "case",
      patternId: "federal-reporter",
      knownReporter: true,
      reporterAmbiguous: false,
      yearPresent: true,
      yearPlausible: true,
      caseNamePresent: false,
      courtIdentified: false,
      blankPage: true,
      metadataExpected: 7,
      metadataPopulated: 3,
    }
    expect(collectReasonCodes(f)).toContain("blank_page")
  })

  it("emits id-specific punctuation reasons", () => {
    const f: IdFeatures = {
      type: "id",
      patternId: "id-citation",
      lowercase: true,
      hasComma: false,
      typoComma: true,
      inCitationContext: false,
    }
    const reasons = collectReasonCodes(f)
    expect(reasons).toContain("lowercase_id")
    expect(reasons).toContain("typo_punctuation")
    expect(reasons).toContain("mid_sentence_id")
  })

  it("appends resolution reasons when ResolutionFeatures provided", () => {
    const r: ResolutionFeatures = {
      patternId: "id-resolution",
      exactMatch: true,
      similarity: 1.0,
      windowMismatch: false,
      inScope: true,
    }
    const f: IdFeatures = {
      type: "id",
      patternId: "id-citation",
      lowercase: false,
      hasComma: false,
      typoComma: false,
      inCitationContext: true,
    }
    expect(collectReasonCodes(f, r)).toContain("exact_antecedent_match")
  })

  it("emits ambiguous_id_window when resolver flagged window mismatch", () => {
    const r: ResolutionFeatures = {
      patternId: "id-resolution",
      exactMatch: true,
      similarity: 1.0,
      windowMismatch: true,
      inScope: true,
    }
    const f: IdFeatures = {
      type: "id",
      patternId: "id-citation",
      lowercase: false,
      hasComma: false,
      typoComma: false,
      inCitationContext: true,
    }
    expect(collectReasonCodes(f, r)).toContain("ambiguous_id_window")
  })

  it("returns empty array (not null) when no reasons apply", () => {
    const f: CaseFeatures = {
      type: "case",
      patternId: "federal-reporter",
      knownReporter: false,
      reporterAmbiguous: false,
      yearPresent: true,
      yearPlausible: true,
      caseNamePresent: false,
      courtIdentified: false,
      blankPage: false,
      metadataExpected: 0,
      metadataPopulated: 0,
    }
    const reasons = collectReasonCodes(f)
    expect(Array.isArray(reasons)).toBe(true)
  })
})
