import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { ShortFormCaseCitation } from "@/types/citation"

describe("backward prose case-name extraction", () => {
  it("extracts case name from prose preceding a short-form when vol+reporter has no full match", () => {
    // "In Yellen v. Kassin" is the prose mention; the short-form has
    // partyName="Yellen". Vol+reporter (416 N.J. Super.) has no full match.
    // After this PR, the short-form should be enriched with inferredCaseName.
    const text =
      "Smith v. Jones, 100 F.2d 50, 55 (1990). In Yellen v. Kassin, the court held. Yellen, 416 N.J. Super. at 590."
    const cites = extractCitations(text, { resolve: true })
    const yellenShort = cites.find(
      (c): c is ShortFormCaseCitation => c.type === "shortFormCase" && c.partyName === "Yellen",
    )
    expect(yellenShort).toBeDefined()
    expect(yellenShort?.inferredCaseName).toBe("Yellen v. Kassin")
    expect(yellenShort?.inferredPlaintiff?.toLowerCase()).toContain("yellen")
    expect(yellenShort?.inferredDefendant?.toLowerCase()).toContain("kassin")
  })

  it("does not infer when short-form has no partyName", () => {
    // Bare short-form `416 N.J. Super. at 590` — no party prefix.
    const text =
      "Smith v. Jones, 100 F.2d 50, 55 (1990). In Yellen v. Kassin, the court held. 416 N.J. Super. at 590."
    const cites = extractCitations(text, { resolve: true })
    const bareShort = cites.find(
      (c): c is ShortFormCaseCitation => c.type === "shortFormCase" && !c.partyName,
    )
    expect(bareShort).toBeDefined()
    expect(bareShort?.inferredCaseName).toBeUndefined()
  })

  it("does not infer when prose case name does not match partyName", () => {
    // Prose mentions Smith v. Jones, but the short-form's partyName is
    // Yellen. No match → no inference.
    const text = "In Smith v. Jones, the court held. Yellen, 416 N.J. Super. at 590."
    const cites = extractCitations(text, { resolve: true })
    const yellenShort = cites.find((c): c is ShortFormCaseCitation => c.type === "shortFormCase")
    expect(yellenShort).toBeDefined()
    expect(yellenShort?.inferredCaseName).toBeUndefined()
  })

  it("vol+reporter match still wins over prose inference (no fallback when resolved)", () => {
    // Provide a full Yellen citation, then a short-form. Resolution
    // succeeds via vol+reporter; the prose-extraction fallback never runs.
    const text =
      "Yellen v. Kassin, 416 N.J. Super. 580 (App. Div. 2009). Yellen, 416 N.J. Super. at 590."
    const cites = extractCitations(text, { resolve: true })
    const yellenShort = cites.find(
      (c): c is ShortFormCaseCitation => c.type === "shortFormCase" && c.partyName === "Yellen",
    )
    expect(yellenShort).toBeDefined()
    expect(yellenShort?.resolution?.resolvedTo).toBeDefined()
    expect(yellenShort?.inferredCaseName).toBeUndefined()
  })
})
