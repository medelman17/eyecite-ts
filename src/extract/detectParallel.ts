/**
 * Parallel Citation Detection
 *
 * Detects parallel citation groups (same case in multiple reporters) using
 * comma-separated case citations sharing a closing parenthetical.
 *
 * Detection happens after tokenization and deduplication, before extraction
 * in the main extractCitations pipeline.
 *
 * @module extract/detectParallel
 */

import type { Token } from '@/tokenize/tokenizer'

/**
 * Maximum characters allowed between end of comma and start of next citation.
 * Bluebook standard uses tight spacing: "500 F.2d 123, 200 F. Supp. 456"
 */
const MAX_PROXIMITY = 5

/**
 * Detect parallel citation groups from tokenized citations.
 *
 * Returns a map of primary citation index to array of secondary citation indices.
 * Parallel citations are comma-separated case citations sharing a parenthetical.
 *
 * Detection algorithm:
 * 1. Iterate tokens with lookahead (i, i+1, i+2...)
 * 2. Check if token[i] and token[i+1] are both case citations
 * 3. Check if comma separates them (within MAX_PROXIMITY chars)
 * 4. Check if both citations share a closing parenthetical (via cleaned text)
 * 5. If all conditions met, add to parallel group
 * 6. Continue for chain (i+1, i+2, i+3...) until no more matches
 *
 * @param tokens - Tokenized citations (after deduplication)
 * @param cleanedText - Cleaned text to check for commas and parentheticals
 * @returns Map of primary index to array of secondary indices
 *
 * @example
 * ```typescript
 * const tokens = [
 *   { text: "410 U.S. 113", span: { cleanStart: 0, cleanEnd: 12 }, type: "case" },
 *   { text: "93 S. Ct. 705", span: { cleanStart: 14, cleanEnd: 27 }, type: "case" }
 * ]
 * const cleaned = "410 U.S. 113, 93 S. Ct. 705 (1973)"
 * const result = detectParallelCitations(tokens, cleaned)
 * // result = Map { 0 => [1] }
 * ```
 */
export function detectParallelCitations(
	tokens: Token[],
	cleanedText = '',
): Map<number, number[]> {
	const parallelGroups = new Map<number, number[]>()

	// Edge cases: empty array or no text
	if (tokens.length === 0 || cleanedText === '') {
		return parallelGroups
	}

	// Track which tokens are already in a parallel group (as secondary)
	const usedAsSecondary = new Set<number>()

	for (let i = 0; i < tokens.length; i++) {
		const primary = tokens[i]

		// Skip if not a case citation
		if (primary.type !== 'case') {
			continue
		}

		// Skip if already used as secondary in another group
		if (usedAsSecondary.has(i)) {
			continue
		}

		const secondaryIndices: number[] = []

		// Look ahead for potential secondary citations
		// Chain detection: "A, B, C (year)" where A is primary, B and C are secondaries
		for (let j = i + 1; j < tokens.length; j++) {
			const secondary = tokens[j]

			// Only case citations can be parallel
			if (secondary.type !== 'case') {
				break // Stop looking once we hit non-case citation
			}

			// Check proximity: comma should be right after primary (or previous secondary in chain)
			const prevToken = j === i + 1 ? primary : tokens[j - 1]
			const gapStart = prevToken.span.cleanEnd
			const gapEnd = secondary.span.cleanStart

			// Extract the gap text between citations
			const gapText = cleanedText.substring(gapStart, gapEnd)

			// Bluebook requires comma separator for parallel citations
			if (!gapText.includes(',')) {
				break // No comma = not parallel, stop looking
			}

			// Check proximity: distance from comma to next citation start
			// MAX_PROXIMITY enforces tight spacing: "A, B" not "A,      B"
			const commaIndex = gapText.indexOf(',')
			const distanceAfterComma = gapText.length - commaIndex - 1

			if (distanceAfterComma > MAX_PROXIMITY) {
				break // Too far apart, stop looking
			}

			// Check for shared parenthetical
			// Both citations must share the SAME closing parenthetical
			// Reject: "A (1970), B (1971)" - separate parens = different cases
			// Accept: "A, B (1970)" - shared paren = parallel citations
			const textBetween = cleanedText.substring(primary.span.cleanEnd, secondary.span.cleanEnd)
			if (textBetween.includes(')')) {
				break // Separate parentheticals = not parallel, stop looking
			}

			// Check that there IS a parenthetical after the secondary citation
			if (!hasSharedParenthetical(cleanedText, secondary.span.cleanEnd)) {
				break // No shared parenthetical, stop looking
			}

			// All conditions met - this is a parallel citation
			secondaryIndices.push(j)
			usedAsSecondary.add(j)
		}

		// If we found any secondary citations, record the group
		if (secondaryIndices.length > 0) {
			parallelGroups.set(i, secondaryIndices)
		}
	}

	return parallelGroups
}

/**
 * Check if there's a closing parenthetical after the given position.
 *
 * This is a simple heuristic: look for "(...)" pattern within reasonable distance.
 * Full parenthetical parsing happens in extractCase, this just validates presence.
 *
 * @param cleanedText - Cleaned text
 * @param position - Position to start searching from
 * @returns true if closing parenthetical found
 */
function hasSharedParenthetical(cleanedText: string, position: number): boolean {
	// Look ahead up to 200 characters for opening parenthesis
	const searchText = cleanedText.substring(position, position + 200)

	// Find opening parenthesis
	const openIndex = searchText.indexOf('(')
	if (openIndex === -1) {
		return false
	}

	// Find matching closing parenthesis (simple depth tracking)
	let depth = 0
	for (let i = openIndex; i < searchText.length; i++) {
		if (searchText[i] === '(') {
			depth++
		} else if (searchText[i] === ')') {
			depth--
			if (depth === 0) {
				// Found matching closing parenthesis
				return true
			}
		}
	}

	return false
}
