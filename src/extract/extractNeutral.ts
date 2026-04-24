/**
 * Neutral Citation Extraction
 *
 * Parses tokenized neutral (vendor-neutral) citations to extract year, court,
 * and document number. Examples: "2020 WL 123456", "2020 U.S. LEXIS 456"
 *
 * @module extract/extractNeutral
 */

import type { Token } from "@/tokenize"
import type { NeutralCitation } from "@/types/citation"
import type { NeutralComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parsePincite, type PinciteInfo } from "./pincite"

/** Matches a trailing pincite on a neutral citation. Accepts both
 *  ", at *3" (comma + "at" keyword) and " at *3" (whitespace + "at") forms,
 *  with optional "*" prefix for star-pagination on both ends of a range
 *  (#191, #203 — "*3-*5" is common on Westlaw/Lexis/NY Slip Op), and an
 *  optional trailing " n.14" / " nn.14-15" footnote suffix (#202). */
const NEUTRAL_PINCITE_LOOKAHEAD =
  /^(?:\s+at\s+|,\s*(?:at\s+)?)(\*?\d+(?:[-–—]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?)/d

/**
 * Extracts neutral citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Year: 4-digit year (e.g., "2020")
 * - Court: Vendor identifier (e.g., "WL", "U.S. LEXIS")
 * - Document number: Unique document identifier (e.g., "123456")
 *
 * Confidence scoring:
 * - 1.0 (neutral format is unambiguous and standardized)
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @returns NeutralCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "2020 WL 123456",
 *   span: { cleanStart: 10, cleanEnd: 24 },
 *   type: "neutral",
 *   patternId: "westlaw-neutral"
 * }
 * const citation = extractNeutral(token, transformationMap)
 * // citation = {
 * //   type: "neutral",
 * //   year: 2020,
 * //   court: "WL",
 * //   documentNumber: "123456",
 * //   confidence: 1.0,
 * //   ...
 * // }
 * ```
 */
export function extractNeutral(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
): NeutralCitation {
  const { text, span } = token

  // Parse year-court-documentNumber using regex
  // Pattern: 4-digit year + court identifier (WL, LEXIS, state codes, etc.) + document number
  const neutralRegex = /^(\d{4})\s+(.+?)\s+(\d+)$/d
  const match = neutralRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse neutral citation: ${text}`)
  }

  const year = Number.parseInt(match[1], 10)
  const court = match[2]
  const documentNumber = match[3]

  let spans: NeutralComponentSpans | undefined
  if (match.indices) {
    spans = {
      year: spanFromGroupIndex(span.cleanStart, match.indices[1]!, transformationMap),
      court: spanFromGroupIndex(span.cleanStart, match.indices[2]!, transformationMap),
      documentNumber: spanFromGroupIndex(span.cleanStart, match.indices[3]!, transformationMap),
    }
  }

  // Look ahead in cleaned text for a trailing pincite (e.g., ", at *3" on
  // Westlaw and Lexis citations). See #191.
  let pincite: number | undefined
  let pinciteInfo: PinciteInfo | undefined
  if (cleanedText) {
    const afterToken = cleanedText.substring(span.cleanEnd)
    const laMatch = NEUTRAL_PINCITE_LOOKAHEAD.exec(afterToken)
    if (laMatch) {
      pinciteInfo = parsePincite(laMatch[1]) ?? undefined
      pincite = pinciteInfo?.page
    }
  }

  // Translate positions from clean → original
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Confidence: 1.0 (neutral format is unambiguous)
  const confidence = 1.0

  return {
    type: "neutral",
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    year,
    court,
    documentNumber,
    pincite,
    pinciteInfo,
    spans,
  }
}
