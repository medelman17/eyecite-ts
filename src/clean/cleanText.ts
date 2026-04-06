import type { Warning } from "../types/citation"
import type { TransformationMap } from "../types/span"
import { SegmentMap } from "./segmentMap"
import {
  collapseSpaces,
  decodeHtmlEntities,
  fixSmartQuotes,
  normalizeDashes,
  normalizeReporterSpacing,
  normalizeTypography,
  normalizeUnicode,
  rejoinHyphenatedWords,
  replaceWhitespace,
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
 * Clean text using a pipeline of transformation functions.
 *
 * Applies cleaners sequentially while maintaining accurate position mappings
 * between the original and cleaned text. This enables citation extraction from
 * cleaned text while reporting positions in the original text.
 *
 * @param original - Original input text
 * @param cleaners - Array of cleaner functions to apply (default: stripHtmlTags, decodeHtmlEntities, normalizeWhitespace, normalizeUnicode, normalizeDashes, fixSmartQuotes, normalizeTypography, normalizeReporterSpacing)
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
    decodeHtmlEntities,
    rejoinHyphenatedWords,
    replaceWhitespace,
    collapseSpaces,
    normalizeUnicode,
    normalizeDashes,
    fixSmartQuotes,
    normalizeTypography,
    normalizeReporterSpacing,
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
    cleanToOriginalSegments: SegmentMap.fromMap(cleanToOriginal),
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
  _oldOriginalToClean: Map<number, number>,
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

      // If remaining lengths are equal, every mismatch is a pure character
      // replacement (no insertions or deletions from this point on).
      // This prevents the lookahead from misinterpreting replacements like \n→' '
      // as multi-char deletions when the replacement char appears later in the text.
      if (beforeText.length - beforeIdx === afterText.length - afterIdx) {
        const originalPos = oldCleanToOriginal.get(beforeIdx) ?? beforeIdx
        newCleanToOriginal.set(afterIdx, originalPos)
        newOriginalToClean.set(originalPos, afterIdx)
        beforeIdx++
        afterIdx++
        continue
      }

      // Look ahead to find next match
      let foundMatch = false
      // Lookahead must span the largest single deletion (e.g., a long HTML tag
      // like <span class="citation" data-id="1"> is 35+ chars).  A fixed 20
      // caused Issue #154: tags longer than the window produced corrupted
      // position mappings, collapsing many clean positions to a single
      // original position.  Scale to the length delta with a reasonable floor.
      const maxLookAhead = Math.max(40, Math.abs(beforeText.length - afterText.length) + 10)

      // Find the closest CONFIRMED match in both directions simultaneously.
      // A "confirmed" match requires that at least CONFIRM_LEN characters
      // after the match point also align.  This prevents greedy false matches
      // (Issue #161) where, e.g., normalizeDashes expands "—" → "---" and the
      // deletion lookahead grabs a "-" from a nearby page range instead.
      const CONFIRM_LEN = 3
      let bestDelLA = -1
      let bestInsLA = -1

      for (let la = 1; la <= maxLookAhead; la++) {
        // Check deletion direction (skipping chars in before)
        if (bestDelLA < 0 && beforeIdx + la < beforeText.length) {
          if (beforeText[beforeIdx + la] === afterText[afterIdx]) {
            let ok = true
            for (let c = 1; c < CONFIRM_LEN; c++) {
              const bi = beforeIdx + la + c
              const ai = afterIdx + c
              if (bi >= beforeText.length || ai >= afterText.length) break
              if (beforeText[bi] !== afterText[ai]) { ok = false; break }
            }
            if (ok) bestDelLA = la
          }
        }

        // Check insertion direction (skipping chars in after)
        if (bestInsLA < 0 && afterIdx + la < afterText.length) {
          if (beforeText[beforeIdx] === afterText[afterIdx + la]) {
            let ok = true
            for (let c = 1; c < CONFIRM_LEN; c++) {
              const bi = beforeIdx + c
              const ai = afterIdx + la + c
              if (bi >= beforeText.length || ai >= afterText.length) break
              if (beforeText[bi] !== afterText[ai]) { ok = false; break }
            }
            if (ok) bestInsLA = la
          }
        }

        // Stop early if we found matches in both directions
        if (bestDelLA >= 0 && bestInsLA >= 0) break
      }

      // Pick the shorter confirmed match (prefer smaller displacement)
      if (bestDelLA >= 0 && (bestInsLA < 0 || bestDelLA <= bestInsLA)) {
        // Deletion: chars before[beforeIdx .. beforeIdx+bestDelLA-1] were removed
        for (let i = 0; i < bestDelLA; i++) {
          const originalPos = oldCleanToOriginal.get(beforeIdx + i) ?? beforeIdx + i
          newOriginalToClean.set(originalPos, afterIdx)
        }
        beforeIdx += bestDelLA
        foundMatch = true
      } else if (bestInsLA >= 0) {
        // Insertion: chars after[afterIdx .. afterIdx+bestInsLA-1] are new
        const originalPos = oldCleanToOriginal.get(beforeIdx) ?? beforeIdx
        for (let i = 0; i < bestInsLA; i++) {
          newCleanToOriginal.set(afterIdx + i, originalPos)
        }
        afterIdx += bestInsLA
        foundMatch = true
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
