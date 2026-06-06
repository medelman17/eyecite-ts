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
  stripPageBreakMarkers,
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
 * @param cleaners - Array of cleaner functions to apply (default: stripHtmlTags, decodeHtmlEntities, normalizeWhitespace, normalizeUnicode, normalizeDashes, fixSmartQuotes, normalizeTypography, normalizeReporterSpacing). Passing a custom array REPLACES the defaults.
 * @param additionalCleaners - Cleaners appended AFTER the effective base chain (the defaults, or a custom `cleaners` array). Use this to add a cleaner — e.g. `stripMarkdownEmphasis` — without dropping the defaults (#835).
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
    stripPageBreakMarkers,
    replaceWhitespace,
    collapseSpaces,
    normalizeUnicode,
    normalizeDashes,
    fixSmartQuotes,
    normalizeTypography,
    normalizeReporterSpacing,
  ],
  additionalCleaners: Array<(text: string) => string> = [],
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

  // Apply each cleaner sequentially, rebuilding position maps. Additional
  // cleaners run after the base chain so adding one keeps the defaults (#835).
  for (const cleaner of [...cleaners, ...additionalCleaners]) {
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

      // Find the closest confirmed match in each direction.
      //
      // "Confirmation depth" is the run of consecutive matching characters
      // starting at the candidate alignment point.  Strong confirmation
      // (CONFIRM_LEN chars) is the high-confidence threshold that
      // dismisses single-character false matches like #161 (normalizeDashes
      // expanding "—" → "---" near a "-" in a page range).
      //
      // The strict-only rule is unsafe for HTML with adjacent tag
      // deletions (Issue #546).  Two patterns break it:
      //   (a) After the CORRECT la (one tag's worth), the very next
      //       before-character is `<` (the next tag's opener), so strict
      //       confirm fails — the algorithm then accepts a much farther
      //       coincidental 3-gram match.
      //   (b) Coincidental 3-gram matches frequently land *inside*
      //       attribute values like `class="word"`, because short bigrams
      //       like `an`/`th`/`on` happen often in both prose and HTML.
      //
      // Fix: track BOTH the shortest la with strong confirmation
      // (`bestStrong*`) AND the shortest la with a weak match (the head
      // matched, and the very next char in before-text is `<` — the
      // structural signal that another deletion follows immediately,
      // i.e. `bestWeak*`).  Then pick whichever has the smaller
      // displacement.  When the strong match is closer (or no weak
      // candidate exists), the longer-confirmation reading wins and
      // still protects against single-character coincidences like #161.
      const CONFIRM_LEN = 3
      let bestStrongDelLA = -1
      let bestWeakDelLA = -1
      let bestStrongInsLA = -1
      let bestWeakInsLA = -1

      const matchDepth = (bi0: number, ai0: number): number => {
        let d = 1
        while (
          d < CONFIRM_LEN &&
          bi0 + d < beforeText.length &&
          ai0 + d < afterText.length &&
          beforeText[bi0 + d] === afterText[ai0 + d]
        ) {
          d++
        }
        return d
      }

      for (let la = 1; la <= maxLookAhead; la++) {
        // Check deletion direction (skipping chars in before)
        if (
          (bestStrongDelLA < 0 || bestWeakDelLA < 0) &&
          beforeIdx + la < beforeText.length
        ) {
          if (beforeText[beforeIdx + la] === afterText[afterIdx]) {
            const depth = matchDepth(beforeIdx + la, afterIdx)
            if (bestStrongDelLA < 0 && depth >= CONFIRM_LEN) {
              bestStrongDelLA = la
            }
            // Weak match: the failing chars in beforeText are `<`, which
            // is a strong signal another deletion follows immediately.
            // (depth includes the head match; we examine the very next
            // char after the matched run.)
            if (
              bestWeakDelLA < 0 &&
              beforeText[beforeIdx + la + depth] === "<"
            ) {
              bestWeakDelLA = la
            }
          }
        }

        // Check insertion direction (skipping chars in after)
        if (
          (bestStrongInsLA < 0 || bestWeakInsLA < 0) &&
          afterIdx + la < afterText.length
        ) {
          if (beforeText[beforeIdx] === afterText[afterIdx + la]) {
            const depth = matchDepth(beforeIdx, afterIdx + la)
            if (bestStrongInsLA < 0 && depth >= CONFIRM_LEN) {
              bestStrongInsLA = la
            }
            if (
              bestWeakInsLA < 0 &&
              beforeText[beforeIdx + depth] === "<"
            ) {
              bestWeakInsLA = la
            }
          }
        }

        // Stop early once strong matches exist in both directions — the
        // weak fallback only matters when strong matches are absent or
        // unusably far away.
        if (bestStrongDelLA >= 0 && bestStrongInsLA >= 0) break
      }

      // Resolve weak vs strong per direction.  When both are present we
      // prefer the SHORTER displacement: a weak match flagged by a `<`
      // next-character is a strong structural signal that we're sitting
      // exactly at a real tag boundary, so the shorter la is the local
      // edit and the longer la is a coincidental match deeper in the
      // document.  When the strong la is the shorter one (or weak is
      // absent), keep the strong match.
      const pick = (strong: number, weak: number): number => {
        if (strong < 0) return weak
        if (weak < 0) return strong
        return weak < strong ? weak : strong
      }
      const bestDelLA = pick(bestStrongDelLA, bestWeakDelLA)
      const bestInsLA = pick(bestStrongInsLA, bestWeakInsLA)

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
