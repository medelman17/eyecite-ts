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
 * Uses character-by-character comparison to track removals/expansions.
 * Conservative approach: maps positions linearly by finding character matches.
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

	// Character-by-character comparison
	while (beforeIdx <= beforeText.length && afterIdx <= afterText.length) {
		if (beforeIdx === beforeText.length && afterIdx === afterText.length) {
			// Both at end - map final positions
			const originalPos = oldCleanToOriginal.get(beforeIdx) ?? beforeIdx
			newCleanToOriginal.set(afterIdx, originalPos)
			newOriginalToClean.set(originalPos, afterIdx)
			break
		}

		if (beforeIdx === beforeText.length) {
			// Before text exhausted, after text has more (expansion case)
			// Map remaining after positions to last before position
			const originalPos = oldCleanToOriginal.get(beforeIdx) ?? beforeIdx
			for (let i = afterIdx; i <= afterText.length; i++) {
				newCleanToOriginal.set(i, originalPos)
			}
			break
		}

		if (afterIdx === afterText.length) {
			// After text exhausted, before text has more (removal case)
			// Map remaining before positions to last after position
			const originalPos = oldCleanToOriginal.get(beforeIdx) ?? beforeIdx
			newOriginalToClean.set(originalPos, afterIdx)
			beforeIdx++
			continue
		}

		if (beforeText[beforeIdx] === afterText[afterIdx]) {
			// Characters match - carry forward mapping
			const originalPos = oldCleanToOriginal.get(beforeIdx) ?? beforeIdx
			newCleanToOriginal.set(afterIdx, originalPos)
			newOriginalToClean.set(originalPos, afterIdx)
			beforeIdx++
			afterIdx++
		} else {
			// Characters differ - check if character was removed
			const originalPos = oldCleanToOriginal.get(beforeIdx) ?? beforeIdx

			// Look ahead to see if next character matches
			if (
				beforeIdx + 1 < beforeText.length &&
				beforeText[beforeIdx + 1] === afterText[afterIdx]
			) {
				// Character was removed from before text
				newOriginalToClean.set(originalPos, afterIdx)
				beforeIdx++
			} else if (
				afterIdx + 1 < afterText.length &&
				beforeText[beforeIdx] === afterText[afterIdx + 1]
			) {
				// Character was inserted in after text
				newCleanToOriginal.set(afterIdx, originalPos)
				afterIdx++
			} else {
				// Character was replaced - map both
				newCleanToOriginal.set(afterIdx, originalPos)
				newOriginalToClean.set(originalPos, afterIdx)
				beforeIdx++
				afterIdx++
			}
		}
	}

	return { newCleanToOriginal, newOriginalToClean }
}
