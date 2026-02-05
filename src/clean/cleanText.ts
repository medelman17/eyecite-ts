import type { TransformationMap } from "../types/span"
import {
	fixSmartQuotes,
	normalizeUnicode,
	normalizeWhitespace,
	stripHtmlTags,
} from "./cleaners"

/**
 * Result of text cleaning operation.
 */
export interface CleanTextResult {
	/** Cleaned text after all transformations */
	cleaned: string

	/** Position mappings between cleaned and original text */
	transformationMap: TransformationMap

	/** Warnings generated during cleaning (currently unused) */
	warnings: Warning[]
}

/**
 * Warning generated during text cleaning.
 */
export interface Warning {
	level: "error" | "warning" | "info"
	message: string
	position: { start: number; end: number }
}

/**
 * Clean text using a pipeline of transformation functions.
 *
 * Applies cleaners sequentially while maintaining accurate position mappings
 * between the original and cleaned text. This enables citation extraction from
 * cleaned text while reporting positions in the original text.
 *
 * @param original - Original input text
 * @param cleaners - Array of cleaner functions to apply (default: stripHtmlTags, normalizeWhitespace, normalizeUnicode, fixSmartQuotes)
 * @returns Cleaned text with position mappings and warnings
 *
 * @example
 * const result = cleanText("Smith v. <b>Doe</b>, 500 F.2d 123")
 * // result.cleaned: "Smith v. Doe, 500 F.2d 123"
 * // result.transformationMap tracks position shifts from HTML removal
 */
export function cleanText(
	original: string,
	cleaners: Array<(text: string) => string> = [
		stripHtmlTags,
		normalizeWhitespace,
		normalizeUnicode,
		fixSmartQuotes,
	],
): CleanTextResult {
	// Initialize 1:1 position mapping
	let currentText = original
	let cleanToOriginal = new Map<number, number>()
	let originalToClean = new Map<number, number>()

	// Identity mapping: cleanToOriginal[i] = i, originalToClean[i] = i
	for (let i = 0; i <= original.length; i++) {
		cleanToOriginal.set(i, i)
		originalToClean.set(i, i)
	}

	// Apply each cleaner sequentially, rebuilding position maps
	for (const cleaner of cleaners) {
		const beforeText = currentText
		const afterText = cleaner(currentText)

		if (beforeText !== afterText) {
			// Text changed - rebuild position maps
			const { newCleanToOriginal, newOriginalToClean } = rebuildPositionMaps(
				beforeText,
				afterText,
				cleanToOriginal,
				originalToClean,
			)

			cleanToOriginal = newCleanToOriginal
			originalToClean = newOriginalToClean
			currentText = afterText
		}
	}

	const transformationMap: TransformationMap = {
		cleanToOriginal,
		originalToClean,
	}

	return {
		cleaned: currentText,
		transformationMap,
		warnings: [],
	}
}

/**
 * Rebuild position maps after a text transformation.
 *
 * Uses a simplified algorithm that scans through both strings, matching
 * characters where possible and tracking the offset accumulation.
 *
 * @param beforeText - Text before transformation
 * @param afterText - Text after transformation
 * @param oldCleanToOriginal - Previous clean-to-original mapping
 * @param oldOriginalToClean - Previous original-to-clean mapping
 * @returns New position maps
 */
function rebuildPositionMaps(
	beforeText: string,
	afterText: string,
	oldCleanToOriginal: Map<number, number>,
	oldOriginalToClean: Map<number, number>,
): {
	newCleanToOriginal: Map<number, number>
	newOriginalToClean: Map<number, number>
} {
	const newCleanToOriginal = new Map<number, number>()
	const newOriginalToClean = new Map<number, number>()

	let beforeIdx = 0
	let afterIdx = 0

	// Scan through both strings, matching characters where possible
	while (beforeIdx <= beforeText.length || afterIdx <= afterText.length) {
		// Both at end
		if (beforeIdx >= beforeText.length && afterIdx >= afterText.length) {
			const originalPos = oldCleanToOriginal.get(beforeIdx) ?? beforeIdx
			newCleanToOriginal.set(afterIdx, originalPos)
			newOriginalToClean.set(originalPos, afterIdx)
			break
		}

		// Before text exhausted (expansion case)
		if (beforeIdx >= beforeText.length) {
			const originalPos = oldCleanToOriginal.get(beforeIdx) ?? beforeIdx
			newCleanToOriginal.set(afterIdx, originalPos)
			afterIdx++
			continue
		}

		// After text exhausted (removal case)
		if (afterIdx >= afterText.length) {
			const originalPos = oldCleanToOriginal.get(beforeIdx) ?? beforeIdx
			newOriginalToClean.set(originalPos, afterIdx)
			beforeIdx++
			continue
		}

		// Characters match - carry forward the mapping
		if (beforeText[beforeIdx] === afterText[afterIdx]) {
			const originalPos = oldCleanToOriginal.get(beforeIdx) ?? beforeIdx
			newCleanToOriginal.set(afterIdx, originalPos)
			newOriginalToClean.set(originalPos, afterIdx)
			beforeIdx++
			afterIdx++
		} else {
			// Characters differ - need to determine if this is insertion/deletion/replacement
			// Look ahead to find next match
			let foundMatch = false
			const maxLookAhead = 20 // Limit lookahead to avoid performance issues

			// Check if something was deleted from before text
			for (let lookAhead = 1; lookAhead <= maxLookAhead; lookAhead++) {
				if (beforeIdx + lookAhead >= beforeText.length) break

				if (beforeText[beforeIdx + lookAhead] === afterText[afterIdx]) {
					// Found a match - characters were deleted from before text
					for (let i = 0; i < lookAhead; i++) {
						const originalPos =
							oldCleanToOriginal.get(beforeIdx + i) ?? beforeIdx + i
						newOriginalToClean.set(originalPos, afterIdx)
					}
					beforeIdx += lookAhead
					foundMatch = true
					break
				}
			}

			if (foundMatch) continue

			// Check if something was inserted into after text
			for (let lookAhead = 1; lookAhead <= maxLookAhead; lookAhead++) {
				if (afterIdx + lookAhead >= afterText.length) break

				if (beforeText[beforeIdx] === afterText[afterIdx + lookAhead]) {
					// Found a match - characters were inserted into after text
					const originalPos = oldCleanToOriginal.get(beforeIdx) ?? beforeIdx
					for (let i = 0; i < lookAhead; i++) {
						newCleanToOriginal.set(afterIdx + i, originalPos)
					}
					afterIdx += lookAhead
					foundMatch = true
					break
				}
			}

			if (foundMatch) continue

			// No match found within lookahead - treat as replacement
			const originalPos = oldCleanToOriginal.get(beforeIdx) ?? beforeIdx
			newCleanToOriginal.set(afterIdx, originalPos)
			newOriginalToClean.set(originalPos, afterIdx)
			beforeIdx++
			afterIdx++
		}
	}

	return { newCleanToOriginal, newOriginalToClean }
}
