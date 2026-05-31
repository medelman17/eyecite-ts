import { describe, expect, it } from "vitest"
import { extractCitations } from "@/index"

/**
 * Issue #321 (part: plural-section prose) — `Sections 5 and 10 of Article I
 * of the Ohio Constitution`. The section-first prose pattern matches a
 * single `Section N` only, so the coordinated plural form (`Sections N and
 * M`) dropped every section. Each section number now emits its own
 * `constitutional` citation sharing the article + jurisdiction, mirroring
 * the plural-section statute expansion (#453) and bare-amendment-coord
 * (#657).
 */
const consts = (t: string) =>
  extractCitations(t).filter((c) => c.type === "constitutional") as Array<{
    article?: number
    section?: string
    jurisdiction?: string
  }>

describe("Issue #321 - plural-section constitutional prose", () => {
  it("`Sections 5 and 10 of Article I of the Ohio Constitution` → two cites", () => {
    const cs = consts("violates Sections 5 and 10 of Article I of the Ohio Constitution")
    expect(cs).toHaveLength(2)
    expect(cs.map((c) => c.section)).toEqual(["5", "10"])
    for (const c of cs) {
      expect(c.article).toBe(1)
      expect(c.jurisdiction).toBe("OH")
    }
  })

  it("Oxford-comma list `Sections 5, 7, and 10 of Article I of the California Constitution` → three cites", () => {
    const cs = consts("Sections 5, 7, and 10 of Article I of the California Constitution")
    expect(cs.map((c) => c.section)).toEqual(["5", "7", "10"])
    for (const c of cs) {
      expect(c.article).toBe(1)
      expect(c.jurisdiction).toBe("CA")
    }
  })

  it("singular `Section 5(B), Article IV of the Ohio Constitution` unchanged (one cite)", () => {
    const cs = consts("Section 5(B), Article IV of the Ohio Constitution")
    expect(cs).toHaveLength(1)
    expect(cs[0].section).toBe("5(B)")
    expect(cs[0].article).toBe(4)
    expect(cs[0].jurisdiction).toBe("OH")
  })

  it("FP guard: `Sections 5 and 10 of the lease agreement` (no Article/Constitution) → none", () => {
    const cs = consts("See Sections 5 and 10 of the lease agreement.")
    expect(cs).toHaveLength(0)
  })
})
