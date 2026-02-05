/**
 * Case Citation Extraction
 *
 * Parses tokenized case citations to extract volume, reporter, page, and
 * optional metadata (pincite, court, year). This is the third stage of
 * the parsing pipeline:
 *   1. Clean text (remove HTML, normalize Unicode)
 *   2. Tokenize (apply patterns to find candidates)
 *   3. Extract (parse metadata, validate) ← THIS MODULE
 *
 * Extraction parses structured data from token text. Validation against
 * reporters-db happens in Phase 3 (resolution layer).
 *
 * @module extract/extractCase
 */

import type { Token } from '@/tokenize'
import type { FullCaseCitation } from '@/types/citation'
import type { TransformationMap } from '@/types/span'

/** Parse a volume string as number when purely numeric, string when hyphenated */
function parseVolume(raw: string): number | string {
	const num = Number.parseInt(raw, 10)
	return String(num) === raw ? num : raw
}

/** Month abbreviations found in legal citation parentheticals */
const MONTH_PATTERN = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?/

/**
 * Strips date components (month, day, year) from parenthetical content
 * to isolate the court abbreviation.
 * E.g., "2d Cir. Jan. 15, 2020" → "2d Cir."
 *        "C.D. Cal. Feb. 9, 2015" → "C.D. Cal."
 *        "D. Mass. Mar. 2020" → "D. Mass."
 */
function stripDateFromCourt(content: string): string | undefined {
	// Strip trailing year
	let court = content.replace(/\s*\d{4}\s*$/, '').trim()
	// Strip trailing date components: optional day+comma, month abbreviation
	court = court.replace(new RegExp(`\\s*,?\\s*\\d{1,2}\\s*,?\\s*$`), '').trim()
	court = court.replace(new RegExp(`\\s*${MONTH_PATTERN.source}\\s*$`), '').trim()
	// Strip any trailing commas left over
	court = court.replace(/,\s*$/, '').trim()
	return court && /[A-Za-z]/.test(court) ? court : undefined
}

/**
 * Extracts case citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Volume: Leading digits (e.g., "500" from "500 F.2d 123")
 * - Reporter: Alphabetic abbreviation (e.g., "F.2d")
 * - Page: Trailing digits after reporter (e.g., "123")
 * - Pincite: Optional page reference after comma (e.g., ", 125")
 * - Court: Optional court abbreviation in parentheses (e.g., "(9th Cir.)")
 * - Year: Optional year in parentheses (e.g., "(2020)")
 *
 * Confidence scoring:
 * - Base: 0.5
 * - Common reporter pattern (F., U.S., etc.): +0.3
 * - Valid year (not future): +0.2
 * - Capped at 1.0
 *
 * Position translation:
 * - Uses TransformationMap to convert clean positions → original positions
 * - cleanStart/cleanEnd from token span
 * - originalStart/originalEnd via transformationMap.cleanToOriginal
 *
 * Note: This function does NOT validate against reporters-db. That happens
 * in Phase 3 (resolution layer). Phase 2 extraction only parses structure.
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @returns FullCaseCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "500 F.2d 123, 125",
 *   span: { cleanStart: 10, cleanEnd: 27 },
 *   type: "case",
 *   patternId: "federal-reporter"
 * }
 * const citation = extractCase(token, transformationMap)
 * // citation = {
 * //   type: "case",
 * //   text: "500 F.2d 123, 125",
 * //   volume: 500,
 * //   reporter: "F.2d",
 * //   page: 123,
 * //   pincite: 125,
 * //   span: { cleanStart: 10, cleanEnd: 27, originalStart: 10, originalEnd: 27 },
 * //   confidence: 0.8,
 * //   ...
 * // }
 * ```
 */
