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
import type { TransformationMap, Span } from '@/types/span'
import { parseDate, type StructuredDate } from './dates'

/** Parse a volume string as number when purely numeric, string when hyphenated */
function parseVolume(raw: string): number | string {
	const num = Number.parseInt(raw, 10)
	return String(num) === raw ? num : raw
}

/** Month abbreviations and full names found in legal citation parentheticals */
const MONTH_PATTERN = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\.?/

/**
 * Strips date components (month, day, year) from parenthetical content
 * to isolate the court abbreviation.
 * E.g., "2d Cir. Jan. 15, 2020" → "2d Cir."
 *        "C.D. Cal. Feb. 9, 2015" → "C.D. Cal."
 *        "D. Mass. Mar. 2020" → "D. Mass."
 *        "D. Mass. 1/15/2020" → "D. Mass."
 */
function stripDateFromCourt(content: string): string | undefined {
	// Strip trailing numeric date format first (1/15/2020)
	let court = content.replace(/\s*\d{1,2}\/\d{1,2}\/\d{4}\s*$/, '').trim()
	// Strip trailing year
	court = court.replace(/\s*\d{4}\s*$/, '').trim()
	// Strip trailing date components: optional day+comma, month abbreviation or full name
	court = court.replace(/\s*,?\s*\d{1,2}\s*,?\s*$/, '').trim()
	court = court.replace(new RegExp(`\\s*${MONTH_PATTERN.source}\\s*$`, 'i'), '').trim()
	// Strip any trailing commas left over
	court = court.replace(/,\s*$/, '').trim()
	return court && /[A-Za-z]/.test(court) ? court : undefined
}

/**
 * Extract case name via backward search from citation core.
 * Looks for "v." pattern or procedural prefixes (In re, Ex parte, Matter of).
 *
 * @param cleanedText - Full cleaned text
 * @param coreStart - Position where citation core begins (volume start)
 * @param maxLookback - Maximum characters to search backward (default 150)
 * @returns Case name and start position, or undefined if not found
 *
 * @example
 * ```typescript
 * extractCaseName(text, 20, 150)
 * // Returns: { caseName: "Smith v. Jones", nameStart: 0 }
 * ```
 */
