/**
 * Issue #572 — `Black.` extracted as Blackford (Indiana) in SCOTUS context.
 *
 * Two reporters share this abbreviation:
 *   - `Black`   — Black's Supreme Court Reports (SCOTUS, 1861-1862)
 *   - `Blackf.` — Indiana Reports, Blackford (1817-1847)
 *
 * The literal `Black.` (with trailing period) is listed in reporters-db
 * as a variation of `Blackf.`, so every input citation `<vol> Black. <page>`
 * normalizes to `Blackf.` — even when surrounded by SCOTUS context like
 * `Dred Scott v. Sandford, 1 Black. 219 (U.S. 1862)`.
 *
 * Fix shape (option b in the issue, the cleanest default-by-era heuristic):
 * when the captured reporter literal is `Black.` (case-insensitive), and a
 * parsed year falls inside the SCOTUS `Black` reporter window
 * [1861, 1862] (inclusive), prefer `Black` over `Blackf.` as the
 * normalizedReporter. Otherwise — no year, or year outside that window —
 * stay with the existing `Blackf.` default. The literal `reporter` field
 * is preserved verbatim so the user-visible match is unchanged.
 *
 * This is a deliberately narrow disambiguation. It only fires on the
 * `Black.` literal (so `Blackf.` direct inputs are unaffected), only
 * shifts the normalized form (not the raw reporter), and only when the
 * year evidence is unambiguous.
 */

import { beforeAll, describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import { loadReporters } from "@/data/reporters"
import type { FullCaseCitation } from "@/types/citation"

const findCase = (text: string): FullCaseCitation | undefined =>
  extractCitations(text).find((c) => c.type === "case") as
    | FullCaseCitation
    | undefined

describe("issue #572 — `Black.` SCOTUS-vs-Blackford era disambiguation", () => {
  beforeAll(async () => {
    await loadReporters()
  })

  describe("SCOTUS era (1861-1862): `Black.` resolves to `Black`", () => {
    it.each([
      ["Dred Scott v. Sandford, 1 Black. 219 (U.S. 1862).", 1862],
      ["Ex parte Milligan, 2 Black. 794 (U.S. 1862).", 1862],
      ["1 Black. 363 (1861).", 1861],
      ["Smith v. Jones, 2 Black. 100 (1861).", 1861],
    ])("%s → normalizedReporter=Black", (text, expectedYear) => {
      const c = findCase(text)
      expect(c, `expected case for: ${text}`).toBeDefined()
      expect(c!.year).toBe(expectedYear)
      // Literal reporter capture is preserved verbatim.
      expect(c!.reporter).toBe("Black.")
      // Era heuristic kicks in: SCOTUS `Black` wins over Indiana `Blackf.`.
      expect(c!.normalizedReporter).toBe("Black")
    })
  })

  describe("Indiana era: `Black.` resolves to `Blackf.`", () => {
    it.each([
      ["Smith v. Jones, 5 Black. 100 (Ind. 1840).", 1840],
      ["1 Black. 50 (1820).", 1820],
      ["Doe v. Roe, 2 Black. 75 (1847).", 1847],
      // Edge: year falls AFTER the SCOTUS `Black` window — stays Indiana.
      ["3 Black. 100 (1870).", 1870],
      // Edge: year falls BEFORE the SCOTUS `Black` window — stays Indiana.
      ["3 Black. 100 (1860).", 1860],
    ])("%s → normalizedReporter=Blackf.", (text, expectedYear) => {
      const c = findCase(text)
      expect(c, `expected case for: ${text}`).toBeDefined()
      expect(c!.year).toBe(expectedYear)
      expect(c!.reporter).toBe("Black.")
      expect(c!.normalizedReporter).toBe("Blackf.")
    })
  })

  describe("No year available: era heuristic does not fire — defaults to Blackf.", () => {
    it.each([
      ["See 1 Black. 219.", "Blackf."],
      ["1 Black. 50", "Blackf."],
    ])("%s → normalizedReporter=Blackf. (default)", (text, normalized) => {
      const c = findCase(text)
      expect(c, `expected case for: ${text}`).toBeDefined()
      expect(c!.year).toBeUndefined()
      expect(c!.reporter).toBe("Black.")
      expect(c!.normalizedReporter).toBe(normalized)
    })
  })

  describe("Direct `Blackf.` inputs are not affected by the heuristic", () => {
    it.each([
      ["Smith v. Jones, 5 Blackf. 100 (Ind. 1840).", "Blackf.", "Blackf."],
      ["3 Blackf. 200 (1830).", "Blackf.", "Blackf."],
      // Even with a SCOTUS-era year, an unambiguous `Blackf.` input stays
      // pointed at Indiana — the heuristic ONLY fires on the `Black.`
      // literal where variation disambiguation is actually needed.
      ["1 Blackf. 219 (1862).", "Blackf.", "Blackf."],
    ])(
      "%s → reporter=%s normalizedReporter=%s",
      (text, raw, normalized) => {
        const c = findCase(text)
        expect(c, `expected case for: ${text}`).toBeDefined()
        expect(c!.reporter).toBe(raw)
        expect(c!.normalizedReporter).toBe(normalized)
      },
    )
  })
})
