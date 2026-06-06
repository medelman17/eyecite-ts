import type { Token } from "@/tokenize"
import type { CaseComponentSpans } from "@/types/componentSpans"
import type { FullCaseCitation } from "@/types/citation"
import { resolveOriginalSpan, type Span, type TransformationMap } from "@/types/span"
import type { CaseCitationCoreSyntax } from "./caseCore"
import type { CaseNameSemantics } from "./caseNameSemantics"
import type { CasePartySemantics } from "./casePartySemantics"
import type { CasePostfixSemantics } from "./casePostfixSemantics"
import type { StructuredDate } from "./dates"
import { interpretCaseReporterSemantics } from "./caseReporterSemantics"

type CaseTokenSpan = Pick<Token["span"], "cleanStart" | "cleanEnd">

export interface CaseCitationDraft {
  text: string
  tokenSpan: CaseTokenSpan
  volume: FullCaseCitation["volume"]
  reporter: string
  page?: number
  nominativeVolume?: number
  nominativeReporter?: string
  pincite?: number
  pinciteInfo?: FullCaseCitation["pinciteInfo"]
  court?: string
  year?: number
  hasBlankPage?: true
  date?: StructuredDate
  fullSpan?: Span
  caseName?: string
  disposition?: string
  parentheticals?: FullCaseCitation["parentheticals"]
  subsequentHistoryEntries?: FullCaseCitation["subsequentHistoryEntries"]
  unpublished?: boolean
  justices?: string[]
  scope?: string
  adminParenthetical?: string
  plaintiff?: string
  plaintiffNormalized?: string
  defendant?: string
  defendantNormalized?: string
  proceduralPrefix?: string
  signal?: FullCaseCitation["signal"]
  spans: CaseComponentSpans
}

export interface CreateCaseCitationDraftFromCoreInput {
  text: string
  tokenSpan: CaseTokenSpan
  core: CaseCitationCoreSyntax
}

export function createCaseCitationDraftFromCore({
  text,
  tokenSpan,
  core,
}: CreateCaseCitationDraftFromCoreInput): CaseCitationDraft {
  return {
    text,
    tokenSpan,
    volume: core.volume,
    reporter: core.reporter,
    ...(core.page !== undefined ? { page: core.page } : {}),
    ...(core.nominativeVolume !== undefined ? { nominativeVolume: core.nominativeVolume } : {}),
    ...(core.nominativeReporter !== undefined
      ? { nominativeReporter: core.nominativeReporter }
      : {}),
    ...(core.hasBlankPage ? { hasBlankPage: true as const } : {}),
    spans: { ...core.spans },
  }
}

export function applyCasePostfixSemantics(
  draft: CaseCitationDraft,
  semantics: CasePostfixSemantics,
): CaseCitationDraft {
  return {
    ...draft,
    ...(semantics.pincite !== undefined ? { pincite: semantics.pincite } : {}),
    ...(semantics.pinciteInfo !== undefined ? { pinciteInfo: semantics.pinciteInfo } : {}),
    unpublished: semantics.unpublished,
    ...(semantics.court !== undefined ? { court: semantics.court } : {}),
    ...(semantics.year !== undefined ? { year: semantics.year } : {}),
    ...(semantics.date !== undefined ? { date: semantics.date } : {}),
    ...(semantics.disposition !== undefined ? { disposition: semantics.disposition } : {}),
    ...(semantics.justices !== undefined ? { justices: semantics.justices } : {}),
    ...(semantics.scope !== undefined ? { scope: semantics.scope } : {}),
    ...(semantics.parentheticals !== undefined ? { parentheticals: semantics.parentheticals } : {}),
    ...(semantics.subsequentHistoryEntries !== undefined
      ? { subsequentHistoryEntries: semantics.subsequentHistoryEntries }
      : {}),
    spans: {
      ...draft.spans,
      ...semantics.spans,
    },
  }
}

