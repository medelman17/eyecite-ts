/**
 * #524 — Georgia-style parenthesized parallel cite swallows the trailing
 * year.
 *
 *   275 Ga. 486, 488-489 (2) (569 SE2d 502) (2002)
 *
 * The inner parallel cite `569 SE2d 502` is wrapped in parens, and the
 * trailing `(2002)` paren is the year for both members of the parallel
 * group. After the inner `502`, the next chars are `) (2002)`. The cite-
 * following lookahead (LOOKAHEAD_PAREN_REGEX) requires a `(` after at
 * most whitespace and an optional pincite, so the leading `)` blocks the
 * year scan and the inner cite gets `year=undefined`.
 *
 * Fix: when the lookahead window starts with `) (` (or `] (`), skip the
 * single close-paren/bracket and re-scan into the following paren. This
 * is exactly the Georgia "parenthesized parallel" shape; it appears ~15-
 * 50 times per 300 GA-reporter opinions.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { CaseCitation } from "@/types/citation"

describe("#524 Georgia-style parenthesized parallel cite", () => {
  it("`(569 SE2d 502) (2002)` propagates year to the parenthesized inner cite", () => {
    const cites = extractCitations(
      "275 Ga. 486, 488-489 (2) (569 SE2d 502) (2002)",
    ) as CaseCitation[]
    const inner = cites.find((c) => c.reporter === "SE2d" || c.reporter === "S.E.2d")
    expect(inner).toBeDefined()
    expect(inner?.year).toBe(2002)
  })

  it("the outer Ga cite also gets year 2002", () => {
    const cites = extractCitations(
      "275 Ga. 486, 488-489 (2) (569 SE2d 502) (2002)",
    ) as CaseCitation[]
    const outer = cites.find((c) => c.reporter === "Ga.")
    expect(outer?.year).toBe(2002)
  })

  it("works without an intervening `(2)` annotation", () => {
    const cites = extractCitations(
      "275 Ga. 486, 488-489 (569 SE2d 502) (2002)",
    ) as CaseCitation[]
    const inner = cites.find((c) => c.reporter === "SE2d" || c.reporter === "S.E.2d")
    expect(inner?.year).toBe(2002)
  })

  it("bracketed parallel `[569 SE2d 502] (2002)` propagates year", () => {
    const cites = extractCitations(
      "275 Ga. 486, 488-489 [569 SE2d 502] (2002)",
    ) as CaseCitation[]
    const inner = cites.find((c) => c.reporter === "SE2d" || c.reporter === "S.E.2d")
    expect(inner?.year).toBe(2002)
  })

  it("does not regress when the paren is not parenthesized (parallel year already works)", () => {
    // The classic parallel-cite chain already propagates year through the
    // post-chain scan; this is a regression check.
    const cites = extractCitations(
      "Foo v. Bar, 410 U.S. 113, 93 S. Ct. 705 (1973)",
    ) as CaseCitation[]
    expect(cites.every((c) => c.year === 1973)).toBe(true)
  })
})
