import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { NeutralCitation } from "@/types/citation"

/**
 * State LEXIS variants (#228) — the existing `lexis` pattern in
 * `neutralPatterns.ts` is hard-coded for federal courts only:
 *
 *   /\b(\d{4})\s+U\.S\.(?:\s+(?:App|Dist)\.)?\s+LEXIS\s+(\d+)\b/g
 *
 * State LEXIS forms (`Cal. LEXIS`, `Tex. App. LEXIS`, `N.Y. Misc. LEXIS`,
 * `Ill. App. LEXIS`, etc.) are not recognized as neutral citations. The
 * broad state-reporter fallback catches them as weak `case` matches with
 * no court/year/documentNumber populated. Generalizing the LEXIS regex
 * to accept any court-abbreviation prefix is the fix.
 */
describe("state LEXIS variants (#228)", () => {
  describe("California LEXIS", () => {
    it("extracts '2020 Cal. LEXIS 1000'", () => {
      const cits = extractCitations("Smith v. Jones, 2020 Cal. LEXIS 1000.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2020)
      expect(neutrals[0].court).toBe("Cal. LEXIS")
      expect(neutrals[0].documentNumber).toBe("1000")
    })

    it("extracts '2019 Cal. App. LEXIS 250' (court of appeal)", () => {
      const cits = extractCitations("See 2019 Cal. App. LEXIS 250.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2019)
      expect(neutrals[0].court).toBe("Cal. App. LEXIS")
      expect(neutrals[0].documentNumber).toBe("250")
    })
  })

  describe("Texas LEXIS", () => {
    it("extracts '2020 Tex. App. LEXIS 5000'", () => {
      const cits = extractCitations("Brown v. State, 2020 Tex. App. LEXIS 5000.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2020)
      expect(neutrals[0].court).toBe("Tex. App. LEXIS")
      expect(neutrals[0].documentNumber).toBe("5000")
    })

    it("extracts '2022 Tex. LEXIS 750' (Texas Supreme Court)", () => {
      const cits = extractCitations("See 2022 Tex. LEXIS 750.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2022)
      expect(neutrals[0].court).toBe("Tex. LEXIS")
      expect(neutrals[0].documentNumber).toBe("750")
    })
  })

  describe("New York LEXIS", () => {
    it("extracts '2020 N.Y. Misc. LEXIS 500'", () => {
      const cits = extractCitations("Doe v. Roe, 2020 N.Y. Misc. LEXIS 500.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2020)
      expect(neutrals[0].court).toBe("N.Y. Misc. LEXIS")
      expect(neutrals[0].documentNumber).toBe("500")
    })

    it("extracts '2021 N.Y. App. Div. LEXIS 800'", () => {
      const cits = extractCitations("See 2021 N.Y. App. Div. LEXIS 800.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2021)
      expect(neutrals[0].court).toBe("N.Y. App. Div. LEXIS")
      expect(neutrals[0].documentNumber).toBe("800")
    })
  })

  describe("Illinois LEXIS", () => {
    it("extracts '2024 Ill. App. LEXIS 100'", () => {
      const cits = extractCitations("Smith v. Jones, 2024 Ill. App. LEXIS 100.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2024)
      expect(neutrals[0].court).toBe("Ill. App. LEXIS")
      expect(neutrals[0].documentNumber).toBe("100")
    })
  })

  describe("other state LEXIS variants (high-corpus jurisdictions)", () => {
    it("extracts '2020 Fla. LEXIS 1500'", () => {
      const cits = extractCitations("See 2020 Fla. LEXIS 1500.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("Fla. LEXIS")
    })

    it("extracts '2021 Ohio LEXIS 250'", () => {
      const cits = extractCitations("See 2021 Ohio LEXIS 250.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("Ohio LEXIS")
    })

    it("extracts '2023 Pa. Super. LEXIS 90'", () => {
      const cits = extractCitations("See 2023 Pa. Super. LEXIS 90.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("Pa. Super. LEXIS")
    })
  })

  describe("regression — federal LEXIS still works", () => {
    it("extracts '2021 U.S. LEXIS 5000' (SCOTUS)", () => {
      const cits = extractCitations("Smith v. Jones, 2021 U.S. LEXIS 5000.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2021)
      expect(neutrals[0].court).toBe("U.S. LEXIS")
      expect(neutrals[0].documentNumber).toBe("5000")
    })

    it("extracts '2021 U.S. App. LEXIS 12345' (circuit court)", () => {
      const cits = extractCitations("Smith v. Jones, 2021 U.S. App. LEXIS 12345.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("U.S. App. LEXIS")
    })

    it("extracts '2021 U.S. Dist. LEXIS 67890' (district court)", () => {
      const cits = extractCitations("Smith v. Jones, 2021 U.S. Dist. LEXIS 67890.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("U.S. Dist. LEXIS")
    })
  })
})
