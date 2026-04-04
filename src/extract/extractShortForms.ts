/**
 * Short-form Citation Extraction
 *
 * Parses tokenized short-form citations (Id., supra, short-form case) to extract
 * metadata. Short-form citations refer to earlier citations in the document.
 *
 * @module extract/extractShortForms
 */

import type { Token } from "@/tokenize"
import type { IdCitation, ShortFormCaseCitation, SupraCitation } from "@/types/citation"
import { resolveOriginalSpan, type TransformationMap } from "@/types/span"

/**
 * Extracts Id. citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Pincite: Optional page reference (e.g., "253" from "Id. at 253")
 *
 * Confidence scoring:
 * - 1.0 (Id. format is unambiguous and standardized)
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @returns IdCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "Id. at 253",
 *   span: { cleanStart: 10, cleanEnd: 20 },
 *   type: "case",
 *   patternId: "id"
 * }
 * const citation = extractId(token, transformationMap)
 * // citation = {
 * //   type: "id",
 * //   pincite: 253,
 * //   confidence: 1.0,
 * //   ...
 * // }
 * ```
 */
export function extractId(token: Token, transformationMap: TransformationMap): IdCitation {
  const { text, span } = token

  // Parse Id. with optional pincite
  // Pattern: Id. or Ibid. with optional comma + "at [page]" (handles "Id., at 5")
  const idRegex = /[Ii](?:d|bid)\.(?:,?\s+at\s+(\d+(?:\s*[-–]\s*\d+)?))?/
  const match = idRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse Id. citation: ${text}`)
  }

  // Extract pincite if present
  const pincite = match[1] ? Number.parseInt(match[1], 10) : undefined

  // Translate positions from clean → original
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Confidence: 1.0 (Id. format is unambiguous)
  const confidence = 1.0

  return {
    type: "id",
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
    pincite,
  }
}

/**
 * Extracts supra citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Party name: Name preceding "supra" (e.g., "Smith" from "Smith, supra")
 * - Pincite: Optional page reference (e.g., "460" from "Smith, supra, at 460")
 *
 * Confidence scoring:
 * - 0.9 (supra format is fairly standard but party name extraction can vary)
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @returns SupraCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "Smith, supra, at 460",
 *   span: { cleanStart: 10, cleanEnd: 30 },
 *   type: "case",
 *   patternId: "supra"
 * }
 * const citation = extractSupra(token, transformationMap)
 * // citation = {
 * //   type: "supra",
 * //   partyName: "Smith",
 * //   pincite: 460,
 * //   confidence: 0.9,
 * //   ...
 * // }
 * ```
 */
export function extractSupra(token: Token, transformationMap: TransformationMap): SupraCitation {
  const { text, span } = token

  // Parse party name, optional note number, and optional pincite
  // Pattern: word(s), supra [note N] [, at page]
  // Note: Matches party names including hyphens, apostrophes, periods, and "v."
  const supraRegex =
    /\b([A-Z][a-zA-Z''\-]+\.?(?:(?:\s+v\.?\s+|\s+)[A-Z][a-zA-Z''\-]+\.?)*)\s*,?\s+supra(?:\s+note\s+(\d+))?(?:,?\s+at\s+(\d+))?/
  const match = supraRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse supra citation: ${text}`)
  }

  const partyName = match[1]
  const pincite = match[3] ? Number.parseInt(match[3], 10) : undefined

  // Translate positions from clean → original
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Confidence: 0.9 (supra format is fairly standard)
  const confidence = 0.9

  return {
    type: "supra",
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
    partyName,
    pincite,
  }
}

/**
 * Extracts short-form case citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Volume: Volume number
 * - Reporter: Reporter abbreviation
 * - Pincite: Page reference (from "at [page]" pattern)
 *
 * Confidence scoring:
 * - 0.7 (short-form case citations are more ambiguous than full citations)
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @returns ShortFormCaseCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "500 F.2d at 125",
 *   span: { cleanStart: 10, cleanEnd: 25 },
 *   type: "case",
 *   patternId: "short-form-case"
 * }
 * const citation = extractShortFormCase(token, transformationMap)
 * // citation = {
 * //   type: "shortFormCase",
 * //   volume: 500,
 * //   reporter: "F.2d",
 * //   pincite: 125,
 * //   confidence: 0.7,
 * //   ...
 * // }
 * ```
 */
export function extractShortFormCase(
  token: Token,
  transformationMap: TransformationMap,
): ShortFormCaseCitation {
  const { text, span } = token

  // Parse volume-reporter-at-page
  // Pattern: number space abbreviation space "at" space number
  // Supports reporters with 1-2 letter ordinal suffixes (e.g., F.4th, Cal.4th)
  const shortFormRegex = /(\d+(?:-\d+)?)\s+([A-Z][A-Za-z.''\s]+?(?:\d[a-z]{1,2})?)\s+at\s+(\d+)/
  const match = shortFormRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse short-form case citation: ${text}`)
  }

  const rawVolume = match[1]
  const volume = /^\d+$/.test(rawVolume) ? Number.parseInt(rawVolume, 10) : rawVolume
  const reporter = match[2].trim() // Remove trailing spaces
  const pincite = Number.parseInt(match[3], 10)

  // Translate positions from clean → original
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Confidence: 0.7 (short-form citations are more ambiguous)
  const confidence = 0.7

  return {
    type: "shortFormCase",
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
    reporter,
    pincite,
  }
}
