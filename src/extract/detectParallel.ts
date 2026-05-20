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

import type { Token } from "@/tokenize/tokenizer"
import { parsePincite } from "./pincite"

/**
 * Maximum total gap (chars) between end of one citation and start of next
 * to even consider them as parallel candidates. Beyond this distance, we can
 * skip all other checks (comma, parenthetical, etc.) for performance.
 *
 * Sized to comfortably hold a comma-separated pincite list like
 * `, 410-13 nn. 5-10, ` (~17 chars) or `, 453-55, 460, ` (14 chars). The
 * pincite-validation gate inside the loop is the real false-positive
 * defense; this cap is just an early-exit performance optimization.
 */
const MAX_GAP_FOR_PARALLEL = 80

/**
 * Detect parallel citation groups from tokenized citations.
 *
 * Returns a map of primary citation index to array of secondary citation indices.
 * Parallel citations are comma-separated case citations sharing a parenthetical.
 *
 * Detection algorithm:
 * 1. Iterate tokens with lookahead (i, i+1, i+2...)
 * 2. Check if token[i] and token[i+1] are both case citations
 * 3. Classify the gap text as either tight comma (`, `) or pincite-between
 *    (`, PINCITE_LIST, `) — Bluebook canonical per Indigo Book R12.3. Reuses
 *    the existing parsePincite helper as single source of truth for pincite
 *    shapes (page/range/star/¶/footnote/etc.).
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
export function detectParallelCitations(tokens: Token[], cleanedText = ""): Map<number, number[]> {
  const parallelGroups = new Map<number, number[]>()

  // Edge cases: empty array or no text
  if (tokens.length === 0 || cleanedText === "") {
    return parallelGroups
  }

  // Track which tokens are already in a parallel group (as secondary)
  const usedAsSecondary = new Set<number>()

  for (let i = 0; i < tokens.length; i++) {
    const primary = tokens[i]

    // Skip if not a case citation
    if (primary.type !== "case") {
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
      if (secondary.type !== "case") {
        break // Stop looking once we hit non-case citation
      }

      // Check proximity: comma should be right after primary (or previous secondary in chain)
      const prevToken = j === i + 1 ? primary : tokens[j - 1]
      const gapStart = prevToken.span.cleanEnd
      const gapEnd = secondary.span.cleanStart

      // Early exit: If gap is too large, no need to check comma/parenthetical
      // This optimization reduces O(n²) to O(n×k) where k is avg tokens within MAX_GAP
      const gapSize = gapEnd - gapStart
      if (gapSize > MAX_GAP_FOR_PARALLEL) {
        break // Too far apart to be parallel, stop looking
      }

      // Extract the gap text between citations
      const gapText = cleanedText.substring(gapStart, gapEnd)

      // California Style Manual bracket form (#237): the parallel citation
      // is wrapped in brackets — `<primary> (<year>) [<secondary>]`. Check
      // this BEFORE the comma-requirement gate so we don't reject CA parallels.
      const inBracket =
        gapText.includes("[") &&
        cleanedText[secondary.span.cleanEnd] === "]"
      if (inBracket) {
        secondaryIndices.push(j)
        usedAsSecondary.add(j)
        // CA brackets always close after a single parallel cite — chain ends here.
        break
      }

      // Gap text between primary and secondary cite must be one of these shapes:
      //
      //   Tight separator: ", " or "; " (no pincite between cites)
      //     "374 N.J. Super. 448, 864 A.2d 1191"        (Bluebook)
      //     "390 Mich 355; 212 NW2d 190"                (Michigan, #551)
      //
      //   Pincite-between: ", PINCITE_LIST<,;> " — the Bluebook-canonical form
      //   per Indigo Book R12.3, where the primary's pincite sits between
      //   the two parallel cites.
      //     "374 N.J. Super. 448, 453-55, 864 A.2d 1191"           (Bluebook)
      //     "410 U.S. 113, 115, 153, 93 S. Ct. 705"                 (multi-pincite)
      //     "390 Mich 355, 359; 212 NW2d 190"                       (Michigan, #551)
      //
      // A PINCITE is anything `parsePincite()` accepts — page, range, star,
      // paragraph, footnote, etc. Reusing parsePincite keeps it as the single
      // source of truth for "what counts as a pincite" and means future
      // pincite improvements propagate here automatically.
      //
      // Semicolons are accepted at the OUTER boundary only (the separator
      // between the last pincite and the next reporter token). Pincite lists
      // themselves still use commas — `parsePincite("453; 460")` returns null
      // and a bare `, 453; 460, ` gap would correctly fail.
      const tight = /^[,;]\s*$/.test(gapText)
      let pinciteBetween = false
      if (!tight) {
        const inner = gapText.match(/^,\s*(.+?)\s*[,;]\s*$/)
        if (inner) {
          const segments = inner[1].split(/\s*,\s*/)
          pinciteBetween =
            segments.length > 0 && segments.every((s) => parsePincite(s) !== null)
        }
      }
      if (!tight && !pinciteBetween) break

      // Check for shared parenthetical
      // Both citations must share the SAME closing parenthetical
      // Reject: "A (1970), B (1971)" - separate parens = different cases
      // Accept: "A, B (1970)" - shared paren = parallel citations
      const textBetween = cleanedText.substring(primary.span.cleanEnd, secondary.span.cleanEnd)
      if (textBetween.includes(")")) {
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
  const openIndex = searchText.indexOf("(")
  if (openIndex === -1) {
    return false
  }

  // Find matching closing parenthesis (simple depth tracking)
  let depth = 0
  for (let i = openIndex; i < searchText.length; i++) {
    if (searchText[i] === "(") {
      depth++
    } else if (searchText[i] === ")") {
      depth--
      if (depth === 0) {
        // Found matching closing parenthesis
        return true
      }
    }
  }

  return false
}
