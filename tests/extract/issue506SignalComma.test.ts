import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"

/**
 * Issue #506: signal phrases bleed into caseName when separated by commas.
 *
 * SIGNAL_STRIP_REGEX is derived from VALID_SIGNALS (canonical forms like
 * "see also") and so doesn't accept the older comma-separated typesetting
 * variants ("See, also,", "See, generally,", "See e.g.,", "See also the
 * case of"). Result: the signal text leaks into the captured caseName.
 *
 * Fix: broaden SIGNAL_STRIP_REGEX to allow optional commas inside multi-word
 * signals and recognize a few common prose connectors ("the case of").
 */
describe("issue #506 — signal phrases bleed into caseName (comma variants)", () => {
  const caseName = (text: string): string | undefined => {
    const cs = extractCitations(text)
    const cc = cs.find((c) => c.type === "case") as FullCaseCitation | undefined
    return cc?.caseName
  }

  it("strips `See, also,` prefix (extra comma after See)", () => {
    const name = caseName(
      "See, also, the opinion filed at this term in Steen vs Swadley, 5 Ind. Ter. Rep. 451",
    )
    expect(name).toBeDefined()
    expect(name).not.toMatch(/^See,?\s+also/i)
    expect(name).toContain("Steen")
    expect(name).toContain("Swadley")
  })

  it("strips `See, generally,` prefix", () => {
    const name = caseName(
      "See, generally, Berkebile v. Nationwide Insurance Co., 5 Ind. Ter. Rep. 451",
    )
    expect(name).toBeDefined()
    expect(name).not.toMatch(/^See/i)
    expect(name).toBe("Berkebile v. Nationwide Insurance Co.")
  })

  it("strips `See also the case of` prose connector", () => {
    const name = caseName(
      "See also the case of the King v. Sir J. Carter and others, 5 Ind. Ter. Rep. 451",
    )
    expect(name).toBeDefined()
    // The captured name should not start with `See`, and the "case of" connector
    // should be dropped. The leading "the" before King is part of the source —
    // capture from "King" onward (or include "the" — both acceptable, but never
    // include "See also the case of").
    expect(name).not.toMatch(/^See/i)
    expect(name).not.toMatch(/case of/i)
    expect(name).toMatch(/King v\.\s+Sir J\. Carter/)
  })

  it("strips `See e.g.,` (spaced variant)", () => {
    const name = caseName(
      "See e.g., Vandermark v. Ford Motor Co., 5 Ind. Ter. Rep. 451",
    )
    expect(name).toBeDefined()
    expect(name).not.toMatch(/^See/i)
    expect(name).toBe("Vandermark v. Ford Motor Co.")
  })
})