function extractCaseName(
	cleanedText: string,
	coreStart: number,
	maxLookback = 150,
): { caseName: string; nameStart: number } | undefined {
	const searchStart = Math.max(0, coreStart - maxLookback)
	const precedingText = cleanedText.substring(searchStart, coreStart)

	// Priority 1: Standard "v." format with comma before citation
	// Match party names with letters, numbers (for "Doe No. 2"), periods, apostrophes, ampersands, hyphens
	// Stop at semicolon (multi-citation separator)
	const vRegex =
		/([A-Z][A-Za-z0-9\s.,'&()-]+?)\s+v\.?\s+([A-Za-z0-9\s.,'&()-]+?)\s*,\s*$/
	const vMatch = vRegex.exec(precedingText)
	if (vMatch) {
		// Check for semicolon in matched text (would indicate crossing citation boundary)
		if (!vMatch[0].includes(';')) {
			const caseName = `${vMatch[1].trim()} v. ${vMatch[2].trim()}`
			const nameStart = searchStart + vMatch.index
			return { caseName, nameStart }
		}
	}

	// Priority 2: Procedural prefixes
	const procRegex =
		/\b(In re|Ex parte|Matter of)\s+([A-Za-z0-9\s.,'&()-]+?)\s*,\s*$/i
	const procMatch = procRegex.exec(precedingText)
	if (procMatch) {
		if (!procMatch[0].includes(';')) {
			const caseName = `${procMatch[1]} ${procMatch[2].trim()}`
			const nameStart = searchStart + procMatch.index
			return { caseName, nameStart }
		}
	}

	return undefined
}

/**
 * Find the end of parenthetical content, including chained parentheticals and subsequent history.
 * Tracks paren depth to handle nested parens, and continues scanning for chained parens.
 *
 * @param cleanedText - Full cleaned text
 * @param searchStart - Position to start searching from (after citation core)
 * @param maxLookahead - Maximum characters to search forward (default 200)
 * @returns Position after final closing paren (exclusive), or searchStart if no parens
 *
 * @example
 * ```typescript
 * findParentheticalEnd(text, 20, 200)
 * // For "(2020) (en banc)" returns position after final ")"
 * ```
 */
function findParentheticalEnd(
	cleanedText: string,
	searchStart: number,
	maxLookahead = 200,
): number {
	let pos = searchStart
	const endLimit = Math.min(cleanedText.length, searchStart + maxLookahead)
	let depth = 0
	let foundAnyParen = false

	while (pos < endLimit) {
		const char = cleanedText[pos]

		if (char === '(') {
			depth++
			foundAnyParen = true
			pos++
		} else if (char === ')') {
			depth--
			pos++

			// When depth returns to 0, check for chained paren or subsequent history
			if (depth === 0) {
				// Skip whitespace
				let nextPos = pos
				while (nextPos < endLimit && /\s/.test(cleanedText[nextPos])) {
					nextPos++
				}

				// Check for chained parenthetical
				if (cleanedText[nextPos] === '(') {
					pos = nextPos
					continue
				}

				// Check for subsequent history signals
				const remainingText = cleanedText.substring(nextPos, endLimit)
				const historyRegex =
					/^,\s*(aff'd|rev'd|cert\.\s*denied|overruled\s+by|vacated\s+by)/i
				if (historyRegex.test(remainingText)) {
					// Continue scanning - subsequent history has its own paren
					pos = nextPos
					continue
				}

				// No chained paren or subsequent history - we're done
				return pos
			}
		} else {
			pos++
		}
	}

	// If we found parens but didn't close them all, return where we stopped
	// If we never found parens, return searchStart
	return foundAnyParen ? pos : searchStart
}

/**
 * Parse parenthetical content to extract court, year, date, and disposition.
 * Unified parser replacing the old year-only logic.
 *
 * @param content - Parenthetical content (without the parens themselves)
 * @returns Structured parenthetical data
 *
 * @example
 * ```typescript
 * parseParenthetical("9th Cir. 2020")
 * // Returns: { court: "9th Cir.", year: 2020, date: { iso: "2020", parsed: { year: 2020 } } }
 *
 * parseParenthetical("2d Cir. Jan. 15, 2020")
 * // Returns: { court: "2d Cir.", year: 2020, date: { iso: "2020-01-15", parsed: { year: 2020, month: 1, day: 15 } } }
 *
 * parseParenthetical("en banc")
 * // Returns: { disposition: "en banc" }
 * ```
 */
function parseParenthetical(content: string): {
	court?: string
	year?: number
	date?: StructuredDate
	disposition?: string
} {
	const result: {
		court?: string
		year?: number
		date?: StructuredDate
		disposition?: string
	} = {}

	// Parse structured date using dates.ts
	const dateResult = parseDate(content)
	if (dateResult) {
		result.date = dateResult
		result.year = dateResult.parsed.year
	}

	// Extract court (strips date components)
	const courtResult = stripDateFromCourt(content)
	if (courtResult) {
		result.court = courtResult
	}

	// Check for disposition
	if (/\ben banc\b/i.test(content)) {
		result.disposition = 'en banc'
	} else if (/\bper curiam\b/i.test(content)) {
		result.disposition = 'per curiam'
	}

	return result
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

	// Initialize Phase 6 fields
	let year: number | undefined
	let court: string | undefined
	let date: StructuredDate | undefined
	let disposition: string | undefined
	let caseName: string | undefined
	let fullSpan: Span | undefined

	// Extract parenthetical from token text
	let parentheticalContent: string | undefined
	// Match any parenthetical (with or without letters)
	const parenRegex = /\(([^)]+)\)/
	const parenMatch = parenRegex.exec(text)
	if (parenMatch) {
		parentheticalContent = parenMatch[1]
		// Parse parenthetical using unified parser
		const parenResult = parseParenthetical(parentheticalContent)
		year = parenResult.year
		court = parenResult.court
		date = parenResult.date
		disposition = parenResult.disposition
	}

	// Look ahead in cleaned text for parenthetical after the token
	// Tokenization patterns only capture volume-reporter-page, so parentheticals
	// like "(1989)" or "(9th Cir. 2020)" are not in the token text.
	if (cleanedText && !parentheticalContent) {
		const afterToken = cleanedText.substring(span.cleanEnd)
		const lookAheadRegex = /^(?:,\s*\d+)*\s*\(([^)]+)\)/
		const lookAheadMatch = lookAheadRegex.exec(afterToken)
		if (lookAheadMatch) {
			parentheticalContent = lookAheadMatch[1]
			// Parse parenthetical using unified parser
			const parenResult = parseParenthetical(parentheticalContent)
			year = parenResult.year
			court = parenResult.court
			date = parenResult.date
			disposition = parenResult.disposition

			// Extract pincite from look-ahead if not already found in token text
			if (pincite === undefined) {
				const laPinciteMatch = /^,\s*(\d+)/.exec(afterToken)
				if (laPinciteMatch) {
					pincite = Number.parseInt(laPinciteMatch[1], 10)
				}
			}
		}
	}

	// Check for chained parentheticals with disposition (e.g., "(2020) (en banc)")
	if (cleanedText && !disposition) {
		const afterToken = cleanedText.substring(span.cleanEnd)
		// Look for second parenthetical after first one
		const chainedRegex = /\([^)]+\)\s*\((en banc|per curiam)\)/i
		const chainedMatch = chainedRegex.exec(afterToken)
		if (chainedMatch) {
			disposition = chainedMatch[1].toLowerCase()
		}
	}

	// Infer court from reporter for known Supreme Court reporters
	if (!court && /^(?:U\.?\s?S\.|S\.?\s?Ct\.|L\.?\s?Ed\.)/.test(reporter)) {
		court = 'scotus'
	}

	// Phase 6: Extract case name via backward search
	if (cleanedText) {
		const caseNameResult = extractCaseName(cleanedText, span.cleanStart)
		if (caseNameResult) {
			caseName = caseNameResult.caseName

			// Calculate fullSpan: case name start through parenthetical end
			const parenEnd = findParentheticalEnd(cleanedText, span.cleanEnd)
			const fullCleanStart = caseNameResult.nameStart
			const fullCleanEnd = parenEnd > span.cleanEnd ? parenEnd : span.cleanEnd

			// Translate to original positions
			const fullOriginalStart =
				transformationMap.cleanToOriginal.get(fullCleanStart) ?? fullCleanStart
			const fullOriginalEnd =
				transformationMap.cleanToOriginal.get(fullCleanEnd) ?? fullCleanEnd

			fullSpan = {
				cleanStart: fullCleanStart,
				cleanEnd: fullCleanEnd,
				originalStart: fullOriginalStart,
				originalEnd: fullOriginalEnd,
			}
		}
	}

	// Translate positions from clean → original (citation core only - span unchanged)
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
		date,
		fullSpan,
		caseName,
		disposition,
	}
}
