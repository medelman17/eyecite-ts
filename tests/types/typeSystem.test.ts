/**
 * Type-Level Tests
 *
 * Verifies the type system using Vitest's expectTypeOf.
 * These tests produce no runtime assertions — they only check compile-time types.
 */

import { describe, expectTypeOf, it } from "vitest"
import { annotate } from "@/annotate"
import { extractCitations, extractCitationsAsync } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"
import type {
  Citation,
  CitationOfType,
  CitationType,
  ExtractorMap,
  FederalRegisterCitation,
  FullCaseCitation,
  FullCitation,
  IdCitation,
  JournalCitation,
  NeutralCitation,
  PublicLawCitation,
  ShortFormCaseCitation,
  ShortFormCitation,
  StatuteCitation,
  SupraCitation,
} from "@/types"
import {
  assertUnreachable,
  isCaseCitation,
  isCitationType,
  isFullCitation,
  isShortFormCitation,
} from "@/types"

describe("Type System", () => {
  describe("CitationOfType extracts correct subtypes", () => {
    it("maps case to FullCaseCitation", () => {
      expectTypeOf<CitationOfType<"case">>().toEqualTypeOf<FullCaseCitation>()
    })

    it("maps statute to StatuteCitation", () => {
      expectTypeOf<CitationOfType<"statute">>().toEqualTypeOf<StatuteCitation>()
    })

    it("maps journal to JournalCitation", () => {
      expectTypeOf<CitationOfType<"journal">>().toEqualTypeOf<JournalCitation>()
    })

    it("maps neutral to NeutralCitation", () => {
      expectTypeOf<CitationOfType<"neutral">>().toEqualTypeOf<NeutralCitation>()
    })

    it("maps publicLaw to PublicLawCitation", () => {
      expectTypeOf<CitationOfType<"publicLaw">>().toEqualTypeOf<PublicLawCitation>()
    })

    it("maps federalRegister to FederalRegisterCitation", () => {
      expectTypeOf<CitationOfType<"federalRegister">>().toEqualTypeOf<FederalRegisterCitation>()
    })

    it("maps id to IdCitation", () => {
      expectTypeOf<CitationOfType<"id">>().toEqualTypeOf<IdCitation>()
    })

    it("maps supra to SupraCitation", () => {
      expectTypeOf<CitationOfType<"supra">>().toEqualTypeOf<SupraCitation>()
    })

    it("maps shortFormCase to ShortFormCaseCitation", () => {
      expectTypeOf<CitationOfType<"shortFormCase">>().toEqualTypeOf<ShortFormCaseCitation>()
    })
  })

  describe("ExtractorMap type", () => {
    it("maps case key to FullCaseCitation", () => {
      expectTypeOf<ExtractorMap["case"]>().toEqualTypeOf<FullCaseCitation>()
    })

    it("maps statute key to StatuteCitation", () => {
      expectTypeOf<ExtractorMap["statute"]>().toEqualTypeOf<StatuteCitation>()
    })

    it("maps journal key to JournalCitation", () => {
      expectTypeOf<ExtractorMap["journal"]>().toEqualTypeOf<JournalCitation>()
    })

    it("maps neutral key to NeutralCitation", () => {
      expectTypeOf<ExtractorMap["neutral"]>().toEqualTypeOf<NeutralCitation>()
    })

    it("maps publicLaw key to PublicLawCitation", () => {
      expectTypeOf<ExtractorMap["publicLaw"]>().toEqualTypeOf<PublicLawCitation>()
    })

    it("maps federalRegister key to FederalRegisterCitation", () => {
      expectTypeOf<ExtractorMap["federalRegister"]>().toEqualTypeOf<FederalRegisterCitation>()
    })
  })

  describe("Type guards narrow correctly", () => {
    it("isFullCitation narrows to FullCitation", () => {
      const c = {} as Citation
      if (isFullCitation(c)) {
        expectTypeOf(c).toEqualTypeOf<FullCitation>()
      }
    })

    it("isShortFormCitation narrows to ShortFormCitation", () => {
      const c = {} as Citation
      if (isShortFormCitation(c)) {
        expectTypeOf(c).toEqualTypeOf<ShortFormCitation>()
      }
    })

    it("isCaseCitation narrows to FullCaseCitation", () => {
      const c = {} as Citation
      if (isCaseCitation(c)) {
        expectTypeOf(c).toEqualTypeOf<FullCaseCitation>()
      }
    })

    it("isCitationType narrows to specific type", () => {
      const c = {} as Citation
      if (isCitationType(c, "statute")) {
        expectTypeOf(c).toEqualTypeOf<StatuteCitation>()
      }
      if (isCitationType(c, "id")) {
        expectTypeOf(c).toEqualTypeOf<IdCitation>()
      }
      if (isCitationType(c, "supra")) {
        expectTypeOf(c).toEqualTypeOf<SupraCitation>()
      }
    })

    it("isCitationType works with generic type parameter", () => {
      function processType<T extends CitationType>(c: Citation, type: T) {
        if (isCitationType(c, type)) {
          expectTypeOf(c).toEqualTypeOf<CitationOfType<T>>()
        }
      }
      // Ensure function compiles
      expectTypeOf(processType).toBeFunction()
    })
  })

  describe("assertUnreachable signature", () => {
    it("accepts never and returns never", () => {
      expectTypeOf(assertUnreachable).parameter(0).toBeNever()
      expectTypeOf(assertUnreachable).returns.toBeNever()
    })
  })

  describe("ResolvedCitation conditional type", () => {
    it("short-form citations have resolution field", () => {
      type ResolvedId = ResolvedCitation<IdCitation>
      expectTypeOf<ResolvedId>().toHaveProperty("resolution")
    })

    it("full citations have resolution as undefined", () => {
      type ResolvedCase = ResolvedCitation<FullCaseCitation>
      // resolution is optional and typed as undefined
      expectTypeOf<ResolvedCase["resolution"]>().toEqualTypeOf<undefined>()
    })

    it("ResolvedCitation distributes over union", () => {
      // Default parameter distributes over all Citation members
      type Resolved = ResolvedCitation
      // Should still be assignable from any resolved citation
      const id = {} as ResolvedCitation<IdCitation>
      expectTypeOf(id).toMatchTypeOf<Resolved>()
      const fc = {} as ResolvedCitation<FullCaseCitation>
      expectTypeOf(fc).toMatchTypeOf<Resolved>()
    })
  })

  describe("extractCitations overloads", () => {
    it("returns ResolvedCitation[] with resolve: true", () => {
      const text = "" as string
      const result = extractCitations(text, { resolve: true })
      expectTypeOf(result).toEqualTypeOf<ResolvedCitation[]>()
    })

    it("returns Citation[] without resolve", () => {
      const text = "" as string
      const result = extractCitations(text)
      expectTypeOf(result).toEqualTypeOf<Citation[]>()
    })

    it("returns Citation[] with options but no resolve", () => {
      const text = "" as string
      const result = extractCitations(text, {})
      expectTypeOf(result).toEqualTypeOf<Citation[]>()
    })
  })

  describe("extractCitationsAsync overloads", () => {
    it("returns Promise<ResolvedCitation[]> with resolve: true", () => {
      const text = "" as string
      const result = extractCitationsAsync(text, { resolve: true })
      expectTypeOf(result).toEqualTypeOf<Promise<ResolvedCitation[]>>()
    })

    it("returns Promise<Citation[]> without resolve", () => {
      const text = "" as string
      const result = extractCitationsAsync(text)
      expectTypeOf(result).toEqualTypeOf<Promise<Citation[]>>()
    })
  })

  describe("Generic annotate callback", () => {
    it("narrows callback parameter to specific citation type", () => {
      const cases = [] as FullCaseCitation[]
      annotate("text", cases, {
        callback: (c) => {
          expectTypeOf(c).toEqualTypeOf<FullCaseCitation>()
          return c.reporter
        },
      })
    })

    it("uses Citation when array is generic", () => {
      const citations = [] as Citation[]
      annotate("text", citations, {
        callback: (c) => {
          expectTypeOf(c).toEqualTypeOf<Citation>()
          return c.matchedText
        },
      })
    })
  })
})
