import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"

const cases = (text: string): FullCaseCitation[] =>
  extractCitations(text).filter((c): c is FullCaseCitation => c.type === "case")

describe("#641 case name with leading numeric prefix preserved", () => {
  it("`2312-2316 Realty Corp. v. Font, 140 Misc. 2d 901` keeps numeric prefix", () => {
    const cs = cases("2312-2316 Realty Corp. v. Font, 140 Misc. 2d 901")
    expect(cs).toHaveLength(1)
    expect(cs[0].caseName).toBe("2312-2316 Realty Corp. v. Font")
  })

  it("`235 East 73rd Street, Inc. v. Smith, 100 N.Y.S.2d 1`", () => {
    const cs = cases("235 East 73rd Street, Inc. v. Smith, 100 N.Y.S.2d 1")
    expect(cs).toHaveLength(1)
    expect(cs[0].caseName).toMatch(/235 East 73rd Street/)
  })

  it("`125 Broadway Associates v. NYC, 100 N.E.2d 200`", () => {
    const cs = cases("125 Broadway Associates v. NYC, 100 N.E.2d 200")
    expect(cs).toHaveLength(1)
    expect(cs[0].caseName).toMatch(/125 Broadway Associates/)
  })

  it("does NOT incorrectly include leading volume digit from a prior cite", () => {
    // Make sure the existing boundary detection (digit-period-space) still
    // works — when a prior citation's page ends in `.`, the next caption
    // should not include that digit.
    const cs = cases("See 500 F.2d 100. Smith v. Jones, 600 F.2d 200.")
    const smith = cs.find((c) => c.volume === 600)
    expect(smith?.caseName).toBe("Smith v. Jones")
  })

  it("normal alphabetic case names still work (regression)", () => {
    const cs = cases("Smith v. Jones, 500 F.2d 100")
    expect(cs).toHaveLength(1)
    expect(cs[0].caseName).toBe("Smith v. Jones")
  })
})
