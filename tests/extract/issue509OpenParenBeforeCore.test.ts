import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"

/**
 * Issue #509: an open-paren `(` immediately before the citation core
 * (`(volume Reporter page)`) is currently treated as a hard boundary
 * by the backward case-name scan, so the caseName is lost.
 *
 * Fix: the scan should be able to step PAST a `(` immediately to the
 * left of the citation core to look for the case name that lives just
 * outside the parenthetical wrapping the citation.
 *
 * Distinct from #512 (the COMPLEMENT) — when the parenthetical contains
 * BOTH the caption AND the citation core (`(Name v. Name, vol Reporter
 * page)`), the open-paren must STOP the scan. The disambiguator is
 * whether a case name has been recovered before the scan reaches the `(`.
 */
describe("issue #509 — open-paren before citation core does not suppress caseName", () => {
  const caseName = (text: string): string | undefined => {
    const cs = extractCitations(text)
    const cc = cs.find((c) => c.type === "case") as FullCaseCitation | undefined
    return cc?.caseName
  }

  it("captures caseName when caption precedes `, (vol Reporter page)`", () => {
    const name = caseName(
      "Thus, in the case of Murray v. Ballou, (1 Johns. Ch. Rep. 566)",
    )
    expect(name).toBe("Murray v. Ballou")
  })

  it("captures caseName for a bare `(Name v. Name, vol Reporter page)` wrapper", () => {
    const name = caseName("(Murray v. Ballou, 1 Johns. Ch. Rep. 566)")
    expect(name).toBe("Murray v. Ballou")
  })
})
