/**
 * Tests for issue #555: Reporter DB not auto-loaded — ~50% of case citations
 * miss the +0.3 confidence boost because `COMMON_REPORTERS` lacked the
 * canonical space-less forms (`S.Ct.`, `L.Ed.2d`) and common state reporters
 * (`Mass.`, `Va.`, `Pa.`, `Idaho`, `Cal.4th`, `Cal.Rptr.2d`).
 *
 * Two bugs compounded:
 *   1. `cleaners.normalizeReporterSpacing` always collapses inner spaces
 *      (`S. Ct.` → `S.Ct.`, `L. Ed. 2d` → `L.Ed.2d`, `F. Supp. 2d`
 *      → `F.Supp.2d`). The Bluebook canonicals in `COMMON_REPORTERS`
 *      (which had spaces) were therefore dead entries — the cleaner
 *      never produced anything that matched them.
 *   2. State reporters from the audit (`Mass.`, `Va.`, `Pa.`, `Idaho`)
 *      and the Cal. family were absent entirely.
 *
 * Without `await loadReporters()`, the in-bundle fallback was the only
 * reporter signal — and it missed 100% of the audited reporter classes.
 *
 * This file deliberately does NOT call `loadReporters()` in a beforeAll.
 * It pins the COLD (sync, no DB) behaviour, which is the path almost every
 * real user takes (the audit script, demo opinion, every `extractCitations`
 * call in user code).
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"

describe("issue #555: reporter-fallback covers canonical cites without DB load", () => {
  // ── SCOTUS canonicals (no spaces) get reporter boost + auto-court ──────
  // S.Ct. / L.Ed.* are recognized by court inference → +0.10 court boost.
  describe("SCOTUS canonicals (no spaces) reach ≥ 0.90", () => {
    it.each([
      ["99 S.Ct. 1804", "S.Ct."],
      ["200 L.Ed.2d 100", "L.Ed.2d"],
      ["75 L.Ed. 50", "L.Ed."],
    ])(
      "Smith v. Jones, %s (1980) → confidence ≥ 0.90 (auto-court inferred)",
      (cite, reporter) => {
        const cits = extractCitations(`Smith v. Jones, ${cite} (1980).`)
        const c = cits.find((c) => c.type === "case")
        expect(c, `expected to extract case citation for "${cite}"`).toBeDefined()
        expect(
          c!.confidence,
          `reporter "${reporter}" should earn the +0.3 fallback boost; got ${c!.confidence}`,
        ).toBeGreaterThanOrEqual(0.9)
      },
    )
  })

  // ── Other federal canonicals (no spaces) get reporter boost ────────────
  // F.Supp.* / F.App'x have no auto-court inference (district court ambiguous);
  // confidence: 0.2 base + 0.3 reporter + 0.2 year + 0.15 name = 0.85.
  describe("Federal Supplement / Appendix canonicals (no spaces) reach ≥ 0.85", () => {
    it.each([
      ["410 F.Supp. 100", "F.Supp."],
      ["500 F.Supp.2d 200", "F.Supp.2d"],
      ["750 F.Supp.3d 300", "F.Supp.3d"],
      ["123 F.App'x 456", "F.App'x"],
    ])(
      "Smith v. Jones, %s (1980) → confidence ≥ 0.85 (reporter+name+year, no court)",
      (cite, reporter) => {
        const cits = extractCitations(`Smith v. Jones, ${cite} (1980).`)
        const c = cits.find((c) => c.type === "case")
        expect(c, `expected to extract case citation for "${cite}"`).toBeDefined()
        expect(
          c!.confidence,
          `reporter "${reporter}" should earn the +0.3 fallback boost; got ${c!.confidence}`,
        ).toBeGreaterThanOrEqual(0.85)
      },
    )
  })

  // ── State reporter canonicals (audited misses) ─────────────────────────
  describe("State reporters from #555 audit get reporter boost", () => {
    it.each([
      ["450 Mass. 200", "Mass."],
      ["250 Va. 100", "Va."],
      ["510 Pa. 200", "Pa."],
      ["145 Idaho 100", "Idaho"],
      ["12 Cal.4th 50", "Cal.4th"],
      ["100 Cal.Rptr.2d 500", "Cal.Rptr.2d"],
      ["75 Cal.Rptr.3d 200", "Cal.Rptr.3d"],
    ])(
      "Smith v. Jones, %s (1995) → confidence ≥ 0.80 (state reporter, no court)",
      (cite, reporter) => {
        const cits = extractCitations(`Smith v. Jones, ${cite} (1995).`)
        const c = cits.find((c) => c.type === "case")
        expect(c, `expected to extract case citation for "${cite}"`).toBeDefined()
        // State reporters without a court parenthetical: 0.2 base + 0.3 reporter
        // + 0.2 year + 0.15 name = 0.85. Floor at 0.80 for headroom.
        expect(
          c!.confidence,
          `reporter "${reporter}" should earn the +0.3 fallback boost; got ${c!.confidence}`,
        ).toBeGreaterThanOrEqual(0.8)
      },
    )
  })

  // ── Spaced forms must still work (no regression) ───────────────────────
  // After cleaner.normalizeReporterSpacing, spaced inputs become the same
  // space-less canonicals (`S. Ct.` → `S.Ct.`, `F. Supp. 2d` → `F.Supp.2d`).
  describe("Spaced canonical inputs collapse and still get the boost", () => {
    it.each([
      ["99 S. Ct. 1804", "S.Ct.", 0.9],
      ["200 L. Ed. 2d 100", "L.Ed.2d", 0.9],
      ["410 F. Supp. 100", "F.Supp.", 0.85],
      ["500 F. Supp. 2d 200", "F.Supp.2d", 0.85],
    ])(
      "Smith v. Jones, %s (1980) → confidence ≥ %d",
      (cite, reporter, floor) => {
        const cits = extractCitations(`Smith v. Jones, ${cite} (1980).`)
        const c = cits.find((c) => c.type === "case")
        expect(c, `expected to extract case citation for "${cite}"`).toBeDefined()
        expect(
          c!.confidence,
          `reporter "${reporter}" (after cleaning) should earn the boost; got ${c!.confidence}`,
        ).toBeGreaterThanOrEqual(floor)
      },
    )
  })

  // ── Cleaner-touchpoint regression guard ─────────────────────────────────
  // The bug had two layers: cleaner collapses `S. Ct.` → `S.Ct.`, and the
  // fallback set was authored against the pre-cleaning Bluebook canonical.
  // This explicitly pins both halves so a future change to either side gets
  // a loud failure instead of a silent confidence regression.
  describe("post-cleaning canonical is what the fallback must match", () => {
    it("S. Ct. variants all collapse and earn the reporter boost", () => {
      // All three forms reach the extractor as `S.Ct.` after cleaning.
      const forms = ["99 S. Ct. 1804", "99 S.Ct. 1804", "99 S.  Ct. 1804"]
      for (const cite of forms) {
        const cits = extractCitations(`Smith v. Jones, ${cite} (1980).`)
        const c = cits.find((c) => c.type === "case")
        expect(c, `expected case for "${cite}"`).toBeDefined()
        // SCOTUS auto-inferred → 0.2 + 0.3 + 0.2 + 0.15 + 0.1 = 0.95
        expect(c!.confidence, `regression: "${cite}" → ${c!.confidence}`).toBeGreaterThanOrEqual(
          0.9,
        )
      }
    })

    it("Cal. family is consistent across editions", () => {
      // Pre-#555 the Cal. family was missing entirely: 0.55 across the board.
      // Post-#555 every audited Cal. edition reaches 0.85 (no court inference).
      const forms = [
        "12 Cal.4th 50",
        "5 Cal.5th 100",
        "200 Cal.App.3d 100",
        "150 Cal.App.4th 200",
        "100 Cal.Rptr.2d 500",
        "75 Cal.Rptr.3d 200",
      ]
      for (const cite of forms) {
        const cits = extractCitations(`Smith v. Jones, ${cite} (1995).`)
        const c = cits.find((c) => c.type === "case")
        expect(c, `expected case for "${cite}"`).toBeDefined()
        expect(
          c!.confidence,
          `regression: Cal. family "${cite}" should boost; got ${c!.confidence}`,
        ).toBeGreaterThanOrEqual(0.8)
      }
    })
  })
})
