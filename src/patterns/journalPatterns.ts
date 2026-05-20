/**
 * Journal Citation Regex Patterns
 *
 * Patterns for law review and journal citations.
 * These are intentionally broad for tokenization - validation against
 * journals-db happens in Phase 3 (extraction layer).
 *
 * Pattern Design:
 * - Matches volume-journal-page format
 * - Broad journal name matching (validated later)
 * - Simple structure to avoid ReDoS
 */

import type { Pattern } from "./casePatterns"

export const journalPatterns: Pattern[] = [
  {
    id: "law-review",
    // `Id.` / `Ibid.` guard (#549) mirrors the state-reporter pattern: the
    // broad journal-name capture used to swallow `45 Id. 318` (treating
    // `Id.` as a journal abbreviation), producing an overlap with the
    // correct id token at the same position. The `(?:Ibid|Id)` alternation
    // puts the longer literal first so journals that start with `Id` are
    // unaffected; the lookahead only matches the short-form shape.
    regex:
      /\b(\d+(?:-\d+)?)\s+(?!(?:Ibid|Id)\.?\s+\d)([A-Z](?:(?!\s+vs?\.\s)(?!\s+at\s+\d)[A-Za-z.\s])+)\s+(\d+)\b/g,
    description:
      'Law review citations (e.g., "120 Harv. L. Rev. 500"), validated against journals-db in Phase 3. Negative lookaheads exclude " v. "/" vs. " (so a party-name run isn\'t mis-captured as a journal), " at <digit>" (so a short-form pincite like "554 U.S. at 621" isn\'t mis-captured as a journal), and `Id.` / `Ibid.` short-form markers (#549).',
    type: "journal",
  },
]
