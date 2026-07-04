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
    // A tight-linked run is a parallel group only once it CLOSES — its LAST
    // member must be followed by a shared parenthetical or a sentence-end
    // terminator. Validating per-link (the old behavior) orphaned the head of a
    // no-trailing-paren chain `A, B, C.` because the `A→B` link saw `, C` (#884).
    let closed = false

    // Look ahead for potential secondary citations
    // Chain detection: "A, B, C (year)" where A is primary, B and C are secondaries
    for (let j = i + 1; j < tokens.length; j++) {
      const secondary = tokens[j]

      // Only case citations can be parallel
      if (secondary.type !== "case") {
        break // Stop looking once we hit non-case citation
      }

      // A parallel cite always leads with its volume number. A secondary that
      // re-introduces a party name (e.g. `Smith, 79 N.Y.2d at 552`) is a NEW
      // case reference — a second short-form, not a parallel of the current
      // run — so stop here so it isn't absorbed and can anchor its own group.
      // This keeps every parallel group anchored on a SINGLE short-form (#884):
      // without it, `Doe, 100 F.3d at 7, 583 N.Y.S.2d 957, Smith, 79 N.Y.2d at
      // 552` would pull the unrelated Smith reference into Doe's group and
      // mis-resolve its members. Volume-first short-forms (`146 A.3d at 1202`)
      // are genuine parallels and stay in the run.
      if (!/^\s*\d/.test(secondary.text)) {
        break
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
        closed = true // CA bracket form is self-closing
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

      // Tight-linked candidate — collect it. Whether the run is a real parallel
      // group is decided after the chain ends (the close-check below): an
      // intermediate cite (`A→B` in `A, B, C.`) need not be a chain terminator
      // itself — only the LAST member must close the run (#884).
      secondaryIndices.push(j)
    }

    // Record the run only if it CLOSED: the last collected member must be
    // followed by a shared parenthetical or a sentence-end terminator (#653).
    // (A CA bracket run already set `closed`.) An unterminated tight run is not
    // a parallel group — its members stay available as their own primaries.
    if (secondaryIndices.length > 0) {
      if (!closed) {
        const last = tokens[secondaryIndices[secondaryIndices.length - 1]]
        closed =
          hasSharedParenthetical(cleanedText, last.span.cleanEnd) ||
          isParallelChainTerminator(cleanedText, last.span.cleanEnd)
      }
      if (closed) {
        parallelGroups.set(i, secondaryIndices)
        for (const j of secondaryIndices) usedAsSecondary.add(j)
      }
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
/**
 * Issue #653: When no shared parenthetical follows the secondary cite,
 * accept the parallel grouping if the chain terminates at clean
 * sentence-end punctuation within a short window. Catches forms like
 * `Kauffman v. Griesemer, 26 Pa. 407, 67 Am. Dec. 437.` where older
 * courts omit the year-paren.
 *
 * Restrictive on purpose: only `.` or `;` immediately (or after one
 * space) is accepted as a chain terminator. The tight-gap check
 * upstream already prevents unrelated citations being grouped.
 */
function isParallelChainTerminator(cleanedText: string, position: number): boolean {
  // Require explicit sentence-end punctuation (`.` or `;`). EOF alone is
  // not enough — the pre-existing test asserts that two cites with no
  // following punctuation should NOT be grouped (avoids accidentally
  // joining unrelated citations in chains the cleaner truncated).
  const tail = cleanedText.slice(position, position + 5)
  return /^\s*[.;](?:\s|$)/.test(tail)
}

function hasSharedParenthetical(cleanedText: string, position: number): boolean {
  // Look ahead up to 200 characters for opening parenthesis
  const searchText = cleanedText.substring(position, position + 200)

  // #890: a bracketed year `[1992]` / `[2d Dept 2012]` (New York Official
  // Reports / Court of Appeals style) closes a parallel run exactly like a
  // `(year)` parenthetical. Require the bracket to end in a plausible 4-digit
  // year, and reject a bracketed parallel CITE whose page merely looks year-like
  // (`[20 Cal.Rptr.2d 1995]` — a bare volume + reporter) or a marker (`[U]`).
  const bracketYear = searchText.match(/\[([^\]]*(?:1[6-9]|20)\d{2})\s*\]/)
  if (bracketYear && !/^\s*\d+\s+[A-Z]/.test(bracketYear[1])) {
    return true
  }

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
