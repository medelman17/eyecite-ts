/**
 * Case Citation Regex Patterns
 *
 * These patterns are designed for tokenization (broad matching) not extraction.
 * They identify potential case citations in text for the tokenizer (Plan 3).
 * Metadata parsing and validation against reporters-db happens in Phase 2 Plan 5 (extraction layer).
 *
 * Pattern Design Principles (from RESEARCH.md):
 * - Use \b word boundaries to avoid matching "F." in "F.B.I."
 * - Avoid nested quantifiers: (a+)+ causes ReDoS
 * - Keep patterns simple: tokenization only needs to find candidates
 * - Use global flag /g for matchAll()
 */

import type { FullCitationType } from "@/types/citation"

export interface Pattern {
  id: string
  regex: RegExp
  description: string
  type: FullCitationType
}

/**
 * Comma-after-reporter (#570): old typesetting and OCR of older volumes
 * sometimes insert a comma between the reporter abbreviation and the page
 * (`3 Den., 594`, `252 S. W., 20`, `26 N. Y., 279`, `217 Ill. App., 427`).
 * The sample-and-judge audit attributed 70% of misses across a 300-opinion
 * sample to this single shape.
 *
 * Two separators are admitted per pattern:
 *   - the canonical `\s+` form (`Den. 594`)
 *   - the comma form `\s*,\s+` (`Den., 594`)
 *
 * The comma form carries a tighter trailing lookahead: the page must be
 * followed by `.`, `;`, `)`, `]`, end-of-string, or another `,` — i.e., a
 * sentence-/clause-ending punctuation. This rejects phantoms like
 * `10 Corp., 2025 NY Slip Op 00784` where the supposed "page" 2025 is
 * actually the start of the NEXT (neutral) citation: ` N` (space + capital
 * letter) is the giveaway and the tightened lookahead excludes it. The
 * canonical `\s+` form keeps the broader trailing lookahead so existing
 * inline-citation shapes continue to work.
 */
const COMMA_PAGE_TERMINATOR = String.raw`(?=$|[.;,)\]])`

export const casePatterns: Pattern[] = [
  {
    id: "federal-reporter",
    // Edition suffix accepts any ordinal ("2d", "3d", or generic "Nth") so the
    // pattern survives the eventual rollout of F.5th / F.6th / F.Supp.Nth (#234).
    // F.Supp.* and F.App'x must come before the generic F.* alternative so the
    // longer prefixes win during alternation.
    //
    // Terminator accepts `)` for citations wrapped in a sentence-internal
    // parenthetical — e.g., `(Smith v. Jones, 500 F.2d 123)` (#509).
    regex: new RegExp(
      String.raw`\b(\d+(?:-\d+)?)\s+(F\.\s?Supp\.(?:\s?(?:\d+(?:st|nd|rd|th)|2d|3d))?|F\.\s?App'x|F\.(?:\d+(?:st|nd|rd|th)|2d|3d)?)(?:\s+(\d+|_{3,}|-{3,})(?=\s|$|\(|\)|,|;|\.)|\s*,\s+(\d+|_{3,}|-{3,})${COMMA_PAGE_TERMINATOR})`,
      "g",
    ),
    description:
      "Federal Reporter (F., F.2d, F.3d, F.Nth, F.Supp., F.App'x, etc.)",
    type: "case",
  },
  {
    id: "supreme-court",
    // L.Ed. edition suffix accepts any ordinal so a future L.Ed.3d edition does
    // not silently fall through to the state-reporter fallback (#234).
    //
    // Terminator accepts `)` for sentence-internal parenthetical citations
    // (#509).
    regex: new RegExp(
      String.raw`\b(\d+(?:-\d+)?)\s+(U\.\s?S\.|S\.\s?Ct\.|L\.\s?Ed\.(?:\s?(?:\d+(?:st|nd|rd|th)|2d|3d))?)(?:\s+(?:\(\d+\s+[A-Z][A-Za-z.]+\)\s+)?(\d+|_{3,}|-{3,})(?=\s|$|\(|\)|,|;|\.)|\s*,\s+(\d+|_{3,}|-{3,})${COMMA_PAGE_TERMINATOR})`,
      "g",
    ),
    description:
      "U.S. Supreme Court reporters (with optional nominative reporter parenthetical)",
    type: "case",
  },
  {
    id: "state-reporter",
    // Character class admits `&` so reporters with ampersands tokenize correctly
    // (e.g., `I&N Dec.` and `I. & N. Dec.` for BIA immigration decisions — #244).
    // Apostrophe `'` is admitted for reporters like `F. App'x` already covered by
    // federal-reporter; including it here is harmless and future-proofs other
    // possessive forms. Trailing lookahead also accepts `[` (NY Slip Op `[U]`
    // markers — #231), `]` (California Style Manual bracketed parallel cites
    // like `[266 Cal.Rptr. 569]` — #237), and `)` (sentence-internal
    // parenthetical citations like `(Smith v. Jones, 100 Cal. App. 4th 1)`
    // — #509). Negative lookahead on the reporter body rejects ` at ` so
    // `18 Cal.4th at p. 717` (CSM short-form, #236) doesn't absorb `at p.`
    // into the reporter; the short-form pattern handles it instead.
    //
    // ` R.\s+\d` guard (#332): Illinois Supreme Court Rules cite as
    // `177 Ill. 2d R. 234` (volume + reporter + `R. ruleNum`), which the lazy
    // reporter capture used to absorb as `Ill. 2d R.` with `page=234`,
    // emitting a phantom case citation. The lookahead stops the lazy match
    // before it consumes ` R.` when a digit follows — leaving the input
    // untokenized rather than misclassified. A typed rule citation is out
    // of scope; the goal here is to suppress the false positive.
    //
    // `Id.` / `Ibid.` guard (#549): the lazy reporter capture used to
    // greedily absorb `Id.` and `Ibid.` as a reporter abbreviation
    // (matching `45 Id. 318` or `100 Ibid. 250`), which then overlapped
    // the correct id/ibid token at the same position. The `(?:Ibid|Id)`
    // alternation puts the longer literal first so `Idaho` (and other
    // reporters that start with `Id`) is unaffected — the lookahead only
    // fires when `Id` / `Ibid` is followed by an optional period plus
    // whitespace and a page digit, which is the short-form shape, never
    // the start of a reporter abbreviation.
    regex: new RegExp(
      String.raw`\b(\d+(?:-\d+)?)\s+(?!(?:Ibid|Id)\.?\s+\d)([A-Z](?:(?! L\.[JQR\s])(?! R\.\s+\d)(?!\s+vs?\.\s)(?!\s+at\s)[A-Za-z.\d\s&'])+?)(?:\s+(\d+|_{3,}|-{3,})(?=\s|$|\(|\)|,|;|\.|\[|\])|\s*,\s+(\d+|_{3,}|-{3,})${COMMA_PAGE_TERMINATOR})`,
      "g",
    ),
    description:
      'State reporters (broad pattern allowing multi-word reporters with & and \', excludes journal patterns with " L.J/Q/Rev", phantom matches across " v. "/" vs. ", CSM " at " short-form boundaries, Illinois " R. N" rule-marker boundaries, and Id./Ibid. short-form markers (#549), validated against reporters-db in Phase 3)',
    type: "case",
  },
]
