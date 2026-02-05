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

import type { Span } from '@/types/span'
import type { Pattern } from '@/patterns'
import {
  casePatterns,
  statutePatterns,
  journalPatterns,
  neutralPatterns,
} from '@/patterns'

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
  span: Pick<Span, 'cleanStart' | 'cleanEnd'>

  /** Pattern type that matched this token */
  type: Pattern['type']

  /** Pattern ID that matched this token */
  patternId: string
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
  patterns: Pattern[] = [
    ...casePatterns,
    ...statutePatterns,
    ...journalPatterns,
    ...neutralPatterns,
  ]
): Token[] {
  const tokens: Token[] = []

  for (const pattern of patterns) {
    try {
      // Apply pattern to cleaned text
      const matches = cleanedText.matchAll(pattern.regex)

      for (const match of matches) {
        // Create token from match
        tokens.push({
          text: match[0],
          span: {
            cleanStart: match.index!,
            cleanEnd: match.index! + match[0].length,
          },
          type: pattern.type,
          patternId: pattern.id,
        })
      }
    } catch (error) {
      // Timeout protection: If pattern throws (ReDoS, etc.), skip it
      console.warn(
        `Pattern ${pattern.id} threw error, skipping:`,
        error instanceof Error ? error.message : String(error)
      )
      continue
    }
  }

  // Sort tokens by position (cleanStart ascending)
  tokens.sort((a, b) => a.span.cleanStart - b.span.cleanStart)

  return tokens
}
