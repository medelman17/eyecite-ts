/**
 * Docket-Number Citation Extraction
 *
 * Parses tokenized docket citations of the form
 *   `Party v. Party, No. <docket> (<court> <year>)`
 *
 * Disambiguation strategy: a bare `No. 51 (N.Y. 2023)` is too generic to
 * extract on its own. The extractor backward-searches for a case-name
 * anchor and only emits a `DocketCitation` when one is found. Tokens
 * without a case-name anchor are silently dropped (the extractor returns
 * `undefined`).
 *
 * @module extract/extractDocket
 */

import type { Token } from "@/tokenize"
import type { DocketCitation } from "@/types/citation"
import { resolveOriginalSpan, type TransformationMap } from "@/types/span"
import { normalizeCourt } from "./courtNormalization"
import { extractCaseName, extractPartyNames, parseParenthetical } from "./extractCase"

/**
 * Extracts a docket-number citation from a tokenized match.
 *
 * Parses token text to extract:
 * - `docketNumber`: digits with optional hyphens (e.g. "51", "12-3456")
 * - `court`, `year`, `date`: from the trailing parenthetical
 * - `caseName`, `plaintiff`, `defendant`: via backward case-name search
 *
 * Returns `undefined` when no case-name anchor is found — the bare docket
 * shape is too ambiguous to surface without context.
 *
 * Confidence: 0.7 (lower than reporter-based citations because there is no
 * reporter to validate against).
 *
 * @param token - Tokenizer output containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @param cleanedText - Full cleaned document (needed for backward case-name search)
 * @returns DocketCitation when a case-name anchor is found, otherwise undefined
 *
 * @example
 * ```typescript
 * const text = "IKB Int'l, S.A. v. Wells Fargo, N.A., No. 51 (N.Y. 2023)."
 * const citation = extractDocket(token, transformationMap, text)
 * // citation = {
 * //   type: "docket",
 * //   docketNumber: "51",
 * //   court: "N.Y.",
 * //   year: 2023,
 * //   caseName: "IKB Int'l, S.A. v. Wells Fargo, N.A.",
 * //   ...
 * // }
 * ```
 */
export function extractDocket(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText: string,
): DocketCitation | undefined {
  const { text, span } = token

  // Parse the token text: "No. <docket> (<paren-content>)"
  const tokenRegex = /\bNo\.\s+([\d]+(?:-[\w\d]+)*)\s+\(([^)]+)\)/
  const match = tokenRegex.exec(text)
  if (!match) return undefined

  const docketNumber = match[1]
  const parenContent = match[2]

  // Backward case-name search — anchor for disambiguation. Without a
  // case-name we don't emit a citation: a bare "No. 51 (N.Y. 2023)" lacks
  // the context needed to be confident this is a citation at all.
  const caseNameResult = extractCaseName(cleanedText, span.cleanStart)
  if (!caseNameResult) return undefined

  // The case-name extractor's V_CASE_NAME_REGEX requires "Party v. Party"
  // or "In re Party" plus a trailing comma. Validate the result actually
  // looks like a case name (contains "v." or a procedural prefix).
  const partyResult = extractPartyNames(caseNameResult.caseName)
  const hasAdversarial = partyResult.plaintiff && partyResult.defendant
  const hasProceduralPrefix = !!partyResult.proceduralPrefix
  if (!hasAdversarial && !hasProceduralPrefix) return undefined

  // Parse court/year/date from the parenthetical content. parseParenthetical
  // is the same helper used by extractCase, so docket citations get the
  // same court-string normalization and date handling.
  const meta = parseParenthetical(parenContent)

  // Resolve clean → original positions for the citation core.
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // fullSpan: case-name start through closing paren. cleanEnd is the end
  // of the matched token (after the closing `)`). When extractPartyNames
  // strips a signal word ("See", "But see", etc.) from the plaintiff,
  // advance fullCleanStart past it to mirror extractCase's behavior.
  let fullCleanStart = caseNameResult.nameStart
  if (partyResult.plaintiff && partyResult.defendant) {
    const prefixRegion = cleanedText.substring(fullCleanStart, span.cleanStart)
    const vSep = /\s+v\.?\s+/i.exec(prefixRegion)
    if (vSep) {
      const beforeV = prefixRegion.substring(0, vSep.index)
      const pIdx = beforeV.lastIndexOf(partyResult.plaintiff)
      if (pIdx !== -1) fullCleanStart += pIdx
    }
  }
  const fullCleanEnd = span.cleanEnd
  const fullOriginalStart = transformationMap.cleanToOriginal.get(fullCleanStart) ?? fullCleanStart
  const fullOriginalEnd = transformationMap.cleanToOriginal.get(fullCleanEnd) ?? fullCleanEnd

  return {
    type: "docket",
    text,
    matchedText: text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence: 0.7,
    processTimeMs: 0,
    patternsChecked: 1,
    docketNumber,
    caseName:
      partyResult.plaintiff && partyResult.defendant
        ? `${partyResult.plaintiff} v. ${partyResult.defendant}`
        : caseNameResult.caseName,
    plaintiff: partyResult.plaintiff,
    defendant: partyResult.defendant,
    plaintiffNormalized: partyResult.plaintiffNormalized,
    defendantNormalized: partyResult.defendantNormalized,
    proceduralPrefix: partyResult.proceduralPrefix,
    court: meta.court,
    normalizedCourt: normalizeCourt(meta.court),
    year: meta.year,
    date: meta.date,
    fullSpan: {
      cleanStart: fullCleanStart,
      cleanEnd: fullCleanEnd,
      originalStart: fullOriginalStart,
      originalEnd: fullOriginalEnd,
    },
  }
}
