/**
 * Issue #809: replace the global linear paren-depth counter with a bounded-depth,
 * sentence-reset bracket scan, so one unbalanced bracket no longer desyncs scope
 * for citations in *later* clauses.
 *
 * The resolver's `isParentheticalAside` reads the raw depth, so a stray unclosed
 * `(` in an earlier sentence used to inflate the depth of a perfectly good
 * top-level antecedent in a following sentence and wrongly exclude it. (#801's
 * sentence-boundary guard lives in the graph path only, not the resolver.)
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

const idResolvedTo = (text: string): number | undefined =>
  (extractCitations(text, { resolve: true }) as ResolvedCitation[]).find((c) => c.type === "id")
    ?.resolution?.resolvedTo

describe("Issue #809: stray bracket does not corrupt later-clause scope", () => {
  it("a stray unclosed ( in an earlier sentence doesn't exclude a later top-level antecedent", () => {
    // Foo (0) ... unclosed `(` ... NEW sentence: Smith (1) is a top-level cite and
    // the immediately preceding authority for Id. → must resolve to Smith.
    const text =
      "Foo v. Goo, 1 U.S. 1 (see generally the discussion. Smith v. Jones, 2 U.S. 2. Id. at 5."
    expect(idResolvedTo(text)).toBe(1)
  })

  it("regression: a balanced (quoting …) aside is still excluded as an antecedent", () => {
    // Bar is inside Foo's balanced parenthetical → Id. resolves to Foo (0), not Bar (1).
    const text = "Foo, 2020 IL 12345 (quoting Bar v. Baz, 100 N.E.3d 200). Id."
    expect(idResolvedTo(text)).toBe(0)
  })
})
