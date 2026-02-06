/**
 * Statute Citation Extraction
 *
 * Parses tokenized statute citations to extract title, code, section, and
 * optional subsections. Examples: "42 U.S.C. § 1983", "Cal. Civ. Code § 1234(a)(1)"
 *
 * @module extract/extractStatute
 */

import type { Token } from '@/tokenize'
import type { StatuteCitation } from '@/types/citation'
import type { TransformationMap } from '@/types/span'

/**
 * Extracts statute citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Title: Optional leading digits (e.g., "42" from "42 U.S.C. § 1983")
 * - Code: Statutory code abbreviation (e.g., "U.S.C.", "Cal. Civ. Code")
 * - Section: Section number after § symbol (e.g., "1983")
 * - Subsections: Optional parenthetical subdivisions (e.g., "(a)(1)")
 *
 * Confidence scoring:
 * - Base: 0.5
 * - Known code pattern (U.S.C., C.F.R., state codes): +0.3
 * - Capped at 1.0
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @returns StatuteCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "42 U.S.C. § 1983",
 *   span: { cleanStart: 10, cleanEnd: 26 },
 *   type: "statute",
 *   patternId: "usc"
 * }
 * const citation = extractStatute(token, transformationMap)
 * // citation = {
 * //   type: "statute",
 * //   title: 42,
 * //   code: "U.S.C.",
 * //   section: "1983",
 * //   ...
 * // }
 * ```
 */
export function extractStatute(
	token: Token,
	transformationMap: TransformationMap,
): StatuteCitation {
	const { text, span } = token

	// Parse title-code-section using regex
	// Pattern: optional title (digits) + code (letters/periods/spaces) + §+ + section
	const statuteRegex = /^(?:(\d+)\s+)?([A-Za-z.\s]+?)\s*§+\s*(\d+[A-Za-z0-9-]*)/
	const match = statuteRegex.exec(text)

	if (!match) {
		throw new Error(`Failed to parse statute citation: ${text}`)
	}

	const title = match[1] ? Number.parseInt(match[1], 10) : undefined
	const code = match[2].trim()
	const section = match[3]

	// Translate positions from clean → original
	const originalStart =
		transformationMap.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart
	const originalEnd =
		transformationMap.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd

	// Calculate confidence score
	let confidence = 0.5 // Base confidence

	// Known statutory code patterns
	const knownCodes = [
		'U.S.C.',
		'C.F.R.',
		'Cal. Civ. Code',
		'Cal. Penal Code',
		'N.Y. Civ. Prac. L. & R.',
		'Tex. Civ. Prac. & Rem. Code',
	]

	if (knownCodes.some((c) => code.includes(c))) {
		confidence += 0.3
	}

	confidence = Math.min(confidence, 1.0)

	return {
		type: 'statute',
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
		title,
		code,
		section,
	}
}
