import { describe, expect, it } from "vitest"
import {
  classifyCaseParenthetical,
  parseCaseParentheticalChain,
  parseParenthetical,
} from "@/extract/caseParentheticals"

describe("case parenthetical AST parser", () => {
  it("parses metadata court and year", () => {
    const node = parseParenthetical("9th Cir. 2020")

    expect(node).toMatchObject({
      kind: "metadata",
      text: "9th Cir. 2020",
      court: "9th Cir.",
      year: 2020,
      date: { iso: "2020", parsed: { year: 2020 } },
      courtStart: 0,
      courtEnd: 8,
      yearStart: 9,
      yearEnd: 13,
    })
  })

  it("parses metadata full date", () => {
    const node = parseParenthetical("2d Cir. Jan. 15, 2020")

    expect(node.kind).toBe("metadata")
    expect(node.court).toBe("2d Cir.")
    expect(node.year).toBe(2020)
    expect(node.date?.iso).toBe("2020-01-15")
    expect(node.date?.parsed).toEqual({ year: 2020, month: 1, day: 15 })
  })

  it("parses disposition parentheticals as metadata nodes", () => {
    const enBanc = parseParenthetical("en banc")
    const perCuriam = parseParenthetical("per curiam")

    expect(enBanc).toMatchObject({
      kind: "metadata",
      text: "en banc",
      disposition: "en banc",
    })
    expect(enBanc.court).toBeUndefined()
    expect(perCuriam).toMatchObject({
      kind: "metadata",
      text: "per curiam",
      disposition: "per curiam",
    })
    expect(perCuriam.court).toBeUndefined()
  })

  it("classifies signal-word explanatory parentheticals", () => {
    const node = classifyCaseParenthetical({
      text: "holding that X",
      span: { start: 25, end: 41 },
    })

    expect(node).toEqual({
      kind: "explanatory",
      text: "holding that X",
      type: "holding",
      span: { start: 25, end: 41 },
    })
  })

  it("classifies unknown non-metadata parentheticals as other", () => {
    const node = classifyCaseParenthetical({
      text: "the court found X",
      span: { start: 25, end: 44 },
    })

    expect(node).toEqual({
      kind: "explanatory",
      text: "the court found X",
      type: "other",
      span: { start: 25, end: 44 },
    })
  })

  it("keeps nested explanatory parenthetical text intact", () => {
    const text = "500 F.2d 123 (2020) (holding that (a) X and (b) Y)"
    const nodes = parseCaseParentheticalChain(text, "500 F.2d 123".length)

    expect(nodes).toMatchObject([
      { kind: "metadata", text: "2020", span: { start: 13, end: 19 }, year: 2020 },
      {
        kind: "explanatory",
        text: "holding that (a) X and (b) Y",
        span: { start: 20, end: text.length },
        type: "holding",
      },
    ])
  })

  it("parses chained metadata and explanatory parentheticals", () => {
    const text = "500 F.2d 123 (en banc) (9th Cir. 2021) (holding that X)"
    const nodes = parseCaseParentheticalChain(text, "500 F.2d 123".length)

    expect(nodes).toMatchObject([
      { kind: "metadata", text: "en banc", disposition: "en banc" },
      { kind: "metadata", text: "9th Cir. 2021", court: "9th Cir.", year: 2021 },
      { kind: "explanatory", text: "holding that X", type: "holding" },
    ])
  })

  it("emits history signal nodes between parentheticals", () => {
    const text = "500 F.2d 123 (2020), aff'd, 501 U.S. 1 (2021)"
    const nodes = parseCaseParentheticalChain(text, "500 F.2d 123".length)

    expect(nodes).toMatchObject([
      { kind: "metadata", text: "2020", year: 2020 },
      {
        kind: "historySignal",
        rawSignal: "aff'd",
        signal: "affirmed",
        span: { start: 21, end: 26 },
      },
    ])
  })

  it("parses Texas internal writ and petition history", () => {
    const node = parseParenthetical("Tex. App.---Dallas 2010, no pet.")

    expect(node).toMatchObject({
      kind: "metadata",
      text: "Tex. App.---Dallas 2010, no pet.",
      court: "Tex. App.---Dallas",
      year: 2010,
      internalHistory: {
        kind: "historySignal",
        rawSignal: "no pet.",
        signal: "no_pet",
      },
    })
    expect(node.internalHistory?.span).toEqual({ start: 25, end: 32 })
  })
})
