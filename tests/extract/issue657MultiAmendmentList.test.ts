import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { ConstitutionalCitation } from "@/types/citation"

const constCites = (text: string): ConstitutionalCitation[] =>
  extractCitations(text).filter((c): c is ConstitutionalCitation => c.type === "constitutional")

const amendments = (text: string): number[] =>
  constCites(text)
    .map((c) => c.amendment)
    .filter((a): a is number => a !== undefined)
    .sort((a, b) => a - b)

describe("#657 multi-amendment list extraction", () => {
  describe("Two-amendment lists", () => {
    it("`the Fifth and Sixth Amendment` extracts both", () => {
      expect(amendments("the Fifth and Sixth Amendment")).toEqual([5, 6])
    })

    it("`the Fifth and Sixth Amendments` (plural)", () => {
      expect(amendments("the Fifth and Sixth Amendments")).toEqual([5, 6])
    })

    it("`his Fifth and Sixth Amendment rights` (with trailing context)", () => {
      expect(amendments("his Fifth and Sixth Amendment rights")).toEqual([5, 6])
    })

    it("`Fourth and Fourteenth Amendments`", () => {
      expect(amendments("Fourth and Fourteenth Amendments")).toEqual([4, 14])
    })
  })

  describe("Three-amendment lists", () => {
    it("`the Fifth, Sixth, and Fourteenth Amendments`", () => {
      expect(amendments("the Fifth, Sixth, and Fourteenth Amendments")).toEqual([5, 6, 14])
    })

    it("`Fourth, Fifth, and Fourteenth Amendments`", () => {
      expect(amendments("Fourth, Fifth, and Fourteenth Amendments")).toEqual([4, 5, 14])
    })
  })

  describe("Four-amendment list", () => {
    it("`First, Fourth, Fifth, and Fourteenth Amendments`", () => {
      expect(amendments("First, Fourth, Fifth, and Fourteenth Amendments")).toEqual([1, 4, 5, 14])
    })
  })

  describe("Regression guards", () => {
    it("single `the Fifth Amendment` still works", () => {
      expect(amendments("the Fifth Amendment")).toEqual([5])
    })

    it("`U.S. Const. amend. V` still single", () => {
      expect(amendments("U.S. Const. amend. V")).toEqual([5])
    })

    it("does NOT match prose without `Amendment`", () => {
      expect(amendments("the fifth section and the sixth chapter")).toEqual([])
    })
  })

  describe("Ordinal abbreviations", () => {
    it("`5th and 6th Amendments`", () => {
      expect(amendments("5th and 6th Amendments")).toEqual([5, 6])
    })
  })
})
