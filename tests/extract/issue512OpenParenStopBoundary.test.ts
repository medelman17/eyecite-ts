import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"

/**
 * Issue #512: when `(Name v. Name, vol Reporter page)` appears as a
 * sentence-internal parenthetical, the backward case-name scan must
 * stop at the open paren of the wrapping parenthetical — otherwise it
 * absorbs the entire host sentence into `caseName`.
 *
 * This is the COMPLEMENT of #509: that issue is about REACHING into
 * the paren from outside; this is about STOPPING at the open paren
 * when the caption lives INSIDE the paren.
 */
describe("issue #512 — backward scan stops at wrapping paren's open `(`", () => {
  const caseName = (text: string): string | undefined => {
    const cs = extractCitations(text)
    const cc = cs.find((c) => c.type === "case") as FullCaseCitation | undefined
    return cc?.caseName
  }

  it("captures `Covello v Covello` (NY-style `v` without period)", () => {
    const name = caseName(
      "Domestic Relations Law (sequestration), section 244 (entry of a money judgment); (Covello v Covello, 68 AD2d 818)",
    )
    expect(name).toBe("Covello v Covello")
    // Negative: must not be hundreds of chars
    expect((name ?? "").length).toBeLessThan(50)
  })

  it("captures `Moran v. Town of Mashpee` without bleeding bracketed prose", () => {
    const name = caseName(
      "The few cases ... involved [contracts]; (Moran v. Town of Mashpee, 17 Mass.App.Ct. 679)",
    )
    expect(name).toBe("Moran v. Town of Mashpee")
    expect((name ?? "").length).toBeLessThan(50)
  })

  it("does not regress #509 paren-before-core (sanity)", () => {
    // The OPPOSITE shape: caption is OUTSIDE the paren that wraps the
    // citation core. Both should resolve correctly side by side.
    expect(caseName("Thus, in the case of Murray v. Ballou, (1 Johns. Ch. Rep. 566)")).toBe(
      "Murray v. Ballou",
    )
    expect(caseName("(Murray v. Ballou, 1 Johns. Ch. Rep. 566)")).toBe(
      "Murray v. Ballou",
    )
  })

  it("stops at the wrapping `(` even when host prose is all-capitalized", () => {
    // Without the open-paren stop, the V_CASE_NAME_REGEX character class
    // allows `(` inside plaintiff, so adjacent capitalized prose like
    // `Some Title For Section And More Text (Smith v. Jones` is absorbed
    // into plaintiff — yielding wildly long caseNames. The `(` boundary
    // ensures only the paren contents are captured.
    expect(
      caseName("Some Title For Section And More Text (Smith v. Jones, 100 F.2d 1)"),
    ).toBe("Smith v. Jones")
    expect(
      caseName("Some Important Sentence Here, (Smith v. Jones, 100 F.2d 1)"),
    ).toBe("Smith v. Jones")
  })
})
