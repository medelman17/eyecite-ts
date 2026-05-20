/**
 * Issue #571 — periodless reporter variants are extracted but never
 * normalized.
 *
 * Compact forms used by NY/IL/OH/CA/federal slip-ops (`725 F2d 1091`,
 * `24 Ill2d 270`, `60 Ill App2d 39`, `140 N.J.Eq. 496`, `17 Oh St 649`,
 * `125 OhioSt. 219`, `329 FedAppx. 1`) are recognized at the tokenizer
 * level — they produce a `case` citation — but `normalizedReporter`
 * stays `undefined`, so downstream consumers (`reporterKey`,
 * `bluebook`, parallel-group matching) can't link them to their
 * canonical Bluebook form.
 *
 * Two compounding causes:
 *
 *   1. The reporters-db `variations` map is missing several of the
 *      periodless forms above. The existing pattern is in place for
 *      `NE2d`/`P2d` (`"NE2d": "N.E.2d"`); the missing variants need
 *      the same treatment in `data/reporters.json`.
 *
 *   2. Even when a variation IS present, the case-citation extractor
 *      never wrote `normalizedReporter` onto the
 *      `FullCaseCitation` — the whole field was advertised in the
 *      type system but completely unwired in the production code
 *      path. `reporterKey` and `bluebook` already preferred
 *      `normalizedReporter` when present, so wiring it up is a
 *      drop-in.
 *
 * Fix: populate `normalizedReporter` from the reporters-db lookup in
 * the case extractor (`reporterMatch.editions` keys ARE the canonical
 * forms — `Ill.App.2d`, `Ill.2d`, `F.2d`, etc.). Pick the edition
 * whose `start`/`end` window contains the citation's year when
 * unambiguous; otherwise pick the longest-period-prefix edition (the
 * shape `Ill. App. 2d` is a stronger match for `Ill App2d` than the
 * older `Ill. App.`).
 *
 * Add periodless / no-space variations for `F2d`, `Cal2d`, `Cal3d`,
 * `Ill2d`, `Ill App2d`, `IllApp2d`, `Oh St`, `OhioSt.`, `OhSt.`,
 * `FedAppx.`, `N.J.Eq.` to the appropriate reporters in
 * `data/reporters.json`.
 */

import { beforeAll, describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import { loadReporters } from "@/data/reporters"
import type { FullCaseCitation } from "@/types/citation"

const findCase = (text: string): FullCaseCitation | undefined =>
  extractCitations(text).find((c) => c.type === "case") as
    | FullCaseCitation
    | undefined

describe("issue #571 — periodless reporter variants normalize", () => {
  beforeAll(async () => {
    await loadReporters()
  })

  describe("baselines that already worked tokenizer-side now also normalize", () => {
    it.each([
      ["See 92 NE2d 100.", "NE2d", "N.E.2d"],
      ["See 100 P2d 50.", "P2d", "P.2d"],
    ])("%s → reporter=%s normalizedReporter=%s", (input, raw, normalized) => {
      const c = findCase(input)
      expect(c, `expected case for ${input}`).toBeDefined()
      expect(c!.reporter).toBe(raw)
      expect(c!.normalizedReporter).toBe(normalized)
    })
  })

  describe("federal reporters: periodless variants are normalized", () => {
    it.each([
      ["See 725 F2d 1091.", "F2d", "F.2d"],
      ["See 750 F3d 200.", "F3d", "F.3d"],
      ["See 329 FedAppx. 1.", "FedAppx.", "F. App'x"],
    ])("%s → reporter=%s normalizedReporter=%s", (input, raw, normalized) => {
      const c = findCase(input)
      expect(c, `expected case for ${input}`).toBeDefined()
      expect(c!.reporter).toBe(raw)
      expect(c!.normalizedReporter).toBe(normalized)
    })
  })

  describe("Illinois Appellate / Supreme periodless variants", () => {
    it.each([
      ["See 60 Ill App2d 39.", "Ill App2d", "Ill. App. 2d"],
      ["See 24 Ill2d 270.", "Ill2d", "Ill. 2d"],
    ])("%s → reporter=%s normalizedReporter=%s", (input, raw, normalized) => {
      const c = findCase(input)
      expect(c, `expected case for ${input}`).toBeDefined()
      expect(c!.reporter).toBe(raw)
      expect(c!.normalizedReporter).toBe(normalized)
    })
  })

  describe("Ohio periodless / no-space variants", () => {
    it.each([
      ["See 17 Oh St 649.", "Oh St", "Ohio St."],
      ["See 125 OhioSt. 219.", "OhioSt.", "Ohio St."],
    ])("%s → reporter=%s normalizedReporter=%s", (input, raw, normalized) => {
      const c = findCase(input)
      expect(c, `expected case for ${input}`).toBeDefined()
      expect(c!.reporter).toBe(raw)
      expect(c!.normalizedReporter).toBe(normalized)
    })
  })

  describe("New Jersey Equity no-space variant", () => {
    it("`140 N.J.Eq. 496` → normalizedReporter=`N.J. Eq.`", () => {
      const c = findCase("See 140 N.J.Eq. 496.")
      expect(c, "expected case for `140 N.J.Eq. 496`").toBeDefined()
      expect(c!.reporter).toBe("N.J.Eq.")
      expect(c!.normalizedReporter).toBe("N.J. Eq.")
    })
  })

  describe("regression: canonical-edition inputs resolve to themselves", () => {
    // Reporter literals that are EDITION keys in reporters-db (not just
    // variations) resolve to themselves. The reporters-db canonical for
    // Cal. 4th carries the inner space, while the post-cleaning form
    // produced by eyecite-ts collapses to `Cal.4th` (variation entry) —
    // so the test pins the variation → canonical mapping here.
    it.each([
      ["See 500 F.2d 123.", "F.2d", "F.2d"],
      ["See 410 U.S. 113.", "U.S.", "U.S."],
      ["See 200 N.E.2d 100.", "N.E.2d", "N.E.2d"],
      // Post-cleaning literal `Cal.4th` is a variation that maps to the
      // reporters-db canonical `Cal. 4th` (with space). Pins the mismatch.
      ["See 50 Cal.4th 75.", "Cal.4th", "Cal. 4th"],
    ])("%s → reporter=%s normalizedReporter=%s", (input, raw, normalized) => {
      const c = findCase(input)
      expect(c, `expected case for ${input}`).toBeDefined()
      expect(c!.reporter).toBe(raw)
      expect(c!.normalizedReporter).toBe(normalized)
    })
  })

  describe("normalizedReporter is undefined when reporter has no DB match", () => {
    // The fallback path: when the reporter literal isn't recognized,
    // `normalizedReporter` should remain undefined (so downstream
    // utilities know to fall back to the raw `reporter` string).
    it("unknown reporter leaves normalizedReporter undefined", () => {
      const c = findCase("See 10 NotARealReporter 99.")
      // The state-reporter pattern still tokenizes this (it's broad),
      // but the DB lookup returns no match.
      expect(c?.normalizedReporter).toBeUndefined()
    })
  })
})
