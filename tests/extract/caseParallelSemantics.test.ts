import { describe, expect, it } from "vitest"
import { resolveParallelCaseFullSpan } from "@/extract/caseParallelSemantics"
import type { Span, TransformationMap } from "@/types/span"

const identityMap: TransformationMap = {
  cleanToOriginal: new Map(),
  originalToClean: new Map(),
}

describe("case parallel-citation semantic interpreter", () => {
  it("preserves an existing full span", () => {
    const existingFullSpan: Span = {
      cleanStart: 0,
      cleanEnd: 30,
      originalStart: 0,
      originalEnd: 30,
    }

    const fullSpan = resolveParallelCaseFullSpan({
      existingFullSpan,
      tokenSpan: { cleanStart: 10, cleanEnd: 20 },
      envelopeContext: { hasCloseParallelPrev: true },
      lastParenthetical: { span: { start: 21, end: 30 } },
      transformationMap: identityMap,
    })

    expect(fullSpan).toBe(existingFullSpan)
  })

  it("does not create a full span for standalone bare citations", () => {
    const fullSpan = resolveParallelCaseFullSpan({
      tokenSpan: { cleanStart: 10, cleanEnd: 20 },
      envelopeContext: { hasCloseParallelPrev: false },
      lastParenthetical: { span: { start: 21, end: 30 } },
      transformationMap: identityMap,
    })

    expect(fullSpan).toBeUndefined()
  })

  it("extends a secondary parallel citation through the shared trailing parenthetical", () => {
    const transformationMap: TransformationMap = {
      cleanToOriginal: new Map([
        [20, 24],
        [52, 60],
      ]),
      originalToClean: new Map(),
    }

    const fullSpan = resolveParallelCaseFullSpan({
      tokenSpan: { cleanStart: 20, cleanEnd: 31 },
      envelopeContext: { hasCloseParallelPrev: true },
      lastParenthetical: { span: { start: 42, end: 52 } },
      transformationMap,
    })

    expect(fullSpan).toEqual({
      cleanStart: 20,
      cleanEnd: 52,
      originalStart: 24,
      originalEnd: 60,
    })
  })
})
