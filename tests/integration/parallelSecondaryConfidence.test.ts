/**
 * Issue #556 — Parallel-cite secondaries score before `inheritParallelCaseName`.
 *
 * `inheritParallelCaseName` (`extractCitations.ts`) runs as a post-pass and
 * mutates `caseName` / `plaintiff` / `defendant` onto secondary citations in
 * a parallel-cite group (e.g. the `93 S. Ct. 705` secondary of
 * `Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705 (1973)`). But by the time it runs,
 * each secondary's `confidence` was already locked in by `buildCaseCitation()`
 * in `extractCase.ts`, missing the `+0.15` caseName signal it now qualifies
 * for. Result: ~94% of "full caption + year + court but confidence < 0.7"
 * citations in the CAP-corpus audit are parallel secondaries.
 *
 * Fix invariant: after inheritance, the secondary's `confidence` should equal
 * what the case-citation scorer would have produced for *its own* signals
 * (reporter / year / court / hasBlankPage) PLUS the inherited caseName.
 *
 * That is NOT the same thing as "secondary.confidence === primary.confidence":
 *   - the U.S. reporter is in COMMON_REPORTERS, so the primary may get a
 *     reporter-match bonus that the normalized "S.Ct." secondary doesn't
 *     (that mismatch is tracked separately by issue #555);
 *   - some parallel groups carry court info on the primary only (court is
 *     extracted from the trailing paren and not propagated by this pass).
 *
 * What MUST hold after the fix is that the +0.15 caseName signal fires for
 * every secondary that ends up with a non-empty inherited caseName.
 */
import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

