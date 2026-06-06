/**
 * Case Citation Extraction
 *
 * Parses tokenized case citations to extract volume, reporter, page, and
 * optional metadata (pincite, court, year). This is the third stage of
 * the parsing pipeline:
 *   1. Clean text (remove HTML, normalize Unicode)
 *   2. Tokenize (apply patterns to find candidates)
 *   3. Extract (parse metadata, validate) ← THIS MODULE
 *
 * Extraction parses structured data from token text. Validation against
 * reporters-db happens in Phase 3 (resolution layer).
 *
 * @module extract/extractCase
 */

import type { Token } from "@/tokenize"
import type { FullCaseCitation } from "@/types/citation"
import type { Span, TransformationMap } from "@/types/span"
import type { CaseComponentSpans } from "@/types/componentSpans"
import type { StructuredDate } from "./dates"
import { finalizeCaseCitationDraft } from "./caseCitationDraft"
import { parseCaseCitationCore } from "./caseCore"
import { parseCaseCitationEnvelopeContext } from "./caseEnvelope"
import { extractCaseName } from "./caseNameScanner"
import { interpretCaseNameScan } from "./caseNameSemantics"
import { resolveParallelCaseFullSpan } from "./caseParallelSemantics"
import { interpretCasePartySemantics } from "./casePartySemantics"
import { parseCaseCitationPostfix } from "./casePostfix"
import { interpretCaseCitationPostfix } from "./casePostfixSemantics"
import { interpretCaseReporterCourtSemantics } from "./caseReporterSemantics"

export { parseParenthetical } from "./caseParentheticals"
export { extractCaseName } from "./caseNameScanner"
export { extractPartyNames } from "./casePartySemantics"
export {
  COMMON_REPORTERS,
  computeCaseConfidence,
  resolveNormalizedReporter,
} from "./caseReporterSemantics"

/**
 * Extracts case citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Volume: Leading digits (e.g., "500" from "500 F.2d 123")
 * - Reporter: Alphabetic abbreviation (e.g., "F.2d")
 * - Page: Trailing digits after reporter (e.g., "123")
 * - Pincite: Optional page reference after comma (e.g., ", 125")
 * - Court: Optional court abbreviation in parentheses (e.g., "(9th Cir.)")
 * - Year: Optional year in parentheses (e.g., "(2020)")
 *
 * Confidence scoring:
 * - Base: 0.5
 * - Common reporter pattern (F., U.S., etc.): +0.3
 * - Valid year (not future): +0.2
 * - Capped at 1.0
 *
 * Position translation:
 * - Uses TransformationMap to convert clean positions → original positions
 * - cleanStart/cleanEnd from token span
 * - originalStart/originalEnd via transformationMap.cleanToOriginal
 *
 * Note: This function does NOT validate against reporters-db. That happens
 * in Phase 3 (resolution layer). Phase 2 extraction only parses structure.
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @returns FullCaseCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "500 F.2d 123, 125",
 *   span: { cleanStart: 10, cleanEnd: 27 },
 *   type: "case",
 *   patternId: "federal-reporter"
 * }
 * const citation = extractCase(token, transformationMap)
 * // citation = {
 * //   type: "case",
 * //   text: "500 F.2d 123, 125",
 * //   volume: 500,
 * //   reporter: "F.2d",
 * //   page: 123,
 * //   pincite: 125,
 * //   span: { cleanStart: 10, cleanEnd: 27, originalStart: 10, originalEnd: 27 },
 * //   confidence: 0.8,
 * //   ...
 * // }
 * ```
 */
