/**
 * Tests for issue #634 — `(Macaluso)`, `(Privette)`, `(SeaBright)` and other
 * short-form case-name parentheticals (Bluebook Rule 10.9) being wrongly
 * routed to the `court` field for California citations.
 *
 * Root cause: `stripDateFromCourt` returned any letter-bearing token as a
 * "court". `(Macaluso)` survives the existing reject filters (no period,
 * but it's a single capitalized word — not a multi-word lowercase prose
 * paren and not a known signal-word lead-in), so it gets misclassified.
 *
 * Fix: reject a no-period parenthetical that doesn't carry a court signal
 * (period, jurisdiction word like "Cir."/"Ct."/"App.", common state token,
 * or known disposition phrase). A single Capitalized Word (or two)
 * starting with an uppercase letter and lacking any court signal is a
 * short-form case nickname, not a court.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"

/**
 * Helper: assert a one-citation input yields a case citation whose `court`
 * is undefined (not the short-form name) and whose other metadata
 * (volume/reporter/page) parsed correctly.
 */
function expectCourtUndefined(
  text: string,
  expected: { volume: number; reporter: string; page: number },
) {
  const cites = extractCitations(text)
  expect(cites.length).toBeGreaterThan(0)
  const c = cites[0]
  expect(c.type).toBe("case")
  if (c.type === "case") {
    expect(c.volume).toBe(expected.volume)
    expect(c.reporter).toBe(expected.reporter)
    expect(c.page).toBe(expected.page)
    expect(c.court).toBeUndefined()
  }
}

