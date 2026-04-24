import { describe, expect, it } from "vitest"
import { extractCitations } from "../../src"

describe("issue #201: short-form case range pincite", () => {
  it("captures range end page (at 462-65)", () => {
    const cites = extractCitations(
      "See Smith v. Jones, 100 F.3d 456, 460 (2d Cir. 2020). Smith, 100 F.3d at 462-65.",
      { resolve: true },
    )
    const shortform = cites.find((c) => c.type === "shortFormCase")
    expect(shortform).toBeDefined()
    const info = shortform?.type === "shortFormCase" ? shortform.pinciteInfo : undefined
    expect(info).toEqual({
      page: 462,
      endPage: 465,
      isRange: true,
      raw: "462-65",
    })
  })

  it("captures range end page with full digits (at 462-465)", () => {
    const cites = extractCitations(
      "See Smith v. Jones, 100 F.3d 456, 460 (2d Cir. 2020). Smith, 100 F.3d at 462-465.",
      { resolve: true },
    )
    const shortform = cites.find((c) => c.type === "shortFormCase")
    expect(shortform).toBeDefined()
    const info = shortform?.type === "shortFormCase" ? shortform.pinciteInfo : undefined
    expect(info?.page).toBe(462)
    expect(info?.endPage).toBe(465)
    expect(info?.isRange).toBe(true)
  })

  it("captures range with footnote (at 462-65 n.3)", () => {
    const cites = extractCitations(
      "See Smith v. Jones, 100 F.3d 456, 460 (2d Cir. 2020). Smith, 100 F.3d at 462-65 n.3.",
      { resolve: true },
    )
    const shortform = cites.find((c) => c.type === "shortFormCase")
    expect(shortform).toBeDefined()
    const info = shortform?.type === "shortFormCase" ? shortform.pinciteInfo : undefined
    expect(info?.page).toBe(462)
    expect(info?.endPage).toBe(465)
    expect(info?.footnote).toBe(3)
    expect(info?.isRange).toBe(true)
  })

  it("still captures single-page pincite (at 462)", () => {
    const cites = extractCitations(
      "See Smith v. Jones, 100 F.3d 456, 460 (2d Cir. 2020). Smith, 100 F.3d at 462.",
      { resolve: true },
    )
    const shortform = cites.find((c) => c.type === "shortFormCase")
    expect(shortform).toBeDefined()
    const info = shortform?.type === "shortFormCase" ? shortform.pinciteInfo : undefined
    expect(info?.page).toBe(462)
    expect(info?.isRange).toBe(false)
    expect(info?.endPage).toBeUndefined()
  })
})
