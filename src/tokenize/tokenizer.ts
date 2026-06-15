/**
 * Tokenization Layer for Citation Extraction
 *
 * Applies regex patterns to cleaned text to produce citation candidate tokens.
 * This is the second stage of the parsing pipeline:
 *   1. Clean text (remove HTML, normalize Unicode)
 *   2. Tokenize (apply patterns to find candidates) ← THIS MODULE
 *   3. Extract (parse metadata, validate against reporters-db)
 *
 * Tokenization is intentionally broad - it finds potential citations without
 * validating them. The extraction layer (Plan 5) validates tokens against
 * reporters-db and parses metadata.
 *
 * @module tokenize
 */

import { orderedPatterns, type Pattern } from "@/patterns"
import type { Span } from "@/types/span"

/**
 * A token representing a potential citation found in cleaned text.
 *
 * Tokens are produced by applying regex patterns to cleaned text.
 * They include matched text, position in cleaned text, and pattern metadata
 * for use in the extraction layer.
 */
export interface Token {
  /** Matched text from input */
  text: string

  /** Position in cleaned text (cleanStart/cleanEnd only, no original positions yet) */
  span: Pick<Span, "cleanStart" | "cleanEnd">

  /** Pattern type that matched this token */
  type: Pattern["type"]

  /** Pattern ID that matched this token */
  patternId: string

  /**
   * Named capture groups of the matching pattern. Present only for patterns
   * that declare named groups; non-participating groups are omitted. (#844)
   */
  groups?: Record<string, string>

  /**
   * Token-relative [start, end] offsets for each participating named group.
   * Same key set as `groups`. (#844)
   */
  groupSpans?: Record<string, [number, number]>
}

/**
 * Tokenizes cleaned text by applying regex patterns to find citation candidates.
 *
 * For each pattern in the patterns array:
 *   1. Apply pattern.regex.matchAll(cleanedText)
 *   2. Create Token for each match with position, text, and pattern metadata
 *   3. Collect all tokens from all patterns
 *   4. Sort by cleanStart position (ascending)
 *
 * Timeout protection: If a pattern throws (e.g., ReDoS), skip it and continue
 * with remaining patterns. Logs warning to console.
 *
 * Note: This function is synchronous because regex matching is inherently
 * synchronous. This enables both sync (extractCitations) and async
 * (extractCitationsAsync) APIs in Plan 6.
 *
 * @param cleanedText - Text that has been cleaned by cleanText() from Plan 1
 * @param patterns - Regex patterns to apply (defaults to all patterns from Plan 2)
 * @returns Array of tokens sorted by position (cleanStart ascending)
 *
 * @example
 * ```typescript
 * import { tokenize } from '@/tokenize'
 * import { cleanText } from '@/clean'
 *
 * const original = "See Smith v. Doe, 500 F.2d 123 (9th Cir. 2020)"
 * const { cleanedText } = cleanText(original)
 * const tokens = tokenize(cleanedText)
 * // tokens[0] = {
 * //   text: "500 F.2d 123",
 * //   span: { cleanStart: 18, cleanEnd: 30 },
 * //   type: "case",
 * //   patternId: "federal-reporter"
 * // }
 * ```
 */
export function tokenize(
  cleanedText: string,
  // Defaults to the authoritative grammar (#844). The main pipeline always
  // passes patterns explicitly; this default just gives standalone callers the
  // full, correctly-ordered set instead of a stale partial list.
  patterns: Pattern[] = orderedPatterns,
): Token[] {
  const tokens: Token[] = []

  for (const pattern of patterns) {
    try {
      // Apply pattern to cleaned text
      const matches = cleanedText.matchAll(pattern.regex)

      for (const match of matches) {
        // Create token from match
        const token: Token = {
          text: match[0],
          span: {
            cleanStart: match.index!,
            cleanEnd: match.index! + match[0].length,
          },
          type: pattern.type,
          patternId: pattern.id,
        }

        // Thread named groups (#844). Only patterns with named groups populate
        // `match.groups`; positional patterns thread nothing.
        if (match.groups) {
          const groups: Record<string, string> = {}
          const groupSpans: Record<string, [number, number]> = {}
          // NOTE: lib types `indices.groups` as non-optional [number,number];
          // at runtime a non-participating named group is `undefined`. Guard it.
          const indices = match.indices?.groups as
            | Record<string, [number, number] | undefined>
            | undefined
          for (const name of Object.keys(match.groups)) {
            const value = match.groups[name]
            if (value === undefined) continue
            groups[name] = value
            const gi = indices?.[name]
            if (gi) groupSpans[name] = [gi[0] - match.index!, gi[1] - match.index!]
          }
          if (Object.keys(groups).length > 0) {
            token.groups = groups
            token.groupSpans = groupSpans
          }
        }

        tokens.push(token)
      }
    } catch (error) {
      // Timeout protection: If pattern throws (ReDoS, etc.), skip it
      console.warn(
        `Pattern ${pattern.id} threw error, skipping:`,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  // Sort tokens by position (cleanStart ascending)
  tokens.sort((a, b) => a.span.cleanStart - b.span.cleanStart)

  return tokens
}
