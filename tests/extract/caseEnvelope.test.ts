import { describe, expect, it } from "vitest"
import { parseCaseCitationEnvelopeContext } from "@/extract/caseEnvelope"

function spanOf(text: string, needle: string): { cleanStart: number; cleanEnd: number } {
  const cleanStart = text.indexOf(needle)
  if (cleanStart === -1) {
    throw new Error(`Missing test needle: ${needle}`)
  }
  return { cleanStart, cleanEnd: cleanStart + needle.length }
}

describe("case citation envelope context parser", () => {
  it("uses the core citation end for a standalone citation envelope", () => {
    const text = "See Smith v. Jones, 500 F.2d 123 (9th Cir. 2020)."
    const tokenSpan = spanOf(text, "500 F.2d 123")

    const context = parseCaseCitationEnvelopeContext({
      cleanedText: text,
      tokenSpan,
    })

    expect(context).toEqual({
      postChainStart: tokenSpan.cleanEnd,
      hasCloseParallelPrev: false,
    })
  })

  it("skips comma-separated parallel-citation siblings before postfix lookup", () => {
    const text = "Nixon v. Nixon, 329 Pa. 256, 198 A. 154 (1938)"
    const primarySpan = spanOf(text, "329 Pa. 256")
    const parallelSpan = spanOf(text, "198 A. 154")

    const context = parseCaseCitationEnvelopeContext({
      cleanedText: text,
      tokenSpan: primarySpan,
      siblings: [parallelSpan],
    })

    expect(context.postChainStart).toBe(parallelSpan.cleanEnd)
    expect(context.caseNameLookback).toBeUndefined()
    expect(context.hasCloseParallelPrev).toBe(false)
  })

  it("treats semicolon-separated parallel citations as the same envelope", () => {
    const text = "People v. Case, 390 Mich 355, 359; 212 NW2d 190 (1973)"
    const primarySpan = spanOf(text, "390 Mich 355")
    const parallelSpan = spanOf(text, "212 NW2d 190")

    const context = parseCaseCitationEnvelopeContext({
      cleanedText: text,
      tokenSpan: primarySpan,
      siblings: [parallelSpan],
    })

    expect(context.postChainStart).toBe(parallelSpan.cleanEnd)
  })

  it("bounds secondary parallel-citation case-name lookup by the previous sibling", () => {
    const text = "Nixon v. Nixon, 329 Pa. 256, 198 A. 154 (1938)"
    const primarySpan = spanOf(text, "329 Pa. 256")
    const parallelSpan = spanOf(text, "198 A. 154")

    const context = parseCaseCitationEnvelopeContext({
      cleanedText: text,
      tokenSpan: parallelSpan,
      siblings: [primarySpan],
    })

    expect(context).toMatchObject({
      postChainStart: parallelSpan.cleanEnd,
      caseNameLookback: parallelSpan.cleanStart - primarySpan.cleanEnd,
      hasCloseParallelPrev: true,
    })
  })
})
