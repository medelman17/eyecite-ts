/**
 * Short-form Citation Regex Patterns
 *
 * Patterns for Id., Ibid., supra, and short-form case citations.
 * These refer to earlier citations in the document.
 *
 * Pattern Design:
 * - Simple structure to avoid ReDoS (no nested quantifiers)
 * - Broad matching for tokenization; validation happens in extraction layer
 * - Word boundaries to prevent false positives (e.g., "Idaho" vs "Id.")
 */

import type { Pattern } from "./casePatterns"

/** Id. with optional pincite: "Id." or "Id. at 253" or "Id., at 253" or
 *  "Id. ¶ 12" (#204).
 *
 *  Punctuation tolerance (#305):
 *   - Optional space before the period — `Id .` / `Ibid .` (OCR + older
 *     typesetting).
 *   - Comma instead of period — `Id, at 1483` — only when immediately
 *     followed by `at` so bare `Id,` in prose ("his Id, but...") is not
 *     misread as a citation.
 *
 *  Pincite captures an optional "*" prefix for star-pagination (NY Slip Op,
 *  Westlaw, Lexis; see #191), an optional trailing " n.14" / " nn.14-15"
 *  footnote suffix (see #202), an optional `p.` / `pp.` prefix for
 *  California Style Manual form (see #236), and `¶` / `¶¶` / `para.` /
 *  `paras.` paragraph markers (#204). When the pincite is a paragraph form,
 *  `at` is optional — `Id. ¶ 12` and `Id. at ¶ 12` both match. */
