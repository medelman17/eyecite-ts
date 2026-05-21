/**
 * Federal Register Citation Extraction
 *
 * Parses tokenized Federal Register citations to extract volume, page, and
 * optional year. Examples: "85 Fed. Reg. 12345", "86 Fed. Reg. 56789 (Jan. 15, 2021)"
 *
 * @module extract/extractFederalRegister
 */

import type { Token } from "@/tokenize"
import type { FederalRegisterCitation } from "@/types/citation"
import type { FederalRegisterComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { isPlausibleYear } from "./dates"

/**
 * Extracts Federal Register citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Volume: Federal Register volume number (e.g., "85")
 * - Page: Page number (e.g., "12345")
 * - Year: Optional publication year in parentheses (e.g., "(2021)")
 *
 * Confidence scoring:
 * - 0.9 (Federal Register format is standardized)
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @returns FederalRegisterCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "85 Fed. Reg. 12345",
 *   span: { cleanStart: 10, cleanEnd: 28 },
 *   type: "federalRegister",
 *   patternId: "federal-register"
 * }
 * const citation = extractFederalRegister(token, transformationMap)
 * // citation = {
 * //   type: "federalRegister",
 * //   volume: 85,
 * //   page: 12345,
 * //   confidence: 0.9,
 * //   ...
 * // }
 * ```
 */
export function extractFederalRegister(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
): FederalRegisterCitation {
  const { text, span } = token

  // Parse volume-page using regex
  // Pattern: volume (digits) + "Fed. Reg." + page (digits, optionally
  // comma-grouped like `12,345`). Federal Register pages routinely
  // exceed 10,000 so commas are common.
  const federalRegisterRegex = /^(\d+(?:-\d+)?)\s+Fed\.\s?Reg\.\s+(\d{1,3}(?:,\d{3})+|\d+)/d
  const match = federalRegisterRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse Federal Register citation: ${text}`)
  }

  const rawVolume = match[1]
  const volume = /^\d+$/.test(rawVolume) ? Number.parseInt(rawVolume, 10) : rawVolume
  // Strip thousands-grouping commas before integer parse.
  const page = Number.parseInt(match[2].replace(/,/g, ""), 10)

  let spans: FederalRegisterComponentSpans | undefined
  if (match.indices) {
    spans = {
      volume: spanFromGroupIndex(span.cleanStart, match.indices[1]!, transformationMap),
      page: spanFromGroupIndex(span.cleanStart, match.indices[2]!, transformationMap),
    }
  }

  // Extract optional year in parentheses
  // Pattern: "(year)" or "(month day, year)"
  // Plausibility filter (#523): drop OCR-mangled or page-number years.
  // Scan the cleaned text starting from the token to catch trailing
  // year parens that aren't part of the matched token itself
  // (`85 Fed. Reg. 12,345 (Mar. 1, 2020)` — the `(Mar. 1, 2020)` sits
  // outside the cite proper but is the publication date).
  const yearRegex = /\((?:.*?\s)?(\d{4})\)/
  const yearScanText = cleanedText
    ? cleanedText.substring(span.cleanStart, span.cleanEnd + 64)
    : text
  const yearMatch = yearRegex.exec(yearScanText)
  const rawYear = yearMatch ? Number.parseInt(yearMatch[1], 10) : undefined
  const year = rawYear !== undefined && isPlausibleYear(rawYear) ? rawYear : undefined

  // Translate positions from clean → original
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Confidence: 0.9 (Federal Register format is standardized)
  const confidence = 0.9

  return {
    type: "federalRegister",
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
    volume,
    page,
    year,
    spans,
  }
}
