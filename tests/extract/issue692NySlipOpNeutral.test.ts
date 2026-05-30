import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { NeutralCitation } from "@/types/citation"

/**
 * NY Slip Op citations are vendor-neutral identifiers (Bluebook 10.3.3), but the
 * reporter-backed case path types them as `case`. There is no neutral pattern
 * for the `YYYY NY Slip Op NNNNN(U)?` form, and a citation's `type` comes from
 * the matching pattern — extraction never consults the reporter-db `cite_type`.
 * So "NY Slip Op", a known reporter, flows through the case path. (#692)
 */
describe("NY Slip Op vendor-neutral citations (#692)", () => {
  it("types '2024 NY Slip Op 51234' as neutral, not case", () => {
    const cits = extractCitations("See 2024 NY Slip Op 51234.")
    const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
    expect(neutrals).toHaveLength(1)
    expect(neutrals[0].year).toBe(2024)
    expect(neutrals[0].documentNumber).toBe("51234")
    // "NY Slip Op" is a vendor identifier, not a court (mirrors LEXIS/WL, #294)
    expect(neutrals[0].database).toBe("NY Slip Op")
    expect(neutrals[0].court).toBeUndefined()
    // must no longer be mis-typed as a case citation
    expect(cits.some((c) => c.type === "case")).toBe(false)
  })

  it("captures the (U) unpublished marker", () => {
    const cits = extractCitations("See 2020 NY Slip Op 51234(U).")
    const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
    expect(neutrals).toHaveLength(1)
    expect(neutrals[0].documentNumber).toBe("51234")
    expect(neutrals[0].unpublished).toBe(true)
  })

  it("captures the [U] bracketed unpublished marker", () => {
    const cits = extractCitations("See 2019 NY Slip Op 29123[U].")
    const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
    expect(neutrals).toHaveLength(1)
    expect(neutrals[0].unpublished).toBe(true)
  })

  describe("regression — WL and LEXIS stay neutral", () => {
    it("'2020 WL 1234567' is neutral", () => {
      const cits = extractCitations("See 2020 WL 1234567.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].database).toBe("WL")
    })

    it("'2021 U.S. App. LEXIS 12345' is neutral", () => {
      const cits = extractCitations("See 2021 U.S. App. LEXIS 12345.")
      const neutrals = cits.filter((c): c is NeutralCitation => c.type === "neutral")
      expect(neutrals).toHaveLength(1)
      expect(neutrals[0].database).toBe("U.S. App. LEXIS")
    })
  })
})
