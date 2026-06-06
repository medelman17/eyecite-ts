import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { CaseCitation, NeutralCitation } from "@/types/citation"

/**
 * Issue #831 — A `Slip Op.` / `WL` citation whose locator number is a
 * bracketed/underscored blank placeholder (`2021 N.Y. Slip Op. [____]`,
 * `2024 WL [____]`) was dropped ENTIRELY by extraction because the locator
 * capture required digits. With case name, court, and year all present the
 * citation must still be extracted — as the same `neutral` type the numeric
 * form produces — with the locator represented as an empty sentinel rather
 * than crashing or emitting garbage.
 *
 * Dropping the container had collateral effects: its `(quoting …)`
 * parenthetical child was promoted to a spurious top-level citation, and a
 * following `Id.` lost its antecedent. Recognizing the locator removes the
 * root cause and resolves the downstream symptoms.
 */
describe("Issue #831 - bracketed-blank slip-op / WL locators", () => {
  describe("NY Slip Op bracketed-blank locator", () => {
    it("extracts the minimal underscored-blank slip-op cite with caseName", () => {
      const cits = extractCitations(
        "Alpha Holdings LLC v. Beta Realty Corp., 2021 N.Y. Slip Op. [____] (2d Dep't 2021).",
      )
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].caseName).toBe("Alpha Holdings LLC v. Beta Realty Corp.")
      expect(neutrals[0].database).toBe("NY Slip Op")
      expect(neutrals[0].year).toBe(2021)
      // Blank locator → empty sentinel, not garbage.
      expect(neutrals[0].documentNumber).toBe("")
    })

    it("extracts a long underscored blank `[__________]`", () => {
      const cits = extractCitations(
        "Alpha Holdings LLC v. Beta Realty Corp., 2021 N.Y. Slip Op. [__________] (2d Dep't 2021).",
      )
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].caseName).toBe("Alpha Holdings LLC v. Beta Realty Corp.")
      expect(neutrals[0].documentNumber).toBe("")
    })

    it("extracts a dashed blank `[--------]`", () => {
      const cits = extractCitations(
        "Alpha Holdings LLC v. Beta Realty Corp., 2021 N.Y. Slip Op. [--------] (2d Dep't 2021).",
      )
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].documentNumber).toBe("")
    })

    it("extracts a two-character minimal blank `[__]`", () => {
      const cits = extractCitations("In re X, 2021 N.Y. Slip Op. [__] (2d Dep't 2021).")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].documentNumber).toBe("")
    })
  })

  describe("Westlaw bracketed-blank locator", () => {
    it("extracts `2024 WL [____]` as the same neutral type the numeric form produces", () => {
      const blank = extractCitations("2024 WL [____]").filter(
        (c): c is NeutralCitation => c.type === "neutral",
      )
      const numeric = extractCitations("2024 WL 1234567").filter(
        (c): c is NeutralCitation => c.type === "neutral",
      )
      expect(blank).toHaveLength(1)
      expect(numeric).toHaveLength(1)
      expect(blank[0].type).toBe(numeric[0].type)
      expect(blank[0].database).toBe("WL")
      expect(blank[0].database).toBe(numeric[0].database)
      expect(blank[0].year).toBe(2024)
      expect(blank[0].documentNumber).toBe("")
    })

    it("extracts a dashed WL blank `[------]`", () => {
      const cits = extractCitations("See In re Y, 2024 WL [------].").filter(
        (c): c is NeutralCitation => c.type === "neutral",
      )
      expect(cits).toHaveLength(1)
      expect(cits[0].database).toBe("WL")
      expect(cits[0].documentNumber).toBe("")
    })
  })

  describe("full reported document (#831 acceptance)", () => {
    const DOC = `An injunction is a remedy, not a freestanding claim. Alpha Holdings LLC v.
Beta Realty Corp., 2021 N.Y. Slip Op. [__________] (2d Dep't 2021) (quoting Gamma
Industries Inc. v. Delta Partners LP, 77 A.D.3d 344, 368 (1st Dep't 2010)).
Consequently, "injunctive relief is simply not available." Id. at 58–59.`

    it("extracts Alpha (the container is no longer dropped)", () => {
      const cits = extractCitations(DOC, { resolve: true })
      const alpha = cits.find(
        (c) =>
          c.type === "neutral" &&
          (c as NeutralCitation).caseName === "Alpha Holdings LLC v. Beta Realty Corp.",
      )
      expect(alpha).toBeDefined()
    })

    it("does NOT promote Gamma (the parenthetical child) to a top-level citation", () => {
      const cits = extractCitations(DOC, { resolve: true })
      const gammaTopLevel = cits.find(
        (c) =>
          c.type === "case" &&
          (c as CaseCitation).caseName === "Gamma Industries Inc. v. Delta Partners LP",
      )
      expect(gammaTopLevel).toBeUndefined()
    })

    it("resolves `Id. at 58–59` to Alpha", () => {
      const cits = extractCitations(DOC, { resolve: true })
      const alpha = cits.find(
        (c) =>
          c.type === "neutral" &&
          (c as NeutralCitation).caseName === "Alpha Holdings LLC v. Beta Realty Corp.",
      ) as (NeutralCitation & { resolvedTo?: unknown }) | undefined
      expect(alpha).toBeDefined()
      const id = cits.find((c) => c.type === "id") as { resolvedTo?: unknown } | undefined
      expect(id).toBeDefined()
      // The Id. must bind to the now-extracted Alpha container.
      expect(id?.resolvedTo).toBe(alpha)
    })
  })

  describe("regression — numeric forms unchanged", () => {
    it("`2024 NY Slip Op 04225` still parses with its document number", () => {
      const cits = extractCitations("In re Z, 2024 NY Slip Op 04225.").filter(
        (c): c is NeutralCitation => c.type === "neutral",
      )
      expect(cits).toHaveLength(1)
      expect(cits[0].database).toBe("NY Slip Op")
      expect(cits[0].year).toBe(2024)
      expect(cits[0].documentNumber).toBe("04225")
    })

    it("`2021 N.Y. Slip Op. 03165` still parses with its document number", () => {
      const cits = extractCitations(
        "Alpha Holdings LLC v. Beta Realty Corp., 2021 N.Y. Slip Op. 03165 (2d Dep't 2021).",
      ).filter((c): c is NeutralCitation => c.type === "neutral")
      expect(cits).toHaveLength(1)
      expect(cits[0].caseName).toBe("Alpha Holdings LLC v. Beta Realty Corp.")
      expect(cits[0].documentNumber).toBe("03165")
    })

    it("`2024 WL 1234567` still parses with its document number", () => {
      const cits = extractCitations("See 2024 WL 1234567.").filter(
        (c): c is NeutralCitation => c.type === "neutral",
      )
      expect(cits).toHaveLength(1)
      expect(cits[0].database).toBe("WL")
      expect(cits[0].documentNumber).toBe("1234567")
    })

    it("`2024 WL 1234567 (N.D. Cal. Jan. 2, 2024)` still recovers court + date", () => {
      const cits = extractCitations("2024 WL 1234567 (N.D. Cal. Jan. 2, 2024)").filter(
        (c): c is NeutralCitation => c.type === "neutral",
      )
      expect(cits).toHaveLength(1)
      expect(cits[0].database).toBe("WL")
      expect(cits[0].court).toBe("N.D. Cal.")
      expect(cits[0].documentNumber).toBe("1234567")
    })

    it("`2020 NY Slip Op 51234(U)` unpublished marker still parsed", () => {
      const cits = extractCitations("2020 NY Slip Op 51234(U)").filter(
        (c): c is NeutralCitation => c.type === "neutral",
      )
      expect(cits).toHaveLength(1)
      expect(cits[0].documentNumber).toBe("51234")
      expect(cits[0].unpublished).toBe(true)
    })
  })
})