export const ID_PATTERN: RegExp =
  /(?:^|(?<=\s)|(?<=["'(\[—]))\b[Ii]d(?:\s*\.|\s*,(?=\s+at\s))(?:,?\s+(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b))(¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?|\*?\d+(?:\s*[-–]\s*\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?))?/g

/** Ibid. with optional pincite (less common variant). Paragraph forms (#204)
 *  follow the same convention as Id. Optional space before the period (#305). */
export const IBID_PATTERN: RegExp =
  /(?:^|(?<=\s)|(?<=["'(\[—]))\b[Ii]bid\s*\.(?:,?\s+(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b))(¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?|\*?\d+(?:\s*[-–]\s*\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?))?/g

/**
 * Supra with party name and optional pincite.
 * Pattern: word(s), supra [note N] [, at page]
 * Captures: (1) party name, (2) note number (if any), (3) pincite
 *
 * Party-name capture (#301): continuation accepts `\s+v\.?\s+` (v.),
 * `\s+&\s+` (ampersand-joined parties — `Walker & Horwich, supra`),
 * `,\s+` (corporate-suffix continuation — `Thorn Americas, Inc., supra`),
 * and plain whitespace (multi-word names). Each continuation requires a
 * capital-letter follow-on, so `, supra` (lowercase `s`) still terminates
 * the name. NOTE: `In re` prefix is NOT included here — the resolver's
 * BKTree matches full-cite party names that don't carry the prefix
 * (#216 / #21), so a supra with `In re X` won't match a full cite
 * indexed as `X`. Handling that gap requires resolver-side normalization,
 * which is intentionally out of scope for #301.
 *
 * Pincite accepts optional "*" prefix for star-pagination (#191), an optional
 * range end (#236), an optional trailing footnote suffix (#202), an optional
 * `p.` / `pp.` prefix for California Style Manual form (#236), and `¶` /
 * `¶¶` / `para.` / `paras.` paragraph markers (#204). When the pincite is a
 * paragraph form, `at` is optional.
 */
export const SUPRA_PATTERN: RegExp =
  /\b([A-Z][a-zA-Z''\-]+\.?(?:(?:\s+v\.?\s+|\s+&\s+|,\s+|\s+)[A-Z][a-zA-Z''\-]+\.?)*)\s*,?\s+supra(?:\s+note\s+(\d+))?(?:,?\s+(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b))(¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?|\*?\d+(?:[-–—]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?))?/g

/**
 * Standalone supra without party name (common in footnotes).
 * Matches: "supra note 12", "supra at 15", "supra § 3", "supra Part II"
 * Requires "note", "at", "§", "Part", or "p." after supra to avoid matching
 * the word "supra" in prose. Preceded by whitespace, start, or signal words.
 * Captures: (1) note number (if any), (2) pincite (with optional "*" prefix,
 * #191, optional range end / `p.`/`pp.` prefix #236, optional trailing
 * footnote suffix #202, and `¶`/`para.` paragraph markers #204).
 */
export const STANDALONE_SUPRA_PATTERN: RegExp =
  /(?:^|(?<=\s)|(?<=[;.]))supra(?:\s+note\s+(\d+)(?:,?\s+(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b))(¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?|\*?\d+(?:[-–—]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?))?|\s+(?:at\s+(?:pp?\.\s*)?|(?=¶|paras?\.?\b))(¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?|\*?\d+(?:[-–—]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?)|\s+(?:§+|Part|p\.)\s*\S+)/g

/**
 * Bracketed supra forms (#306) — `[supra]`, `[supra, 705]`, `[supra at 78-82]`,
 * and `State v. Jarzbek, [supra, 705]`. Connecticut Supreme/Appellate use
 * brackets around the supra token when it appears inside a string-cite or
 * quotation. The comma-pincite form `[supra, 705]` accepts NO `at` before
 * the page — that's the Connecticut convention.
 *
 * Captures: (1) party name (optional; undefined for bare standalone form),
 *   (2) pincite (optional, accepts comma-form `, N` or `at N` shape with
 *   optional range `N-M`).
 */
export const BRACKETED_SUPRA_PATTERN: RegExp =
  /(?:\b([A-Z][a-zA-Z''\-]+\.?(?:(?:\s+v\.?\s+|\s+&\s+|,\s+|\s+)[A-Z][a-zA-Z''\-]+\.?)*)\s*,?\s+)?\[supra(?:(?:,\s+|\s+at\s+(?:pp?\.\s*)?)(\d+(?:[-–—]\d+)?))?\]/g

/**
 * Short-form case: [Party,] volume reporter [,] at page
 * Pattern: optional Party name, then number space abbreviation [, ] at space number.
 * Simplified detection; full parsing in extraction layer.
 * Supports reporters with 1-2 letter ordinal suffixes (e.g., F.4th, Cal.4th).
 * Handles SCOTUS/federal comma-before-at: "597 U.S., at 721", "116 F.4th, at 1193".
 * Pincite accepts optional "*" prefix for star-pagination (#191), an optional
 * range end "462-65" / "462-*65" (#201), an optional trailing footnote suffix
 * " n.14" / " nn.14-15" (#202), an optional `p.` / `pp.` prefix for
 * California Style Manual form (`18 Cal.4th at p. 717`; see #236), and `¶` /
 * `¶¶` / `para.` / `paras.` paragraph markers (#204).
 *
 * Optional leading party-name group captures Bluebook back-references like
 * `Smith, 500 F.2d at 125` so the resolver can disambiguate when multiple
 * full citations share the same volume+reporter (#278). Group order:
 *   1: party name (optional)
 *   2: volume
 *   3: reporter
 *   4: pincite
 *
 * Pincite prefix also tolerates the spelled-out `page` / `pages` form
 * (`281 Ala. at page 322`, `38 Ala.App. at pages 186`) common in Alabama
 * appellate writing (#344). Without this, the input slipped past the
 * short-form-case pattern and was misclassified as a journal citation by
 * a later pattern.
 */
export const SHORT_FORM_CASE_PATTERN: RegExp =
  /\b(?:([A-Z][a-zA-Z''\-]+\.?(?:(?:\s+v\.?\s+|\s+&\s+|,\s+|\s+)[A-Z][a-zA-Z''\-]+\.?)*),\s+)?(\d+(?:-\d+)?)\s+([A-Z][A-Za-z.''\s]+?(?:\d[a-z]{1,2})?)\s*,?\s+at\s+(?:pp?\.\s*|pages?\s+)?(\*?\d+(?:[-–—]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?|¶¶?\s*\d+(?:[-–—]\d+)?|paras?\.?\s*\d+(?:[-–—]\d+)?)\b/g

/** All short-form patterns for tokenization */
export const SHORT_FORM_PATTERNS: readonly RegExp[] = [
  ID_PATTERN,
  IBID_PATTERN,
  BRACKETED_SUPRA_PATTERN,
  SUPRA_PATTERN,
  STANDALONE_SUPRA_PATTERN,
  SHORT_FORM_CASE_PATTERN,
] as const

/** Pattern objects for consistency with other pattern modules */
export const shortFormPatterns: Pattern[] = [
  {
    id: "id",
    regex: ID_PATTERN,
    description: 'Id. citations (e.g., "Id." or "Id. at 253")',
    type: "case", // Will be typed as 'id' in extraction layer
  },
  {
    id: "ibid",
    regex: IBID_PATTERN,
    description: 'Ibid. citations (e.g., "Ibid." or "Ibid. at 125")',
    type: "case", // Will be typed as 'id' in extraction layer
  },
  {
    id: "supra",
    regex: BRACKETED_SUPRA_PATTERN,
    description:
      'Bracketed supra citations (e.g., "State v. Jarzbek, [supra, 705]" — Connecticut style; #306)',
    type: "case", // Will be typed as 'supra' in extraction layer
  },
  {
    id: "supra",
    regex: SUPRA_PATTERN,
    description: 'Supra citations (e.g., "Smith, supra" or "Smith, supra, at 460")',
    type: "case", // Will be typed as 'supra' in extraction layer
  },
  {
    id: "supra",
    regex: STANDALONE_SUPRA_PATTERN,
    description: 'Standalone supra (e.g., "supra note 12" or "supra at 15")',
    type: "case", // Will be typed as 'supra' in extraction layer
  },
  {
    id: "shortFormCase",
    regex: SHORT_FORM_CASE_PATTERN,
    description: 'Short-form case citations (e.g., "500 F.2d at 125")',
    type: "case", // Will be typed as 'shortFormCase' in extraction layer
  },
]
