import { describe, expect, it } from "vitest"
import { extractCitations } from "../../src"

describe("issue #202: footnote in pincite", () => {
  it("populates footnote for full-case n.N", () => {
    const cites = extractCitations("Smith v. Jones, 100 F.3d 456, 460 n.14 (2d Cir. 2020).", {
      resolve: true,
    })
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    expect(c?.type === "case" ? c.pinciteInfo : undefined).toEqual({
      page: 460,
      footnote: 14,
      isRange: false,
      raw: "460 n.14",
    })
  })

  it("populates footnote for full-case nn.N-N", () => {
    const cites = extractCitations("Smith v. Jones, 100 F.3d 456, 460 nn.14-15 (2d Cir. 2020).")
    const c = cites.find((c) => c.type === "case")
    expect(c).toBeDefined()
    const info = c?.type === "case" ? c.pinciteInfo : undefined
    expect(info?.footnote).toBe(14)
    expect(info?.footnoteEnd).toBe(15)
    expect(info?.raw).toContain("nn.14-15")
  })

  it("populates footnote for short-form case", () => {
    const cites = extractCitations(
      "See Smith v. Jones, 100 F.3d 456, 460 (2d Cir. 2020). Smith, 100 F.3d at 462 n.14.",
      { resolve: true },
    )
    const shortform = cites.find((c) => c.type === "shortFormCase")
    expect(shortform).toBeDefined()
    expect(shortform?.type === "shortFormCase" ? shortform.pinciteInfo?.footnote : undefined).toBe(
      14,
    )
  })

  it("populates footnote for Id. citation", () => {
    const cites = extractCitations(
      "Smith v. Jones, 100 F.3d 456, 460 (2d Cir. 2020). Id. at 462 n.14.",
      { resolve: true },
    )
    const id = cites.find((c) => c.type === "id")
    expect(id).toBeDefined()
    expect(id?.type === "id" ? id.pinciteInfo?.footnote : undefined).toBe(14)
  })

  it("populates footnote for neutral citation", () => {
    const cites = extractCitations("See 2020 WL 1234567, at *3 n.4 (S.D.N.Y. Jan. 15, 2020).", {
      resolve: true,
    })
    const neutral = cites.find((c) => c.type === "neutral")
    expect(neutral).toBeDefined()
    const info = neutral?.type === "neutral" ? neutral.pinciteInfo : undefined
    expect(info?.footnote).toBe(4)
    expect(info?.starPage).toBe(true)
  })
})
