/**
 * Issue #818: `resolveSupra` must not silently commit at full confidence when a
 * party-name key matches >1 distinct in-scope authority. Hybrid policy
 * (warn + tie-abstain):
 *   - exactly 1 match → resolve as before (full confidence);
 *   - >1, distinguishable (different years) → recency-within-name, but capped
 *     confidence + ambiguity warning (idConfidenceFloor can fail it closed);
 *   - >1, true tie (same name + same year) → abstain (failureReason).
 * Root cause: `fullCitationHistory` collapsed same-name authorities (last-write-
 * wins); it is now a `Map<string, number[]>` so the cardinality is visible.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

const DIFF_YEARS =
  "Smith v. Jones, 100 F.2d 1 (2010). Smith v. Roe, 200 F.3d 2 (2012). Smith, supra, at 5."
const SAME_YEAR =
  "Smith v. Jones, 100 F.2d 1 (2010). Smith v. Roe, 200 F.3d 2 (2010). Smith, supra, at 5."
const UNIQUE = "Smith v. Jones, 100 F.2d 1 (2010). Doe v. Roe, 200 F.3d 2 (2012). Smith, supra, at 5."
const CAPTION_TIE =
  "Smith v. Jones, 100 F.2d 1 (2010). Smith v. Jones, 200 F.3d 2 (2010). Smith v. Jones, supra, at 5."

const supraResolution = (text: string, idConfidenceFloor?: number) =>
  (
    extractCitations(text, {
      resolve: true,
      resolutionOptions: idConfidenceFloor === undefined ? undefined : { idConfidenceFloor },
    }) as ResolvedCitation[]
  ).find((c) => c.type === "supra")?.resolution

describe("Issue #818: supra abstains/degrades on non-unique party-name keys", () => {
  it(">1 distinguishable match → recency-within-name, capped confidence + ambiguity warning", () => {
    // Pre-fix: silently resolved to idx 1 at confidence 1.0, no warning.
    const r = supraResolution(DIFF_YEARS)
    expect(r?.resolvedTo).toBe(1) // most-recent Smith (recency-within-name)
    expect(r?.confidence).toBeLessThanOrEqual(0.5)
    expect(r?.warnings?.some((w: string) => /ambiguous|#818/i.test(w))).toBe(true)
  })

  it("true tie (same name + same year) → abstains", () => {
    const r = supraResolution(SAME_YEAR)
    expect(r?.resolvedTo).toBeUndefined()
    expect(r?.failureReason).toMatch(/ambiguous|indistinguishable/i)
  })

  it("(control) unique name key still resolves at full confidence", () => {
    const r = supraResolution(UNIQUE)
    expect(r?.resolvedTo).toBe(0)
    expect(r?.confidence).toBe(1)
    expect(r?.warnings ?? []).toHaveLength(0)
  })

  it("idConfidenceFloor fails the distinguishable-ambiguous case closed", () => {
    const r = supraResolution(DIFF_YEARS, 0.7)
    expect(r?.resolvedTo).toBeUndefined()
    expect(r?.failureReason).toBeDefined()
  })

  it("full-caption duplicate (same name + year) also abstains", () => {
    const r = supraResolution(CAPTION_TIE)
    expect(r?.resolvedTo).toBeUndefined()
    expect(r?.failureReason).toMatch(/ambiguous|indistinguishable/i)
  })
})
