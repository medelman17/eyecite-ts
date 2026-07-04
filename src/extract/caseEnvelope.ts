export interface CaseCitationEnvelopeSpan {
  cleanStart: number
  cleanEnd: number
}

export interface ParseCaseCitationEnvelopeContextInput {
  cleanedText?: string
  tokenSpan: CaseCitationEnvelopeSpan
  siblings?: ReadonlyArray<CaseCitationEnvelopeSpan>
}

export interface CaseCitationEnvelopeContext {
  postChainStart: number
  caseNameLookback?: number
  hasCloseParallelPrev: boolean
}

const PARALLEL_CHAIN_BRIDGE_REGEX = /^[\s,;\d\u2013\u2014-]*$/
const CLOSE_PARALLEL_PREV_LOOKBACK = 30

function findPreviousSibling(
  tokenSpan: CaseCitationEnvelopeSpan,
  siblings: ReadonlyArray<CaseCitationEnvelopeSpan>,
): CaseCitationEnvelopeSpan | undefined {
  return siblings
    .filter((s) => s.cleanEnd <= tokenSpan.cleanStart)
    .reduce<CaseCitationEnvelopeSpan | undefined>(
      (best, s) => (!best || s.cleanEnd > best.cleanEnd ? s : best),
      undefined,
    )
}

function findPostChainStart(
  cleanedText: string | undefined,
  tokenSpan: CaseCitationEnvelopeSpan,
  siblings: ReadonlyArray<CaseCitationEnvelopeSpan>,
): number {
  let postChainStart = tokenSpan.cleanEnd
  if (!cleanedText) return postChainStart

  while (true) {
    const next = siblings.find(
      (s) =>
        s.cleanStart > postChainStart &&
        PARALLEL_CHAIN_BRIDGE_REGEX.test(
          cleanedText.substring(postChainStart, s.cleanStart),
        ),
    )
    if (!next) break
    postChainStart = next.cleanEnd
  }

  return postChainStart
}

export function parseCaseCitationEnvelopeContext(
  input: ParseCaseCitationEnvelopeContextInput,
): CaseCitationEnvelopeContext {
  const siblings = input.siblings ?? []
  const postChainStart = findPostChainStart(input.cleanedText, input.tokenSpan, siblings)
  const prev = findPreviousSibling(input.tokenSpan, siblings)
  const caseNameLookback = prev ? input.tokenSpan.cleanStart - prev.cleanEnd : undefined

  return {
    postChainStart,
    ...(caseNameLookback !== undefined ? { caseNameLookback } : {}),
    hasCloseParallelPrev:
      caseNameLookback !== undefined && caseNameLookback < CLOSE_PARALLEL_PREV_LOOKBACK,
  }
}
