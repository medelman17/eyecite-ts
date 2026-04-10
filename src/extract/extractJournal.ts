/**
 * Journal Citation Extraction
 *
 * Parses tokenized journal citations to extract volume, journal name, page,
 * and optional metadata. Examples: "123 Harv. L. Rev. 456", "75 Yale L.J. 789, 791"
 *
 * @module extract/extractJournal
 */

import type { Token } from "@/tokenize"
import type { JournalCitation } from "@/types/citation"
import type { JournalComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"

/**
 * Extracts journal citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Volume: Leading digits (e.g., "123" from "123 Harv. L. Rev. 456")
 * - Journal: Journal abbreviation (e.g., "Harv. L. Rev.")
 * - Page: Starting page number (e.g., "456")
 * - Pincite: Optional specific page reference after comma (e.g., ", 458")
 * - Year: Optional publication year in parenthetical (e.g., "(2020)")
 *
 * When `cleanedText` is provided, the extractor performs lookahead beyond the token
 * boundary to extract optional pincite and year components that the tokenizer does
 * not capture in the token text.
 *
 * Confidence scoring:
 * - Base: 0.6 (journal validation happens in Phase 3)
 *
 * Note: Author and title extraction from preceding text is not implemented
 * in Phase 2. That requires context analysis in Phase 3.
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @param cleanedText - Full cleaned document text (optional; enables pincite/year lookahead)
 * @returns JournalCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "123 Harv. L. Rev. 456",
 *   span: { cleanStart: 10, cleanEnd: 31 },
 *   type: "journal",
 *   patternId: "journal-standard"
 * }
 * const citation = extractJournal(token, transformationMap)
 * // citation = {
 * //   type: "journal",
 * //   volume: 123,
 * //   journal: "Harv. L. Rev.",
 * //   abbreviation: "Harv. L. Rev.",
 * //   page: 456,
 * //   ...
 * // }
 * ```
 */
export function extractJournal(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
): JournalCitation {
  const { text, span } = token

  // Parse volume-journal-page using regex
  // Pattern: volume (digits) + journal (letters/periods/spaces) + page (digits)
  const journalRegex = /^(\d+(?:-\d+)?)\s+([A-Za-z.\s]+?)\s+(\d+)/d
  const match = journalRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse journal citation: ${text}`)
  }

  const rawVolume = match[1]
  const volume = /^\d+$/.test(rawVolume) ? Number.parseInt(rawVolume, 10) : rawVolume
  const journal = match[2].trim()
  const page = Number.parseInt(match[3], 10)

  // Determine where to search for pincite/year.
  //
  // When cleanedText is available (pipeline context), we search a window starting
  // at the token end position. This handles the normal tokenizer case where the
  // tokenizer only captures the core citation (e.g., "75 Yale L.J. 456") and the
  // pincite/year appear immediately after in the document.
  //
  // When cleanedText is not available (manually constructed tokens in tests),
  // we fall back to the token text itself, which may contain them directly.
  const lookaheadWindow = 30

  // afterTokenText: text immediately after the core token match, in clean coordinates.
  // For pipeline tokens: this is a window of cleanedText starting at span.cleanEnd.
  // For manually constructed tokens (no cleanedText): the remainder of token.text after
  //   the core match (text after match[0].length characters, if any).
  let afterTokenText: string
  let afterTokenCleanStart: number
  if (cleanedText !== undefined) {
    afterTokenText = cleanedText.slice(span.cleanEnd, span.cleanEnd + lookaheadWindow)
    afterTokenCleanStart = span.cleanEnd
  } else {
    // Token text may already include pincite/year (e.g., "123 Harv. L. Rev. 456, 458")
    // The core match ends at match[0].length within the token text.
    afterTokenText = text.slice(match[0].length)
    afterTokenCleanStart = span.cleanStart + match[0].length
  }

  // Build full context string (from token start) for year search
  const fullContext = cleanedText
    ? cleanedText.slice(span.cleanStart, span.cleanEnd + lookaheadWindow)
    : text

  // Extract optional pincite (page reference after comma) immediately after core match
  const pinciteRegex = /^,\s*(\d+)/d
  const pinciteMatch = pinciteRegex.exec(afterTokenText)
  const pincite = pinciteMatch ? Number.parseInt(pinciteMatch[1], 10) : undefined

  // Extract optional year from parenthetical (e.g., "(2020)") anywhere in the context
  const yearRegex = /\((?:.*?\s)?(\d{4})\)/d
  const yearMatch = yearRegex.exec(fullContext)
  const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : undefined

  // Build component spans using match indices from `d` flag
  let spans: JournalComponentSpans | undefined
  if (match.indices) {
    spans = {
      volume: spanFromGroupIndex(span.cleanStart, match.indices[1]!, transformationMap),
      journal: spanFromGroupIndex(span.cleanStart, match.indices[2]!, transformationMap),
      page: spanFromGroupIndex(span.cleanStart, match.indices[3]!, transformationMap),
    }
    if (pinciteMatch?.indices?.[1]) {
      // pinciteMatch.indices[1] is relative to afterTokenText which starts at afterTokenCleanStart
      spans.pincite = spanFromGroupIndex(
        afterTokenCleanStart,
        pinciteMatch.indices[1],
        transformationMap,
      )
    }
    if (yearMatch?.indices?.[1]) {
      // yearMatch.indices[1] is relative to fullContext which starts at span.cleanStart
      spans.year = spanFromGroupIndex(span.cleanStart, yearMatch.indices[1], transformationMap)
    }
  }

  // Translate positions from clean → original
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Confidence: 0.6 base (journal validation against database happens in Phase 3)
  const confidence = 0.6

  return {
    type: "journal",
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
    journal,
    abbreviation: journal, // For Phase 2, abbreviation = journal name
    page,
    pincite,
    year,
    spans,
  }
}
