/**
 * Issue #504: supra resolution fails when partyName is "Plaintiff v. Defendant".
 *
 * `extractSupra` captures the full caption (`"Fitzgerald v. Cleveland"` for
 * `Fitzgerald v. Cleveland, supra`), but `trackFullCitation` indexes the
 * BK-tree under the *individual* normalized plaintiff/defendant strings
 * (`"fitzgerald"`, `"cleveland"`). Levenshtein distance between
 * `"fitzgerald v. cleveland"` (queryLen ≈ 23) and either single name
 * (length 7 / 9) exceeds the threshold-implied `maxDistance`, so the
 * BK-tree query returns no candidates and resolution fails.
 *
 * Fix: when the supra `partyName` contains ` v. ` (or ` vs. `), split it
 * and query each half independently. Either half hitting an indexed full
 * cite is acceptable — return the first match.
 *
 * Affects ~59% of supra citations in the CAP corpus per the resolution
 * audit.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

describe("Issue #504: supra resolution with `Party v. Party` caption", () => {
  it("`Fitzgerald v. Cleveland, supra` resolves to prior `Fitzgerald v. Cleveland`", () => {
    const text =
      "Fitzgerald v. Cleveland, 88 Ohio St. 338 (1913). " +
      "The court explained the rule. " +
      "Fitzgerald v. Cleveland, supra, at 342."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const full = citations.find((c) => c.type === "case")!
    const supra = citations.find((c) => c.type === "supra")!
    expect(full, "full Fitzgerald cite should extract").toBeDefined()
    expect(supra, "supra should extract").toBeDefined()
    expect(supra.partyName).toBe("Fitzgerald v. Cleveland")
    expect(supra.resolution?.resolvedTo).toBe(citations.indexOf(full))
  })

  it("`Auld v. Travis, supra` resolves to prior `Auld v. Travis`", () => {
    const text =
      "Auld v. Travis, 5 Colo. App. 535 (1895). " +
      "The court reasoned thus. " +
      "Auld v. Travis, supra, at 540."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const full = citations.find((c) => c.type === "case")!
    const supra = citations.find((c) => c.type === "supra")!
    expect(full).toBeDefined()
    expect(supra).toBeDefined()
    expect(supra.partyName).toBe("Auld v. Travis")
    expect(supra.resolution?.resolvedTo).toBe(citations.indexOf(full))
  })

  it("`Smith v. Jones, supra` still resolves when only plaintiff matches indexed name", () => {
    // Ensure the split-and-query fallback works even if only one half matches.
    const text =
      "Smith v. Doe, 100 F.3d 1 (1990). " +
      "Other prose here. " +
      "Smith v. Jones, supra."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const full = citations.find((c) => c.type === "case")!
    const supra = citations.find((c) => c.type === "supra")!
    expect(supra.resolution?.resolvedTo).toBe(citations.indexOf(full))
  })

  it("regression: single-word `Smith, supra` still resolves to `Smith v. Jones`", () => {
    const text = "Smith v. Jones, 100 F.3d 1 (1990). Smith, supra."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const full = citations.find((c) => c.type === "case")!
    const supra = citations.find((c) => c.type === "supra")!
    expect(supra.resolution?.resolvedTo).toBe(citations.indexOf(full))
  })
})
