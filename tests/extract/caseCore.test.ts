import { describe, expect, it } from "vitest"
import { parseCaseCitationCore } from "@/extract/caseCore"
import type { Token } from "@/tokenize"
import type { TransformationMap } from "@/types/span"

const identityMap: TransformationMap = {
  cleanToOriginal: new Map(),
  originalToClean: new Map(),
}

function token(text: string, cleanStart = 0): Token {
  return {
    text,
    span: { cleanStart, cleanEnd: cleanStart + text.length },
    type: "case",
    patternId: "test-case-core",
  }
}

describe("case citation core parser", () => {
  it("parses canonical volume reporter page cores with component spans", () => {
    const core = parseCaseCitationCore({
      token: token("500 F.2d 123", 10),
      transformationMap: identityMap,
    })

    expect(core).toMatchObject({
      volume: 500,
      reporter: "F.2d",
      page: 123,
      spans: {
        volume: { cleanStart: 10, cleanEnd: 13, originalStart: 10, originalEnd: 13 },
        reporter: { cleanStart: 14, cleanEnd: 18, originalStart: 14, originalEnd: 18 },
        page: { cleanStart: 19, cleanEnd: 22, originalStart: 19, originalEnd: 22 },
      },
    })
    expect(core.hasBlankPage).toBeUndefined()
  })

  it("keeps hyphenated volumes as strings", () => {
    const core = parseCaseCitationCore({
      token: token("1984-1 T.C. 10"),
      transformationMap: identityMap,
    })

    expect(core.volume).toBe("1984-1")
    expect(core.reporter).toBe("T.C.")
    expect(core.page).toBe(10)
  })

  it("parses nominative reporter parentheticals", () => {
    const core = parseCaseCitationCore({
      token: token("67 U.S. (2 Black) 635"),
      transformationMap: identityMap,
    })

    expect(core).toMatchObject({
      volume: 67,
      reporter: "U.S.",
      nominativeVolume: 2,
      nominativeReporter: "Black",
      page: 635,
    })
  })

  it("parses blank page placeholders without a numeric page", () => {
    const core = parseCaseCitationCore({
      token: token("500 F.2d ___"),
      transformationMap: identityMap,
    })

    expect(core).toMatchObject({
      volume: 500,
      reporter: "F.2d",
      hasBlankPage: true,
    })
    expect(core.page).toBeUndefined()
    expect(core.spans.page).toMatchObject({ cleanStart: 9, cleanEnd: 12 })
  })

  it("falls back to comma-form volume reporter page cores", () => {
    const core = parseCaseCitationCore({
      token: token("3 Den., 594"),
      transformationMap: identityMap,
    })

    expect(core).toMatchObject({
      volume: 3,
      reporter: "Den.",
      page: 594,
    })
  })

  it("throws on malformed case cores", () => {
    expect(() =>
      parseCaseCitationCore({
        token: token("not a case core"),
        transformationMap: identityMap,
      }),
    ).toThrow("Failed to parse case citation: not a case core")
  })
})
