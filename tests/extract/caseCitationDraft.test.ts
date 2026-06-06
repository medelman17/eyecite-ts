import { beforeAll, describe, expect, it } from "vitest"
import { loadReporters } from "@/data/reporters"
import {
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
})