describe("issue #634 — Cal. parenthetical short-form names should not pollute court", () => {
  describe("documented reproductions (all 8 from issue)", () => {
    it("does not set court=Macaluso for 162 Cal.Rptr.3d 318 (Macaluso)", () => {
      expectCourtUndefined("162 Cal.Rptr.3d 318 (Macaluso)", {
        volume: 162,
        reporter: "Cal.Rptr.3d",
        page: 318,
      })
    })

    it("does not set court=Fox Johns for 162 Cal.Rptr.3d 571 (Fox Johns)", () => {
      expectCourtUndefined("162 Cal.Rptr.3d 571 (Fox Johns)", {
        volume: 162,
        reporter: "Cal.Rptr.3d",
        page: 571,
      })
    })

    it("does not set court=Privette for 5 Cal.4th 689 (Privette)", () => {
      expectCourtUndefined("5 Cal.4th 689 (Privette)", {
        volume: 5,
        reporter: "Cal.4th",
        page: 689,
      })
    })

    it("does not set court=Hooker for 27 Cal.4th 198 (Hooker)", () => {
      expectCourtUndefined("27 Cal.4th 198 (Hooker)", {
        volume: 27,
        reporter: "Cal.4th",
        page: 198,
      })
    })

    it("does not set court=Regalado for 3 Cal.App.5th 582 (Regalado)", () => {
      expectCourtUndefined("3 Cal.App.5th 582 (Regalado)", {
        volume: 3,
        reporter: "Cal.App.5th",
        page: 582,
      })
    })

    it("does not set court=SeaBright for 52 Cal.4th 590 (SeaBright)", () => {
      expectCourtUndefined("52 Cal.4th 590 (SeaBright)", {
        volume: 52,
        reporter: "Cal.4th",
        page: 590,
      })
    })

    it("does not set court=SeaBright for 129 Cal.Rptr.3d 601 (SeaBright)", () => {
      expectCourtUndefined("129 Cal.Rptr.3d 601 (SeaBright)", {
        volume: 129,
        reporter: "Cal.Rptr.3d",
        page: 601,
      })
    })

    it("does not set court=Regalado for 207 Cal.Rptr.3d 712 (Regalado)", () => {
      expectCourtUndefined("207 Cal.Rptr.3d 712 (Regalado)", {
        volume: 207,
        reporter: "Cal.Rptr.3d",
        page: 712,
      })
    })
  })

  describe("reporter coverage (Cal.4th / Cal.App.5th / Cal.Rptr.3d)", () => {
    it("Cal.4th + single-word nickname", () => {
      expectCourtUndefined("5 Cal.4th 689 (Privette)", {
        volume: 5,
        reporter: "Cal.4th",
        page: 689,
      })
    })

    it("Cal.App.5th + single-word nickname", () => {
      expectCourtUndefined("3 Cal.App.5th 582 (Regalado)", {
        volume: 3,
        reporter: "Cal.App.5th",
        page: 582,
      })
    })

    it("Cal.Rptr.3d + single-word nickname", () => {
      expectCourtUndefined("162 Cal.Rptr.3d 318 (Macaluso)", {
        volume: 162,
        reporter: "Cal.Rptr.3d",
        page: 318,
      })
    })
  })

  describe("single-word vs two-word short-form names", () => {
    it("single-word nickname (Privette)", () => {
      expectCourtUndefined("5 Cal.4th 689 (Privette)", {
        volume: 5,
        reporter: "Cal.4th",
        page: 689,
      })
    })

    it("two-word nickname (Fox Johns)", () => {
      expectCourtUndefined("162 Cal.Rptr.3d 571 (Fox Johns)", {
        volume: 162,
        reporter: "Cal.Rptr.3d",
        page: 571,
      })
    })

    it("camel-case nickname (SeaBright)", () => {
      expectCourtUndefined("52 Cal.4th 590 (SeaBright)", {
        volume: 52,
        reporter: "Cal.4th",
        page: 590,
      })
    })
  })

  describe("negative tests — legitimate court abbreviations still extract", () => {
    it("(9th Cir.) is still recognized as a court", () => {
      const cites = extractCitations("100 F.3d 200 (9th Cir.)")
      expect(cites).toHaveLength(1)
      const c = cites[0]
      expect(c.type).toBe("case")
      if (c.type === "case") {
        expect(c.court).toBe("9th Cir.")
      }
    })

    it("(9th Cir. 1990) preserves both court and year", () => {
      const cites = extractCitations("100 F.3d 200 (9th Cir. 1990)")
      expect(cites).toHaveLength(1)
      const c = cites[0]
      expect(c.type).toBe("case")
      if (c.type === "case") {
        expect(c.court).toBe("9th Cir.")
        expect(c.year).toBe(1990)
      }
    })

    it("(D. Mass. 2019) preserves both court and year", () => {
      const cites = extractCitations("350 F. Supp. 3d 100 (D. Mass. 2019)")
      expect(cites).toHaveLength(1)
      const c = cites[0]
      expect(c.type).toBe("case")
      if (c.type === "case") {
        expect(c.court).toBe("D. Mass.")
        expect(c.year).toBe(2019)
      }
    })

    it("(Cal. Ct. App.) is still recognized as a court", () => {
      const cites = extractCitations("100 Cal.Rptr.3d 100 (Cal. Ct. App. 2010)")
      expect(cites).toHaveLength(1)
      const c = cites[0]
      expect(c.type).toBe("case")
      if (c.type === "case") {
        expect(c.court).toBe("Cal. Ct. App.")
        expect(c.year).toBe(2010)
      }
    })

    it("(Ct. App.) — bare appellate abbreviation — is still recognized", () => {
      const cites = extractCitations("100 Cal.Rptr.3d 100 (Ct. App.)")
      expect(cites).toHaveLength(1)
      const c = cites[0]
      expect(c.type).toBe("case")
      if (c.type === "case") {
        expect(c.court).toBe("Ct. App.")
      }
    })

    it("(2d Cir. 2020) preserves both court and year", () => {
      const cites = extractCitations("500 F.2d 123 (2d Cir. 2020)")
      expect(cites).toHaveLength(1)
      const c = cites[0]
      expect(c.type).toBe("case")
      if (c.type === "case") {
        expect(c.court).toBe("2d Cir.")
        expect(c.year).toBe(2020)
      }
    })
  })

  describe("edge cases — name + year combined parens", () => {
    it("(Macaluso, 2013) extracts year but not court=Macaluso", () => {
      const cites = extractCitations("162 Cal.Rptr.3d 318 (Macaluso, 2013)")
      expect(cites.length).toBeGreaterThan(0)
      const c = cites[0]
      expect(c.type).toBe("case")
      if (c.type === "case") {
        expect(c.year).toBe(2013)
        // Macaluso is a short-form case nickname, NOT a court — must not pollute court field.
        expect(c.court).not.toBe("Macaluso")
        // California Reporter doesn't infer a backward-compat court string, so court is undefined here.
        // (For SCOTUS reporters there is a backward-compat "scotus" string, but not for Cal.)
      }
    })

    it("(Privette 2013) extracts year but not court=Privette", () => {
      const cites = extractCitations("5 Cal.4th 689 (Privette 2013)")
      expect(cites.length).toBeGreaterThan(0)
      const c = cites[0]
      expect(c.type).toBe("case")
      if (c.type === "case") {
        expect(c.year).toBe(2013)
        expect(c.court).not.toBe("Privette")
      }
    })
  })

  describe("regression — Cal reporter still infers court level/jurisdiction from reporter map", () => {
    it("Cal.4th still infers state-supreme jurisdiction via inferredCourt", () => {
      const cites = extractCitations("5 Cal.4th 689 (Privette)")
      expect(cites.length).toBeGreaterThan(0)
      const c = cites[0]
      if (c.type === "case") {
        // Reporter-based inference should still produce inferredCourt (level + jurisdiction)
        // even though the parenthetical (Privette) is rejected as a court abbreviation.
        expect(c.inferredCourt).toEqual({
          level: "supreme",
          jurisdiction: "state",
          state: "CA",
          confidence: 1.0,
        })
      }
    })

    it("Cal.App.5th still infers state-appellate jurisdiction via inferredCourt", () => {
      const cites = extractCitations("3 Cal.App.5th 582 (Regalado)")
      expect(cites.length).toBeGreaterThan(0)
      const c = cites[0]
      if (c.type === "case") {
        expect(c.inferredCourt).toEqual({
          level: "appellate",
          jurisdiction: "state",
          state: "CA",
          confidence: 1.0,
        })
      }
    })
  })
})
