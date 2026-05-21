import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { ResolvedCitation } from "@/resolve/types"
import type { ShortFormCaseCitation } from "@/types/citation"

const resolved = (text: string): ResolvedCitation[] =>
  extractCitations(text, { resolve: true })

describe("shortFormCase partyName disambiguation (no `v.` in antecedent)", () => {
  it("`Smith, 100 F.2d 1. Doe, 100 F.2d 5. Smith, 100 F.2d at 3.` resolves to Smith (index 0), not Doe", () => {
    const cs = resolved("Smith, 100 F.2d 1. Doe, 100 F.2d 5. Smith, 100 F.2d at 3.")
    const sf = cs.find((c) => c.type === "shortFormCase") as
      | (ShortFormCaseCitation & { resolution?: { resolvedTo?: number } })
      | undefined
    expect(sf).toBeDefined()
    expect(sf?.resolution?.resolvedTo).toBe(0)
  })

  it("`Smith, 100 F.2d 1. Doe, 100 F.2d 5. Doe, 100 F.2d at 7.` resolves to Doe (index 1)", () => {
    const cs = resolved("Smith, 100 F.2d 1. Doe, 100 F.2d 5. Doe, 100 F.2d at 7.")
    const sf = cs.find((c) => c.type === "shortFormCase") as
      | (ShortFormCaseCitation & { resolution?: { resolvedTo?: number } })
      | undefined
    expect(sf).toBeDefined()
    expect(sf?.resolution?.resolvedTo).toBe(1)
  })

  it("three same-vol+reporter cases — Smith shortform picks Smith (index 0), not most recent", () => {
    const cs = resolved(
      "Smith, 100 F.2d 1. Doe, 100 F.2d 5. Roe, 100 F.2d 9. Smith, 100 F.2d at 3.",
    )
    const sf = cs.find((c) => c.type === "shortFormCase") as
      | (ShortFormCaseCitation & { resolution?: { resolvedTo?: number } })
      | undefined
    expect(sf).toBeDefined()
    expect(sf?.resolution?.resolvedTo).toBe(0)
  })

  it("three same-vol+reporter cases — Roe shortform picks Roe (index 2)", () => {
    const cs = resolved(
      "Smith, 100 F.2d 1. Doe, 100 F.2d 5. Roe, 100 F.2d 9. Roe, 100 F.2d at 12.",
    )
    const sf = cs.find((c) => c.type === "shortFormCase") as
      | (ShortFormCaseCitation & { resolution?: { resolvedTo?: number } })
      | undefined
    expect(sf?.resolution?.resolvedTo).toBe(2)
  })

  it("regression: full `v.` antecedent still works", () => {
    const cs = resolved(
      "Smith v. Jones, 100 F.2d 1. Doe v. Roe, 100 F.2d 5. Smith, 100 F.2d at 3.",
    )
    const sf = cs.find((c) => c.type === "shortFormCase") as
      | (ShortFormCaseCitation & { resolution?: { resolvedTo?: number } })
      | undefined
    expect(sf?.resolution?.resolvedTo).toBe(0)
  })

  it("regression: only one candidate falls through to recency", () => {
    const cs = resolved("Smith, 100 F.2d 1. Smith, 100 F.2d at 3.")
    const sf = cs.find((c) => c.type === "shortFormCase") as
      | (ShortFormCaseCitation & { resolution?: { resolvedTo?: number } })
      | undefined
    expect(sf?.resolution?.resolvedTo).toBe(0)
  })
})
