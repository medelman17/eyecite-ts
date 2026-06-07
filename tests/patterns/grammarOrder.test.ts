/**
 * Issue #844: the authoritative pattern grammar (set + priority order) is a
 * single exported definition (`orderedPatterns`) consumed by both the tokenizer
 * default and `extractCitations`.
 *
 * Priority is load-bearing but invisible — dedup keeps the earliest-listed
 * (most-specific) pattern on an overlap. These tests are a canary against
 * accidental reordering.
 */

import { describe, expect, it } from "vitest"
import {
  canonPatterns,
  casePatterns,
  constitutionalPatterns,
  docketPatterns,
  federalRulePatterns,
  journalPatterns,
  legislativeMaterialPatterns,
  localOrdinancePatterns,
  neutralPatterns,
  orderedPatterns,
  secondaryAuthorityPatterns,
  sessionLawPatterns,
  shortFormPatterns,
  stateRulePatterns,
  statutePatterns,
  treatyPatterns,
} from "@/patterns"

describe("authoritative pattern grammar order (#844)", () => {
  it("is the documented most-specific → least-specific sequence", () => {
    const federalStatutePatterns = statutePatterns.filter(
      (p) => p.id === "usc" || p.id === "cfr" || p.id === "irc",
    )
    const otherStatutePatterns = statutePatterns.filter(
      (p) => p.id !== "usc" && p.id !== "cfr" && p.id !== "irc",
    )
    expect(orderedPatterns).toEqual([
      ...neutralPatterns,
      ...sessionLawPatterns,
      ...treatyPatterns,
      ...legislativeMaterialPatterns,
      ...localOrdinancePatterns,
      ...canonPatterns,
      ...docketPatterns,
      ...shortFormPatterns,
      ...federalRulePatterns,
      ...stateRulePatterns,
      ...secondaryAuthorityPatterns,
      ...federalStatutePatterns,
      ...casePatterns,
      ...constitutionalPatterns,
      ...otherStatutePatterns,
      ...journalPatterns,
    ])
  })

  it("keeps the load-bearing 'before casePatterns' precedence (#576/#636/#578/#428)", () => {
    const idx = (id: string) => orderedPatterns.findIndex((p) => p.id === id)
    const caseIdx = idx(casePatterns[0].id)
    // More-specific families must out-prioritize the broad case-reporter regexes.
    expect(idx(federalRulePatterns[0].id)).toBeLessThan(caseIdx)
    expect(idx(stateRulePatterns[0].id)).toBeLessThan(caseIdx)
    expect(idx(secondaryAuthorityPatterns[0].id)).toBeLessThan(caseIdx)
    expect(idx("usc")).toBeLessThan(caseIdx) // federal statutes before case (#428)
    // Journal is least specific — after case.
    expect(idx(journalPatterns[0].id)).toBeGreaterThan(caseIdx)
  })
})
