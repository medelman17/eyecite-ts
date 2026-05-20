/**
 * Tests for #582 — `<YEAR> Fed.R.X.X. N` false positive when YEAR ≥ 20.
 *
 * Pre-fix behavior: the state-reporter regex matched `1983 Fed.R.Civ.P. 17`
 * as `{volume: 1983, reporter: "Fed.R.Civ.P.", page: 17}`. The cap in
 * `isSuspiciousSmallVolume` only catches volumes ≤ 20, so the FP slipped
 * through with high confidence.
 *
 * Post-#576: the federal-rule extractor wins overlap dedup and extracts
 * `Fed.R.Civ.P. 17(b)` correctly. This test file is the defense-in-depth
 * regression suite — even if a future change loosens the federal-rule
 * pattern's match, the volume-cap fix must still reject the phantom.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import { applyFalsePositiveFilters } from "@/extract/filterFalsePositives"
import type { FullCaseCitation } from "@/types/citation"
import type { Span } from "@/types/span"

/** Minimal case-citation factory mirroring tests/extract/issue145FalsePositives.test.ts */
function makeCase(reporter: string, volume: number, page = 17): FullCaseCitation {
  const span: Span = { cleanStart: 0, cleanEnd: 10, originalStart: 0, originalEnd: 10 }
  return {
    type: "case",
    text: "",
    span,
    confidence: 0.8,
    matchedText: "",
    processTimeMs: 0,
    patternsChecked: 1,
    volume,
    reporter,
    page,
  }
}

describe("#582: <YEAR> Fed.R.X.X. N false positive", () => {
  describe("full pipeline (post-#576 — extracted as federalRule)", () => {
    it("does not emit a case citation for `1983 Fed.R.Civ.P. 17(b)`", () => {
      const cites = extractCitations("See 1983 Fed.R.Civ.P. 17(b).")
      const fpCases = cites.filter(
        (c) =>
          c.type === "case" &&
          typeof c.volume === "number" &&
          c.volume === 1983 &&
          c.reporter?.toLowerCase().includes("fed"),
      )
      expect(fpCases).toHaveLength(0)
    })
  })

  describe("defense in depth — false-positive filter rejects synthetic phantom", () => {
    it("flags `vol=1983, reporter=Fed.R.Civ.P.` as a phantom case", () => {
      const phantom = makeCase("Fed.R.Civ.P.", 1983)
      const filtered = applyFalsePositiveFilters([phantom], false)
      expect(filtered).toHaveLength(1)
      expect(filtered[0].confidence).toBeLessThanOrEqual(0.1)
      expect(filtered[0].warnings?.length).toBeGreaterThan(0)
    })

    it("removes phantom when `remove: true`", () => {
      const phantom = makeCase("Fed.R.Civ.P.", 1983)
      const filtered = applyFalsePositiveFilters([phantom], true)
      expect(filtered).toHaveLength(0)
    })

    it("flags `vol=1995, reporter=Fed. R. Civ. P.` (spaced form)", () => {
      const phantom = makeCase("Fed. R. Civ. P.", 1995)
      const filtered = applyFalsePositiveFilters([phantom], true)
      expect(filtered).toHaveLength(0)
    })

    it("flags `vol=2020, reporter=Fed.R.Evid.` (evidence variant)", () => {
      const phantom = makeCase("Fed.R.Evid.", 2020)
      const filtered = applyFalsePositiveFilters([phantom], true)
      expect(filtered).toHaveLength(0)
    })

    it("preserves a real `5 Fed. Cl. 100` (volume in plausible range, real reporter)", () => {
      // The Federal Claims reporter (`Fed. Cl.`) is a real US reporter; we
      // must not over-reject it just because the reporter string starts
      // with `Fed.`.
      const real = makeCase("Fed. Cl.", 5)
      const filtered = applyFalsePositiveFilters([real], true)
      expect(filtered).toHaveLength(1)
    })
  })
})
