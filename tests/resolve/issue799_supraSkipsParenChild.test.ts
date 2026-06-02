/**
 * Issue #799: `supra` must not resolve to a case cited only inside another
 * citation's explanatory parenthetical (`(quoting X)`). `resolveId` already
 * excludes parenthetical-internal antecedents (#214) via `isParentheticalChild`;
 * `resolveSupra` applied no such filter, so `X v. Y, supra` could resolve to a
 * case named only inside another cite's aside. The two back-reference resolvers
 * should agree on whether a parenthetical-internal cite is a valid antecedent.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

describe("Issue #799: supra skips parenthetical-internal antecedents", () => {
  it("does not resolve supra to a case named only inside another cite's (quoting ...)", () => {
    const text =
      "Foo v. Goo, 500 U.S. 100 (quoting Bar v. Baz, 200 U.S. 50). " +
      "Filler text. Bar v. Baz, supra, at 55."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const supra = citations.find((c) => c.type === "supra")
    expect(supra, "supra should extract").toBeDefined()
    // Bar v. Baz appears ONLY inside Foo v. Goo's parenthetical → not a valid
    // supra antecedent. The resolver must abstain rather than commit to it.
    expect(supra?.resolution?.resolvedTo).toBeUndefined()
  })

  it("regression: supra still resolves to a case cited in its own right", () => {
    const text = "Bar v. Baz, 200 U.S. 50 (1990). Filler text. Bar v. Baz, supra, at 55."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const full = citations.find((c) => c.type === "case")
    const supra = citations.find((c) => c.type === "supra")
    expect(full).toBeDefined()
    expect(supra?.resolution?.resolvedTo).toBe(citations.indexOf(full as ResolvedCitation))
  })

  it("supra and Id. agree: both skip the parenthetical-internal cite", () => {
    const supraText =
      "Foo v. Goo, 500 U.S. 100 (quoting Bar v. Baz, 200 U.S. 50). Filler. Bar v. Baz, supra."
    const supraCites = extractCitations(supraText, { resolve: true }) as ResolvedCitation[]
    const supra = supraCites.find((c) => c.type === "supra")
    // index 1 is the paren-internal Bar v. Baz
    expect(supra?.resolution?.resolvedTo).not.toBe(1)

    // For comparison, `Id.` in the same layout already skips Bar v. Baz (#214)
    // and resolves to the citing authority Foo v. Goo (index 0).
    const idText = "Foo v. Goo, 500 U.S. 100 (quoting Bar v. Baz, 200 U.S. 50). Id."
    const idCites = extractCitations(idText, { resolve: true }) as ResolvedCitation[]
    const id = idCites.find((c) => c.type === "id")
    expect(id?.resolution?.resolvedTo).toBe(0)
  })
})