export function extractCase(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
  originalText?: string,
  /** Clean-coordinate spans of sibling tokens. Used to:
   *  - bound the case-name backward walk so a parallel cite's caption is
   *    not absorbed into this cite's caseName,
   *  - skip past a contiguous parallel-cite chain (`, 198 A. 154, 35 L.Ed.2d 147`)
   *    when searching for the shared trailing year parenthetical so each
   *    cite in the chain gets year/court populated. */
  siblings?: ReadonlyArray<{ cleanStart: number; cleanEnd: number }>,
): FullCaseCitation {
  const { text, span } = token

  const core = parseCaseCitationCore({ token, transformationMap })
  const volume = core.volume
  const reporter = core.reporter
  const page = core.page
  const nominativeVolume = core.nominativeVolume
  const nominativeReporter = core.nominativeReporter
  const hasBlankPage = core.hasBlankPage
  const spans: CaseComponentSpans = { ...core.spans }

  // Initialize Phase 6 fields
  let year: number | undefined
  let court: string | undefined
  let date: StructuredDate | undefined
  let caseName: string | undefined
  let fullSpan: Span | undefined

  const envelopeContext = parseCaseCitationEnvelopeContext({
    cleanedText,
    tokenSpan: span,
    siblings,
  })

  const postfix = parseCaseCitationPostfix({
    text: cleanedText,
    tokenText: text,
    tokenStart: span.cleanStart,
    tokenEnd: span.cleanEnd,
    postChainStart: envelopeContext.postChainStart,
    hasNominativeReporter: nominativeVolume !== undefined,
  })
  const postfixSemantics = interpretCaseCitationPostfix(postfix, transformationMap)
  Object.assign(spans, postfixSemantics.spans)

  const pinciteInfo = postfixSemantics.pinciteInfo
  const pincite = postfixSemantics.pincite
  const unpublished = postfixSemantics.unpublished
  year = postfixSemantics.year
  court = postfixSemantics.court
  date = postfixSemantics.date
  const disposition = postfixSemantics.disposition
  const justices = postfixSemantics.justices
  const scope = postfixSemantics.scope
  const parentheticals = postfixSemantics.parentheticals
  const subsequentHistoryEntries = postfixSemantics.subsequentHistoryEntries

  const initialReporterSemantics = interpretCaseReporterCourtSemantics(reporter, court)
  court = initialReporterSemantics.court

  // Phase 6: Extract case name via backward search.
  let caseNameResult: ReturnType<typeof extractCaseName> | undefined
  if (cleanedText) {
    caseNameResult = extractCaseName(
      cleanedText,
      span.cleanStart,
      envelopeContext.caseNameLookback,
      {
        originalText,
        transformationMap,
      },
    )
    if (caseNameResult) {
      const caseNameSemantics = interpretCaseNameScan({
        caseNameResult,
        tokenSpan: span,
        postfixLastParentheticalEnd: postfix.lastParenthetical?.span.end,
        year,
        court,
        date,
        hasExistingYearSpan: spans.year !== undefined,
        transformationMap,
      })
      caseName = caseNameSemantics.caseName
      year = caseNameSemantics.year
      court = caseNameSemantics.court
      date = caseNameSemantics.date
      fullSpan = caseNameSemantics.fullSpan
      Object.assign(spans, caseNameSemantics.spans)
    }
  }

  fullSpan = resolveParallelCaseFullSpan({
    existingFullSpan: fullSpan,
    tokenSpan: span,
    envelopeContext,
    lastParenthetical: postfix.lastParenthetical,
    transformationMap,
  })

  // Phase 7: Extract party names from case name
  let plaintiff: string | undefined
  let plaintiffNormalized: string | undefined
  let defendant: string | undefined
  let defendantNormalized: string | undefined
  let proceduralPrefix: string | undefined
  let adminParenthetical: string | undefined
  let signal: FullCaseCitation["signal"] | undefined
  if (caseName) {
    const partySemantics = interpretCasePartySemantics({
      caseName,
      caseNameStart: caseNameResult?.nameStart,
      citationCoreStart: span.cleanStart,
      fullSpan,
      cleanedText,
      transformationMap,
    })
    caseName = partySemantics.caseName
    fullSpan = partySemantics.fullSpan
    plaintiff = partySemantics.plaintiff
    plaintiffNormalized = partySemantics.plaintiffNormalized
    defendant = partySemantics.defendant
    defendantNormalized = partySemantics.defendantNormalized
    proceduralPrefix = partySemantics.proceduralPrefix
    signal = partySemantics.signal
    adminParenthetical = partySemantics.adminParenthetical
    Object.assign(spans, partySemantics.spans)
  }

  return finalizeCaseCitationDraft(
    {
      text,
      tokenSpan: span,
      volume,
      reporter,
      page,
      nominativeVolume,
      nominativeReporter,
      pincite,
      pinciteInfo,
      court,
      year,
      hasBlankPage,
      date,
      fullSpan,
      caseName,
      disposition,
      parentheticals,
      subsequentHistoryEntries,
      unpublished,
      justices,
      scope,
      adminParenthetical,
      plaintiff,
      plaintiffNormalized,
      defendant,
      defendantNormalized,
      proceduralPrefix,
      signal,
      spans,
    },
    transformationMap,
  )
}
