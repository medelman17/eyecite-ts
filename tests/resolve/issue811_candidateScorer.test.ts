/**
 * Issue #811: antecedent selection routes through an explicit candidate-list
 * scorer (the seam for a future learning-to-rank model). This pins, via the
 * public API, the deterministic behavior the scorer reproduces on the `Id.`
 * path: preferred-family dominates, recency breaks ties. Behavior is unchanged
 * from the prior inline `preferred ?? candidates[0]` logic.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

const idResolvedTo = (text: string): number | undefined =>
  (extractCitations(text, { resolve: true }) as ResolvedCitation[]).find((c) => c.type === "id")
    ?.resolution?.resolvedTo

describe("Issue #811: candidate-list scorer (Id. path)", () => {
  it("page-pincite Id. prefers the case family over a more-recent statute", () => {
    // case (0), statute (1); `Id. at 5` is a page pincite ⇒ case family ⇒ case (0),
    // even though the statute is more recent.
    expect(idResolvedTo("Smith v. Jones, 100 F.2d 1. 42 U.S.C. § 1983. Id. at 5.")).toBe(0)
  })

  it("recency breaks ties within the preferred family", () => {
    // two cases; `Id. at 5` ⇒ most-recent case (1).
    expect(idResolvedTo("Smith v. Jones, 100 F.2d 1. Doe v. Roe, 200 F.3d 2. Id. at 5.")).toBe(1)
  })
})
