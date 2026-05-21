/**
 * Issue #639 — multi-page pincite (`vol Rep. page, pincite`) and range
 * pincites in short-form citations.
 *
 * Two distinct sub-bugs:
 * 1. Range/dual pincite in short-form: `at 1025, 1027` should capture both.
 * 2. Page-vs-pincite conflation in full-form: `103 Tenn. 184, 216` — `184` is
 *    the start page, `216` is the pincite.
 * 3. Statutes at Large `100 Stat. 3743, 3755` — second number is the pincite.
 * 4. Explanatory parenthetical leak for statutes:
 *    `ORS 161.085(2) ("voluntary act"...)` — only `(2)` belongs in subsection
 *    /pincite; the explanatory paren is a separate `parenthetical` field.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "../../src"

describe("issue #639: multi-page pincite", () => {
  describe("full-form case: `vol Rep. page, pincite` (second number is pincite)", () => {
    it("`103 Tenn. 184, 216` → page=184, pincite=216", () => {
      const cites = extractCitations("See 103 Tenn. 184, 216.")
      const caseCite = cites.find((c) => c.type === "case")
      expect(caseCite).toBeDefined()
      if (caseCite?.type === "case") {
        expect(caseCite.page).toBe(184)
        expect(caseCite.pincite).toBe(216)
        expect(caseCite.pinciteInfo?.page).toBe(216)
        expect(caseCite.pinciteInfo?.isRange).toBe(false)
      }
    })

    it("`67 Am. Dec. 437, 441` → page=437, pincite=441", () => {
      const cites = extractCitations("See 67 Am. Dec. 437, 441.")
      const caseCite = cites.find((c) => c.type === "case")
      expect(caseCite).toBeDefined()
      if (caseCite?.type === "case") {
        expect(caseCite.page).toBe(437)
        expect(caseCite.pincite).toBe(441)
      }
    })

    it("`5 Tenn. App. 619, 625` → page=619, pincite=625", () => {
      const cites = extractCitations("See 5 Tenn. App. 619, 625.")
      const caseCite = cites.find((c) => c.type === "case")
      expect(caseCite).toBeDefined()
      if (caseCite?.type === "case") {
        expect(caseCite.page).toBe(619)
        expect(caseCite.pincite).toBe(625)
      }
    })

    it.each([
      ["410 U.S. 113, 125 (1973)", 410, "U.S.", 113, 125],
      ["909 F.2d 1025, 1027", 909, "F.2d", 1025, 1027],
      ["500 F.3d 100, 105", 500, "F.3d", 100, 105],
      // F. Supp. variants get whitespace normalized away during cleaning.
      ["100 F. Supp. 2d 200, 220", 100, "F.Supp.2d", 200, 220],
      ["50 F. Supp. 3d 75, 85", 50, "F.Supp.3d", 75, 85],
    ])("`%s` → page=%d, pincite=%d", (text, volume, reporter, page, pincite) => {
      const cites = extractCitations(`See ${text}.`)
      const caseCite = cites.find((c) => c.type === "case")
      expect(caseCite).toBeDefined()
      if (caseCite?.type === "case") {
        expect(caseCite.volume).toBe(volume)
        expect(caseCite.reporter).toBe(reporter)
        expect(caseCite.page).toBe(page)
        expect(caseCite.pincite).toBe(pincite)
      }
    })

    it.each([
      ["50 Cal. 4th 100, 110", 100, 110],
      ["40 N.Y.2d 200, 215", 200, 215],
    ])("state reporter `%s` page+pincite (page=%d, pincite=%d)", (text, page, pincite) => {
      const cites = extractCitations(`See ${text}.`)
      const caseCite = cites.find((c) => c.type === "case")
      expect(caseCite).toBeDefined()
      if (caseCite?.type === "case") {
        expect(caseCite.page).toBe(page)
        expect(caseCite.pincite).toBe(pincite)
      }
    })

    it("range pincite: `500 F.2d 123, 125-27` → pincite=125, endPage=127", () => {
      const cites = extractCitations("See 500 F.2d 123, 125-27.")
      const caseCite = cites.find((c) => c.type === "case")
      expect(caseCite).toBeDefined()
      if (caseCite?.type === "case") {
        expect(caseCite.page).toBe(123)
        expect(caseCite.pinciteInfo?.page).toBe(125)
        expect(caseCite.pinciteInfo?.endPage).toBe(127)
        expect(caseCite.pinciteInfo?.isRange).toBe(true)
      }
    })

    it("dual pincite chain: `410 U.S. 113, 115, 153` → pincite=115, additional=[153]", () => {
      const cites = extractCitations("See 410 U.S. 113, 115, 153.")
      const caseCite = cites.find((c) => c.type === "case")
      expect(caseCite).toBeDefined()
      if (caseCite?.type === "case") {
        expect(caseCite.page).toBe(113)
        expect(caseCite.pinciteInfo?.page).toBe(115)
        expect(caseCite.pinciteInfo?.additionalPincites).toHaveLength(1)
        expect(caseCite.pinciteInfo?.additionalPincites?.[0]?.page).toBe(153)
      }
    })

    it("triple pincite: `500 F.2d 123, 125, 127, 129`", () => {
      const cites = extractCitations("See 500 F.2d 123, 125, 127, 129.")
      const caseCite = cites.find((c) => c.type === "case")
      expect(caseCite).toBeDefined()
      if (caseCite?.type === "case") {
        expect(caseCite.page).toBe(123)
        expect(caseCite.pinciteInfo?.page).toBe(125)
        expect(caseCite.pinciteInfo?.additionalPincites?.map((p) => p.page)).toEqual([127, 129])
      }
    })

    it("regression — single-page citation unchanged: `500 F.2d 123` (no pincite)", () => {
      const cites = extractCitations("See 500 F.2d 123 (3d Cir. 1990).")
      const caseCite = cites.find((c) => c.type === "case")
      expect(caseCite).toBeDefined()
      if (caseCite?.type === "case") {
        expect(caseCite.page).toBe(123)
        expect(caseCite.pincite).toBeUndefined()
      }
    })

    it("regression — single-page with year unchanged: `410 U.S. 113 (1973)`", () => {
      const cites = extractCitations("See 410 U.S. 113 (1973).")
      const caseCite = cites.find((c) => c.type === "case")
      expect(caseCite).toBeDefined()
      if (caseCite?.type === "case") {
        expect(caseCite.page).toBe(113)
        expect(caseCite.pincite).toBeUndefined()
        expect(caseCite.year).toBe(1973)
      }
    })
  })

  describe("short-form `at` form: `vol Rep. at p1, p2` (both are pincites)", () => {
    it("`909 F.2d at 1025, 1027` → primary=1025, additional=[1027]", () => {
      // Provide a preceding full citation so the short-form has an antecedent
      // (otherwise short-form might be filtered as floating).
      const text =
        "See Smith v. Jones, 909 F.2d 1000 (3d Cir. 1990). The court further held, 909 F.2d at 1025, 1027."
      const cites = extractCitations(text, { resolve: true })
      const shortform = cites.find((c) => c.type === "shortFormCase")
      expect(shortform).toBeDefined()
      if (shortform?.type === "shortFormCase") {
        expect(shortform.pincite).toBe(1025)
        expect(shortform.pinciteInfo?.page).toBe(1025)
        expect(shortform.pinciteInfo?.additionalPincites).toHaveLength(1)
        expect(shortform.pinciteInfo?.additionalPincites?.[0]?.page).toBe(1027)
      }
    })

    it("`500 F.2d at 125, 127, 130` → primary=125, additional=[127, 130]", () => {
      const text =
        "See Smith v. Jones, 500 F.2d 100 (3d Cir. 1990). The court explained, 500 F.2d at 125, 127, 130."
      const cites = extractCitations(text, { resolve: true })
      const shortform = cites.find((c) => c.type === "shortFormCase")
      expect(shortform).toBeDefined()
      if (shortform?.type === "shortFormCase") {
        expect(shortform.pincite).toBe(125)
        expect(shortform.pinciteInfo?.additionalPincites?.map((p) => p.page)).toEqual([127, 130])
      }
    })

    it("regression — single pincite short-form unchanged: `500 F.2d at 125`", () => {
      const text = "See Smith v. Jones, 500 F.2d 100 (3d Cir. 1990). Smith, 500 F.2d at 125."
      const cites = extractCitations(text, { resolve: true })
      const shortform = cites.find((c) => c.type === "shortFormCase")
      expect(shortform).toBeDefined()
      if (shortform?.type === "shortFormCase") {
        expect(shortform.pincite).toBe(125)
        expect(shortform.pinciteInfo?.additionalPincites).toBeUndefined()
      }
    })

    it("range pincite short-form still parses: `500 F.2d at 125-27`", () => {
      const text = "See Smith v. Jones, 500 F.2d 100 (3d Cir. 1990). Smith, 500 F.2d at 125-27."
      const cites = extractCitations(text, { resolve: true })
      const shortform = cites.find((c) => c.type === "shortFormCase")
      expect(shortform).toBeDefined()
      if (shortform?.type === "shortFormCase") {
        expect(shortform.pinciteInfo?.page).toBe(125)
        expect(shortform.pinciteInfo?.endPage).toBe(127)
        expect(shortform.pinciteInfo?.isRange).toBe(true)
      }
    })

    it("range then continuation: `500 F.2d at 125-27, 130`", () => {
      const text =
        "See Smith v. Jones, 500 F.2d 100 (3d Cir. 1990). Smith, 500 F.2d at 125-27, 130."
      const cites = extractCitations(text, { resolve: true })
      const shortform = cites.find((c) => c.type === "shortFormCase")
      expect(shortform).toBeDefined()
      if (shortform?.type === "shortFormCase") {
        expect(shortform.pinciteInfo?.page).toBe(125)
        expect(shortform.pinciteInfo?.endPage).toBe(127)
        expect(shortform.pinciteInfo?.additionalPincites?.[0]?.page).toBe(130)
      }
    })
  })

  describe("Statutes at Large: `vol Stat. page, pincite`", () => {
    it("`100 Stat. 3743, 3755` → page=3743, pincite=3755", () => {
      const cites = extractCitations("See 100 Stat. 3743, 3755.")
      const stat = cites.find((c) => c.type === "statutesAtLarge")
      expect(stat).toBeDefined()
      if (stat?.type === "statutesAtLarge") {
        expect(stat.volume).toBe(100)
        expect(stat.page).toBe(3743)
        expect(stat.pincite).toBe(3755)
      }
    })

    it("`103 Stat. 2106, 2289` → page=2106, pincite=2289", () => {
      const cites = extractCitations("See 103 Stat. 2106, 2289.")
      const stat = cites.find((c) => c.type === "statutesAtLarge")
      expect(stat).toBeDefined()
      if (stat?.type === "statutesAtLarge") {
        expect(stat.volume).toBe(103)
        expect(stat.page).toBe(2106)
        expect(stat.pincite).toBe(2289)
      }
    })

    it("`124 Stat. 119, 125 (2010)` → page=119, pincite=125, year=2010", () => {
      const cites = extractCitations("See 124 Stat. 119, 125 (2010).")
      const stat = cites.find((c) => c.type === "statutesAtLarge")
      expect(stat).toBeDefined()
      if (stat?.type === "statutesAtLarge") {
        expect(stat.page).toBe(119)
        expect(stat.pincite).toBe(125)
        expect(stat.year).toBe(2010)
      }
    })

    it("range pincite: `100 Stat. 3743, 3755-58`", () => {
      const cites = extractCitations("See 100 Stat. 3743, 3755-58.")
      const stat = cites.find((c) => c.type === "statutesAtLarge")
      expect(stat).toBeDefined()
      if (stat?.type === "statutesAtLarge") {
        expect(stat.page).toBe(3743)
        expect(stat.pincite).toBe(3755)
      }
    })

    it("regression — single-page Stat. citation unchanged: `124 Stat. 119`", () => {
      const cites = extractCitations("See 124 Stat. 119 (2010).")
      const stat = cites.find((c) => c.type === "statutesAtLarge")
      expect(stat).toBeDefined()
      if (stat?.type === "statutesAtLarge") {
        expect(stat.page).toBe(119)
        expect(stat.pincite).toBeUndefined()
      }
    })
  })

  describe("statute explanatory parenthetical (not subsection)", () => {
    it('`ORS 161.085(2) ("voluntary act" defined)` → subsection=(2), parenthetical=quoted text', () => {
      const cites = extractCitations('See ORS 161.085(2) ("voluntary act" defined).')
      const statute = cites.find((c) => c.type === "statute")
      expect(statute).toBeDefined()
      if (statute?.type === "statute") {
        expect(statute.code).toBe("ORS")
        expect(statute.section).toBe("161.085")
        expect(statute.subsection).toBe("(2)")
        expect(statute.pincite).toBe("(2)")
      }
    })

    it("`ORS 161.085(2) (defining voluntary act)` → subsection=(2), parenthetical absent from subsection", () => {
      const cites = extractCitations("See ORS 161.085(2) (defining voluntary act).")
      const statute = cites.find((c) => c.type === "statute")
      expect(statute).toBeDefined()
      if (statute?.type === "statute") {
        expect(statute.code).toBe("ORS")
        expect(statute.section).toBe("161.085")
        expect(statute.subsection).toBe("(2)")
        // The explanatory paren must not appear in subsection.
        expect(statute.subsection).not.toContain("defining")
        expect(statute.subsection).not.toContain("voluntary")
      }
    })

    it("regression — `ORS 161.085(2)` (no trailing paren) still parses", () => {
      const cites = extractCitations("See ORS 161.085(2).")
      const statute = cites.find((c) => c.type === "statute")
      expect(statute).toBeDefined()
      if (statute?.type === "statute") {
        expect(statute.code).toBe("ORS")
        expect(statute.section).toBe("161.085")
        expect(statute.subsection).toBe("(2)")
      }
    })

    it("regression — `ORS 161.085(2)(a)` (chained subsections) still parses", () => {
      const cites = extractCitations("See ORS 161.085(2)(a).")
      const statute = cites.find((c) => c.type === "statute")
      expect(statute).toBeDefined()
      if (statute?.type === "statute") {
        expect(statute.code).toBe("ORS")
        expect(statute.section).toBe("161.085")
        expect(statute.subsection).toBe("(2)(a)")
      }
    })

    it("regression — `42 U.S.C. § 1983 (1976)` (year paren) still parses with year, not subsection", () => {
      const cites = extractCitations("See 42 U.S.C. § 1983 (1976).")
      const statute = cites.find((c) => c.type === "statute")
      expect(statute).toBeDefined()
      if (statute?.type === "statute") {
        expect(statute.section).toBe("1983")
        // Year paren is `(1976)` — should not be in subsection.
        expect(statute.subsection).toBeUndefined()
        expect(statute.year).toBe(1976)
      }
    })
  })

  describe("integration — all repro cases from issue #639", () => {
    it.each([
      [
        "See 909 F.2d 1025, 1027.",
        "case",
        { page: 1025, pincite: 1027 } as Record<string, unknown>,
      ],
      [
        "See 100 Stat. 3743, 3755.",
        "statutesAtLarge",
        { page: 3743, pincite: 3755 } as Record<string, unknown>,
      ],
      [
        "See 103 Stat. 2106, 2289.",
        "statutesAtLarge",
        { page: 2106, pincite: 2289 } as Record<string, unknown>,
      ],
      ["See 103 Tenn. 184, 216.", "case", { page: 184, pincite: 216 } as Record<string, unknown>],
      ["See 67 Am. Dec. 437, 441.", "case", { page: 437, pincite: 441 } as Record<string, unknown>],
      [
        "See 5 Tenn. App. 619, 625.",
        "case",
        { page: 619, pincite: 625 } as Record<string, unknown>,
      ],
    ])("`%s` extracts %s with expected page/pincite", (text, type, expected) => {
      const cites = extractCitations(text)
      const target = cites.find((c) => c.type === type)
      expect(target, `expected ${type} cite for: ${text}`).toBeDefined()
      if (target) {
        const fields = target as Record<string, unknown>
        for (const [key, value] of Object.entries(expected)) {
          expect(fields[key]).toBe(value)
        }
      }
    })
  })
})
