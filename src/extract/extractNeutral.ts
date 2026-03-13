/**
 * Neutral Citation Extraction
 *
 * Parses tokenized neutral (vendor-neutral) citations to extract year, court,
 * and document number. Examples: "2020 WL 123456", "2020 U.S. LEXIS 456"
 *
 * @module extract/extractNeutral
 */

import type { Token } from '@/tokenize'
import type { NeutralCitation } from '@/types/citation'
import type { TransformationMap } from '@/types/span'

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
): NeutralCitation {
	const { text, span } = token

	// Parse year-court-documentNumber using regex
	// Pattern: 4-digit year + court identifier (WL, LEXIS, state codes, etc.) + document number
	const neutralRegex = /^(\d{4})\s+(.+?)\s+(\d+)$/
	const match = neutralRegex.exec(text)

	if (!match) {
		throw new Error(`Failed to parse neutral citation: ${text}`)
	}

	const year = Number.parseInt(match[1], 10)
	const court = match[2]
	const documentNumber = match[3]

	// Translate positions from clean → original
	const originalStart =
		transformationMap.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart
	const originalEnd =
		transformationMap.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd

	// Confidence: 1.0 (neutral format is unambiguous)
	const confidence = 1.0

	return {
		type: 'neutral',
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
	}
}
