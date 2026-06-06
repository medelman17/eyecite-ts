import type { Span, TransformationMap } from "@/types/span"
import type { CaseCitationEnvelopeContext, CaseCitationEnvelopeSpan } from "./caseEnvelope"
import type { RawSpan } from "./caseParentheticals"

export interface ResolveParallelCaseFullSpanInput {
  existingFullSpan?: Span
  tokenSpan: CaseCitationEnvelopeSpan
  envelopeContext: Pick<CaseCitationEnvelopeContext, "hasCloseParallelPrev">
  lastParenthetical?: { span: RawSpan }
  transformationMap: TransformationMap
}

/**
 * Secondary parallel case cites inherit the shared trailing parenthetical as
 * their fullSpan extent, but only when a close previous sibling proves they
 * belong to a parallel-citation envelope.
 */
export function resolveParallelCaseFullSpan(
  input: ResolveParallelCaseFullSpanInput,
): Span | undefined {
  if (input.existingFullSpan) return input.existingFullSpan
  if (!input.envelopeContext.hasCloseParallelPrev) return undefined
  if (!input.lastParenthetical) return undefined
  if (input.lastParenthetical.span.end <= input.tokenSpan.cleanEnd) return undefined

  const fullCleanStart = input.tokenSpan.cleanStart
  const fullCleanEnd = input.lastParenthetical.span.end
  return {
    cleanStart: fullCleanStart,
    cleanEnd: fullCleanEnd,
    originalStart: input.transformationMap.cleanToOriginal.get(fullCleanStart) ?? fullCleanStart,
    originalEnd: input.transformationMap.cleanToOriginal.get(fullCleanEnd) ?? fullCleanEnd,
  }
}
