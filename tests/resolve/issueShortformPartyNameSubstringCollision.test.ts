import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { ResolvedCitation } from "@/resolve/types"
import type { ShortFormCaseCitation } from "@/types/citation"

const resolved = (text: string): ResolvedCitation[] =>
  extractCitations(text, { resolve: true })

describe("shortFormCase partyName must word-boundary match (no prefix collisions)", () => {
  it("`Smith` does not match `Smithers` (prefix collision)", () => {
    const cs = resolved(
      "Smith v. Jones, 100 F.2d 1. Smithers v. Brown, 100 F.2d 50. Smith, 100 F.2d at 7.",
    )
    const sf = cs.find((c) => c.type === "shortFormCase") as
      | (ShortFormCaseCitation & { resolution?: { resolvedTo?: number } })
      | undefined
    expect(sf?.resolution?.resolvedTo).toBe(0)
  })

  it("`Doe` does not match `Doering`", () => {
    const cs = resolved(
      "Doe v. Acme, 100 F.2d 1. Doering v. Beta, 100 F.2d 50. Doe, 100 F.2d at 7.",
    )
    const sf = cs.find((c) => c.type === "shortFormCase") as
      | (ShortFormCaseCitation & { resolution?: { resolvedTo?: number } })
      | undefined
    expect(sf?.resolution?.resolvedTo).toBe(0)
  })

  it("regression: `Smith` still matches `Smith, Inc.` (whole-word containment)", () => {
    const cs = resolved(
      "Smith, Inc. v. Jones, 100 F.2d 1. Doe v. Roe, 100 F.2d 50. Smith, 100 F.2d at 7.",
    )
    const sf = cs.find((c) => c.type === "shortFormCase") as
      | (ShortFormCaseCitation & { resolution?: { resolvedTo?: number } })
      | undefined
    expect(sf?.resolution?.resolvedTo).toBe(0)
  })

  it("regression: `Smith, Inc.` still matches `Smith` (reverse direction)", () => {
    const cs = resolved(
      "Smith v. Jones, 100 F.2d 1. Doe v. Roe, 100 F.2d 50. Smith, Inc., 100 F.2d at 7.",
    )
    const sf = cs.find((c) => c.type === "shortFormCase") as
      | (ShortFormCaseCitation & { resolution?: { resolvedTo?: number } })
      | undefined
    expect(sf?.resolution?.resolvedTo).toBe(0)
  })

  it("regression: exact-match still works", () => {
    const cs = resolved(
      "Smith v. Jones, 100 F.2d 1. Doe v. Roe, 100 F.2d 50. Smith, 100 F.2d at 7.",
    )
    const sf = cs.find((c) => c.type === "shortFormCase") as
      | (ShortFormCaseCitation & { resolution?: { resolvedTo?: number } })
      | undefined
    expect(sf?.resolution?.resolvedTo).toBe(0)
  })
})
