/**
 * Docket-Number Citation Patterns
 *
 * Patterns for case citations identified by docket / slip-opinion number
 * rather than a traditional reporter assignment. Common shapes:
 *
 *   - NY Court of Appeals slip ops: `Party v. Party, No. 51 (N.Y. 2023)`
 *   - Federal district court pre-reporter: `Smith v. Jones, No. 12-3456 (S.D.N.Y. 2024)`
 *
 * Disambiguation: a bare `No. 51 (N.Y. 2023)` is too generic to extract
 * without strong context. The pattern matches the `No. <docket> (<court> <year>)`
 * core; the extractor enforces a case-name anchor and only emits a citation
 * when a `Party v. Party,` (or `In re Party,`) prefix is found.
 */

import type { Pattern } from "./casePatterns"

export const docketPatterns: Pattern[] = [
  {
    id: "docket-paren-court-year",
    // Match: "No. <docket-number> (<court...> <year>)"
    //   docket-number: digits, optionally hyphenated (51, 12-3456, 22-cv-1234)
    //   parenthetical: anything (lazy) ending with a 4-digit year
    // The `\bNo\.` anchor + space-separated paren keep this narrow without a
    // case-name lookbehind — case-name validation lives in the extractor.
    regex: /\bNo\.\s+([\d]+(?:-[\w\d]+)*)\s+\(([^)]+\s(\d{4}))\)/g,
    description: 'Docket-number citation: "Party v. Party, No. <docket> (<court> <year>)"',
    type: "docket",
  },
]
