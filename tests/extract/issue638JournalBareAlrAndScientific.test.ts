import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { AnnotationCitation, JournalCitation } from "@/types/citation"

const journals = (text: string): JournalCitation[] =>
  extractCitations(text).filter((c): c is JournalCitation => c.type === "journal")

const annotations = (text: string): AnnotationCitation[] =>
  extractCitations(text).filter((c): c is AnnotationCitation => c.type === "annotation")

describe("#638 bare-abbreviation journals + ALR-no-periods + scientific journals", () => {
  describe("Scientific / medical journals", () => {
    it("53 Neurology 1107 → journal", () => {
      const cs = journals("53 Neurology 1107")
      expect(cs).toHaveLength(1)
      expect(cs[0].volume).toBe(53)
      expect(cs[0].abbreviation).toBe("Neurology")
      expect(cs[0].page).toBe(1107)
    })

    it("344 New Eng. J. Med. 678 → journal", () => {
      const cs = journals("344 New Eng. J. Med. 678")
      expect(cs).toHaveLength(1)
    })

    it("285 JAMA 2486 → journal", () => {
      const cs = journals("285 JAMA 2486")
      expect(cs).toHaveLength(1)
    })

    it("scientific journal in prose (`...as reported in 53 Neurology 1107 (1999)`)", () => {
      const cs = journals("...as reported in 53 Neurology 1107 (1999) by the authors.")
      expect(cs).toHaveLength(1)
      expect(cs[0].abbreviation).toBe("Neurology")
      expect(cs[0].year).toBe(1999)
    })
  })

  describe("Law reviews without periods", () => {
    it("70 Brook L Rev 1045 → journal", () => {
      const cs = journals("70 Brook L Rev 1045")
      expect(cs).toHaveLength(1)
      expect(cs[0].volume).toBe(70)
      expect(cs[0].abbreviation).toBe("Brook L Rev")
      expect(cs[0].page).toBe(1045)
    })

    it("96 Yale L J 1234 → journal", () => {
      const cs = journals("96 Yale L J 1234")
      expect(cs).toHaveLength(1)
    })

    it("with-periods canonical form still works (regression)", () => {
      const cs = journals("100 Harv. L. Rev. 500")
      expect(cs).toHaveLength(1)
      expect(cs[0].abbreviation).toBe("Harv. L. Rev.")
    })
  })

  describe("ALR bare-acronym (no periods)", () => {
    it("48 ALR 749 → annotation (not case)", () => {
      const cs = annotations("48 ALR 749")
      expect(cs).toHaveLength(1)
      expect(cs[0].volume).toBe(48)
      expect(cs[0].page).toBe(749)
    })

    it("100 ALR2d 567 → annotation", () => {
      const cs = annotations("100 ALR2d 567")
      expect(cs).toHaveLength(1)
      expect(cs[0].volume).toBe(100)
    })

    it("23 ALR Fed 3d 456 → annotation", () => {
      const cs = annotations("23 ALR Fed 3d 456")
      expect(cs).toHaveLength(1)
    })

    it("canonical `100 A.L.R.2d 1234` still works (regression)", () => {
      const cs = annotations("100 A.L.R.2d 1234")
      expect(cs).toHaveLength(1)
      expect(cs[0].volume).toBe(100)
    })
  })

  describe("Case-citation regression guards", () => {
    it("`500 F.2d 123` still extracts as case", () => {
      const cs = extractCitations("500 F.2d 123").filter((c) => c.type === "case")
      expect(cs).toHaveLength(1)
    })

    it("`347 U.S. 483` (Brown v. Board) still case, not journal", () => {
      const cs = extractCitations("Brown v. Board of Education, 347 U.S. 483 (1954)")
      const cases = cs.filter((c) => c.type === "case")
      const journ = cs.filter((c) => c.type === "journal")
      expect(cases.length).toBeGreaterThanOrEqual(1)
      expect(journ.length).toBe(0)
    })
  })

  describe("False-positive guards", () => {
    it("does NOT match `Neurology` in prose without volume/page", () => {
      const cs = journals("Neurology specialists agree on the diagnosis.")
      expect(cs).toHaveLength(0)
    })

    it("does NOT match `ALR` as standalone abbreviation in prose", () => {
      const cs = annotations("The ALR specifications were updated.")
      expect(cs).toHaveLength(0)
    })
  })
})
