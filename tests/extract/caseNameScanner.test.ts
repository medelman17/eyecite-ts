import { describe, expect, it } from "vitest"
import { extractCaseName } from "@/extract/caseNameScanner"
import type { TransformationMap } from "@/types/span"

const identityMap: TransformationMap = {
  cleanToOriginal: new Map(),
  originalToClean: new Map(),
}

function citationStart(text: string, citation: string): number {
  const start = text.indexOf(citation)
  if (start === -1) {
    throw new Error(`Missing test citation: ${citation}`)
  }
  return start
}

describe("case-name scanner", () => {
  it("scans backward to the nearest v-style case name", () => {
    const text = "The court held in Smith v. Jones, 500 F.2d 123 (2020)."

    const result = extractCaseName(text, citationStart(text, "500 F.2d 123"), undefined, {
      transformationMap: identityMap,
    })

    expect(result).toMatchObject({
      caseName: "Smith v. Jones",
      nameStart: text.indexOf("Smith"),
    })
  })

  it("returns CSM year-first metadata with clean-coordinate year spans", () => {
    const text = "In re K.F. (2009) 173 Cal.App.4th 655"
    const yearStart = text.indexOf("2009")

    const result = extractCaseName(text, citationStart(text, "173 Cal.App.4th 655"), undefined, {
      transformationMap: identityMap,
    })

    expect(result).toMatchObject({
      caseName: "In re K.F.",
      nameStart: 0,
      year: 2009,
      yearStart,
      yearEnd: yearStart + 4,
    })
  })

  it("returns Louisiana docket-prefix metadata for trailing reporter citations", () => {
    const text = "Smith v. Jones, 07-393, p. 2 (La. App. 3d Cir. 10/3/07), 966 So. 2d 1127"

    const result = extractCaseName(text, citationStart(text, "966 So. 2d 1127"), undefined, {
      transformationMap: identityMap,
    })

    expect(result).toMatchObject({
      caseName: "Smith v. Jones",
      nameStart: 0,
      precedingDocketMeta: {
        court: "La. App. 3d Cir.",
        year: 2007,
        date: {
          iso: "2007-10-03",
          parsed: { year: 2007, month: 10, day: 3 },
        },
      },
    })
  })

  it("does not treat short-form markers as generic single-party captions", () => {
    const text = "the plaintiff suffered no physical injury. Id., 584 N.Y.S.2d 744"

    const result = extractCaseName(text, citationStart(text, "584 N.Y.S.2d 744"), undefined, {
      transformationMap: identityMap,
    })

    expect(result).toBeUndefined()
  })
})
