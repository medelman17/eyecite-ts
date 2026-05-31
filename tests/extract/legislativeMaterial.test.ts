import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { LegislativeMaterialCitation } from "@/types/citation"

/**
 * Legislative-material citations (#308): House/Senate committee reports
 * (`H.R. Rep. No. 94-1487, p. 16 (1976)`) and the Congressional Record
 * (`112 Cong. Rec. 1234`), unified under the `legislativeMaterial` type with a
 * `kind` discriminator. The "U.S. Code Cong. & Admin. News" form is a follow-up.
 */
const legmat = (t: string): LegislativeMaterialCitation | undefined =>
  extractCitations(t).find((c): c is LegislativeMaterialCitation => c.type === "legislativeMaterial")

describe("legislative materials — committee reports (#308)", () => {
  it("H.R. Rep. No. 94-1487, p. 16 (1976)", () => {
    const c = legmat("H.R. Rep. No. 94-1487, p. 16 (1976)")
    expect(c).toBeDefined()
    expect(c?.kind).toBe("report")
    expect(c?.chamber).toBe("House")
    expect(c?.reportNumber).toBe("94-1487")
    expect(c?.page).toBe(16)
    expect(c?.year).toBe(1976)
  })

  it("S. Rep. No. 989, 95th Cong., 2d Sess. 86 (congress + session + bare page)", () => {
    const c = legmat("S. Rep. No. 989, 95th Cong., 2d Sess. 86")
    expect(c).toBeDefined()
    expect(c?.chamber).toBe("Senate")
    expect(c?.reportNumber).toBe("989")
    expect(c?.congress).toBe(95)
    expect(c?.session).toBe("2d")
    expect(c?.page).toBe(86)
  })

  it("S. Rep. No. 861, at 2 (at-page form)", () => {
    const c = legmat("S. Rep. No. 861, at 2")
    expect(c).toBeDefined()
    expect(c?.chamber).toBe("Senate")
    expect(c?.reportNumber).toBe("861")
    expect(c?.page).toBe(2)
  })

  it("H. R. Rep. No. 595 (spaced abbreviation)", () => {
    const c = legmat("see H. R. Rep. No. 595, 95th Cong., 1st Sess. 371")
    expect(c).toBeDefined()
    expect(c?.chamber).toBe("House")
    expect(c?.reportNumber).toBe("595")
    expect(c?.congress).toBe(95)
    expect(c?.session).toBe("1st")
    expect(c?.page).toBe(371)
  })
})

describe("legislative materials — Congressional Record (#308)", () => {
  it("112 Cong. Rec. 1234", () => {
    const c = legmat("112 Cong. Rec. 1234")
    expect(c).toBeDefined()
    expect(c?.kind).toBe("congressionalRecord")
    expect(c?.volume).toBe(112)
    expect(c?.page).toBe(1234)
  })
})

describe("legislative-material regression", () => {
  it("does not false-positive on prose 'report'", () => {
    const cits = extractCitations("The committee report was thorough.")
    expect(cits.some((c) => c.type === "legislativeMaterial")).toBe(false)
  })
})
