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
// Page-terminator character class. Citations end at:
//   - end of input (`$`)
//   - standard sentence punctuation: `.`, `;`, `,`, `)`, `]`
//   - trailing-prose punctuation that follows the page directly without
//     a space: `!`, `?`, em dash (—), en dash (–), apostrophe
//     (possessive `1's holding`), straight quote (`"`), curly quotes
//     (`“` `”`), markdown asterisk (`*`), angle brackets (`<` `>`).
//   - typographic footnote / reference markers: dagger (`†`), double
//     dagger (`‡`), section sign (`§`), pilcrow (`¶`), copyright (`©`),
//     degree sign (`°`). These follow the page when the citation is
//     immediately tagged with a footnote reference or attribution mark.
//     Real reporters never end with these characters.
//   - `-` followed by a non-digit. The cleaner normalizes in-word em/en
//     dashes to ASCII `-`, so `1—a` arrives at the tokenizer as `1-a`.
//     The `\D` lookahead keeps page-range syntax intact (`44-501` does
//     not terminate at `44`, because `-5` is digit). #681-class.
const COMMA_PAGE_TERMINATOR = String.raw`(?=$|[.;,)\]!?–—'"“”*<>†‡§¶©°]|-\D)`

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
    // Page capture accepts `N` (single) or `N-M` (range, #705). The
    // range form has tighter terminator: must be followed by end-of-input,
    // whitespace, or a clause-ending punctuation. This prevents `1-5-7`
    // from matching as `page=1-5` with stray `-7`.
    regex: new RegExp(
      String.raw`\b(\d+(?:-\d+)?)\s+(F\.\s?Supp\.(?:\s?(?:\d+(?:st|nd|rd|th)|2d|3d))?|F\.\s?App'x|F\.(?:\d+(?:st|nd|rd|th)|2d|3d)?)(?:\s+(\d+-\d+|\d+|_{3,}|-{3,})(?=\s|$|[().,;!?–—'"“”*<>†‡§¶©°])|\s*,\s+(\d+|_{3,}|-{3,})${COMMA_PAGE_TERMINATOR})`,
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
      String.raw`\b(\d+(?:-\d+)?)\s+(U\.\s?S\.|S\.\s?Ct\.|L\.\s?Ed\.(?:\s?(?:\d+(?:st|nd|rd|th)|2d|3d))?)(?:\s+(?:\(\d+\s+[A-Z][A-Za-z.]+\)\s+)?(\d+-\d+(?=\s+\(\d{4}\))|\d+|_{3,}|-{3,})(?=\s|$|[().,;!?–—'"“”*<>†‡§¶©°]|-\D)|\s*,\s+(\d+|_{3,}|-{3,})${COMMA_PAGE_TERMINATOR})`,
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
    // Phantom-citation guard: the reporter capture is token-aware so
    // subsequent space-separated tokens must START with uppercase letter,
    // digit, or `&`. This rejects all multi-word prose phantoms (paragraph
    // markers + prose, section headings + prose, year-prefixed prose
    // sentences) without an explicit word blocklist. Real reporters are
    // always Title Case + periods + digit suffixes, so lowercase-starting
    // tokens are a near-perfect prose signal.
    //
    // Examples of phantoms killed by this rule:
    //   - `2 Beginning in 2011`        → "in" lowercase, no second token
    //   - `15 ODC maintains that...`   → "maintains" lowercase
    //   - `2009 General Primary Election due to the fact that...` → "due" lowercase
    //   - `47 AND 100`                 → no second token after "AND"
    //
    // The `AND` / `OR` / `Ibid` / `Id.` guards remain as a fast-fail
    // for the most common bare-conjunction shapes before the token loop
    // even starts.
    //
    // First token: `[A-Z][A-Za-z.\d&']*`
    // Continuation: optional `\s+[A-Z\d&][A-Za-z.\d&']*` repeated lazily.
    // The `(?! L\.[JQR\s])` and `(?! R\.\s+\d)` lookaheads remain pre-
    // space to handle Illinois `R. <ruleNum>` and the `L.J./L.Q./L.R.`
    // journal-abbreviation guards (#332, #549).
    regex: new RegExp(
      String.raw`\b(\d+(?:-\d+)?)\s+(?!(?:Ibid|Id)\.?\s+\d)(?!(?:AND|OR)\s+\d)([A-Z][A-Za-z.\d&']*(?:(?! L\.[JQR\s])(?! R\.\s+\d)\s+[A-Z\d&][A-Za-z.\d&']*)*?)(?:\s+(\d+-\d+(?=\s+\(\d{4}\))|\d+|_{3,}|-{3,})(?=\s|$|[().,;!?\[\]–—'"“”*<>†‡§¶©°]|-\D)|\s*,\s+(\d+|_{3,}|-{3,})${COMMA_PAGE_TERMINATOR})`,
      "g",
    ),
    description:
      'State reporters (broad pattern allowing multi-word reporters with & and \', excludes journal patterns with " L.J/Q/Rev", phantom matches across " v. "/" vs. ", CSM " at " short-form boundaries, Illinois " R. N" rule-marker boundaries, and Id./Ibid. short-form markers (#549), validated against reporters-db in Phase 3)',
    type: "case",
  },
]
