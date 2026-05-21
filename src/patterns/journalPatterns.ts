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
    // Token-aware capture mirrors the state-reporter regex fix: every
    // post-space token must start with uppercase letter, digit, or `&`.
    // This kills phantom matches like `20006 Counsel for Appellees 20004`
    // where lowercase prose was previously absorbed as a journal name.
    // Real journal abbreviations (`Harv. L. Rev.`, `Yale L.J.`) and
    // single-word forms (`Neurology`) still match.
    regex:
      /\b(\d+(?:-\d+)?)\s+(?!(?:Ibid|Id)\.?\s+\d)([A-Z][A-Za-z.&']*(?:\s+[A-Z\d&][A-Za-z.&']*)*?)\s+(\d+)\b/g,
    description:
      'Law review citations (e.g., "120 Harv. L. Rev. 500"), validated against journals-db in Phase 3. Each post-space token must start with uppercase/digit/& to reject prose phantoms.',
    type: "journal",
  },
]
