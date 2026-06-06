import type { Token } from "@/tokenize"
import type { CaseComponentSpans } from "@/types/componentSpans"
import type { FullCaseCitation } from "@/types/citation"
import { resolveOriginalSpan, type Span, type TransformationMap } from "@/types/span"
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
