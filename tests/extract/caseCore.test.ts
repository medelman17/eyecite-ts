import { describe, expect, it } from "vitest"
import { parseCaseCitationCore } from "@/extract/caseCore"
import { tokenize } from "@/tokenize"
import { casePatterns } from "@/patterns/casePatterns"
import type { Token } from "@/tokenize"
import type { TransformationMap } from "@/types/span"

const identityMap: TransformationMap = {
  cleanToOriginal: new Map(),
  originalToClean: new Map(),
}

/** Build the case token the tokenizer would produce for `text` (with threaded groups). */
function caseToken(text: string): Token {
  const t = tokenize(text, casePatterns)[0]
  if (!t) throw new Error(`no case token for: ${text}`)
  return t
}

describe("case citation core parser", () => {
  it("parses canonical volume reporter page cores with component spans", () => {
    const core = parseCaseCitationCore({
      token: caseToken("500 F.2d 123"),
      transformationMap: identityMap,
    })

    expect(core).toMatchObject({
      volume: 500,
      reporter: "F.2d",
      page: 123,
      spans: {
        volume: { cleanStart: 0, cleanEnd: 3, originalStart: 0, originalEnd: 3 },
        reporter: { cleanStart: 4, cleanEnd: 8, originalStart: 4, originalEnd: 8 },
        page: { cleanStart: 9, cleanEnd: 12, originalStart: 9, originalEnd: 12 },
      },
    })
    expect(core.hasBlankPage).toBeUndefined()
  })

  it("keeps hyphenated volumes as strings", () => {
    const core = parseCaseCitationCore({
      token: caseToken("1984-1 T.C. 10"),
      transformationMap: identityMap,
    })

    expect(core.volume).toBe("1984-1")
    expect(core.reporter).toBe("T.C.")
    expect(core.page).toBe(10)
  })

  it("parses nominative reporter parentheticals", () => {
    const core = parseCaseCitationCore({
      token: caseToken("67 U.S. (2 Black) 635"),
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
      token: caseToken("500 F.2d ___"),
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
      token: caseToken("3 Den., 594"),
      transformationMap: identityMap,
    })

    expect(core).toMatchObject({
      volume: 3,
      reporter: "Den.",
      page: 594,
    })
  })

  it("throws on a token with no threaded groups (decline path)", () => {
    // A token with no groups (e.g., produced by an older or positional-only
    // pattern) causes requireGroup to throw CitationParseError — the #881
    // decline path. "not a case core" produces no tokenizer match, so we
    // construct the minimal no-groups token directly.
    const noGroupsToken: Token = {
      text: "not a case core",
      span: { cleanStart: 0, cleanEnd: 15 },
      type: "case",
      patternId: "test-case-core",
    }
    expect(() =>
      parseCaseCitationCore({
        token: noGroupsToken,
        transformationMap: identityMap,
      }),
    ).toThrow("Missing required capture group")
  })
})
