/**
 * Public Law Citation Extraction
 *
 * Parses tokenized public law citations to extract congress number and law number.
 * Examples: "Pub. L. No. 116-283", "Pub. L. 117-58"
 *
 * @module extract/extractPublicLaw
 */

import type { Token } from '@/tokenize'
import type { PublicLawCitation } from '@/types/citation'
import type { TransformationMap } from '@/types/span'

/**
 * Extracts public law citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Congress: Congress number (e.g., "116" from "Pub. L. No. 116-283")
 * - Law number: Law number within that Congress (e.g., "283")
 *
 * Confidence scoring:
 * - 0.9 (public law format is fairly standard)
 *
 * Note: Bill title extraction from nearby text is not implemented in Phase 2.
 * That requires context analysis in Phase 3.
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @returns PublicLawCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "Pub. L. No. 116-283",
 *   span: { cleanStart: 10, cleanEnd: 29 },
 *   type: "publicLaw",
 *   patternId: "public-law"
 * }
 * const citation = extractPublicLaw(token, transformationMap)
 * // citation = {
 * //   type: "publicLaw",
 * //   congress: 116,
 * //   lawNumber: 283,
 * //   confidence: 0.9,
 * //   ...
 * // }
 * ```
 */
export function extractPublicLaw(
	token: Token,
	transformationMap: TransformationMap,
): PublicLawCitation {
	const { text, span } = token

	// Parse congress-lawNumber using regex
	// Pattern: "Pub. L." (with optional "No.") + congress number + "-" + law number
	const publicLawRegex = /Pub\.\s?L\.(?:\s?No\.)?\s?(\d+)-(\d+)/
	const match = publicLawRegex.exec(text)

	if (!match) {
		throw new Error(`Failed to parse public law citation: ${text}`)
	}

	const congress = Number.parseInt(match[1], 10)
	const lawNumber = Number.parseInt(match[2], 10)

	// Translate positions from clean → original
	const originalStart =
		transformationMap.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart
	const originalEnd =
		transformationMap.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd

	// Confidence: 0.9 (public law format is fairly standard)
	const confidence = 0.9

	return {
		type: 'publicLaw',
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
		congress,
		lawNumber,
	}
}
