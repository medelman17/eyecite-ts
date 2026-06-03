/**
 * Issue #819: `supra` must not resolve to a case cited only as a *non-first
 * member* of a string-cite parenthetical `(citing A; B; C)`.
 *
 * Root cause: `computeBracketScopes` reset its bounded bracket stack on the `;`
 * separator *while the outer `(` was still open*, so 2nd-and-later members read
 * depth 0 (and `balanceOk=false`) and escaped the #799 parenthetical-aside
 * filter. The 1st member (depth 1) was correctly excluded; later members leaked.
 * Fix: a `;` inside an open paren is a string-cite separator, not a clause
 * boundary — every member must read depth ≥ 1 like the first.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { Citation } from "@/types/citation"
import type { ResolvedCitation } from "@/resolve/types"
import { computeBracketScopes } from "@/utils/parentheticalScope"

const STRING_CITE =
  "Smith v. Jones, 1 U.S. 1 (citing Alpha v. Beta, 2 F.2d 2; Gamma v. Delta, 3 F.3d 3)."

const supraResolvedTo = (text: string): number | undefined =>
  (extractCitations(text, { resolve: true }) as ResolvedCitation[]).find((c) => c.type === "supra")
    ?.resolution?.resolvedTo

describe("Issue #819: supra skips string-cite parenthetical members", () => {
  it("does not resolve supra to a 2nd-and-later member of (citing A; B; C)", () => {
    // Gamma is the 2nd member, inside the (citing …) aside → not a valid supra
    // antecedent (#799). Pre-fix it resolved to index 2 at confidence 1.0.
    expect(supraResolvedTo(`${STRING_CITE} Gamma, supra, at 9.`)).toBeUndefined()
  })

  it("(control) already excludes the 1st member", () => {
    expect(supraResolvedTo(`${STRING_CITE} Alpha, supra, at 9.`)).toBeUndefined()
  })

  it("computeBracketScopes: every string-cite member reads depth ≥ 1, balanceOk", () => {
    const cites = extractCitations(STRING_CITE) as Citation[]
    expect(cites.length).toBe(3) // Smith (outer), Alpha + Gamma (inside (citing …))
    const scopes = computeBracketScopes(STRING_CITE, cites)
    expect(scopes[0].depth).toBe(0) // Smith — top level
    expect(scopes[1].depth).toBeGreaterThanOrEqual(1) // Alpha — inside the paren
    expect(scopes[2].depth).toBeGreaterThanOrEqual(1) // Gamma — pre-fix: 0 (the bug)
    expect(scopes[2].balanceOk).toBe(true) // pre-fix: false (the balanceOk pollution)
  })
})
