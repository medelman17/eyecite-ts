import { describe, expect, it } from "vitest"
import { extractCitations } from "@/extract"
import type { FullCaseCitation } from "@/types/citation"

/**
 * Issue #511: old-style citation form `Name, YEAR, vol Reporter page` (and
 * `Name, COURT, MONTH DAY, YEAR, vol Reporter page`) leaves the trailing
 * year / court / date in the captured caseName.
 *
 * Fix shape: trim a trailing `,\s+\d{4}` (and the more elaborate
 * `,\s+\d{1,2}\s+Cir\.,\s+Month \d{1,2}, \d{4}` form) from the captured
 * caseName when it sits immediately before the citation core.
 */
describe("issue #511 — old-style date-prefix citation form", () => {
  const caseName = (text: string): string | undefined => {
    const cs = extractCitations(text)
    const cc = cs.find((c) => c.type === "case") as FullCaseCitation | undefined
    return cc?.caseName
  }

  it("strips `, YYYY` from caseName: `Seymour v. Osborne, 1870, 11 Wall. 516`", () => {
    expect(caseName("Seymour v. Osborne, 1870, 11 Wall. 516")).toBe(
      "Seymour v. Osborne",
    )
  })

  it("strips `, YYYY` from caseName: `MacPherson v. Buick Motor Co., 1916, 217 N.Y. 382`", () => {
    expect(caseName("MacPherson v. Buick Motor Co., 1916, 217 N.Y. 382")).toBe(
      "MacPherson v. Buick Motor Co.",
    )
  })

  it("strips `, YYYY` from caseName: `Kendall v. Winsor, 1858, 21 How. 322`", () => {
    expect(caseName("Kendall v. Winsor, 1858, 21 How. 322")).toBe(
      "Kendall v. Winsor",
    )
  })

  it("strips `, COURT, MONTH DAY, YYYY` from caseName: `Picard v. United Aircraft, 2 Cir., May 28, 1942, 128 F.2d 632`", () => {
    expect(
      caseName("Picard v. United Aircraft, 2 Cir., May 28, 1942, 128 F.2d 632"),
    ).toBe("Picard v. United Aircraft")
  })
})
