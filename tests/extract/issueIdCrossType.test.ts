import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"
import type { ResolvedCitation } from "@/resolve/types"

/**
 * Issue #721 — Id. cross-type resolution. Per Bluebook Rule 4.1, bare
 * `Id.` (no pincite) attaches to the immediately preceding cited
 * authority of any type. The resolver's family-preference filter
 * overrode positional priority — `42 U.S.C. § 1983. Id.` resolved
 * to an earlier case if one was in scope.
 *
 * Fix: when Id. has NO pincite and NO trailing `§ N` section marker,
 * skip family preference and take the most recent candidate.
 *
 * Id. WITH a pincite still uses family preference (the pincite shape
 * disambiguates: `Id. § 5` → statute family; `Id. at 27` → case).
 */
describe("Issue #721 - Id. cross-type resolution", () => {
  it("bare `Id.` resolves to immediately preceding statute (was case)", () => {
    const text = "Smith, 100 F.2d 1. 42 U.S.C. § 1983. Id."
    const cs = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const statute = cs.find((c) => c.type === "statute") as ResolvedCitation
    const id = cs.find((c) => c.type === "id") as ResolvedCitation
    expect(id.resolution?.resolvedTo).toBe(cs.indexOf(statute))
  })

  it("`Id. at 5` (page pincite, case family) resolves to case", () => {
    const text = "Smith, 100 F.2d 1. 42 U.S.C. § 1983. Id. at 5."
    const cs = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const smith = cs.find((c) => c.type === "case") as ResolvedCitation
    const id = cs.find((c) => c.type === "id") as ResolvedCitation
    expect(id.resolution?.resolvedTo).toBe(cs.indexOf(smith))
  })

  it("`Id. § 7` (section pincite, statute family) resolves to statute", () => {
    const text = "Smith, 100 F.2d 1. 42 U.S.C. § 1983. Id. § 7."
    const cs = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const statute = cs.find((c) => c.type === "statute") as ResolvedCitation
    const id = cs.find((c) => c.type === "id") as ResolvedCitation
    expect(id.resolution?.resolvedTo).toBe(cs.indexOf(statute))
  })

  it("reversed order: `statute. case. Id.` resolves to case (most recent)", () => {
    const text = "42 U.S.C. § 1983. Smith, 100 F.2d 1. Id."
    const cs = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const smith = cs.find((c) => c.type === "case") as ResolvedCitation
    const id = cs.find((c) => c.type === "id") as ResolvedCitation
    expect(id.resolution?.resolvedTo).toBe(cs.indexOf(smith))
  })

  it("statute-only context: bare `Id.` resolves to statute", () => {
    const text = "42 U.S.C. § 1983. Id."
    const cs = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const statute = cs.find((c) => c.type === "statute") as ResolvedCitation
    const id = cs.find((c) => c.type === "id") as ResolvedCitation
    expect(id.resolution?.resolvedTo).toBe(cs.indexOf(statute))
  })
})
