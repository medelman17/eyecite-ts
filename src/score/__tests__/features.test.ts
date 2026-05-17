import { describe, expectTypeOf, it } from "vitest"
import type {
  CaseFeatures,
  ConstitutionalFeatures,
  DocketFeatures,
  ExtractionFeatures,
  FederalRegisterFeatures,
  IdFeatures,
  JournalFeatures,
  NeutralFeatures,
  PublicLawFeatures,
  ShortFormCaseFeatures,
  StatuteFeatures,
  StatutesAtLargeFeatures,
  SupraFeatures,
} from "@/score/features"

describe("ExtractionFeatures discriminated union", () => {
  it("CaseFeatures has the expected shape", () => {
    const f: CaseFeatures = {
      type: "case",
      patternId: "federal-reporter",
      knownReporter: true,
      reporterAmbiguous: false,
      yearPresent: true,
      yearPlausible: true,
      caseNamePresent: true,
      courtIdentified: false,
      blankPage: false,
      metadataExpected: 7,
      metadataPopulated: 5,
    }
    expectTypeOf(f.type).toEqualTypeOf<"case">()
  })

  it("IdFeatures has the expected shape", () => {
    const f: IdFeatures = {
      type: "id",
      patternId: "id-citation",
      lowercase: false,
      hasComma: false,
      typoComma: false,
      inCitationContext: true,
    }
    expectTypeOf(f.type).toEqualTypeOf<"id">()
  })

  it("ExtractionFeatures narrows on type tag", () => {
    const f = { type: "case" } as ExtractionFeatures
    if (f.type === "case") {
      expectTypeOf(f).toMatchTypeOf<CaseFeatures>()
    }
  })

  it("all citation types have a Features variant", () => {
    // Compile-time check via discriminated-union exhaustion
    function _exhaustive(f: ExtractionFeatures): string {
      switch (f.type) {
        case "case":
          return f.type
        case "id":
          return f.type
        case "supra":
          return f.type
        case "shortFormCase":
          return f.type
        case "statute":
          return f.type
        case "constitutional":
          return f.type
        case "journal":
          return f.type
        case "neutral":
          return f.type
        case "publicLaw":
          return f.type
        case "federalRegister":
          return f.type
        case "statutesAtLarge":
          return f.type
        case "docket":
          return f.type
      }
    }
    void _exhaustive
  })
})
