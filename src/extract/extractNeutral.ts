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

  // Parse year-court-documentNumber. Two-step:
  // 1. Try the Mississippi 4-segment hyphenated form (#233):
  //    year-caseType-number-appellateTrack, e.g., "2010-CT-01234-SCT".
  //    Court is composed as `${caseType}-${appellateTrack}` so the single
  //    `court` field preserves the full sovereign identifier.
  // 2. Try the 3-segment hyphenated form (NM/Ohio/NC) or the whitespace form.
  let year: number
  let court: string
  let documentNumber: string
  let unpublished = false
  let spans: NeutralComponentSpans | undefined

  const msMatch = /^(\d{4})-([A-Z]+)-(\d+)-([A-Z]+)$/d.exec(text)
  if (msMatch) {
    year = Number.parseInt(msMatch[1], 10)
    court = `${msMatch[2]}-${msMatch[4]}`
    documentNumber = msMatch[3]
    if (msMatch.indices) {
      const caseTypeIndices = msMatch.indices[2]!
      const trackIndices = msMatch.indices[4]!
      // Span covers the case-type token through the appellate-track token so
      // the position range reflects the combined court identifier.
      const courtIndices: [number, number] = [caseTypeIndices[0], trackIndices[1]]
      spans = {
        year: spanFromGroupIndex(span.cleanStart, msMatch.indices[1]!, transformationMap),
        court: spanFromGroupIndex(span.cleanStart, courtIndices, transformationMap),
        documentNumber: spanFromGroupIndex(
          span.cleanStart,
          msMatch.indices[3]!,
          transformationMap,
        ),
      }
    }
  } else {
    // 3-segment forms: hyphenated (NM/Ohio/NC) or whitespace (UT/WI/IL/WL).
    // Trailing `(-U)?` captures Illinois Rule 23 unpublished marker (#230);
    // the suffix is consumed but excluded from `documentNumber`.
    const neutralRegex = /^(\d{4})[-\s]+(.+?)[-\s]+(\d+)(-U)?$/d
    const match = neutralRegex.exec(text)
    if (!match) {
      throw new Error(`Failed to parse neutral citation: ${text}`)
    }
    year = Number.parseInt(match[1], 10)
    court = match[2]
    documentNumber = match[3]
    if (match[4] === "-U") {
      unpublished = true
    }
    if (match.indices) {
      spans = {
        year: spanFromGroupIndex(span.cleanStart, match.indices[1]!, transformationMap),
        court: spanFromGroupIndex(span.cleanStart, match.indices[2]!, transformationMap),
        documentNumber: spanFromGroupIndex(
          span.cleanStart,
          match.indices[3]!,
          transformationMap,
        ),
      }
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
      // Component span for pincite (#210). Indices are relative to afterToken,
      // which starts at span.cleanEnd in cleanedText.
      if (laMatch.indices?.[1]) {
        if (!spans) spans = {}
        spans.pincite = spanFromGroupIndex(
          span.cleanEnd,
          laMatch.indices[1],
          transformationMap,
        )
      }
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
    ...(unpublished ? { unpublished: true } : {}),
    pincite,
    pinciteInfo,
    spans,
  }
}