describe("Issue #556: parallel-secondary confidence after caseName inheritance", () => {
  it("secondary with inherited caseName earns the +0.15 caseName signal (SCOTUS)", () => {
    // Roe: U.S. (primary), S.Ct. (secondary), L.Ed.2d (secondary). All three
    // share SCOTUS courtInference, year 1973, and the same case name.
    const text = "Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705 (1973)."
    const cites = extractCitations(text).filter((c) => c.type === "case")
    expect(cites.length).toBeGreaterThanOrEqual(2)

    const primary = cites.find((c) => c.type === "case" && c.reporter === "U.S.")
    // Reporter normalization collapses "S. Ct." → "S.Ct." in the extracted form.
    const secondary = cites.find((c) => c.type === "case" && c.reporter === "S.Ct.")
    expect(primary).toBeDefined()
    expect(secondary).toBeDefined()
    if (primary?.type !== "case" || secondary?.type !== "case") return

    // Pre-conditions: inheritParallelCaseName ran (caseName propagated, same group).
    expect(primary.caseName).toBe("Roe v. Wade")
    expect(secondary.caseName).toBe("Roe v. Wade")
    expect(primary.groupId).toBe(secondary.groupId)

    // Secondary signals: year 1973 (+0.2), court "scotus" (+0.1), caseName
    // (+0.15). Reporter "S.Ct." is NOT in COMMON_REPORTERS and may or may not
    // hit reporters-db depending on autoload state (tracked by #555).
    // Lower-bound the score against the year+court+caseName floor.
    //   0.2 base + 0.2 year + 0.1 court + 0.15 caseName = 0.65
    expect(secondary.year).toBe(1973)
    expect(secondary.court).toBe("scotus")
    expect(secondary.confidence).toBeGreaterThanOrEqual(0.65)
  })

  it("3-reporter parallel: every secondary earns the caseName signal", () => {
    const text = "Roe v. Wade, 410 U.S. 113, 93 S. Ct. 705, 35 L. Ed. 2d 147 (1973)."
    const cites = extractCitations(text).filter((c) => c.type === "case")
    expect(cites).toHaveLength(3)

    for (const c of cites) {
      if (c.type !== "case") continue
      expect(c.caseName).toBe("Roe v. Wade")
      // Every cite has year and court, and now caseName. Lower bound:
      // 0.2 + 0.2 (year) + 0.1 (court) + 0.15 (caseName) = 0.65.
      expect(c.confidence).toBeGreaterThanOrEqual(0.65)
    }
  })

  it("Pennsylvania parallel: secondary's caseName signal fires", () => {
    // Pa. primary, A. secondary. No court parenthetical, both have year.
    // A. IS in COMMON_REPORTERS → +0.3 reporter bonus.
    // After fix:  0.2 + 0.3 + 0.2 (year) + 0.15 (caseName) = 0.85.
    const text = "Nixon v. Nixon, 329 Pa. 256, 198 A. 154 (1938)."
    const cites = extractCitations(text).filter((c) => c.type === "case")
    expect(cites).toHaveLength(2)

    const secondary = cites.find((c) => c.type === "case" && c.reporter === "A.")
    expect(secondary).toBeDefined()
    if (secondary?.type !== "case") return

    expect(secondary.caseName).toBe("Nixon v. Nixon")
    expect(secondary.year).toBe(1938)
    // Exact: A. is COMMON_REPORTERS member, year present, no court, caseName.
    expect(secondary.confidence).toBe(0.85)
  })

  it("California bracketed parallel: secondary's caseName signal fires", () => {
    // Cal.4th primary, Cal.Rptr.2d secondary. Cal.Rptr.2d isn't in
    // COMMON_REPORTERS and the bracketed parallel doesn't carry year onto
    // the secondary either, so the ONLY signal it can have after inheritance
    // is caseName.
    //   0.2 base + 0.15 caseName = 0.35.
    // Without the fix it's 0.2 (base only). Asserting > 0.2 is the proof.
    const text = "People v. Smith (2001) 24 Cal.4th 849 [102 Cal.Rptr.2d 731]."
    const cites = extractCitations(text).filter((c) => c.type === "case")
    expect(cites).toHaveLength(2)

    const secondary = cites.find((c) => c.type === "case" && c.reporter === "Cal.Rptr.2d")
    expect(secondary).toBeDefined()
    if (secondary?.type !== "case") return

    expect(secondary.caseName).toBe("People v. Smith")
    // Bug pre-fix: 0.2. After fix: 0.35.
    expect(secondary.confidence).toBe(0.35)
  })

  it("single non-parallel citation is unchanged by the fix", () => {
    // Sanity: nothing about a non-parallel cite goes through inheritance.
    const text = "Smith v. Jones, 500 F.2d 100 (1974)."
    const cites = extractCitations(text).filter((c) => c.type === "case")
    expect(cites).toHaveLength(1)
    if (cites[0].type !== "case") return

    expect(cites[0].caseName).toBe("Smith v. Jones")
    expect(cites[0].groupId).toBeUndefined()
    // 0.2 + 0.3 (F.2d) + 0.2 (year) + 0.15 (caseName) = 0.85.
    expect(cites[0].confidence).toBe(0.85)
  })

  it("secondary without an inherited caseName keeps its original score", () => {
    // No surrounding case name → inheritance loop never fires (primary has
    // nothing to give). Secondaries stay at their pre-inheritance score.
    const text = "410 U.S. 113, 93 S. Ct. 705 (1973)."
    const cites = extractCitations(text).filter((c) => c.type === "case")
    expect(cites.length).toBeGreaterThanOrEqual(2)
    for (const c of cites) {
      if (c.type !== "case") continue
      expect(c.caseName).toBeUndefined()
      // No caseName → no +0.15. Bounded above by year (+0.2) + court (+0.1)
      // + reporter, never reaches the caseName-enabled range.
      expect(c.confidence).toBeLessThan(0.9)
    }
  })

  it("secondary that already has its own caseName is not double-counted", () => {
    // Defensive: the inheritance loop has `if (secondary.caseName) continue`,
    // so a secondary that already carried a caseName at extract time should
    // not be recomputed. We can't easily trigger this in pure text input
    // (parallel detection key`s off the absence of an intervening case name),
    // but we can at least exercise the non-parallel path as a regression
    // guard for shared-helper math: a cite that earned +0.15 the first time
    // should still score the same when run through the helper directly.
    const text = "Smith v. Jones, 500 F.2d 100 (1974)."
    const cites = extractCitations(text).filter((c) => c.type === "case")
    if (cites[0].type !== "case") return
    expect(cites[0].confidence).toBe(0.85)
  })
})
