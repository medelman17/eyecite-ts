/**
 * Issue #514: `Id.` with no `§`-trailer defaults to family=case, but should
 * still anchor to a prior statute when no case-family candidate exists.
 *
 * `getIdPreferredFamily` defaults to `"case"` for any `Id.` not followed by
 * `§` — including `Id.`, `Id. at N`, and `Id. ¶ N`. In documents whose only
 * prior authority is a statute (~8% of `Id.` citations in the audit, per the
 * issue), the resolver should treat family preference as a soft signal and
 * fall back to the available authority.
 *
 * The pre-fix scorer awarded +1000 for a family match but happened to work
 * because `best` was initialized to `candidates[0]` unconditionally. These
 * tests pin the explicit fallback so future scorer refactors don't silently
 * regress it. They also cover the `Id. ¶ N` "complaint paragraph N" idiom
 * the audit reported failing, which is structurally the same problem.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

describe("Issue #514: Id. family-preference fallback to statute when no case in scope", () => {
  it("statute-only context: `Id.` resolves to the statute", () => {
    const text = "29 U.S.C. § 201. Id."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const statute = citations.find((c) => c.type === "statute")!
    const id = citations.find((c) => c.type === "id")!
    expect(id.resolution?.resolvedTo).toBe(citations.indexOf(statute))
    expect(id.resolution?.confidence).toBeGreaterThan(0)
    expect(id.resolution?.failureReason).toBeUndefined()
  })

  it("statute-only context: `Id. at 5` (case-style pincite) resolves to statute", () => {
    const text = "29 U.S.C. § 201. Id. at 5."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const statute = citations.find((c) => c.type === "statute")!
    const id = citations.find((c) => c.type === "id")!
    expect(id.resolution?.resolvedTo).toBe(citations.indexOf(statute))
    expect(id.resolution?.confidence).toBeGreaterThan(0)
  })

  it("statute-only context: `Id. ¶ 5` (paragraph-style pincite) resolves to statute", () => {
    // The audit's repro: "complaint paragraph N" idiom after a statute citation.
    const text = "29 U.S.C. § 201. Id. ¶ 5."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const statute = citations.find((c) => c.type === "statute")!
    const id = citations.find((c) => c.type === "id")!
    expect(id.resolution?.resolvedTo).toBe(citations.indexOf(statute))
    expect(id.resolution?.confidence).toBeGreaterThan(0)
  })

  it("statute-only context: chained `Id. ¶ N` references all resolve to the statute", () => {
    const text =
      "Plaintiff alleges violations of the FLSA. 29 U.S.C. § 201. " +
      "The complaint alleges failure to pay overtime. Id. ¶ 5. " +
      "The complaint further alleges minimum-wage violations. Id. ¶ 6. " +
      "And retaliation. Id. ¶ 7."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const statute = citations.find((c) => c.type === "statute")!
    const ids = citations.filter((c) => c.type === "id")
    expect(ids).toHaveLength(3)
    for (const id of ids) {
      expect(id.resolution?.resolvedTo).toBe(citations.indexOf(statute))
      expect(id.resolution?.confidence).toBeGreaterThan(0)
    }
  })

  it("case present in scope: family preference still wins over statute (no regression)", () => {
    // Case-preferred Id. should still pick the case when one is in scope,
    // even if a statute is more recent. The fallback only activates when
    // the preferred family is absent.
    const text = "Smith v. Jones, 100 F.3d 1 (1990). 42 U.S.C. § 1983. Id. at 5."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const smith = citations.find((c) => c.type === "case")!
    const id = citations.find((c) => c.type === "id")!
    expect(id.resolution?.resolvedTo).toBe(citations.indexOf(smith))
  })

  it("section-style pincite: `Id. § 1983(c)` still prefers statute", () => {
    // Regression — the inverse fallback case.
    const text = "Smith v. Jones, 100 F.3d 1 (1990). 42 U.S.C. § 1983. Id. § 1983(c)."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const statute = citations.find((c) => c.type === "statute")!
    const id = citations.find((c) => c.type === "id")!
    expect(id.resolution?.resolvedTo).toBe(citations.indexOf(statute))
  })
})
