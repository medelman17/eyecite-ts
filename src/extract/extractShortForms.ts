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
export function extractId(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
): IdCitation {
  const { text, span } = token

  // Parse Id. with optional pincite
  // Pattern: Id. or Ibid. with optional comma + "at [page]" (handles "Id., at 5")
  const idRegex = /([Ii])(?:d|bid)(\.)(,?)\s*(?:at\s+(\d+(?:\s*[-–]\s*\d+)?))?/
  const match = idRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse Id. citation: ${text}`)
  }

  const firstChar = match[1]
  const hasComma = match[3] === ","
  const pincite = match[4] ? Number.parseInt(match[4], 10) : undefined

  // Confidence scoring based on variant
  let confidence = 1.0
  const isLowercase = firstChar === "i"
  if (isLowercase) confidence = 0.85 // Lowercase id. is non-standard
  if (hasComma) confidence = Math.min(confidence, 0.9) // Comma variant (Id., at N)

  // Context validation: check whether Id. appears in a citation context.
  // Real Id. citations follow sentence-ending punctuation, semicolons,
  // or paragraph breaks — not mid-sentence prose like "The Id. card".
  if (cleanedText && span.cleanStart > 0) {
    const preceding = cleanedText.slice(Math.max(0, span.cleanStart - 20), span.cleanStart)
    // Look for the last non-whitespace character before Id.
    const trimmed = preceding.trimEnd()
    if (trimmed.length > 0) {
      const lastChar = trimmed[trimmed.length - 1]
      // Citation contexts end with: . ; ) ] — or follow certain patterns
      const isCitationContext = /[.;)\]—:]$/.test(trimmed)
      if (!isCitationContext) {
        // Mid-sentence Id. (e.g., "The Id. card") — likely not a citation
        confidence = Math.min(confidence, 0.4)
      }
    }
  }

  // Translate positions from clean → original
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

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

  // Try party-name pattern first: "Smith, supra [note N] [, at page]"
  const partySupraRegex =
    /\b([A-Z][a-zA-Z''\-]+\.?(?:(?:\s+v\.?\s+|\s+)[A-Z][a-zA-Z''\-]+\.?)*)\s*,?\s+supra(?:\s+note\s+(\d+))?(?:,?\s+at\s+(\d+))?/
  const partyMatch = partySupraRegex.exec(text)

  // Fallback: standalone supra — "supra note N", "supra at N", "supra § N"
  const standaloneRegex =
    /supra(?:\s+note\s+(\d+)(?:,?\s+at\s+(\d+))?|\s+at\s+(\d+))?/
  const match = partyMatch || standaloneRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse supra citation: ${text}`)
  }

  let partyName: string | undefined
  let pincite: number | undefined
  let confidence: number

  if (partyMatch) {
    partyName = partyMatch[1]
    pincite = partyMatch[3] ? Number.parseInt(partyMatch[3], 10) : undefined
    confidence = 0.9
  } else {
    // Standalone supra — no party name
    partyName = undefined
    const noteNum = match[1]
    const noteAtPage = match[2]
    const atPage = match[3]
    pincite = noteAtPage
      ? Number.parseInt(noteAtPage, 10)
      : atPage
        ? Number.parseInt(atPage, 10)
        : undefined
    confidence = 0.8 // Slightly lower — standalone supra is less specific
  }

  // Translate positions from clean → original
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

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
