import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { LocalOrdinanceCitation } from "@/types/citation"

/**
 * Local / municipal ordinance citations (#778). Clark County Code/Ordinance
 * (`CCCO § 2.12.010(1)`) is the first member of the jurisdiction-general
 * `localOrdinance` type (reusable for Cook County, L.A. County, Miami-Dade).
 */
const ordinance = (t: string): LocalOrdinanceCitation | undefined =>
  extractCitations(t).find((c): c is LocalOrdinanceCitation => c.type === "localOrdinance")

describe("Clark County ordinances (#778)", () => {
  it("CCCO § 2.12.010(1)", () => {
    const c = ordinance("CCCO § 2.12.010(1)")
    expect(c).toBeDefined()
    expect(c?.code).toBe("CCCO")
    expect(c?.locality).toBe("Clark County, NV")
    expect(c?.section).toBe("2.12.010(1)")
  })

  it("CCCO § 2.12.080 (bare section)", () => {
    const c = ordinance("under CCCO § 2.12.080")
    expect(c).toBeDefined()
    expect(c?.section).toBe("2.12.080")
  })

  it("CCCO § 2.12.080(c) (parenthetical subsection)", () => {
    const c = ordinance("CCCO § 2.12.080(c)")
    expect(c).toBeDefined()
    expect(c?.section).toBe("2.12.080(c)")
  })

  it("CCCO § 2.12.020(e)", () => {
    const c = ordinance("see CCCO § 2.12.020(e).")
    expect(c).toBeDefined()
    expect(c?.section).toBe("2.12.020(e)")
  })
})

describe("local-ordinance regression", () => {
  it("does not false-positive on prose without the CCCO anchor", () => {
    const cits = extractCitations("The county code was amended.")
    expect(cits.some((c) => c.type === "localOrdinance")).toBe(false)
  })
})
