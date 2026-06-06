import { describe, expect, it } from "vitest"
import { interpretCasePartySemantics } from "@/extract/casePartySemantics"
import type { Span, TransformationMap } from "@/types/span"

const identityMap: TransformationMap = {
  cleanToOriginal: new Map(),
  originalToClean: new Map(),
}

function fullSpan(cleanStart: number, cleanEnd: number): Span {
  return { cleanStart, cleanEnd, originalStart: cleanStart, originalEnd: cleanEnd }
}

function citationCoreStart(text: string, citationCore: string): number {
  const start = text.indexOf(citationCore)
  if (start === -1) {
    throw new Error(`Missing citation core: ${citationCore}`)
  }
  return start
}

describe("case party semantic interpreter", () => {
  it("extracts adversarial parties and their source spans", () => {
    const text = "Smith v. Jones, 500 F.2d 123"

    const semantics = interpretCasePartySemantics({
      caseName: "Smith v. Jones",
      caseNameStart: 0,
      citationCoreStart: citationCoreStart(text, "500 F.2d 123"),
      fullSpan: fullSpan(0, text.length),
      cleanedText: text,
      transformationMap: identityMap,
    })

    expect(semantics).toMatchObject({
      caseName: "Smith v. Jones",
      plaintiff: "Smith",
      plaintiffNormalized: "smith",
      defendant: "Jones",
      defendantNormalized: "jones",
      spans: {
        plaintiff: { cleanStart: 0, cleanEnd: 5, originalStart: 0, originalEnd: 5 },
        defendant: { cleanStart: 9, cleanEnd: 14, originalStart: 9, originalEnd: 14 },
      },
    })
  })

  it("strips citation signals from the case name and advances the full span", () => {
    const text = "See also Smith v. Jones, 500 F.2d 123"
    const smithStart = text.indexOf("Smith")

    const semantics = interpretCasePartySemantics({
      caseName: "See also Smith v. Jones",
      caseNameStart: 0,
      citationCoreStart: citationCoreStart(text, "500 F.2d 123"),
      fullSpan: fullSpan(0, text.length),
      cleanedText: text,
      transformationMap: identityMap,
    })

    expect(semantics).toMatchObject({
      caseName: "Smith v. Jones",
      signal: "see also",
      fullSpan: {
        cleanStart: smithStart,
        cleanEnd: text.length,
        originalStart: smithStart,
        originalEnd: text.length,
      },
      spans: {
        caseName: {
          cleanStart: smithStart,
          cleanEnd: smithStart + "Smith v. Jones".length,
          originalStart: smithStart,
          originalEnd: smithStart + "Smith v. Jones".length,
        },
        signal: { cleanStart: 0, cleanEnd: "See also".length },
        plaintiff: { cleanStart: smithStart, cleanEnd: smithStart + "Smith".length },
      },
    })
  })

  it("extracts procedural party semantics without a defendant", () => {
    const text = "In re Debtor LLC, 612 B.R. 45"

    const semantics = interpretCasePartySemantics({
      caseName: "In re Debtor LLC",
      caseNameStart: 0,
      citationCoreStart: citationCoreStart(text, "612 B.R. 45"),
      fullSpan: fullSpan(0, text.length),
      cleanedText: text,
      transformationMap: identityMap,
    })

    expect(semantics).toMatchObject({
      caseName: "In re Debtor LLC",
      plaintiff: "In re Debtor LLC",
      plaintiffNormalized: "debtor",
      proceduralPrefix: "In re",
      spans: {
        plaintiff: {
          cleanStart: 0,
          cleanEnd: "In re Debtor LLC".length,
          originalStart: 0,
          originalEnd: "In re Debtor LLC".length,
        },
      },
    })
  })

  it("preserves bankruptcy admin parentheticals on the case name", () => {
    const text = "Spence v. Hintze (In re Hintze), 570 B.R. 369"

    const semantics = interpretCasePartySemantics({
      caseName: "Spence v. Hintze (In re Hintze)",
      caseNameStart: 0,
      citationCoreStart: citationCoreStart(text, "570 B.R. 369"),
      fullSpan: fullSpan(0, text.length),
      cleanedText: text,
      transformationMap: identityMap,
    })

    expect(semantics).toMatchObject({
      caseName: "Spence v. Hintze (In re Hintze)",
      plaintiff: "Spence",
      defendant: "Hintze",
      adminParenthetical: "In re Hintze",
      spans: {
        defendant: {
          cleanStart: "Spence v. ".length,
          cleanEnd: "Spence v. Hintze".length,
        },
      },
    })
  })
})
