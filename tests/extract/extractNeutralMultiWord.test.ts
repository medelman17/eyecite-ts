import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { NeutralCitation } from "@/types/citation"

/**
 * Multi-word neutral court designations (#230). The existing
 * `state-vendor-neutral` regex caps the court at `[A-Z]{2}(?:\s+App\.?)?`,
 * so Illinois's paren-district form (`IL App (1st)`, `IL App (2d)`) and
 * Oklahoma's three-token forms (`OK CIV APP`, `OK CR`, `OK AG`) silently
 * fail to extract. Illinois Rule 23 unpublished decisions add a `-U` suffix
 * on the document number that the current extractor cannot parse.
 */
describe("multi-word neutral court designations (#230)", () => {
  describe("Illinois — IL App with district parenthetical", () => {
    it("extracts '2011 IL App (1st) 101234'", () => {
      const cits = extractCitations("People v. Doe, 2011 IL App (1st) 101234.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2011)
      expect(neutrals[0].court).toBe("IL App (1st)")
      expect(neutrals[0].documentNumber).toBe("101234")
      expect(neutrals[0].unpublished).toBeFalsy()
    })

    it("extracts '2020 IL App (2d) 190123' (Bluebook 2d form)", () => {
      const cits = extractCitations("See 2020 IL App (2d) 190123.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("IL App (2d)")
      expect(neutrals[0].documentNumber).toBe("190123")
    })

    it("extracts '2019 IL App (3d) 170567'", () => {
      const cits = extractCitations("See 2019 IL App (3d) 170567.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("IL App (3d)")
    })

    it("extracts '2022 IL App (4th) 210888'", () => {
      const cits = extractCitations("See 2022 IL App (4th) 210888.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("IL App (4th)")
    })

    it("extracts '2024 IL App (5th) 230445'", () => {
      const cits = extractCitations("See 2024 IL App (5th) 230445.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("IL App (5th)")
    })

    it("extracts '2020 IL App (2d) 190123-U' with unpublished=true", () => {
      const cits = extractCitations("See 2020 IL App (2d) 190123-U.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("IL App (2d)")
      expect(neutrals[0].documentNumber).toBe("190123")
      expect(neutrals[0].unpublished).toBe(true)
    })
  })

  describe("Oklahoma — multi-word forms", () => {
    it("extracts '2020 OK CIV APP 67' (Civil Court of Appeals)", () => {
      const cits = extractCitations("Stewart v. Gonzalez, 2020 OK CIV APP 67.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2020)
      expect(neutrals[0].court).toBe("OK CIV APP")
      expect(neutrals[0].documentNumber).toBe("67")
    })

    it("extracts '2019 OK CR 1' (Court of Criminal Appeals)", () => {
      const cits = extractCitations("State v. Smith, 2019 OK CR 1.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].year).toBe(2019)
      expect(neutrals[0].court).toBe("OK CR")
      expect(neutrals[0].documentNumber).toBe("1")
    })

    it("extracts '2024 OK AG 5' (Attorney General opinions)", () => {
      const cits = extractCitations("See 2024 OK AG 5.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("OK AG")
      expect(neutrals[0].documentNumber).toBe("5")
    })

    it("extracts bare '2020 OK 25' (Oklahoma Supreme Court, single-word fallback)", () => {
      const cits = extractCitations("See 2020 OK 25.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("OK")
      expect(neutrals[0].documentNumber).toBe("25")
    })
  })

  describe("regression — existing single-word and App-suffixed forms", () => {
    it("extracts '2013 IL 112116' (bare IL, no App)", () => {
      const cits = extractCitations("People v. Smith, 2013 IL 112116.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("IL")
      expect(neutrals[0].documentNumber).toBe("112116")
    })

    it("extracts '2007 UT 49'", () => {
      const cits = extractCitations("Brown v. Bd. of Educ., 2007 UT 49.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("UT")
    })

    it("extracts '2017 WI 17'", () => {
      const cits = extractCitations("State v. Avila, 2017 WI 17.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("WI")
    })

    it("extracts '2024-Ohio-764' (hyphenated, from #233)", () => {
      const cits = extractCitations("Smith v. Ohio State Univ., 2024-Ohio-764.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].court).toBe("Ohio")
      expect(neutrals[0].unpublished).toBeFalsy()
    })

    it("extracts '2021 U.S. App. LEXIS 12345' (LEXIS, from #228)", () => {
      const cits = extractCitations("See 2021 U.S. App. LEXIS 12345.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      // LEXIS variants are database identifiers, not courts (#294)
      expect(neutrals[0].database).toBe("U.S. App. LEXIS")
      expect(neutrals[0].court).toBeUndefined()
    })
  })
})
