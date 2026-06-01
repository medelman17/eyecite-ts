/**
 * Issue #795: `antecedentIndex` disagrees with `resolvedTo` on the
 * supra / shortFormCase **success** paths, breaking the #508 invariant.
 *
 * #508 established that a resolved short-form's `antecedentIndex` mirrors
 * `resolvedTo` on the success path so consumers have one source of truth.
 * That fix was applied only to the `Id.` resolver; the supra and
 * shortFormCase success paths still computed `antecedentIndex` via
 * `findImmediatePredecessor` — a position-only walk that returns the
 * immediately preceding cite regardless of which authority actually
 * resolved. When an intervening citation of a *different* case sits
 * between the true antecedent and the short form, the two pointers
 * disagree: `resolvedTo` points at the resolved antecedent while
 * `antecedentIndex` points at the intervening cite.
 *
 * Fix (matching the #508 `Id.` shape): mirror `resolvedTo` on the three
 * success paths. `findImmediatePredecessor` remains the fallback only for
 * the unresolved/positional path, where `resolvedTo` is undefined.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

describe("Issue #795: supra/shortFormCase antecedentIndex agrees with resolvedTo on the success path", () => {
  it("supra named-match across an intervening case — both pointers are the resolved case", () => {
    // Brown (#0) → Mapp (#1) → Brown, supra (#2). The supra resolves by
    // party name to Brown; the positional predecessor is the intervening
    // Mapp. Both pointers must be Brown.
    const text =
      "Brown v. Board of Education, 347 U.S. 483 (1954). " +
      "The Court later decided Mapp v. Ohio, 367 U.S. 643 (1961). " +
      "But Brown, supra, at 500, controls."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const brown = citations.find((c) => c.type === "case" && c.volume === 347)!
    const supra = citations.find((c) => c.type === "supra")!
    expect(supra.resolution?.resolvedTo).toBe(citations.indexOf(brown))
    expect(supra.resolution?.antecedentIndex).toBe(supra.resolution?.resolvedTo)
  })

  it("shortFormCase party-name match across an intervening case — both pointers are the named case", () => {
    // Smith 100 F.3d (#0) → Doe 200 F.3d (#1) → Smith, 100 F.3d at 5 (#2).
    // vol+reporter narrows to Smith and the party name confirms it; the
    // positional predecessor is the intervening Doe. Both pointers = Smith.
    const text =
      "Smith v. Jones, 100 F.3d 1 (1990). " +
      "Doe v. Roe, 200 F.3d 50 (2000). " +
      "Smith, 100 F.3d at 5."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const smith = citations.find((c) => c.type === "case" && c.volume === 100)!
    const shortForm = citations.find((c) => c.type === "shortFormCase")!
    expect(shortForm.resolution?.resolvedTo).toBe(citations.indexOf(smith))
    expect(shortForm.resolution?.antecedentIndex).toBe(shortForm.resolution?.resolvedTo)
  })

  it("shortFormCase recency-fallback across an intervening case — both pointers are the resolved case", () => {
    // Same shape with no back-reference party name, exercising the
    // recency-fallback branch: `100 F.3d at 5` resolves to the only
    // vol+reporter match (Smith), not the positional predecessor (Doe).
    const text =
      "Smith v. Jones, 100 F.3d 1 (1990). " +
      "Doe v. Roe, 200 F.3d 50 (2000). " +
      "100 F.3d at 5."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const smith = citations.find((c) => c.type === "case" && c.volume === 100)!
    const shortForm = citations.find((c) => c.type === "shortFormCase")!
    expect(shortForm.resolution?.resolvedTo).toBe(citations.indexOf(smith))
    expect(shortForm.resolution?.antecedentIndex).toBe(shortForm.resolution?.resolvedTo)
  })

  it("immediate antecedent (no intervening cite) — already agreed; lock it in", () => {
    const text = "Smith v. Jones, 100 F.3d 1 (1990). Smith, supra, at 5."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const smith = citations.find((c) => c.type === "case")!
    const supra = citations.find((c) => c.type === "supra")!
    expect(supra.resolution?.resolvedTo).toBe(citations.indexOf(smith))
    expect(supra.resolution?.antecedentIndex).toBe(citations.indexOf(smith))
  })

  it("carve-out: unresolved shortFormCase still records the positional predecessor", () => {
    // vol+reporter lookup fails (400 F.3d ≠ 500 F.2d) → resolvedTo undefined.
    // The fallback path keeps `findImmediatePredecessor` so a later `Id.` (or
    // a consumer walking the chain) can still cluster with the short form.
    const text = "Smith v. Jones, 500 F.2d 123. See 400 F.3d at 200."
    const citations = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const shortForm = citations.find((c) => c.type === "shortFormCase")!
    expect(shortForm.resolution?.resolvedTo).toBeUndefined()
    expect(shortForm.resolution?.antecedentIndex).toBe(0)
  })
})
