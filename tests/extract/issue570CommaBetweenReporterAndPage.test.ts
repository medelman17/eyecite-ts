/**
 * Issue #570 — `<vol> <Reporter>, <page>` form misses every cite.
 *
 * Old typesetting (and OCR over old volumes) inserts a comma between the
 * reporter and the page: `3 Den., 594`, `252 S. W., 20`, `26 N. Y., 279`,
 * `19 Barb., 341`, `217 Ill. App., 427`, `125 N. E., 793`.
 *
 * Pre-fix every probe returned 0 citations. Sample-judge measured this as
 * 70% of misses across a 300-opinion sample.
 *
 * Root cause: the federal / SCOTUS / state-reporter regexes in
 * `src/patterns/casePatterns.ts` required `\s+` between reporter and page.
 * Fix: relax to `\s*,?\s+` so the comma form is admitted alongside the
 * canonical whitespace form.
 *
 * The intent of this fix is "match the cite even when an extra comma is
 * present". Volume / reporter / page metadata should be identical to the
 * non-comma form; the literal `text` / `matchedText` carries the comma
 * because the page span itself starts at the digit.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"

const findCase = (text: string): FullCaseCitation | undefined =>
  extractCitations(text).find((c) => c.type === "case") as
    | FullCaseCitation
    | undefined

describe("issue #570 — comma between reporter and page", () => {
  describe("state reporters (Den., Barb., Wend., Johns., Hill, A., Denio, S.C., W.Va.,)", () => {
    it.each([
      ["3 Den., 594", 3, "Den.", 594],
      ["19 Barb., 341", 19, "Barb.", 341],
      ["12 Wend., 100", 12, "Wend.", 100],
      ["5 Johns., 200", 5, "Johns.", 200],
      ["1 Hill, 50", 1, "Hill", 50],
      ["7 A., 300", 7, "A.", 300],
      ["4 Denio, 75", 4, "Denio", 75],
      ["10 Mass., 400", 10, "Mass.", 400],
      ["8 Tenn., 250", 8, "Tenn.", 250],
    ])(
      "extracts %s as one full case citation",
      (cite, volume, reporter, page) => {
        const c = findCase(`See ${cite}.`)
        expect(c, `expected case for "${cite}"`).toBeDefined()
        expect(c!.volume).toBe(volume)
        expect(c!.reporter).toBe(reporter)
        expect(c!.page).toBe(page)
      },
    )
  })

  describe("multi-word state reporters with internal periods", () => {
    it.each([
      ["252 S. W., 20", 252, "S.W.", 20], // after normalizeReporterSpacing
      ["125 N. E., 793", 125, "N.E.", 793],
      ["217 Ill. App., 427", 217, "Ill. App.", 427],
      ["33 Ill. App. 2d, 100", 33, "Ill. App. 2d", 100],
      ["26 N. Y., 279", 26, "N. Y.", 279],
      ["44 Ohio St., 150", 44, "Ohio St.", 150],
      ["12 S. E., 90", 12, "S.E.", 90],
      ["6 Ind. App., 220", 6, "Ind. App.", 220],
      ["55 W. Va., 80", 55, "W. Va.", 80],
    ])(
      "extracts %s as one full case citation",
      (cite, volume, reporter, page) => {
        const c = findCase(`See ${cite}.`)
        expect(c, `expected case for "${cite}"`).toBeDefined()
        expect(c!.volume).toBe(volume)
        expect(c!.reporter).toBe(reporter)
        expect(c!.page).toBe(page)
      },
    )
  })

  describe("federal reporters with the comma form", () => {
    it.each([
      ["500 F., 100", 500, "F.", 100],
      ["725 F. 2d, 1091", 725, "F.2d", 1091],
      ["410 F. Supp., 200", 410, "F.Supp.", 200],
    ])(
      "extracts %s as one full case citation",
      (cite, volume, reporter, page) => {
        const c = findCase(`See ${cite}.`)
        expect(c, `expected case for "${cite}"`).toBeDefined()
        expect(c!.volume).toBe(volume)
        expect(c!.reporter).toBe(reporter)
        expect(c!.page).toBe(page)
      },
    )
  })

  describe("SCOTUS reporters with the comma form", () => {
    it.each([
      ["100 U. S., 50", 100, "U.S.", 50],
      ["80 S. Ct., 200", 80, "S.Ct.", 200],
      ["120 L. Ed. 2d, 300", 120, "L.Ed.2d", 300],
    ])(
      "extracts %s as one full case citation",
      (cite, volume, reporter, page) => {
        const c = findCase(`See ${cite}.`)
        expect(c, `expected case for "${cite}"`).toBeDefined()
        expect(c!.volume).toBe(volume)
        expect(c!.reporter).toBe(reporter)
        expect(c!.page).toBe(page)
      },
    )
  })

  describe("the comma form does not produce two citations", () => {
    it("does not double-count `3 Den., 594`", () => {
      const cs = extractCitations("See 3 Den., 594.")
      const cases = cs.filter((c) => c.type === "case")
      expect(cases.length).toBe(1)
    })
  })

  describe("regression: existing whitespace-only forms still extract", () => {
    it.each([
      ["3 Den. 594", 3, "Den.", 594],
      ["500 F.2d 123", 500, "F.2d", 123],
      ["410 U.S. 113", 410, "U.S.", 113],
    ])("still extracts %s", (cite, volume, reporter, page) => {
      const c = findCase(`See ${cite}.`)
      expect(c).toBeDefined()
      expect(c!.volume).toBe(volume)
      expect(c!.reporter).toBe(reporter)
      expect(c!.page).toBe(page)
    })
  })
})
