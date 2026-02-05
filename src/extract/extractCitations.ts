/**
 * Main Citation Extraction Pipeline
 *
 * Orchestrates the complete citation extraction flow:
 *   1. Clean text (remove HTML, normalize Unicode)
 *   2. Tokenize (apply patterns to find candidates)
 *   3. Extract (parse metadata from tokens)
 *
 * This is the primary public API for citation extraction.
 *
 * @module extract/extractCitations
 */

import { cleanText } from '@/clean'
import { tokenize } from '@/tokenize'
import {
	extractCase,
	extractStatute,
	extractJournal,
	extractNeutral,
	extractPublicLaw,
	extractFederalRegister,
	extractStatutesAtLarge,
} from '@/extract'
import { extractId, extractSupra, extractShortFormCase } from './extractShortForms'
import {
	casePatterns,
	statutePatterns,
	journalPatterns,
	neutralPatterns,
	shortFormPatterns,
} from '@/patterns'
import { resolveCitations } from '../resolve'
import type { Citation } from '@/types/citation'
import type { Pattern } from '@/patterns'
import type { ResolutionOptions, ResolvedCitation } from '../resolve/types'

/**
 * Options for customizing citation extraction behavior.
 */
export interface ExtractOptions {
	/**
	 * Custom text cleaners (overrides defaults).
	 *
	 * If provided, these cleaners replace the default pipeline:
	 * [stripHtmlTags, normalizeWhitespace, normalizeUnicode, fixSmartQuotes]
	 *
	 * @example
	 * ```typescript
	 * // Use only HTML stripping, skip Unicode normalization
	 * const citations = extractCitations(text, {
	 *   cleaners: [stripHtmlTags]
	 * })
	 * ```
	 */
	cleaners?: Array<(text: string) => string>

	/**
	 * Custom regex patterns (overrides defaults).
	 *
	 * If provided, these patterns replace the default pattern set:
	 * [casePatterns, statutePatterns, journalPatterns, neutralPatterns, shortFormPatterns]
	 *
	 * @example
	 * ```typescript
	 * // Extract only case citations
	 * const citations = extractCitations(text, {
	 *   patterns: casePatterns
	 * })
	 * ```
	 */
	patterns?: Pattern[]

	/**
	 * Resolve short-form citations to their full antecedents (default: false).
	 *
	 * If true, returns ResolvedCitation[] with resolution metadata for short-form citations
	 * (Id., supra, short-form case). Full citations are unchanged.
	 *
	 * @example
	 * ```typescript
	 * const text = "Smith v. Jones, 500 F.2d 100 (1974). Id. at 105."
	 * const citations = extractCitations(text, { resolve: true })
	 * // citations[1].resolution.resolvedTo === 0 (points to Smith v. Jones)
	 * ```
	 */
	resolve?: boolean

	/**
	 * Options for citation resolution (only used if resolve: true).
	 *
	 * @example
	 * ```typescript
	 * const citations = extractCitations(text, {
	 *   resolve: true,
	 *   resolutionOptions: {
	 *     scopeStrategy: 'paragraph',
	 *     fuzzyPartyMatching: true
	 *   }
	 * })
	 * ```
	 */
	resolutionOptions?: ResolutionOptions
}

/**
 * Extracts legal citations from text using the full parsing pipeline.
 *
 * Pipeline flow:
 * 1. **Clean:** Remove HTML tags, normalize Unicode, fix smart quotes
 * 2. **Tokenize:** Apply regex patterns to find citation candidates
 * 3. **Extract:** Parse metadata (volume, reporter, page, etc.)
 * 4. **Translate:** Map positions from cleaned text back to original text
 *
 * This function is synchronous because all stages (cleaning, tokenization,
 * extraction) are synchronous. For async operations (e.g., future reporters-db
 * lookups), use extractCitationsAsync().
 *
 * Position tracking:
 * - TransformationMap is built during cleaning
 * - Tokens contain positions in cleaned text (cleanStart/cleanEnd)
 * - Extraction translates cleaned positions → original positions
 * - Final citations have originalStart/originalEnd pointing to input text
 *
 * Warnings from cleaning layer are attached to all extracted citations.
 *
 * @param text - Raw text to extract citations from (may contain HTML, Unicode)
 * @param options - Optional customization (cleaners, patterns)
 * @returns Array of citations with parsed metadata and accurate positions
 *
 * @example
 * ```typescript
 * const text = "See Smith v. Doe, 500 F.2d 123 (9th Cir. 2020)"
 * const citations = extractCitations(text)
 * // citations[0] = {
 * //   type: "case",
 * //   volume: 500,
 * //   reporter: "F.2d",
 * //   page: 123,
 * //   court: "9th Cir.",
 * //   year: 2020,
 * //   span: { originalStart: 18, originalEnd: 30, ... }
 * // }
 * ```
 *
 * @example
 * ```typescript
 * // Extract from HTML
 * const html = "<p>In <b>Smith</b>, 500 F.2d 123, the court held...</p>"
 * const citations = extractCitations(html)
 * // HTML is stripped, positions point to original HTML
 * ```
 *
 * @example
 * ```typescript
 * // Extract multiple citation types
 * const text = "See 42 U.S.C. § 1983; Smith, 500 F.2d 123; 123 Harv. L. Rev. 456"
 * const citations = extractCitations(text)
 * // citations[0].type === "statute"
 * // citations[1].type === "case"
 * // citations[2].type === "journal"
 * ```
 */
