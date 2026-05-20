/**
 * Issue #508: `Id.` `antecedentIndex` diverges from `resolvedTo` when an
 * intervening citation of a different family sits between them.
 *
 * After #498 fixed the strict-Bluebook reading of `Id.`, the resolver
 * computes two pointers:
 *   - `resolvedTo` — the family-preferred, scope-filtered antecedent
 *   - `antecedentIndex` — the positional immediate predecessor
 *
 * For case-family `Id.` (the default), an intervening statute is
 * deprioritized as the resolution target but still surfaces as the
 * positional predecessor. Result: `resolvedTo` and `antecedentIndex`
 * disagree on the same citation in ~8% of the corpus.
 *
 * Fix shape (option a in the task spec): when the primary chase succeeds,
 * set `antecedentIndex` to `resolvedTo`. The two are then one source of
 * truth, matching the post-#498 invariant that `Id.` anchors to a
 * specific resolved authority. `findImmediatePredecessor` is still
 * useful for the pass-2 unresolved-short-form path.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

describe("Issue #508: Id. antecedentIndex agrees with resolvedTo on the success path", () => {
  it("case → statute → Id. at 5 — both pointers should be the case", () => {
    const text = "Smith v. Jones, 100 F.3d 1 (1990). 42 U.S.C. § 1983. Id. at 5."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const smith = citations.find((c) => c.type === "case")!
    const id = citations.find((c) => c.type === "id")!
    expect(id.resolution?.resolvedTo).toBe(citations.indexOf(smith))
    expect(id.resolution?.antecedentIndex).toBe(id.resolution?.resolvedTo)
  })

  it("two cases → statute → Id. — both pointers should be the recent case", () => {
    const text =
      "Smith v. Jones, 100 F.3d 1. " +
      "Doe v. Roe, 200 F.3d 50. " +
      "42 U.S.C. § 1983. " +
      "Id. at 55."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const doe = citations.find((c) => c.type === "case" && c.volume === 200)!
    const id = citations.find((c) => c.type === "id")!
    expect(id.resolution?.resolvedTo).toBe(citations.indexOf(doe))
    expect(id.resolution?.antecedentIndex).toBe(id.resolution?.resolvedTo)
  })

  it("case → see also case → Id. — both pointers should be the see-also case", () => {
    // Already covered by #498's strict reading; pin the antecedentIndex agreement.
    const text =
      "People v. Henderson, 28 N.Y.3d 63, 70 (2016). " +
      "See also People v. Molineux, 168 N.Y. 264 (1901). Id. at 70."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const molineux = citations.find((c) => c.type === "case" && c.volume === 168)!
    const id = citations.find((c) => c.type === "id")!
    expect(id.resolution?.resolvedTo).toBe(citations.indexOf(molineux))
    expect(id.resolution?.antecedentIndex).toBe(id.resolution?.resolvedTo)
  })

  it("case → Id. (immediate) — both pointers should be the case", () => {
    // Regression: the trivial path was already correct; lock it in.
    const text = "Smith v. Jones, 100 F.3d 1 (1990). Id."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const smith = citations.find((c) => c.type === "case")!
    const id = citations.find((c) => c.type === "id")!
    expect(id.resolution?.resolvedTo).toBe(citations.indexOf(smith))
    expect(id.resolution?.antecedentIndex).toBe(citations.indexOf(smith))
  })
})
