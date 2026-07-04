import { describe, expect, it } from "vitest"
import { parseCaseCitationPostfix } from "@/extract/casePostfix"
import { interpretCaseCitationPostfix } from "@/extract/casePostfixSemantics"
import type { TransformationMap } from "@/types/span"

const identityMap: TransformationMap = {
  cleanToOriginal: new Map(),
  originalToClean: new Map(),
}

describe("case citation postfix semantic interpreter", () => {
  it("interprets pincites, metadata, explanatory parentheticals, and component spans", () => {
    const tokenText = "500 F.2d 123, 125"
    const text = `${tokenText} (9th Cir. 2020) (holding that X)`
    const postfix = parseCaseCitationPostfix({
      text,
      tokenText,
      tokenStart: 0,
      tokenEnd: tokenText.length,
    })

    const semantics = interpretCaseCitationPostfix(postfix, identityMap)

    expect(semantics).toMatchObject({
      pincite: 125,
      pinciteInfo: { page: 125, raw: "125" },
      court: "9th Cir.",
      year: 2020,
      date: { iso: "2020", parsed: { year: 2020 } },
      parentheticals: [
        {
          text: "holding that X",
          type: "holding",
          span: {
            cleanStart: 34,
            cleanEnd: 50,
            originalStart: 34,
            originalEnd: 50,
          },
        },
      ],
      spans: {
        pincite: {
          cleanStart: 14,
          cleanEnd: 17,
          originalStart: 14,
          originalEnd: 17,
        },
        metadataParenthetical: {
          cleanStart: 18,
          cleanEnd: 33,
          originalStart: 18,
          originalEnd: 33,
        },
        court: {
          cleanStart: 19,
          cleanEnd: 27,
          originalStart: 19,
          originalEnd: 27,
        },
        year: {
          cleanStart: 28,
          cleanEnd: 32,
          originalStart: 28,
          originalEnd: 32,
        },
      },
    })
  })

  it("uses later metadata parentheticals to fill fields missing from primary metadata", () => {
    const tokenText = "500 F.2d 123"
    const text = `${tokenText} (en banc) (9th Cir. 2021)`
    const postfix = parseCaseCitationPostfix({
      text,
      tokenText,
      tokenStart: 0,
      tokenEnd: tokenText.length,
    })

    const semantics = interpretCaseCitationPostfix(postfix, identityMap)

    expect(semantics).toMatchObject({
      disposition: "en banc",
      court: "9th Cir.",
      year: 2021,
      date: { iso: "2021", parsed: { year: 2021 } },
    })
  })

  it("orders internal history before subsequent history signals between parentheticals", () => {
    const tokenText = "500 F.2d 123"
    const text = `${tokenText} (Tex. App.---Dallas 2010, no pet.), aff'd, 501 U.S. 1 (2021)`
    const postfix = parseCaseCitationPostfix({
      text,
      tokenText,
      tokenStart: 0,
      tokenEnd: tokenText.length,
    })

    const semantics = interpretCaseCitationPostfix(postfix, identityMap)

    expect(semantics.subsequentHistoryEntries).toMatchObject([
      {
        signal: "no_pet",
        rawSignal: "no pet.",
        signalSpan: {
          cleanStart: text.indexOf("no pet."),
          cleanEnd: text.indexOf("no pet.") + "no pet.".length,
          originalStart: text.indexOf("no pet."),
          originalEnd: text.indexOf("no pet.") + "no pet.".length,
        },
        order: 0,
      },
      {
        signal: "affirmed",
        rawSignal: "aff'd",
        signalSpan: {
          cleanStart: text.indexOf("aff'd"),
          cleanEnd: text.indexOf("aff'd") + "aff'd".length,
          originalStart: text.indexOf("aff'd"),
          originalEnd: text.indexOf("aff'd") + "aff'd".length,
        },
        order: 1,
      },
    ])
  })
})