export function applyCaseNameSemantics(
  draft: CaseCitationDraft,
  semantics: CaseNameSemantics,
): CaseCitationDraft {
  return {
    ...draft,
    caseName: semantics.caseName,
    ...(semantics.year !== undefined ? { year: semantics.year } : {}),
    ...(semantics.court !== undefined ? { court: semantics.court } : {}),
    ...(semantics.date !== undefined ? { date: semantics.date } : {}),
    fullSpan: semantics.fullSpan,
    spans: {
      ...draft.spans,
      ...semantics.spans,
    },
  }
}

export function applyCasePartySemantics(
  draft: CaseCitationDraft,
  semantics: CasePartySemantics,
): CaseCitationDraft {
  return {
    ...draft,
    caseName: semantics.caseName,
    fullSpan: semantics.fullSpan,
    ...(semantics.plaintiff !== undefined ? { plaintiff: semantics.plaintiff } : {}),
    ...(semantics.plaintiffNormalized !== undefined
      ? { plaintiffNormalized: semantics.plaintiffNormalized }
      : {}),
    ...(semantics.defendant !== undefined ? { defendant: semantics.defendant } : {}),
    ...(semantics.defendantNormalized !== undefined
      ? { defendantNormalized: semantics.defendantNormalized }
      : {}),
    ...(semantics.proceduralPrefix !== undefined
      ? { proceduralPrefix: semantics.proceduralPrefix }
      : {}),
    ...(semantics.signal !== undefined ? { signal: semantics.signal } : {}),
    ...(semantics.adminParenthetical !== undefined
      ? { adminParenthetical: semantics.adminParenthetical }
      : {}),
    spans: {
      ...draft.spans,
      ...semantics.spans,
    },
  }
}

export function finalizeCaseCitationDraft(
  draft: CaseCitationDraft,
  transformationMap: TransformationMap,
): FullCaseCitation {
  const { originalStart, originalEnd } = resolveOriginalSpan(draft.tokenSpan, transformationMap)
  const reporterSemantics = interpretCaseReporterSemantics({
    reporter: draft.reporter,
    year: draft.year,
    caseName: draft.caseName,
    court: draft.court,
    hasBlankPage: draft.hasBlankPage ?? false,
  })

  return {
    type: "case",
    text: draft.text,
    span: {
      cleanStart: draft.tokenSpan.cleanStart,
      cleanEnd: draft.tokenSpan.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence: reporterSemantics.confidence,
    matchedText: draft.text,
    processTimeMs: 0,
    patternsChecked: 1,
    volume: draft.volume,
    reporter: draft.reporter,
    ...(reporterSemantics.normalizedReporter !== undefined
      ? { normalizedReporter: reporterSemantics.normalizedReporter }
      : {}),
    page: draft.page,
    nominativeVolume: draft.nominativeVolume,
    nominativeReporter: draft.nominativeReporter,
    pincite: draft.pincite,
    pinciteInfo: draft.pinciteInfo,
    court: reporterSemantics.court,
    normalizedCourt: reporterSemantics.normalizedCourt,
    year: draft.year,
    hasBlankPage: draft.hasBlankPage,
    date: draft.date,
    fullSpan: draft.fullSpan,
    caseName: draft.caseName,
    disposition: draft.disposition,
    parentheticals: draft.parentheticals,
    subsequentHistoryEntries: draft.subsequentHistoryEntries,
    ...(draft.unpublished ? { unpublished: true } : {}),
    ...(draft.justices ? { justices: draft.justices } : {}),
    ...(draft.scope ? { scope: draft.scope } : {}),
    ...(draft.adminParenthetical ? { adminParenthetical: draft.adminParenthetical } : {}),
    plaintiff: draft.plaintiff,
    plaintiffNormalized: draft.plaintiffNormalized,
    defendant: draft.defendant,
    defendantNormalized: draft.defendantNormalized,
    proceduralPrefix: draft.proceduralPrefix,
    inferredCourt: reporterSemantics.inferredCourt,
    signal: draft.signal,
    spans: draft.spans,
  }
}