export function extractCase(
	token: Token,
	transformationMap: TransformationMap,
	cleanedText?: string,
): FullCaseCitation {
	const { text, span } = token

	// Parse volume-reporter-page using regex
	// Pattern: volume (digits) + reporter (letters/periods/spaces/numbers) + page (digits or blank placeholder)
	// Use greedy matching for reporter to capture full abbreviation including spaces
	const volumeReporterPageRegex = /^(\d+(?:-\d+)?)\s+([A-Za-z0-9.\s]+)\s+(\d+|_{3,}|-{3,})/
	const match = volumeReporterPageRegex.exec(text)

	if (!match) {
		// Fallback if pattern doesn't match (shouldn't happen if tokenizer is correct)
		throw new Error(`Failed to parse case citation: ${text}`)
	}

	const volume = parseVolume(match[1])
	const reporter = match[2].trim()

	// Check if page is a blank placeholder
	const pageStr = match[3]
	const isBlankPage = /^[_-]{3,}$/.test(pageStr)
	const page = isBlankPage ? undefined : Number.parseInt(pageStr, 10)
	const hasBlankPage = isBlankPage ? true : undefined

	// Extract optional pincite (page reference after comma)
	// Pattern: ", digits" (e.g., ", 125")
	const pinciteRegex = /,\s*(\d+)/
	const pinciteMatch = pinciteRegex.exec(text)
	let pincite = pinciteMatch ? Number.parseInt(pinciteMatch[1], 10) : undefined

	// Extract optional year in parentheses (extract first for better matching)
	// Pattern: 4-digit year anywhere in parentheses
	const yearRegex = /\((?:[^)]*\s)?(\d{4})\)/
	const yearMatch = yearRegex.exec(text)
	let year = yearMatch ? Number.parseInt(yearMatch[1], 10) : undefined

	// Extract optional court abbreviation in parentheses
	// Pattern: "(text)" where text contains letters (captures full parenthetical)
	const courtRegex = /\(([^)]*[A-Za-z][^)]*)\)/
	const courtMatch = courtRegex.exec(text)
	let court = courtMatch ? stripDateFromCourt(courtMatch[1]) : undefined

	// Look ahead in cleaned text for parenthetical after the token
	// Tokenization patterns only capture volume-reporter-page, so parentheticals
	// like "(1989)" or "(9th Cir. 2020)" are not in the token text.
	if (cleanedText && year === undefined) {
		const afterToken = cleanedText.substring(span.cleanEnd)
		const lookAheadRegex = /^(?:,\s*\d+)*\s*\(([^)]+)\)/
		const lookAheadMatch = lookAheadRegex.exec(afterToken)
		if (lookAheadMatch) {
			const parenContent = lookAheadMatch[1]

			// Extract year from parenthetical content
			const laYearMatch = /(\d{4})/.exec(parenContent)
			if (laYearMatch) {
				year = Number.parseInt(laYearMatch[1], 10)
			}

			// Extract court from parenthetical (strip date components)
			const courtContent = stripDateFromCourt(parenContent)
			if (courtContent) {
				court = courtContent
			}

			// Extract pincite from look-ahead if not already found in token text
			if (pincite === undefined) {
				const laPinciteMatch = /^,\s*(\d+)/.exec(afterToken)
				if (laPinciteMatch) {
					pincite = Number.parseInt(laPinciteMatch[1], 10)
				}
			}
		}
	}

	// Infer court from reporter for known Supreme Court reporters
	if (!court && /^(?:U\.?\s?S\.|S\.?\s?Ct\.|L\.?\s?Ed\.)/.test(reporter)) {
		court = 'scotus'
	}

	// Translate positions from clean → original
	const originalStart =
		transformationMap.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart
	const originalEnd =
		transformationMap.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd

	// Calculate confidence score
	let confidence = 0.5 // Base confidence

	// Common reporter patterns (F., U.S., S. Ct., etc.)
	const commonReporters = [
		'F.',
		'F.2d',
		'F.3d',
		'F.4th',
		'U.S.',
		'S. Ct.',
		'L. Ed.',
		'P.',
		'P.2d',
		'P.3d',
		'A.',
		'A.2d',
		'A.3d',
		'N.E.',
		'N.E.2d',
		'N.E.3d',
		'N.W.',
		'N.W.2d',
		'S.E.',
		'S.E.2d',
		'S.W.',
		'S.W.2d',
		'S.W.3d',
		'So.',
		'So. 2d',
		'So. 3d',
	]

	if (commonReporters.some((r) => reporter.includes(r))) {
		confidence += 0.3
	}

	// Valid year check (not in future)
	if (year !== undefined) {
		const currentYear = new Date().getFullYear()
		if (year <= currentYear) {
			confidence += 0.2
		}
	}

	// Cap at 1.0
	confidence = Math.min(confidence, 1.0)

	// Override confidence for blank page citations
	if (hasBlankPage) {
		confidence = 0.8
	}

	return {
		type: 'case',
		text,
		span: {
			cleanStart: span.cleanStart,
			cleanEnd: span.cleanEnd,
			originalStart,
			originalEnd,
		},
		confidence,
		matchedText: text,
		processTimeMs: 0, // Placeholder - timing handled by orchestration layer
		patternsChecked: 1, // Single token processed
		volume,
		reporter,
		page,
		pincite,
		court,
		year,
		hasBlankPage,
	}
}
