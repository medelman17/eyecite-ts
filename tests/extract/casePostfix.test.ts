import { describe, expect, it } from "vitest"
import { parseCaseCitationPostfix } from "@/extract/casePostfix"

describe("case citation postfix parser", () => {
  it("returns token pincite, metadata parenthetical, and parenthetical chain as one aggregate", () => {
    const tokenText = "500 F.2d 123, 125"
    const text = `${tokenText} (9th Cir. 2020) (holding that X)`
    const postfix = parseCaseCitationPostfix({
      text,
      tokenText,
      tokenStart: 0,
      tokenEnd: tokenText.length,
    })

    expect(postfix.pinciteInfo).toMatchObject({ page: 125, raw: "125" })
    expect(postfix.pinciteSpan).toEqual({ start: 14, end: 17 })
    expect(postfix.metadataParenthetical).toMatchObject({
      kind: "metadata",
      text: "9th Cir. 2020",
      court: "9th Cir.",
      year: 2020,
      span: { start: 18, end: 33 },
    })
    expect(postfix.metadataParentheticalFromToken).toBe(false)
    expect(postfix.parentheticalChain.parentheticals).toMatchObject([
      { kind: "metadata", text: "9th Cir. 2020" },
      { kind: "explanatory", text: "holding that X" },
    ])
    expect(postfix.lastParenthetical).toMatchObject({
      kind: "explanatory",
      text: "holding that X",
    })
  })

  it("uses post-chain start for shared metadata after a parallel citation chain", () => {
    const tokenText = "410 U.S. 113"
    const text = `${tokenText}, 117, 93 S. Ct. 705 (1973)`
    const postfix = parseCaseCitationPostfix({
      text,
      tokenText,
      tokenStart: 0,
      tokenEnd: tokenText.length,
      postChainStart: text.indexOf(" (1973)"),
    })

    expect(postfix.pinciteInfo).toMatchObject({ page: 117, raw: "117" })
    expect(postfix.metadataParenthetical).toMatchObject({
      text: "1973",
      year: 1973,
      span: { start: 33, end: 39 },
    })
    expect(postfix.parentheticalChain.firstParenthetical).toMatchObject({
      text: "1973",
      year: 1973,
    })
  })

  it("skips unpublished markers and wrapper closes before metadata lookup", () => {
    const unpublishedToken = "2020 NY Slip Op 00001"
    const unpublishedText = `${unpublishedToken} (U) (2020)`
    const unpublishedPostfix = parseCaseCitationPostfix({
      text: unpublishedText,
      tokenText: unpublishedToken,
      tokenStart: 0,
      tokenEnd: unpublishedToken.length,
    })

    expect(unpublishedPostfix.unpublished).toBe(true)
    expect(unpublishedPostfix.metadataParenthetical).toMatchObject({
      text: "2020",
      year: 2020,
    })

    const wrappedToken = "569 SE2d 502"
    const wrappedText = `${wrappedToken}) (2002)`
    const wrappedPostfix = parseCaseCitationPostfix({
      text: wrappedText,
      tokenText: wrappedToken,
      tokenStart: 0,
      tokenEnd: wrappedToken.length,
    })

    expect(wrappedPostfix.metadataParenthetical).toMatchObject({
      text: "2002",
      year: 2002,
    })
  })
})
