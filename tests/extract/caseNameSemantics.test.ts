import { describe, expect, it } from "vitest"
import { interpretCaseNameScan } from "@/extract/caseNameSemantics"
import type { TransformationMap } from "@/types/span"

const identityMap: TransformationMap = {
  cleanToOriginal: new Map(),
  originalToClean: new Map(),
}

function spanOf(text: string, needle: string): { cleanStart: number; cleanEnd: number } {
  const cleanStart = text.indexOf(needle)
  if (cleanStart === -1) {
    throw new Error(`Missing test needle: ${needle}`)
  }
  return { cleanStart, cleanEnd: cleanStart + needle.length }
}

describe("case-name scan semantic interpreter", () => {
  it("strips absorbed old-style bare years from the scanned case name", () => {
    const text = "Seymour v. Osborne, 1870, 11 Wall. 516"
    const semantics = interpretCaseNameScan({
      caseNameResult: {
        caseName: "Seymour v. Osborne, 1870",
        nameStart: 0,
      },
      tokenSpan: spanOf(text, "11 Wall. 516"),
      transformationMap: identityMap,
    })

    expect(semantics).toMatchObject({
      caseName: "Seymour v. Osborne",
      year: 1870,
      fullSpan: {
        cleanStart: 0,
        cleanEnd: text.length,
        originalStart: 0,
        originalEnd: text.length,
      },
      spans: {
        caseName: {
          cleanStart: 0,
          cleanEnd: "Seymour v. Osborne".length,
          originalStart: 0,
          originalEnd: "Seymour v. Osborne".length,
        },
      },
    })
  })

  it("uses a CSM year-first scan result when no trailing metadata supplied a year", () => {
    const text = "In re K.F. (2009) 173 Cal.App.4th 655"
    const tokenSpan = spanOf(text, "173 Cal.App.4th 655")
    const yearStart = text.indexOf("2009")

    const semantics = interpretCaseNameScan({
      caseNameResult: {
        caseName: "In re K.F.",
        nameStart: 0,
        year: 2009,
        yearStart,
        yearEnd: yearStart + 4,
      },
      tokenSpan,
      transformationMap: identityMap,
    })

    expect(semantics).toMatchObject({
      caseName: "In re K.F.",
      year: 2009,
      spans: {
        year: {
          cleanStart: yearStart,
          cleanEnd: yearStart + 4,
          originalStart: yearStart,
          originalEnd: yearStart + 4,
        },
      },
    })
  })

  it("keeps existing trailing metadata over CSM year-first scan metadata", () => {
    const text = "In re K.F. (2009) 173 Cal.App.4th 655 (Cal. Ct. App. 2010)"
    const yearStart = text.indexOf("2009")

    const semantics = interpretCaseNameScan({
      caseNameResult: {
        caseName: "In re K.F.",
        nameStart: 0,
        year: 2009,
        yearStart,
        yearEnd: yearStart + 4,
      },
      tokenSpan: spanOf(text, "173 Cal.App.4th 655"),
      postfixLastParentheticalEnd: text.length,
      year: 2010,
      hasExistingYearSpan: true,
      transformationMap: identityMap,
    })

    expect(semantics.year).toBe(2010)
    expect(semantics.spans.year).toBeUndefined()
  })

  it("uses preceding docket metadata as fallback court, year, and date", () => {
    const text = "Smith v. Jones, 07-393, p. 2 (La. App. 3d Cir. 10/3/07), 966 So. 2d 1127"
    const date = { iso: "2007-10-03", parsed: { year: 2007, month: 10, day: 3 } }

    const semantics = interpretCaseNameScan({
      caseNameResult: {
        caseName: "Smith v. Jones",
        nameStart: 0,
        precedingDocketMeta: {
          court: "La. App. 3d Cir.",
          year: 2007,
          date,
        },
      },
      tokenSpan: spanOf(text, "966 So. 2d 1127"),
      transformationMap: identityMap,
    })

    expect(semantics).toMatchObject({
      court: "La. App. 3d Cir.",
      year: 2007,
      date,
    })
  })

  it("extends the initial full span through the last postfix parenthetical", () => {
    const text = "Smith v. Jones, 500 F.2d 123 (9th Cir. 2020) (holding that X)"

    const semantics = interpretCaseNameScan({
      caseNameResult: {
        caseName: "Smith v. Jones",
        nameStart: 0,
      },
      tokenSpan: spanOf(text, "500 F.2d 123"),
      postfixLastParentheticalEnd: text.length,
      transformationMap: identityMap,
    })

    expect(semantics.fullSpan).toEqual({
      cleanStart: 0,
      cleanEnd: text.length,
      originalStart: 0,
      originalEnd: text.length,
    })
  })
})
