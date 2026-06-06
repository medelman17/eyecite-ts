import { beforeAll, describe, expect, it } from "vitest"
import { loadReporters } from "@/data/reporters"
import {
  applyCaseNameSemantics,
  applyCasePostfixSemantics,
  createCaseCitationDraftFromCore,
  finalizeCaseCitationDraft,
  type CaseCitationDraft,
} from "@/extract/caseCitationDraft"
import { createOffsetMap } from "../helpers/transformationMap"

describe("case citation draft finalization", () => {
  beforeAll(async () => {
    await loadReporters()
  })

  it("finalizes parsed semantic state into a full case citation", () => {
    const text = "500 F.2d 123, 130 (2d Cir. 2020)"
    const draft: CaseCitationDraft = {
      text,
      tokenSpan: { cleanStart: 10, cleanEnd: 42 },
      volume: 500,
      reporter: "F.2d",
      page: 123,
      pincite: 130,
      court: "2d Cir.",
      year: 2020,
      caseName: "Smith v. Jones",
      spans: {
        volume: { cleanStart: 10, cleanEnd: 13, originalStart: 15, originalEnd: 18 },
      },
    }

    const citation = finalizeCaseCitationDraft(draft, createOffsetMap(5))

    expect(citation).toMatchObject({
      type: "case",
      text,
      span: { cleanStart: 10, cleanEnd: 42, originalStart: 15, originalEnd: 47 },
      confidence: 0.95,
      matchedText: text,
      processTimeMs: 0,
      patternsChecked: 1,
      volume: 500,
      reporter: "F.2d",
      normalizedReporter: "F.2d",
      page: 123,
      pincite: 130,
      court: "2d Cir.",
      normalizedCourt: "2d Cir.",
      year: 2020,
      caseName: "Smith v. Jones",
      inferredCourt: {
        level: "appellate",
        jurisdiction: "federal",
        confidence: 1.0,
      },
      spans: draft.spans,
    })
  })

  it("leaves absent optional reporter fields absent when semantic evidence is missing", () => {
    const text = "10 NotAReporter ___"
    const citation = finalizeCaseCitationDraft(
      {
        text,
        tokenSpan: { cleanStart: 0, cleanEnd: text.length },
        volume: 10,
        reporter: "NotAReporter",
        hasBlankPage: true,
        spans: {},
      },
      createOffsetMap(0),
    )

    expect(citation.page).toBeUndefined()
    expect(citation.normalizedReporter).toBeUndefined()
    expect(citation.confidence).toBe(0.5)
  })

  it("creates a draft from parsed citation core syntax", () => {
    const volumeSpan = { cleanStart: 10, cleanEnd: 13, originalStart: 10, originalEnd: 13 }
    const draft = createCaseCitationDraftFromCore({
      text: "500 F.2d 123",
      tokenSpan: { cleanStart: 10, cleanEnd: 22 },
      core: {
        volume: 500,
        reporter: "F.2d",
        page: 123,
        nominativeVolume: 2,
        nominativeReporter: "Black",
        spans: { volume: volumeSpan },
      },
    })

    expect(draft).toEqual({
      text: "500 F.2d 123",
      tokenSpan: { cleanStart: 10, cleanEnd: 22 },
      volume: 500,
      reporter: "F.2d",
      page: 123,
      nominativeVolume: 2,
      nominativeReporter: "Black",
      spans: { volume: volumeSpan },
    })
  })

  it("applies postfix semantics to a draft and merges component spans", () => {
    const volumeSpan = { cleanStart: 0, cleanEnd: 3, originalStart: 0, originalEnd: 3 }
    const pinciteSpan = { cleanStart: 14, cleanEnd: 17, originalStart: 14, originalEnd: 17 }
    const yearSpan = { cleanStart: 28, cleanEnd: 32, originalStart: 28, originalEnd: 32 }
    const draft: CaseCitationDraft = {
      text: "500 F.2d 123, 125",
      tokenSpan: { cleanStart: 0, cleanEnd: 18 },
      volume: 500,
      reporter: "F.2d",
      page: 123,
      spans: { volume: volumeSpan },
    }

    const next = applyCasePostfixSemantics(draft, {
      pincite: 125,
      pinciteInfo: { page: 125, raw: "125" },
      unpublished: true,
      court: "9th Cir.",
      year: 2020,
      date: { iso: "2020", parsed: { year: 2020 } },
      disposition: "en banc",
      justices: ["Smith"],
      scope: "in_part",
      parentheticals: [
        {
          text: "holding that X",
          type: "holding",
          span: { cleanStart: 34, cleanEnd: 50, originalStart: 34, originalEnd: 50 },
        },
      ],
      subsequentHistoryEntries: [
        {
          signal: "affirmed",
          rawSignal: "aff'd",
          signalSpan: { cleanStart: 52, cleanEnd: 57, originalStart: 52, originalEnd: 57 },
          order: 0,
        },
      ],
      spans: {
        pincite: pinciteSpan,
        year: yearSpan,
      },
    })

    expect(next).toEqual({
      ...draft,
      pincite: 125,
      pinciteInfo: { page: 125, raw: "125" },
      unpublished: true,
      court: "9th Cir.",
      year: 2020,
      date: { iso: "2020", parsed: { year: 2020 } },
      disposition: "en banc",
      justices: ["Smith"],
      scope: "in_part",
      parentheticals: [
        {
          text: "holding that X",
          type: "holding",
          span: { cleanStart: 34, cleanEnd: 50, originalStart: 34, originalEnd: 50 },
        },
      ],
      subsequentHistoryEntries: [
        {
          signal: "affirmed",
          rawSignal: "aff'd",
          signalSpan: { cleanStart: 52, cleanEnd: 57, originalStart: 52, originalEnd: 57 },
          order: 0,
        },
      ],
      spans: {
        volume: volumeSpan,
        pincite: pinciteSpan,
        year: yearSpan,
      },
    })
  })

  it("applies case-name semantics to a draft and merges component spans", () => {
    const volumeSpan = { cleanStart: 12, cleanEnd: 15, originalStart: 12, originalEnd: 15 }
    const caseNameSpan = { cleanStart: 0, cleanEnd: 9, originalStart: 0, originalEnd: 9 }
    const yearSpan = { cleanStart: 29, cleanEnd: 33, originalStart: 29, originalEnd: 33 }
    const fullSpan = { cleanStart: 0, cleanEnd: 34, originalStart: 0, originalEnd: 34 }
    const draft: CaseCitationDraft = {
      text: "500 F.2d 123",
      tokenSpan: { cleanStart: 12, cleanEnd: 24 },
      volume: 500,
      reporter: "F.2d",
      page: 123,
      court: "2d Cir.",
      spans: { volume: volumeSpan },
    }

    const next = applyCaseNameSemantics(draft, {
      caseName: "Smith v. Jones",
      year: 2020,
      court: "2d Cir.",
      date: { iso: "2020", parsed: { year: 2020 } },
      fullSpan,
      spans: {
        caseName: caseNameSpan,
        year: yearSpan,
      },
    })

    expect(next).toEqual({
      ...draft,
      caseName: "Smith v. Jones",
      year: 2020,
      court: "2d Cir.",
      date: { iso: "2020", parsed: { year: 2020 } },
      fullSpan,
      spans: {
        volume: volumeSpan,
        caseName: caseNameSpan,
        year: yearSpan,
      },
    })
  })
})
