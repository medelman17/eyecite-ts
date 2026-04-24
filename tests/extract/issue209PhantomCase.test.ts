import { describe, expect, it } from "vitest"
import { extractCitations } from "../../src"

describe("issue #209: phantom FullCase alongside ShortForm with footnote pincite", () => {
  it("emits exactly 2 citations — no phantom case", () => {
    const cites = extractCitations(
      "See Smith v. Jones, 100 F.3d 456, 460 (2d Cir. 2020). Smith, 100 F.3d at 462 n.14.",
    )
    const types = cites.map((c) => c.type).sort()
    expect(types).toEqual(["case", "shortFormCase"])
  })

  it("legit full-case has pinciteInfo.raw='460'", () => {
    const cites = extractCitations(
      "See Smith v. Jones, 100 F.3d 456, 460 (2d Cir. 2020). Smith, 100 F.3d at 462 n.14.",
    )
    const cases = cites.filter((c) => c.type === "case")
    expect(cases).toHaveLength(1)
    expect(cases[0].type === "case" ? cases[0].pinciteInfo?.raw : undefined).toBe("460")
  })

  it("shortFormCase carries the footnote pincite", () => {
    const cites = extractCitations(
      "See Smith v. Jones, 100 F.3d 456, 460 (2d Cir. 2020). Smith, 100 F.3d at 462 n.14.",
    )
    const sf = cites.find((c) => c.type === "shortFormCase")
    expect(sf).toBeDefined()
    const info = sf?.type === "shortFormCase" ? sf.pinciteInfo : undefined
    expect(info?.raw).toBe("462 n.14")
    expect(info?.footnote).toBe(14)
  })

  it("same guarantee without footnote (regression baseline)", () => {
    const cites = extractCitations(
      "See Smith v. Jones, 100 F.3d 456, 460 (2d Cir. 2020). Smith, 100 F.3d at 462.",
    )
    const types = cites.map((c) => c.type).sort()
    expect(types).toEqual(["case", "shortFormCase"])
  })
})
