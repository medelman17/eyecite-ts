/**
 * Issue #876 (slice 1): the resolver's pre-Phase-7 prose-scanning party-name
 * fallback (`extractPartyName`) was removed as dead code — extraction's
 * structured `plaintiffNormalized`/`defendantNormalized` subsume it. These
 * pin that supra / short-form resolution still works via the EXTRACTED party
 * names, so the removal stays safe against future regression.
 */

import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract/extractCitations"
import type { ResolvedCitation } from "@/resolve/types"

describe("Issue #876: resolution via extracted party names (no prose-scan fallback)", () => {
  it("supra resolves to its full citation via the extracted plaintiff name", () => {
    const text = "Smith v. Jones, 100 F.3d 1 (2d Cir. 1990). The court agreed. Smith, supra, at 5."
    const cites = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const full = cites.find((c) => c.type === "case")!
    const supra = cites.find((c) => c.type === "supra")!
    expect(supra.resolution?.resolvedTo).toBe(cites.indexOf(full))
  })

  it("short-form case resolves to its full citation via the extracted caption", () => {
    const text = "Smith v. Jones, 100 F.3d 1 (2d Cir. 1990). The court agreed. Smith, 100 F.3d at 5."
    const cites = extractCitations(text, { resolve: true }) as ResolvedCitation[]
    const full = cites.find((c) => c.type === "case")!
    const shortForm = cites.find((c) => c.type === "shortFormCase")!
    expect(shortForm.resolution?.resolvedTo).toBe(cites.indexOf(full))
  })
})
