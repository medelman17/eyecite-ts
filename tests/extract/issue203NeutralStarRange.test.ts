import { describe, expect, it } from "vitest"
import { extractCitations } from "../../src"

describe("issue #203: neutral star-page range pincite", () => {
  it("captures range end with star on both ends (*3-*5)", () => {
    const cites = extractCitations(
      "See 2020 WL 1234567, at *3-*5 (S.D.N.Y. Jan. 15, 2020).",
      { resolve: true },
    )
    const neutral = cites.find((c) => c.type === "neutral")
    expect(neutral).toBeDefined()
    const info = neutral?.type === "neutral" ? neutral.pinciteInfo : undefined
    expect(info).toEqual({
      page: 3,
      endPage: 5,
      isRange: true,
      starPage: true,
      raw: "*3-*5",
    })
  })

  it("captures range end with star on first only (*3-5)", () => {
    const cites = extractCitations(
      "See 2020 WL 1234567, at *3-5 (S.D.N.Y. 2020).",
      { resolve: true },
    )
    const neutral = cites.find((c) => c.type === "neutral")
    expect(neutral).toBeDefined()
    const info = neutral?.type === "neutral" ? neutral.pinciteInfo : undefined
    expect(info?.page).toBe(3)
    expect(info?.endPage).toBe(5)
    expect(info?.isRange).toBe(true)
    expect(info?.starPage).toBe(true)
  })

  it("still captures non-range star-page (*3)", () => {
    const cites = extractCitations("See 2020 WL 1234567, at *3 (S.D.N.Y. 2020).", {
      resolve: true,
    })
    const neutral = cites.find((c) => c.type === "neutral")
    expect(neutral).toBeDefined()
    const info = neutral?.type === "neutral" ? neutral.pinciteInfo : undefined
    expect(info?.page).toBe(3)
    expect(info?.isRange).toBe(false)
    expect(info?.starPage).toBe(true)
    expect(info?.endPage).toBeUndefined()
  })
})
