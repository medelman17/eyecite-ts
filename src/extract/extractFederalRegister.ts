/**
 * Federal Register Citation Extraction
 *
 * Parses tokenized Federal Register citations to extract volume, page, and
 * optional year. Examples: "85 Fed. Reg. 12345", "86 Fed. Reg. 56789 (Jan. 15, 2021)"
 *
 * @module extract/extractFederalRegister
 */

import type { Token } from '@/tokenize'
import type { FederalRegisterCitation } from '@/types/citation'
import type { TransformationMap } from '@/types/span'

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
): FederalRegisterCitation {
	const { text, span } = token

	// Parse volume-page using regex
	// Pattern: volume (digits) + "Fed. Reg." + page (digits)
	const federalRegisterRegex = /^(\d+)\s+Fed\.\s?Reg\.\s+(\d+)/
	const match = federalRegisterRegex.exec(text)

	if (!match) {
		throw new Error(`Failed to parse Federal Register citation: ${text}`)
	}

	const volume = Number.parseInt(match[1], 10)
	const page = Number.parseInt(match[2], 10)

	// Extract optional year in parentheses
	// Pattern: "(year)" or "(month day, year)"
	const yearRegex = /\((?:.*?\s)?(\d{4})\)/
	const yearMatch = yearRegex.exec(text)
	const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : undefined

	// Translate positions from clean → original
	const originalStart =
		transformationMap.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart
	const originalEnd =
		transformationMap.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd

	// Confidence: 0.9 (Federal Register format is standardized)
	const confidence = 0.9

	return {
		type: 'federalRegister',
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
	}
}
