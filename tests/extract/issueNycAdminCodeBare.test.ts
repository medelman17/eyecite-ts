import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #594 — `NYC Admin. Code § N` (bare prefix without periods) was
 * mis-tagged as Georgia by the `ga-pre-1983` fallback because the
 * `nyc-admin-code` pattern required the period-rich `N.Y.C.` form.
 * Extended the tokenizer and extractor regexes to accept the bare form.
 *
 * Canonical and spelled-out forms were already correct from an earlier
 * patch; this is the bare-prefix follow-up.
 */
describe("Issue #594 - NYC Admin Code bare prefix", () => {
  it("`NYC Admin. Code § 8-107` routes to NY (not GA)", () => {
    const cs = extractCitations(`NYC Admin. Code § 8-107`).filter(
      (c) => c.type === "statute",
    )
    expect(cs).toHaveLength(1)
    const c = cs[0] as { code?: string; jurisdiction?: string }
    expect(c.code).toBe("N.Y.C. Admin. Code")
    expect(c.jurisdiction).toBe("NY")
  })

  it("`NYC Admin Code § 8-107` (no period after Admin) also routes to NY", () => {
    const cs = extractCitations(`NYC Admin Code § 8-107`).filter(
      (c) => c.type === "statute",
    )
    expect(cs).toHaveLength(1)
    const c = cs[0] as { code?: string; jurisdiction?: string }
    expect(c.code).toBe("N.Y.C. Admin. Code")
    expect(c.jurisdiction).toBe("NY")
  })

  it("canonical `N.Y.C. Admin. Code § 8-107(1)(a)` unchanged", () => {
    const cs = extractCitations(`N.Y.C. Admin. Code § 8-107(1)(a)`).filter(
      (c) => c.type === "statute",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { code?: string }).code).toBe("N.Y.C. Admin. Code")
  })

  it("spelled-out `New York City Administrative Code § 8-107` unchanged", () => {
    const cs = extractCitations(`New York City Administrative Code § 8-107`).filter(
      (c) => c.type === "statute",
    )
    expect(cs).toHaveLength(1)
    expect((cs[0] as { code?: string }).code).toBe("N.Y.C. Admin. Code")
  })
})