export function extractCitations(text: string, options: ExtractOptions & { resolve: true }): ResolvedCitation[]
export function extractCitations(text: string, options?: ExtractOptions): Citation[]
export function extractCitations(
	text: string,
	options?: ExtractOptions,
): Citation[] | ResolvedCitation[] {
	const startTime = performance.now()

	// Step 1: Clean text
	const { cleaned, transformationMap, warnings } = cleanText(
		text,
		options?.cleaners,
	)

	// Step 2: Tokenize (synchronous)
	// Note: Pattern order matters for deduplication - more specific patterns first
	const allPatterns = options?.patterns || [
		...neutralPatterns,      // Most specific (year-based format)
		...shortFormPatterns,    // Short-form (requires " at " keyword)
		...casePatterns,         // Case citations (reporter-specific)
		...statutePatterns,      // Statutes (code-specific)
		...journalPatterns,      // Least specific (broad pattern)
	]
	const tokens = tokenize(cleaned, allPatterns)

	// Step 3: Deduplicate overlapping tokens
	// Multiple patterns may match the same text (e.g., "500 F.2d 123" matches both federal-reporter and state-reporter)
	// Keep only the most specific match for each position
	const deduplicatedTokens: typeof tokens = []
	const seenPositions = new Set<string>()

	for (const token of tokens) {
		const posKey = `${token.span.cleanStart}-${token.span.cleanEnd}`
		if (!seenPositions.has(posKey)) {
			seenPositions.add(posKey)
			deduplicatedTokens.push(token)
		}
	}

	// Step 4: Extract citations from deduplicated tokens
	const citations: Citation[] = []
	for (const token of deduplicatedTokens) {
		let citation: Citation

		switch (token.type) {
			case 'case':
				// Check pattern ID to distinguish short-form from full citations
				if (token.patternId === 'id' || token.patternId === 'ibid') {
					citation = extractId(token, transformationMap)
				} else if (token.patternId === 'supra') {
					citation = extractSupra(token, transformationMap)
				} else if (token.patternId === 'shortFormCase') {
					citation = extractShortFormCase(token, transformationMap)
				} else {
					citation = extractCase(token, transformationMap, cleaned)
				}
				break
			case 'statute':
				citation = extractStatute(token, transformationMap)
				break
			case 'journal':
				citation = extractJournal(token, transformationMap)
				break
			case 'neutral':
				citation = extractNeutral(token, transformationMap)
				break
			case 'publicLaw':
				citation = extractPublicLaw(token, transformationMap)
				break
			case 'federalRegister':
				citation = extractFederalRegister(token, transformationMap)
				break
			case 'statutesAtLarge':
				citation = extractStatutesAtLarge(token, transformationMap)
				break
			default:
				// Unknown type - skip
				continue
		}

		// Attach cleaning warnings to citation if any
		if (warnings.length > 0) {
			citation.warnings = [...(citation.warnings || []), ...warnings]
		}

		// Update processing time
		citation.processTimeMs = performance.now() - startTime

		citations.push(citation)
	}

	// Step 5: Resolve short-form citations if requested
	if (options?.resolve) {
		return resolveCitations(citations, text, options.resolutionOptions)
	}

	return citations
}

/**
 * Asynchronous version of extractCitations().
 *
 * Currently wraps the synchronous extractCitations() function. This API
 * exists for future extensibility when async operations are added:
 * - Async reporters-db lookups (Phase 3)
 * - Async resolution/annotation services
 * - Web Workers for parallel processing
 *
 * For now, this function immediately resolves with the same results as
 * the synchronous version.
 *
 * @param text - Raw text to extract citations from
 * @param options - Optional customization (cleaners, patterns, resolve)
 * @returns Promise resolving to array of citations (or ResolvedCitation[] if resolve: true)
 *
 * @example
 * ```typescript
 * const citations = await extractCitationsAsync(text, { resolve: true })
 * // Returns ResolvedCitation[] with resolution metadata
 * ```
 */
export async function extractCitationsAsync(text: string, options: ExtractOptions & { resolve: true }): Promise<ResolvedCitation[]>
export async function extractCitationsAsync(text: string, options?: ExtractOptions): Promise<Citation[]>
export async function extractCitationsAsync(
	text: string,
	options?: ExtractOptions,
): Promise<Citation[] | ResolvedCitation[]> {
	// Async wrapper for future extensibility (e.g., async reporters-db lookup)
	// For MVP, wraps synchronous extractCitations
	return extractCitations(text, options)
}
