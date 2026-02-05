/**
 * Journal Citation Extraction
 *
 * Parses tokenized journal citations to extract volume, journal name, page,
 * and optional metadata. Examples: "123 Harv. L. Rev. 456", "75 Yale L.J. 789, 791"
 *
 * @module extract/extractJournal
 */

import type { Token } from '@/tokenize'
import type { JournalCitation } from '@/types/citation'
import type { TransformationMap } from '@/types/span'

/**
 * Extracts journal citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Volume: Leading digits (e.g., "123" from "123 Harv. L. Rev. 456")
 * - Journal: Journal abbreviation (e.g., "Harv. L. Rev.")
 * - Page: Starting page number (e.g., "456")
 * - Pincite: Optional specific page reference after comma (e.g., ", 458")
 *
 * Confidence scoring:
 * - Base: 0.6 (journal validation happens in Phase 3)
 *
 * Note: Author and title extraction from preceding text is not implemented
 * in Phase 2. That requires context analysis in Phase 3.
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
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
): JournalCitation {
	const { text, span } = token

	// Parse volume-journal-page using regex
	// Pattern: volume (digits) + journal (letters/periods/spaces) + page (digits)
	const journalRegex = /^(\d+(?:-\d+)?)\s+([A-Za-z.\s]+?)\s+(\d+)/
	const match = journalRegex.exec(text)

	if (!match) {
		throw new Error(`Failed to parse journal citation: ${text}`)
	}

	const rawVolume = match[1]
	const volume = /^\d+$/.test(rawVolume) ? Number.parseInt(rawVolume, 10) : rawVolume
	const journal = match[2].trim()
	const page = Number.parseInt(match[3], 10)

	// Extract optional pincite (page reference after comma)
	const pinciteRegex = /,\s*(\d+)/
	const pinciteMatch = pinciteRegex.exec(text)
	const pincite = pinciteMatch ? Number.parseInt(pinciteMatch[1], 10) : undefined

	// Translate positions from clean → original
	const originalStart =
		transformationMap.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart
	const originalEnd =
		transformationMap.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd

	// Confidence: 0.6 base (journal validation against database happens in Phase 3)
	const confidence = 0.6

	return {
		type: 'journal',
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
	}
}
