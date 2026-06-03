/**
 * Issue #821: the resolver-shared subordinating-trigger lexicon recognized only
 * quoting / citing / quoted in / cited in. Under a dropped opening paren
 * (OCR/PDF), a citation introduced by a prior-/subsequent-history subordinator
 * (`overruled by`, `abrogated by`, `cited with approval in`, …) was NOT
 * recognized as a parenthetical aside, so the #214/#799 exclusion never fired
 * and recency mis-resolved `Id.` to the subordinated cite. The lexicon now
 * covers these — a soft signal that only changes behavior when the paren is
 * dropped/garbled (balanced asides are already handled by bracket depth).
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

const idResolvedTo = (text: string): number | undefined =>
  (extractCitations(text, { resolve: true }) as ResolvedCitation[]).find((c) => c.type === "id")
    ?.resolution?.resolvedTo

// Outer authority Smith (idx 0); subordinated cite Jones (idx 1) introduced by a
// history trigger with a DROPPED opening paren (the OCR failure mode).
const dropped = (trigger: string) =>
  `Smith v. Allen, 5 U.S. 5 (1990) ${trigger} Jones v. Doe, 6 F.3d 6. Id. at 7.`

describe("Issue #821: resolver trigger lexicon covers history subordinators", () => {
  it("excludes a dropped-paren `(overruled by …)` aside → Id. resolves to the outer cite", () => {
    expect(idResolvedTo(dropped("overruled by"))).toBe(0) // Smith, not Jones
  })

  it("excludes a dropped-paren `(abrogated by …)` aside", () => {
    expect(idResolvedTo(dropped("abrogated by"))).toBe(0)
  })

  it("excludes a multi-word `(cited with approval in …)` aside", () => {
    expect(idResolvedTo(dropped("cited with approval in"))).toBe(0)
  })

  it("(regression) balanced `(overruled by …)` is still excluded via bracket depth", () => {
    expect(
      idResolvedTo("Smith v. Allen, 5 U.S. 5 (1990) (overruled by Jones v. Doe, 6 F.3d 6). Id. at 7."),
    ).toBe(0)
  })

  it("(regression) existing `quoting` trigger still recognized on a dropped paren", () => {
    expect(idResolvedTo(dropped("quoting"))).toBe(0)
  })

  it("does NOT over-trigger on a non-subordinating signal (`See also` is a new authority)", () => {
    // `See also Jones …` introduces Jones as its own authority, not a subordinate
    // aside of Smith — `Id.` correctly anchors to the immediate Jones (idx 1).
    expect(
      idResolvedTo("Smith v. Allen, 5 U.S. 5 (1990). See also Jones v. Doe, 6 F.3d 6. Id. at 7."),
    ).toBe(1)
  })
})
