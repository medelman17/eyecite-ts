/**
 * Case Citation Extraction
 *
 * Parses tokenized case citations to extract volume, reporter, page, and
 * optional metadata (pincite, court, year). This is the third stage of
 * the parsing pipeline:
 *   1. Clean text (remove HTML, normalize Unicode)
 *   2. Tokenize (apply patterns to find candidates)
 *   3. Extract (parse metadata, validate) ← THIS MODULE
 *
 * Extraction parses structured data from token text. Validation against
 * reporters-db happens in Phase 3 (resolution layer).
 *
 * @module extract/extractCase
 */

import type { Token } from "@/tokenize"
import type {
  CitationSignal,
  FullCaseCitation,
  HistorySignal,
  Parenthetical,
  ParentheticalType,
  SubsequentHistoryEntry,
} from "@/types/citation"
import {
  resolveOriginalSpan,
  spanFromGroupIndex,
  type Span,
  type TransformationMap,
} from "@/types/span"
import type { CaseComponentSpans } from "@/types/componentSpans"
import { isPlausibleYear, parseDate, type StructuredDate } from "./dates"
import { getReportersSync } from "@/data/reportersCache"
import { inferCourtFromReporter } from "./courtInference"
import { parsePincite, type PinciteInfo } from "./pincite"
import { normalizeCourt } from "./courtNormalization"

/** Valid CitationSignal values for safe validation after regex capture + normalization. */
const VALID_SIGNALS = new Set([
  "see",
  "see also",
  "see generally",
  "cf",
  "but see",
  "but cf",
  "compare",
  "accord",
  "contra",
  // Combined `, e.g.` forms (Bluebook Rule 1.3) — must be matched by SIGNAL_PATTERNS
  // in detectStringCites.ts before the bare-signal forms (#239).
  "e.g.",
  "see, e.g.",
  "see also, e.g.",
  "but see, e.g.",
  "cf., e.g.",
  "but cf., e.g.",
])

/**
 * Regex matching any VALID_SIGNALS entry at the start of a string, followed by whitespace.
 * Derived from VALID_SIGNALS to ensure a single source of truth.
 * Multi-word signals are listed first so "See also" matches before "See".
 * The trailing `,?` accommodates combined `, e.g.` signals (Bluebook Rule 1.3)
 * whose source-text form has a trailing comma between the signal and citation.
 *
 * Each whitespace gap inside a multi-word signal is permitted as `\s*,?\s+` so
 * older typesetting variants like `See, also,` (extra inter-word comma) and
 * `See e.g.,` (spaced `e.g.`) are stripped alongside the canonical Bluebook
 * forms. This mirrors PR #503's relaxation for signal *detection* in
 * detectStringCites.ts (#506).
 *
 * Additionally, a small set of prose connectors that commonly follow a signal
 * are stripped here (`the case of`, `the opinion (filed at this term )?in`).
 * Without this, captions like `See also the case of the King v. ...` carry
 * `See also the case of` into the captured caseName.
 */
const SIGNAL_STRIP_REGEX = (() => {
  const sorted = [...VALID_SIGNALS].sort((a, b) => b.length - a.length)
  const alternatives = sorted.map((s) =>
    // Whitespace between signal words tolerates an extra `, ` separator
    // (e.g., `See, also,` for `See also`, `See, generally,` for `See generally`).
    // Internal literal commas (from canonical forms like `see, e.g.`) are
    // made optional so the bare typesetting variant `See e.g.,` also matches.
    // Periods in `e.g.` / `cf.` tolerate an extra space (e.g., `See e. g.,`).
    s
      .replace(/\s+/g, "\\s*,?\\s+")
      .replace(/,\s*/g, ",?\\s*")
      .replace(/\./g, "\\.\\s*"),
  )
  // Optional prose connector after the signal: `the case of`, `the opinion
  // (filed at this term )?in`. The connector is consumed lazily — only when
  // present — and is followed by mandatory whitespace before the party name.
  const proseConnector =
    "(?:the\\s+(?:case\\s+of(?:\\s+the)?|opinion(?:\\s+filed\\s+at\\s+this\\s+term)?\\s+in)\\s+)?"
  return new RegExp(`^(${alternatives.join("|")}),?\\s+${proseConnector}`, "i")
})()

/** Parse a volume string as number when purely numeric, string when hyphenated */
function parseVolume(raw: string): number | string {
  const num = Number.parseInt(raw, 10)
  return String(num) === raw ? num : raw
}

/** Month abbreviations and full names found in legal citation parentheticals */
const MONTH_PATTERN =
  /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\.?/

// ============================================================================
// Compiled regex patterns for performance (hoisted to module level)
// ============================================================================

/** Cached current year to avoid Date allocation per extraction call. */
const CURRENT_YEAR = new Date().getFullYear()

/** Common US reporters for confidence boost. Exact match to avoid substring false positives.
 *  Shared across extractCase and extractShortForms.
 *
 *  ## Why this set matters (#555)
 *
 *  This fallback is the *only* reporter signal in degraded mode — that is, when
 *  the reporters-db has not been loaded via `await loadReporters()`. The async
 *  loader is opt-in (`extractCitations` is synchronous and cannot await it), so
 *  in practice the vast majority of real callers — including the audit script
 *  in `scripts/audit-confidence.ts` — never see DB-backed reporter validation.
 *  An entry that the cleaner can never produce is dead weight and silently
 *  drops the citation by 0.30 confidence.
 *
 *  ## Entries are POST-CLEANING forms
 *
 *  `cleaners.ts:normalizeReporterSpacing` collapses inner spaces in known
 *  reporter abbreviations (`S. Ct.` → `S.Ct.`, `L. Ed. 2d` → `L.Ed.2d`,
 *  `F. Supp. 2d` → `F.Supp.2d`, the general `Letter. Digit` ordinal rule).
 *  Pre-#555 the set was authored against the Bluebook canonical (with spaces),
 *  which after cleaning never matched anything. The post-cleaning canonical is
 *  what the extractor actually hands to the fallback check, so that's what we
 *  store here.
 *
 *  ## State reporters
 *
 *  State reporters absent from the set used to all fall through to 0.65
 *  (or lower if no court parenthetical). The audit surfaced `Mass.`, `Va.`,
 *  `Pa.`, `Idaho`, `Cal.4th`, `Cal.Rptr.2d` as the worst offenders (100% of
 *  occurrences scored < 0.7). We include those and a small set of close
 *  cousins (`Cal.5th`, `Cal.Rptr.`, `Cal.Rptr.3d`, `Cal.App.*`) so the
 *  full Cal. family lands consistently. We intentionally do NOT dump every
 *  US state abbreviation — single-letter state forms could create
 *  false-positive boosts on non-reporter text.
 *
 *  Future editions are pre-registered defensively (#234) so the eventual rollout
 *  of F.5th / N.E.4th / etc. does not silently regress confidence scores. The
 *  generalized federal-reporter regex captures these formats; this set ensures
 *  they earn the +0.3 reporter-match boost out of the box. */
export const COMMON_REPORTERS: ReadonlySet<string> = new Set([
  // ── Federal Reporter ────────────────────────────────────────────────────
  "F.",
  "F.2d",
  "F.3d",
  "F.4th",
  "F.5th",
  "F.6th",
  "F.7th",
  // ── United States Reports & SCOTUS-adjacent (#555) ──────────────────────
  // Post-cleaning canonicals (cleaner collapses `S. Ct.` → `S.Ct.`,
  // `L. Ed. 2d` → `L.Ed.2d`). The spaced forms remain for defensiveness in
  // case a code path skips the cleaner.
  "U.S.",
  "S.Ct.",
  "S. Ct.",
  "L.Ed.",
  "L. Ed.",
  "L.Ed.2d",
  "L. Ed. 2d",
  "L.Ed.3d",
  "L. Ed. 3d",
  // ── Federal Supplement & Appendix (#555) ────────────────────────────────
  "F.Supp.",
  "F. Supp.",
  "F.Supp.2d",
  "F. Supp. 2d",
  "F.Supp.3d",
  "F. Supp. 3d",
  "F.Supp.4th",
  "F. Supp. 4th",
  "F.Supp.5th",
  "F. Supp. 5th",
  "F.Supp.6th",
  "F. Supp. 6th",
  "F.App'x",
  "F. App'x",
  // ── Regional reporters ──────────────────────────────────────────────────
  "P.",
  "P.2d",
  "P.3d",
  "P.4th",
  "A.",
  "A.2d",
  "A.3d",
  "A.4th",
  "N.E.",
  "N.E.2d",
  "N.E.3d",
  "N.E.4th",
  "N.W.",
  "N.W.2d",
  "N.W.3d",
  "S.E.",
  "S.E.2d",
  "S.E.3d",
  "S.W.",
  "S.W.2d",
  "S.W.3d",
  "S.W.4th",
  // ── Southern Reporter (#555: cleaner produces `So.2d` not `So. 2d`) ─────
  "So.",
  "So.2d",
  "So. 2d",
  "So.3d",
  "So. 3d",
  "So.4th",
  "So. 4th",
  // ── State reporters from the #555 audit ─────────────────────────────────
  // 100% of occurrences scored < 0.7 pre-fix.
  "Mass.",
  "Va.",
  "Pa.",
  "Idaho",
  // ── California reporters (#555) ─────────────────────────────────────────
  // `Cal.4th` and `Cal.Rptr.2d` were audited misses; the full Cal. family
  // shares the same cleaner pattern and benefits identically.
  "Cal.",
  "Cal.2d",
  "Cal.3d",
  "Cal.4th",
  "Cal.5th",
  "Cal.Rptr.",
  "Cal.Rptr.2d",
  "Cal.Rptr.3d",
  "Cal.App.",
  "Cal.App.2d",
  "Cal.App.3d",
  "Cal.App.4th",
  "Cal.App.5th",
])

/** SCOTUS `Black` reporter active years — the only two volumes were
 *  published 1861-1862 (Vols. 1 and 2). Used by
 *  {@link resolveNormalizedReporter} to disambiguate the shared `Black.`
 *  abbreviation from Indiana's `Blackf.` (Blackford) reporter. See #572. */
const SCOTUS_BLACK_REPORTER_START_YEAR = 1861
const SCOTUS_BLACK_REPORTER_END_YEAR = 1862

/**
 * Resolve a raw reporter literal to its canonical Bluebook form using the
 * reporters-db lookup (#571).
 *
 * The reporters-db structure has two relevant lookup keys per
 * {@link ReporterEntry}: the `editions` map (whose keys ARE the canonical
 * Bluebook forms — `F.2d`, `Ill. App. 2d`, `N.J. Eq.`) and the `variations`
 * map (whose keys are alternate spellings, mapping to a single canonical
 * value). Order of resolution:
 *
 *   1. Exact (case-insensitive) match against an edition key → return that
 *      key verbatim. Covers the canonical-input case (`F.2d` → `F.2d`).
 *   2. Exact (case-insensitive) match against a variation key → return the
 *      variation's value. Covers all periodless / no-space variants
 *      (`F2d` → `F.2d`, `Ill App2d` → `Ill. App. 2d`, `OhioSt.` → `Ohio St.`).
 *   3. Otherwise `undefined` — downstream consumers fall back to the raw
 *      `reporter` string. Maintains the pre-#571 behaviour for unknown
 *      reporters.
 *
 * Returns `undefined` when reporters-db is not loaded (degraded mode);
 * `normalizedReporter` remains absent in that case, mirroring the
 * pre-#571 behaviour where the field was never populated at all.
 *
 * Year-based disambiguation (#572): when the literal reporter is `Black.`
 * (the variation that points to Indiana's `Blackf.`) AND the citation's
 * year falls inside the SCOTUS `Black` reporter's window
 * [1861, 1862] inclusive, the result switches to `Black` instead. Outside
 * that window — or when no year was extracted — the default `Blackf.`
 * resolution stands. The literal `reporter` field on the citation is
 * preserved verbatim; only `normalizedReporter` shifts.
 */
export function resolveNormalizedReporter(
  reporter: string,
  year?: number,
): string | undefined {
  const reportersDb = getReportersSync()
  if (!reportersDb) return undefined

  const matches = reportersDb.byAbbreviation.get(reporter.toLowerCase())
  if (!matches || matches.length === 0) return undefined

  const lower = reporter.toLowerCase()

  // Year-based era disambiguation for `Black.` (#572): the literal
  // `Black.` only maps to Blackford (Indiana) in reporters-db, but when
  // the citation year is 1861-1862 the intended reporter is SCOTUS
  // `Black` (which has no period in canonical form). Apply BEFORE the
  // generic resolution so the variation lookup doesn't lock us into
  // `Blackf.` first.
  if (
    lower === "black." &&
    year !== undefined &&
    year >= SCOTUS_BLACK_REPORTER_START_YEAR &&
    year <= SCOTUS_BLACK_REPORTER_END_YEAR
  ) {
    return "Black"
  }

  for (const entry of matches) {
    // (1) Canonical edition key match — return the literal key (preserves
    // upstream casing/spacing).
    for (const editionAbbr of Object.keys(entry.editions)) {
      if (editionAbbr.toLowerCase() === lower) {
        return editionAbbr
      }
    }
    // (2) Variation key match — the value is the canonical key.
    if (entry.variations) {
      for (const [variant, canonical] of Object.entries(entry.variations)) {
        if (variant.toLowerCase() === lower && canonical) {
          return canonical
        }
      }
    }
  }

  return undefined
}

/**
 * Compute the multi-factor confidence score for a case citation.
 *
 * Pure helper over the five signals the case-citation scorer cares about.
 * Factored out so post-pass mutations that change one of those signals
 * (notably `inheritParallelCaseName`, which propagates `caseName` onto
 * parallel-cite secondaries — #556) can re-derive confidence with the
 * same formula instead of being silently stuck at the pre-mutation value.
 *
 * Formula:
 *   - base 0.2
 *   - +0.3 if reporter is known (reporters-db hit, falling back to COMMON_REPORTERS)
 *   - +0.2 if year is present and <= current year
 *   - +0.15 if caseName is present
 *   - +0.1 if court is present
 *   - cap 1.0, rounded to 0.01
 *   - finally, blank-page placeholders floor at 0.5
 */
export function computeCaseConfidence(opts: {
  reporter: string
  year: number | undefined
  caseName: string | undefined
  court: string | undefined
  hasBlankPage: boolean
}): number {
  const { reporter, year, caseName, court, hasBlankPage } = opts
  let confidence = 0.2

  const reportersDb = getReportersSync()
  const dbMatch = reportersDb?.byAbbreviation.get(reporter.toLowerCase())
  if (dbMatch && dbMatch.length > 0) {
    confidence += 0.3
  } else if (COMMON_REPORTERS.has(reporter)) {
    confidence += 0.3
  }

  if (year !== undefined && year <= CURRENT_YEAR) {
    confidence += 0.2
  }

  if (caseName) {
    confidence += 0.15
  }

  if (court) {
    confidence += 0.1
  }

  confidence = Math.round(Math.min(confidence, 1.0) * 100) / 100

  if (hasBlankPage) {
    confidence = Math.max(confidence, 0.5)
  }

  return confidence
}

/** Matches volume-reporter-page format in citation core, with optional nominative reporter parenthetical.
 *  Reporter character class includes `&` so the BIA `I&N Dec.` / `I. & N. Dec.`
 *  variants parse correctly (#244).
 *
 *  Trailing lookahead `(?=$|[\s.;,)\]])` ensures the page capture is
 *  bounded by a real terminator. Without it, greedy reporter backtracking
 *  can produce wrong splits on inputs like `33 Ill. App. 2d, 100` (the
 *  reporter character class includes digits, so the greedy match would
 *  back off to reporter=`Ill. App.`, page=`2`, leaving `d, 100`
 *  unparsed). With the lookahead the canonical match fails on the
 *  comma-form input and the caller falls through to
 *  `VOLUME_REPORTER_PAGE_REGEX_COMMA` instead — see #570. */
const VOLUME_REPORTER_PAGE_REGEX =
  /^(\d+(?:-\d+)?)\s+([A-Za-z0-9.\s'&]+)\s+(?:\((\d+)\s+([A-Z][A-Za-z.]+)\)\s+)?(\d+|_{3,}|-{3,})(?=$|[\s.;,)\]])/d

/** Comma-form variant of VOLUME_REPORTER_PAGE_REGEX (#570) for the old
 *  typesetting shape `<vol> <Reporter>, <page>` (`3 Den., 594`,
 *  `252 S. W., 20`, `26 N. Y., 279`, `217 Ill. App., 427`). Used as a
 *  fallback ONLY when the canonical-spacing pattern above fails to match
 *  — running this regex first would let the greedy reporter capture
 *  swallow a trailing pincite (`500 F.2d 123, 125` would mis-parse as
 *  `reporter="F.2d 123"`, `page=125`).
 *
 *  Reporter capture is lazy (`+?`) so the backtracking prefers
 *  multi-word reporters with embedded ordinals (`Ill. App. 2d`) over
 *  collapsing to the prefix. The trailing `(?=$|[.;)\]])` lookahead is
 *  critical: it rejects phantom matches like
 *  `10 Corp., 2025 NY Slip Op 00784` where the supposed "page" 2025 is
 *  the start of the next (neutral) citation. The corresponding
 *  tokenizer pattern in `src/patterns/casePatterns.ts` uses the same
 *  terminator constraint. */
const VOLUME_REPORTER_PAGE_REGEX_COMMA =
  /^(\d+(?:-\d+)?)\s+([A-Za-z0-9.\s'&]+?)\s*,\s+(?:\((\d+)\s+([A-Z][A-Za-z.]+)\)\s+)?(\d+|_{3,}|-{3,})(?=$|[.;)\]])/d

/** Detects blank page placeholders (3+ underscores or dashes) */
const BLANK_PAGE_REGEX = /^[_-]{3,}$/

/** Extracts pincite (page reference after comma). Accepts optional "at "
 *  keyword, optional "*" prefix for star-pagination (NY Slip Op, Westlaw,
 *  Lexis, and other slip-opinion citations; see #191), and an optional
 *  trailing footnote suffix " n.14" / " nn.14-15" (see #202). */
const PINCITE_REGEX =
  /,\s*(?:at\s+)?(\*?\d+(?:-\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—]\d+)?)?)/d

/** Matches parenthetical content */
const PAREN_REGEX = /\(([^)]+)\)/

/** Look-ahead pattern for parenthetical after token. Skips pincite text
 *  (including star-pagination) before the court/year parenthetical.
 *
 *  Pincite-skip prefix grammar mirrors the leading branch of
 *  LOOKAHEAD_PINCITE_REGEX so the same shapes are accepted:
 *    - `, [at] [pp.|pages] *N[-N]`  (comma form)
 *    - ` at [pp.|pages] *N[-N]`     (at form without comma; #552)
 *
 *  Before #552 only the comma form was accepted, so
 *  `491 S.W.2d 636 at 638 (1973)` lost the trailing `(1973)` paren —
 *  the leading ` at 638` could not be consumed and the regex failed.
 *  The at-form is repeatable too (rare in practice, but the comma form
 *  already was), so the entire prefix is wrapped in `(?:...)*`. */
const LOOKAHEAD_PAREN_REGEX =
  /^(?:(?:,\s*(?:at\s+(?:(?:pp?\.|pages?)\s*)?)?|\s+at\s+(?:(?:pp?\.|pages?)\s*)?)\*?\d+(?:-\d+)?)*(?:\s+(?:n|note)\s*\.?\s*\d+)?\s*\(([^)]+)\)/

/** Extracts pincite from look-ahead text.
 *  Accepts five prefix forms:
 *    - ", 125"       (comma-separated, numeric)
 *    - ", at *1"     (comma + "at" keyword; common with star-pagination)
 *    - " at *2"      (whitespace + "at" keyword; NY Slip Op repeat form)
 *    - ", at p. 115" (CSM form with `p.` / `pp.` prefix; #236)
 *    - ", ¶ 12"      (paragraph-marker form; #204)
 *  The "*" prefix marks star-pagination (#191); a trailing " n.14" /
 *  " nn.14-15" footnote suffix is captured when present (#202). Paragraph
 *  forms (`¶ N` / `¶¶ N-M` / `para. N` / `paras. N-M`) are accepted in the
 *  capture; `parsePincite` routes them to the `paragraph` field (#204). */
// Parallel-cite disambiguation: a real pincite is bounded by end-of-string,
// sentence punctuation, a paren or bracket close, or whitespace NOT followed
// by a capital letter (which would start a parallel cite's reporter token,
// e.g., `, 198 A. 154` or `, 93 S. Ct. 705`). The anchored positive lookahead
// prevents regex backtracking into shorter digit prefixes.
//
// Footnote suffix (#311): the suffix-bearing forms `n.3`, `note 3` accept
// either `\s+` (the original `768 n.3` form) or `,\s+` (the California
// `768, fn. 3` form). `fn` / `fns` are added to the alternation alongside
// `n` / `nn` / `note`.
//
// Terminator class (#505): in addition to sentence punctuation and closing
// brackets, accept `:` (block-quote intro), `[` (bracketed parallel cite),
// `»` (OCR artifact), and the four common curly/straight quote characters
// (`"`, `"`, `'`, `'`, `"`). Frequency ~6–10 per 1,000 cites in the wild.
//
// Page-prefix forms (#510): accept spelled-out `page` / `pages` in addition
// to the abbreviated `p.` / `pp.` so full-case citations match the
// short-form extractor's accepted prefixes (#344).
//
// Star-pagination range (#513): page body now allows `*` on BOTH ends of
// the range (`*10-*11`), matching the short-form extractor (#201).
//
// Range separators (#516): tilde (`~`) is accepted as a range separator
// alongside hyphen / en-dash / em-dash. Tilde shows up as an OCR artifact
// in some scanned reporters and PDF dehyphenators.
//
// Footnote-only pincite (#515): a footnote reference without a preceding
// page (`, n. 7` / `, note 7` / `, nn. 3-5` / `, fn. 4`) is accepted as
// the trailing alternation. `parsePincite` surfaces this as
// `pinciteInfo.footnote` with `page=undefined`. The leading `at` prefix is
// allowed for symmetry with the page-bearing forms.
const LOOKAHEAD_PINCITE_REGEX =
  /^(?:\s+at\s+(?:(?:pp?\.|pages?)\s*)?|,\s*(?:at\s+(?:(?:pp?\.|pages?)\s*)?)?)(\*?\d+(?:[-–—~]\*?\d+)?(?:(?:\s+|,\s+)(?:nn?|fns?|note)\s*\.?\s*\d+(?:[-–—~]\d+)?)?|¶¶?\s*\d+(?:[-–—~]\d+)?|paras?\.?\s*\d+(?:[-–—~]\d+)?|(?:nn?|fns?|note)\s*\.?\s*\d+(?:[-–—~]\d+)?)(?=$|[.,:;)([\]»"'“”‘’]|\s(?![A-Z]))/d

/** Citation boundary pattern (digit-period-space) */
const CITATION_BOUNDARY_REGEX = /\d\.\s+/g

/** Whitespace/comma skip pattern for parenthetical scanning */
const PAREN_SKIP_REGEX = /[\s,]/

/** Additional discrete pincite (`, NNN` continuation) after the primary
 *  pincite has been consumed (#247). Matches a comma + optional whitespace
 *  followed by a pincite body. Used in a loop after `LOOKAHEAD_PINCITE_REGEX`
 *  to collect `115, 153, 200` chains.
 *
 *  Excludes paragraph forms (`¶ 12` mixed with page numbers is exceedingly
 *  rare and would conflict with the citation core's lookahead boundary). */
// Parallel-cite disambiguation: tighten the trailing whitespace branch to
// reject `\s+[A-Z]` (a parallel-cite reporter token). Allow bracket close
// `]` as a terminator so bracketed parallel pincites still capture.
//
// Terminator class mirrors LOOKAHEAD_PINCITE_REGEX (#505): accept `:`, `[`,
// `»`, and curly/straight quotes as additional terminators.
//
// Range separators include tilde (#516).
const ADDITIONAL_PINCITE_REGEX =
  /^,\s*(\*?\d+(?:[-–—~]\*?\d+)?(?:\s+(?:nn?|note)\s*\.?\s*\d+(?:[-–—~]\d+)?)?)(?=$|[.,:;)([\]»"'“”‘’]|\s(?![A-Z]))/

/** Pincite text that appears between core citation and parentheticals.
 *  Matches: comma-separated page numbers/ranges and optional note refs.
 *  E.g., ", 199 n.2", ", 999-1000", ", 130 n.5", ", at p. 115" (CSM, #236),
 *  ", ¶ 12" / ", paras. 12-14" (paragraph form, #204),
 *  ", at page 115" / ", at pages 100-105" (spelled-out form, #510).
 *  Range separators include `~` (OCR artifact, #516).
 *  The outer `+` is intentionally greedy to handle multi-pincite citations
 *  (e.g., ", 199, 205, 210"). Safe because the scan window is bounded by maxLookahead. */
const PINCITE_SKIP_REGEX =
  /^(?:,\s*(?:(?:at\s+(?:(?:pp?\.|pages?)\s*)?)?\*?\d+(?:[-–—~]\*?\d+)?(?:\s+(?:n|note)\s*\.?\s*\d+)?|(?:at\s+)?(?:¶¶?|paras?\.?)\s*\d+(?:[-–—~]\d+)?))+/

/**
 * Signal normalization table. Longer patterns first so "aff'd on other grounds"
 * matches before "aff'd". Each entry: [regex, normalized HistorySignal].
 */
const SIGNAL_TABLE: ReadonlyArray<readonly [RegExp, HistorySignal]> = [
  // affirmed (longer variants first)
  [/^aff'?d\s+on\s+other\s+grounds\b/i, "affirmed"],
  [/^affirmed\s+on\s+other\s+grounds\b/i, "affirmed"],
  [/^aff'?d\b/i, "affirmed"],
  [/^affirmed\b/i, "affirmed"],
  // reversed
  [/^rev'?d\s+and\s+remanded\b/i, "reversed"],
  [/^rev'?d\s+on\s+other\s+grounds\b/i, "reversed"],
  [/^reversed\s+and\s+remanded\b/i, "reversed"],
  [/^rev'?d\b/i, "reversed"],
  [/^reversed\b/i, "reversed"],
  // cert denied
  [/^certiorari\s+denied\b/i, "cert_denied"],
  [/^cert\.\s*den(ied|\.)(?=[\s,;(]|$)/i, "cert_denied"],
  // cert granted
  [/^certiorari\s+granted\b/i, "cert_granted"],
  [/^cert\.\s*granted\b/i, "cert_granted"],
  // overruled
  [/^overruled\s+by\b/i, "overruled"],
  [/^overruled\s+in\b/i, "overruled"],
  [/^overruling\b/i, "overruled"],
  [/^overruled\b/i, "overruled"],
  // vacated
  [/^vacated\s+by\b/i, "vacated"],
  [/^vacated\b/i, "vacated"],
  // remanded
  [/^remanded\s+for\s+reconsideration\b/i, "remanded"],
  [/^remanded\b/i, "remanded"],
  // modified
  [/^modified\s+by\b/i, "modified"],
  [/^modified\b/i, "modified"],
  // abrogated
  [/^abrogated\s+by\b/i, "abrogated"],
  [/^abrogated\s+in\b/i, "abrogated"],
  [/^abrogated\b/i, "abrogated"],
  // additional signals — CA-specific "superseded by grant of review" precedes
  // the bare "superseded by" so alternation prefers the more specific match.
  [/^superseded\s+by\s+grant\s+of\s+review\b/i, "superseded_by_grant_of_review"],
  [/^superseded\s+by\b/i, "superseded"],
  [/^superseded\b/i, "superseded"],
  // CA-specific "disapproved on other grounds" precedes the bare/of forms
  // so alternation prefers the more specific match (#238).
  [/^disapproved\s+on\s+other\s+grounds\b/i, "disapproved_other_grounds"],
  [/^disapproved\s+of\b/i, "disapproved"],
  [/^disapproved\b/i, "disapproved"],
  [/^questioned\s+by\b/i, "questioned"],
  [/^questioned\b/i, "questioned"],
  [/^distinguished\s+by\b/i, "distinguished"],
  [/^distinguished\b/i, "distinguished"],
  [/^withdrawn\b/i, "withdrawn"],
  [/^reinstated\b/i, "reinstated"],
  // Federal rehearing history (#246). `as modified on denial of rehearing`
  // (CA compound, listed later) anchors on `^as modified` so the bare
  // `reh'g denied` / `rehearing denied` entries here do not conflict.
  [/^reh'?g\s+denied\b/i, "rehearing_denied"],
  [/^rehearing\s+denied\b/i, "rehearing_denied"],
  [/^reh'?g\s+granted\b/i, "rehearing_granted"],
  [/^rehearing\s+granted\b/i, "rehearing_granted"],
  // Texas writ-of-error history (Tex. R. App. P. 47.7, pre-Sept. 1997).
  // Longer disposition modifiers must precede the bare forms so alternation
  // picks the more specific match (#229).
  [/^writ\s+ref'?d\s+n\.r\.e\./i, "writ_refused"],
  [/^writ\s+ref'?d\s+w\.m\.j\./i, "writ_refused"],
  [/^writ\s+ref'?d\b/i, "writ_refused"],
  [/^writ\s+dism'?d\s+w\.o\.j\./i, "writ_dismissed"],
  [/^writ\s+dism'?d\b/i, "writ_dismissed"],
  [/^writ\s+denied\b/i, "writ_denied"],
  [/^writ\s+granted\b/i, "writ_granted"],
  [/^no\s+writ\b/i, "no_writ"],
  // Texas petition history (post-Sept. 1997).
  [/^pet\.\s+ref'?d\b/i, "pet_refused"],
  [/^pet\.\s+denied\b/i, "pet_denied"],
  [/^pet\.\s+dism'?d\b/i, "pet_dismissed"],
  [/^pet\.\s+granted\b/i, "pet_granted"],
  [/^pet\.\s+filed\b/i, "pet_filed"],
  [/^no\s+pet\.\s+h\./i, "no_pet"],
  [/^no\s+pet\./i, "no_pet"],
  // California Supreme Court review history (#238). Bluebook T8 only covers
  // federal cert. denied/granted — these CA-specific forms appear in Cal.,
  // Cal.App., and federal opinions citing CA cases.
  [/^review\s+den(?:ied|\.)/i, "review_denied"],
  [/^review\s+granted\b/i, "review_granted"],
  [/^opinion\s+vacated\b/i, "opinion_vacated"],
  // CA Tier 1 research additions (2026-05-11). Longer disposition modifiers
  // precede the bare forms so alternation prefers the more specific match.
  // (`superseded_by_grant_of_review` is placed earlier in SIGNAL_TABLE next to
  // the bare `superseded by` entry — see comment there.)
  [/^petition\s+for\s+review\s+filed\b/i, "petition_for_review_filed"],
  [/^petition\s+for\s+review\s+granted\b/i, "petition_for_review_granted"],
  [/^petition\s+for\s+review\s+denied\b/i, "petition_for_review_denied"],
  [/^as\s+modified\s+on\s+denial\s+of\s+rehearing\b/i, "modified_on_denial_of_rehearing"],
  // Depublication signals — order: longest-first
  [/^ordered\s+not\s+pub\.?/i, "not_published"],
  [/^not\s+for\s+publication\b/i, "not_published"],
  [/^nonpubl?\.?\s+opn\.?/i, "not_published"],
]

/**
 * Match a string against SIGNAL_TABLE and return the normalized signal + match length.
 * Returns undefined if the string doesn't start with a known signal.
 */
function normalizeSignal(raw: string): { signal: HistorySignal; matchLength: number } | undefined {
  for (const [regex, signal] of SIGNAL_TABLE) {
    const match = regex.exec(raw)
    if (match) {
      return { signal, matchLength: match[0].length }
    }
  }
  return undefined
}

/** Signal words that identify explanatory parentheticals */
const SIGNAL_WORDS: ReadonlySet<string> = new Set([
  "holding",
  "finding",
  "stating",
  "noting",
  "explaining",
  "quoting",
  "citing",
  "discussing",
  "describing",
  "recognizing",
  "applying",
  "rejecting",
  "adopting",
  "requiring",
])

/** Type guard: validates a string is a known signal word */
function isSignalWord(word: string): word is ParentheticalType {
  return SIGNAL_WORDS.has(word)
}

/** Matches a leading word (used to extract signal word candidate) */
const LEADING_WORD_REGEX = /^([a-z]+)\b/i

/**
 * Detect parenthetical content that *cannot* be a metadata paren —
 * three shapes, all symptoms of #522 (nested-paren leak):
 *
 * 1. Unbalanced parens (more `(` than `)`): the regex truncated past an
 *    inner open paren and the actual paren extends further. Common shape:
 *    `quoting X v. Y, ... (1995` (closing `)` consumed as the regex's own).
 *
 * 2. Leading signal word (`quoting`, `citing`, `holding`, etc.): explanatory
 *    prose, never metadata.
 *
 * 3. Nested `(YYYY)` inside the content: the inner year belongs to a quoted
 *    citation (`see Foo v. Bar, 100 U.S. 1 (1995)`) — and broader Bluebook
 *    metadata parens never contain a nested year paren. Catches `see`/`but
 *    see`/`accord`/etc. lead-ins that aren't in `SIGNAL_WORDS` but still
 *    follow the same explanatory shape with a nested year paren.
 *
 * Before this guard, all three shapes ran through `parseParenthetical`, which
 * picked up the first 4-digit token as a year (often a page number from
 * inside the nested paren) and the entire prose body as a court — corrupting
 * the outer cite. The lookahead, in-token paren, and classification paths
 * gate metadata extraction on this check before calling `parseParenthetical`.
 *
 * NOTE: `collectParentheticals` uses depth-tracking and returns balanced
 * content, but the balanced content can still fall into shape #3 (e.g., the
 * full `see ... (1995)`). The check applies uniformly across all paren paths.
 */
function isNonMetadataParenContent(content: string): boolean {
  // Unbalanced parens: more `(` than `)` means the lookahead regex stopped at
  // an inner `)` and the actual paren extends further.
  let depth = 0
  for (const ch of content) {
    if (ch === "(") depth++
    else if (ch === ")") depth--
  }
  if (depth > 0) return true

  // Leading signal word — explanatory paren, not metadata.
  const leadingMatch = LEADING_WORD_REGEX.exec(content)
  if (leadingMatch) {
    const candidate = leadingMatch[1].toLowerCase()
    if (isSignalWord(candidate)) return true
  }

  // Nested `(YYYY)` inside the content — the inner year paren marks an
  // embedded citation (`see Foo, 100 U.S. 1 (1995)`). A real metadata paren
  // never contains another year paren.
  if (/\(\d{4}\)/.test(content)) return true

  return false
}

/** Standard "v." or "vs." case name format.
 *
 *  The trailing alternation accepts either a comma (Bluebook form:
 *  `Smith v. Jones, 50 Cal.3d 100 (Cal. 1990)`) or a year paren (California
 *  Style Manual year-first form: `Smith v. Jones (2d Cir. 2005) 396 F.3d 96`
 *  / `Smith v. Jones (1990) 50 Cal.3d 100`). The CSM paren may carry an
 *  optional court abbreviation before the year — `(2d Cir. 2005)`,
 *  `(N.Y. 1991)` — which the caller routes to `precedingDocketMeta.court`.
 *  The court text must contain a period so loose forms like `(March 1991)`
 *  don't get misread as courts (Bluebook T7 court abbreviations all contain
 *  at least one period). Capture group 3 = court (optional), 4 = year.
 *  The `d` flag enables `match.indices` so the caller can compute a year
 *  span. See #19, #293. */
// Latin-1 Supplement (À-ÿ) and Latin Extended-A (Ā-ſ)
// cover the bulk of accented characters that appear in real case names
// (Müller, Société, Pérez, González, Çelik, etc.). Uppercase initial
// accepts both ASCII A-Z and uppercase Latin-1 (À-Þ), so
// plaintiffs whose name begins with `Ç`, `Ö`, `É` etc. still anchor the
// backscan.
//
// Numeric prefix accepts both bare numbers (`12 Lincoln Square`) and
// ordinal forms (`21st Century Fox`, `1st National Bank`, `100th
// Anniversary`). Without the `(?:st|nd|rd|th)?` suffix the regex
// stripped the ordinal prefix entirely.
const V_CASE_NAME_REGEX =
  /((?:\d[\d-]*(?:st|nd|rd|th)?\s+)?[A-ZÀ-Þ][A-Za-z0-9À-ſ\s.,'&()/-]+?)\s+v(?:s)?\.?\s+([A-Za-z0-9À-ſ\s.,'&()/-]+?)\s*(?:,|\((?:([^)]*?\.[^)]*?)\s+)?(\d{4})\))\s*$/d

/** Procedural prefix case name format.
 *  Longer prefixes listed first so the alternation prefers the longer match
 *  (e.g., `In the Matter of the Liquidation of X` beats `In the Matter of X`,
 *  `In re Marriage of X` beats `In re X`, `Commonwealth of Puerto Rico ex rel.`
 *  beats `Commonwealth ex rel.`). See #193, #242, and the six 2026-05-11
 *  procedural-prefix research dispatches in `docs/research/`.
 *
 *  The trailing alternation matches either `,` (Bluebook) or
 *  `((<court>)? <year>)` (CSM year-first form, #19 / #293). Captures:
 *    1: prefix word, 2: party body, 3: court (optional), 4: year.
 *  The court text must contain a period so loose forms like `(March 1991)`
 *  don't get misread as courts. The `d` flag enables `match.indices`. */
const PROCEDURAL_PREFIX_REGEX =
  /\b(In\s+the\s+Matter\s+of\s+the\s+Liquidation\s+of|In\s+the\s+Matter\s+of\s+the\s+Rehabilitation\s+of|In\s+the\s+Matter\s+of\s+the\s+Receivership\s+of|In\s+the\s+Matter\s+of\s+the\s+Extradition\s+of|In\s+the\s+Matter\s+of\s+the\s+Application\s+of|In\s+the\s+Matter\s+of\s+the\s+Welfare\s+of|In\s+the\s+Matter\s+of|In\s+re\s+Petition\s+for\s+Naturalization\s+of|In\s+re\s+Termination\s+of\s+Parental\s+Rights\s+as\s+to|In\s+re\s+Termination\s+of\s+Parental\s+Rights\s+to|In\s+re\s+Termination\s+of\s+Parental\s+Rights\s+of|In\s+re\s+Marriage\s+of|In\s+re\s+Liquidation\s+of|In\s+re\s+Rehabilitation\s+of|In\s+re\s+Receivership\s+of|In\s+re\s+Naturalization\s+of|In\s+re\s+Extradition\s+of|In\s+re\s+Application\s+of|In\s+re\s+Welfare\s+of|In\s+re\s+Dependency\s+of|In\s+re\s+Paternity\s+of|In\s+re\s+Parentage\s+of|In\s+re\s+Conservatorship\s+of|In\s+re\s+Guardianship\s+of|In\s+re\s+Adoption\s+of|In\s+the\s+Interest\s+of|Matter\s+of\s+Liquidation\s+of|Matter\s+of\s+Rehabilitation\s+of|Commonwealth\s+of\s+Puerto\s+Rico\s+ex\s+rel\.|Government\s+of\s+the\s+Virgin\s+Islands\s+ex\s+rel\.|Commonwealth\s+ex\s+rel\.|Petition\s+for\s+Naturalization\s+of|People\s+ex\s+rel\.|District\s+of\s+Columbia\s+ex\s+rel\.|Conservatorship\s+of\s+the\s+Person\s+and\s+Estate\s+of|Conservatorship\s+of\s+the\s+Person\s+of|Conservatorship\s+of\s+the\s+Estate\s+of|Inquiry\s+Concerning\s+Judge|Appeal\s+of|Care\s+and\s+Protection\s+of|Succession\s+of|In re|Ex parte|Matter of|Estate of|State ex rel\.|United States ex rel\.|Application of|On Petition of|Petition of|Adoption of|Conservatorship of|Guardianship of)\s+([A-Za-z0-9\s.,'&()/-]+?)\s*(?:,|\((?:([^)]*?\.[^)]*?)\s+)?(\d{4})\))\s*$/id

/**
 * Lowercase words that legitimately appear in legal party names.
 * Articles, prepositions, and legal connectors (e.g., "of", "the", "ex", "rel").
 * Used to distinguish real party names from sentence context captured by the regex.
 *
 * Note: "in" is intentionally NOT a connector. It's overwhelmingly a prose
 * preposition ("the holding in", "the rule announced in") rather than a
 * party-name internal token. Treating "in" as a connector lets lead-in
 * clauses bleed into the captured plaintiff (#223). Procedural "In re"
 * captions go through PROCEDURAL_PREFIX_REGEX instead.
 */
const PARTY_NAME_CONNECTORS = new Set([
  "of",
  "the",
  "and",
  "for",
  "on",
  "by",
  "a",
  "an",
  "to",
  "at",
  "as",
  "de",
  "la",
  "el",
  "del",
  "von",
  "van",
  "ex",
  "rel",
  "et",
  "al",
  "d",
  "or",
])

/**
 * Internal qualifier markers that appear inside legitimate party names
 * (e.g., "Smith d/b/a Old Bob's Diner v. Jones", "Jones aka Johnson v. Smith").
 * When such a marker is present, the plaintiff is correctly anchored at its
 * first word — even if that word is followed by lowercase non-connector
 * tokens. Without this signal, the firstWordIsProperName guard incorrectly
 * preserves lead-in prose (#223).
 */
const INTERNAL_QUALIFIER_REGEX = /\b(?:d\/?b\/?a|a\/?k\/?a|f\/?k\/?a|n\/?k\/?a)\b/i

/**
 * Check whether a string looks like a legal party name vs. sentence context.
 *
 * Valid party names consist of capitalized words and legal connectors:
 *   "Smith" ✓, "United States" ✓, "People of the State of New York" ✓
 *
 * Sentence context contains lowercase non-connector words (verbs, nouns):
 *   "The court cited Smith" ✗ ("court", "cited" are not connectors)
 */
function isLikelyPartyName(name: string): boolean {
  const words = name.split(/\s+/)
  // Reject names whose first word is a sentence-initial transition word
  // (`Invoking Younger`, `Citing Pederson`, `Under People`). These pass
  // the all-capitalized-words check below because every word starts capital,
  // but the first word is prose, not a party name. (#323)
  const firstWord = words[0] ?? ""
  const firstWordClean = firstWord.toLowerCase().replace(/[.,']+$/, "")
  if (SENTENCE_INITIAL_WORDS.has(firstWordClean)) return false
  for (const word of words) {
    if (!word) continue
    // Standalone ampersand is ubiquitous in corporate captions
    // ("Smith & Jones", "Goldman, Sachs & Co.").
    if (word === "&") continue
    // Strip trailing punctuation for comparison (handles "Inc.", "Corp.,")
    const clean = word.toLowerCase().replace(/[.,']+$/, "")
    if (PARTY_NAME_CONNECTORS.has(clean)) continue
    if (/^[A-Z]/.test(word)) continue
    // Numeric words are valid in party names (e.g., "Doe No. 2", "Route 66")
    if (/^\d/.test(word)) continue
    // Lowercase non-connector word → not a party name
    return false
  }
  return true
}

/**
 * Capitalized words that are never proper names — only uppercase because they're
 * sentence-initial. Prevents the firstWordIsProperName guard from treating
 * "This landmark decision..." or "Those cases..." as party-name-anchored text.
 *
 * Includes citation-introducing transition words (#323): `Under`, `Invoking`,
 * `Citing`, `Following`, `Unlike`, `Whereas`, `Pursuant`, `Applying`. These
 * appear at the start of sentences that introduce a citation and get
 * incorrectly captured as part of the plaintiff name by V_CASE_NAME_REGEX's
 * greedy lookback.
 */
const SENTENCE_INITIAL_WORDS = new Set([
  "this",
  "that",
  "these",
  "those",
  "here",
  "there",
  "such",
  "its",
  "his",
  "her",
  "their",
  "our",
  // Citation-introducing transition words (#323)
  "under",
  "invoking",
  "citing",
  "following",
  "unlike",
  "whereas",
  "pursuant",
  "applying",
])

/**
 * Strips date components (month, day, year) from parenthetical content
 * to isolate the court abbreviation.
 * E.g., "2d Cir. Jan. 15, 2020" → "2d Cir."
 *        "C.D. Cal. Feb. 9, 2015" → "C.D. Cal."
 *        "D. Mass. Mar. 2020" → "D. Mass."
 *        "D. Mass. 1/15/2020" → "D. Mass."
 */
function stripDateFromCourt(content: string): string | undefined {
  // Strip trailing numeric date format first (1/15/2020)
  let court = content.replace(/\s*\d{1,2}\/\d{1,2}\/\d{4}\s*$/, "").trim()
  // Strip trailing year-plus-disposition-modifier (`1990 mem.`,
  // `1990 unpublished`, `1990 per curiam`, `1990 en banc`). The year
  // sits in the middle of `(<court> <year> <modifier>)` so the bare
  // `\d{4}$` strip below can't reach it; lift the year+modifier suffix
  // first.
  court = court
    .replace(
      /\s*\d{4}\s+(?:mem\.?|unpub\.?|unpublished|per\s+curiam|en\s+banc|slip\s+op\.?|table|supp\.?)\s*$/i,
      "",
    )
    .trim()
  // Strip trailing year
  court = court.replace(/\s*\d{4}\s*$/, "").trim()
  // Strip trailing date components: optional day+comma, month abbreviation or full name
  court = court.replace(/\s*,?\s*\d{1,2}\s*,?\s*$/, "").trim()
  court = court.replace(new RegExp(`\\s*${MONTH_PATTERN.source}\\s*$`, "i"), "").trim()
  // Strip any trailing commas left over
  court = court.replace(/,\s*$/, "").trim()
  if (!court || !/[A-Za-z]/.test(court)) return undefined

  // Reject explanatory parentheticals — `(holding that...)`, `(emphasis
  // added)`, `(citations omitted)`, etc. These are NOT court abbreviations
  // even after date-stripping. Bluebook court abbreviations (T7) virtually
  // always contain a period (`D.C. Cir.`, `9th Cir.`, `S.D.N.Y.`,
  // `Cal.`). Content with no period and starting with a known
  // explanatory-signal word or running multiple words of lowercase prose
  // is an explanatory parenthetical that should NOT be routed to `court`.
  // #431
  //
  // Additionally, a no-period parenthetical that looks like a short-form
  // case nickname (Bluebook Rule 10.9 anchor — Title-Case word(s) like
  // `(Macaluso)`, `(Privette)`, `(Fox Johns)`, `(SeaBright)`) must be
  // rejected as a court. These appear after California citations and
  // every other reporter; they are the case-name handle, not a court
  // abbreviation. All Bluebook T7 court abbreviations contain at least
  // one period, so we reject any no-period content whose alphabetic
  // words all begin with an uppercase letter and contain no ordinal
  // (`2d`, `9th`, `1st`). See #634.
  // Quote-leading content is a quotation parenthetical (`("A fundamental
  // and longstanding principle...")`), never a court abbreviation. Apply
  // BEFORE the period-check because quoted content frequently contains
  // periods (sentence-ending) which would otherwise pass the period gate.
  if (/^["'“”‘’]/.test(court)) {
    return undefined
  }
  // Dissent / concurring opinion attribution (`dis. opn. of Shenk, J.`,
  // `conc. opn. of Werdegar, J.`) contains periods so it passes the
  // period gate. Detect the `dis.|conc. opn.` head OR the trailing
  // `, J.|J.J.|JJ.` judge marker as a positive signal. Real court
  // abbreviations don't contain `opn.` or trailing single-letter-J
  // judge markers.
  if (/^(?:dis|conc|concurring|dissenting)\.\s*opn\./i.test(court)) {
    return undefined
  }
  if (/,\s+J\.?J?\.?\s*$|,\s+JJ\.?\s*$/.test(court)) {
    return undefined
  }
  // Judge-attribution parenthetical with mid-string `, J.,` / `, JJ.,`
  // (e.g. `Smith, J., dissenting`, `Smith, J., concurring in part`).
  // The trailing-only check above misses these because `dissenting` /
  // `concurring` follows the `J.` marker.
  if (/,\s+J\.?J?\.?,\s+(?:dissenting|concurring|joining)/i.test(court)) {
    return undefined
  }
  // Disposition tokens (Bluebook Rule 10.7) sometimes appear inside the
  // court parenthetical: `(rev'd 1990)`, `(per curiam 1990)`, `(en banc)`,
  // `(cert. denied 1990)`. After year-stripping, the bare disposition is
  // not a court — reject it so we don't surface `court="rev'd"`.
  if (
    /^(?:rev'd|aff'd|aff'g|rev'g|mod'd|cert\.?\s+(?:denied|granted|dismissed)|appeal\s+(?:denied|dismissed|docketed)|dismissed|reversed|vacated|vacating|overruled(?:\s+by)?|overruling|en\s+banc|per\s+curiam)(?:\s+(?:in\s+part|on\s+other\s+grounds?|sub\s+nom\.?))?\s*$/i.test(
      court,
    )
  ) {
    return undefined
  }
  // Editorial/status tokens that appear in date parenthetical position but
  // are not courts: `n.d.` (no date), `unpub.`, `unpublished`,
  // `slip op.`, `slip opinion`, `table`, `mem.`, `no date`,
  // `year omitted`. These either contain periods (escaping the no-period
  // gate) or are single short lowercase words that wouldn't trigger the
  // multi-word-prose rule.
  if (
    /^(?:n\.?\s*d\.?|no\s+date|year\s+omitted|unpub\.?|unpublished|slip\s+op(?:\.|inion)?|table|mem\.?)\s*$/i.test(
      court,
    )
  ) {
    return undefined
  }
  // Date-modifier verbs (Bluebook Rule 10.5) that prefix the date inside
  // the court parenthetical: `(filed Jan. 15, 1990)`, `(decided
  // Mar. 15, 1990)`, `(argued Apr. 1, 1990)`, `(effective Jan. 1, 1990)`,
  // `(entered Jan. 1, 1990)`, `(submitted Jan. 1, 1990)`, `(heard ...)`.
  // After year + date stripping the residue is the bare verb (or messy
  // mid-string commas for `argued ..., decided ...`). Detect by leading
  // verb word and reject — these are not courts.
  if (
    /^(?:filed|decided|argued|submitted|heard|effective|entered)\b/i.test(
      court,
    )
  ) {
    return undefined
  }
  // Approximate-year prefixes (`c.`, `circa`, `about`, `approx.`) and
  // typo court abbreviations (`cir.` lowercase, no number). After year-
  // stripping these leak as the bare prefix word.
  if (/^(?:c\.|circa|about|approx\.?|approximately|cir\.)\s*$/i.test(court)) {
    return undefined
  }
  if (!court.includes(".")) {
    const firstWord = court.match(/^[a-z]+/i)?.[0].toLowerCase()
    if (firstWord && (SIGNAL_WORDS.has(firstWord) ||
      firstWord === "additional" ||
      firstWord === "emphasis" || firstWord === "internal" ||
      firstWord === "citations" || firstWord === "footnote" ||
      firstWord === "alteration" || firstWord === "alterations" ||
      firstWord === "omitted" || firstWord === "see")) {
      return undefined
    }
    // Multi-word lowercase prose (>= 3 words) without any period is
    // explanatory text, not a court abbreviation.
    const words = court.split(/\s+/)
    if (words.length >= 3 && words.every((w) => /^[a-z]/.test(w))) {
      return undefined
    }
    // Short-form case nickname (#634): every alphabetic word starts with
    // an uppercase letter, no word is an ordinal indicator (`2d`, `9th`,
    // `1st`, `21st`), and no period anywhere. This is a Bluebook Rule 10.9
    // case-name anchor, not a court abbreviation.
    const hasOrdinal = words.some((w) => /^\d+(st|nd|rd|th|d)$/i.test(w))
    const allTitleCase = words.every((w) => /^[A-Z]/.test(w))
    if (!hasOrdinal && allTitleCase) {
      return undefined
    }
  }
  return court
}

// ============================================================================
// Case-name boundary detection: abbreviation set + heuristics
// ============================================================================

/**
 * Comprehensive set of legal abbreviation stems (lowercase, without trailing period)
 * used to distinguish abbreviation periods from sentence-ending periods during
 * backward case-name scanning.
 *
 * Sources: Bluebook T6 (case name abbreviations), T7 (court abbreviations),
 * T10 (geographic abbreviations), plus common titles and corporate suffixes.
 */
const CASE_NAME_ABBREVS: ReadonlySet<string> = new Set([
  // ── Bluebook T6: Case name and institutional abbreviations ──
  "acad",
  "acct",
  "accts",
  "admin",
  "adm",
  "advert",
  "advoc",
  "aff",
  "affs",
  "afr",
  "agric",
  "all",
  "alt",
  "am",
  "ann",
  "app",
  "arb",
  "assoc",
  "assocs",
  "atl",
  "auth",
  "auto",
  "ave",
  "bankr",
  "behav",
  "bd",
  "bor",
  "brit",
  "broad",
  "bhd",
  "bros",
  "bldg",
  "bull",
  "bus",
  "can",
  "cap",
  "cas",
  "cath",
  "ctr",
  "ctrs",
  "cent",
  "chem",
  "child",
  "chron",
  "coal",
  "coll",
  "com",
  "comm",
  "compar",
  "comp",
  "comput",
  "condo",
  "conf",
  "cong",
  "consol",
  "const",
  "constr",
  "cont",
  "coop",
  "corp",
  "corps",
  "corr",
  "cosm",
  "couns",
  "cntys",
  "cnty",
  "crim",
  "def",
  "delinq",
  "det",
  "dev",
  "dig",
  "dir",
  "disc",
  "disp",
  "distrib",
  "dist",
  "div",
  "econ",
  "educ",
  "elec",
  "emp",
  "eng",
  "enter",
  "enters", // Enters. (Enterprises, plural of Bluebook T6 "Enter.") — common in NY/4th Dep't captions ("Fields Enters. Inc."). #288 surfaced this gap.
  "ent",
  "equal",
  "equip",
  "est",
  "eur",
  "exam",
  "exch",
  "exec",
  "expl",
  "exp",
  "fac",
  "fam",
  "fams",
  "fed",
  "fid",
  "fin",
  "found",
  "gen",
  "glob",
  "grp",
  "guar",
  "hist",
  "hosp",
  "hous",
  "hum",
  "immigr",
  "imp",
  "inc",
  "indem",
  "indep",
  "indus",
  "info",
  "inj",
  "inst",
  "ins",
  "intell",
  "intel",
  "int",
  "inv",
  "invs",
  "jurid",
  "just",
  "juv",
  "lab",
  "law",
  "liab",
  "ltd",
  "loc",
  "mach",
  "mag",
  "maint",
  "mgmt",
  "mgt",
  "mfr",
  "mfrs",
  "mfg",
  "mar",
  "mkt",
  "mktg",
  "matrim",
  "mech",
  "med",
  "merch",
  "metro",
  "min",
  "misc",
  "mod",
  "mortg",
  "mun",
  "mut",
  "nat",
  "negl",
  "negot",
  "nw",
  "no",
  "nos",
  "off",
  "org",
  "orgs",
  "pac",
  "pat",
  "pers",
  "pharm",
  "phil",
  "plan",
  "pol",
  "prac",
  "pres",
  "priv",
  "prob",
  "proc",
  "prod",
  "pro",
  "prop",
  "psych",
  "pub",
  "rec",
  "reg",
  "regul",
  "rehab",
  "rel",
  "rels",
  "rep",
  "reprod",
  "rsch",
  "rsrv",
  "resol",
  "res",
  "resp",
  "rest",
  "ret",
  "rd",
  "sav",
  "sch",
  "schs",
  "sci",
  "sec",
  "serv",
  "servs",
  "sess",
  "soc",
  "solic",
  "spec",
  "stat",
  "subcomm",
  "sur",
  "surv",
  "sys",
  "tchr",
  "tech",
  "telecomm",
  "tel",
  "temp",
  "twp",
  "transcon",
  "transp",
  "treas",
  "tr",
  "trs",
  "tpk",
  "unemplmt",
  "unif",
  "univ",
  "urb",
  "util",
  "veh",
  "vehs",
  "vill",
  "voc",
  "whse",
  "whol",
  "litig",
  // ── T6: Directional abbreviations ──
  "n",
  "s",
  "e",
  "w",
  "m",
  "ne",
  "se",
  "sw",
  // ── T6/T10: Geographic features and street types ──
  // Appear mid-party-name as "Long Is.", "Mt. Sinai", "Ft. Worth", "Stony Pt.",
  // "Route 66" (Rt.), "St. Paul" / "Main St.", "Wilshire Blvd.", "Times Sq.",
  // "Pacific Hwy.", "Grand Central Pkwy.", "Washington Hts.". Without these,
  // the backward scanner treats "Is. R" / "Mt. S" as sentence boundaries and
  // truncates the case name. See #188.
  "is",
  "mt",
  "ft",
  "pt",
  "rt",
  "st",
  "blvd",
  "sq",
  "hwy",
  "pkwy",
  "hts",
  // ── T7: Court abbreviations ──
  "v",
  "vs",
  "ct",
  "cir",
  "supp",
  "cl",
  "jud",
  "super",
  "sup",
  "magis",
  "mil",
  "terr",
  // ── T10: US state abbreviations ──
  "ala",
  "ariz",
  "ark",
  "cal",
  "colo",
  "conn",
  "del",
  "fla",
  "ga",
  "haw",
  "ida",
  "ill",
  "ind",
  "kan",
  "ky",
  "la",
  "me",
  "md",
  "mass",
  "mich",
  "minn",
  "miss",
  "mo",
  "mont",
  "neb",
  "nev",
  "okla",
  "or",
  "pa",
  "tenn",
  "tex",
  "vt",
  "va",
  "wash",
  "wis",
  "wyo",
  // ── Titles and honorifics ──
  "mr",
  "mrs",
  "ms",
  "dr",
  "jr",
  "sr",
  "prof",
  "rev",
  "hon",
  "sgt",
  "capt",
  "col",
  "lt",
  // ── Other common legal abbreviations ──
  "ed",
  "op",
  "ad",
  "dep",
  "ass",
  "ry",
  // ── reporters-db alignment (Bluebook T6-derived, 19th ed) ──
  // Period-form abbreviations. Source: freelawproject/reporters-db
  // data/case_name_abbreviations.json. `co` (Co./Company) was the most
  // impactful gap — "Smith & Co. United States Corp." was truncated to
  // just "United States Corp." because the sentence-boundary scan fired
  // on "Co. U".
  "co",
  "cmty",
  "cty",
  "envtl",
  "gend",
  "par",
  "prot",
  "ref",
  "sol",
  "adver",
  // Apostrophe-form abbreviations. Stored as pure-letter stems because
  // isLikelyAbbreviationPeriod now strips all apostrophes/periods before
  // set lookup. These appear in nearly every NY appellate citation
  // ("2d Dep't", "Nat'l", "Int'l", "Ass'n", "Gov't", etc.).
  "admr",
  "admx",
  "assn",
  "commcn",
  "commn",
  "commr",
  "contl",
  "dept",
  "empr",
  "empt",
  "engg",
  "engr",
  "entmt",
  "envt",
  "examr",
  "exr",
  "exx",
  "fedn",
  "govt",
  "intl",
  "invr",
  "meml",
  "natl",
  "profl",
  "pship",
  "publg",
  "publn",
  "regl",
  "secy",
  "sholder",
  "socy",
  // ── Cornell § 4-100 / state-practice gaps not in Bluebook T6 source ──
  // Used in real case captions across multiple jurisdictions:
  //   - "Tp." (NJ alternative to Bluebook "Twp." Township) —
  //     "Parsippany-Troy Hills Tp. Council", "Bernards Tp. v. ..."
  //   - "Vil." (NY single-L variant of Bluebook "Vill." Village) — #288
  //     NY Reporter / Slip Opinion captions, esp. 4th Dep't:
  //     "Bristol Harbour Vil. Assn., Inc.", "Smithtown Vil. Bd."
  //   - "Tax'n" (Taxation) — "Dep't of Tax'n v. ..."
  //   - "Enf't" (Enforcement) — "Drug Enf't Admin. v. ..."
  //   - "Rts." (Rights) — "Human Rts. Watch v. ...", "Civ. Rts. Div."
  "tp",
  "vil",
  "taxn",
  "enft",
  "rts",
  // ── 2026-05-10 jurisdiction-survey additions ──
  // Cross-agent research canvassing 15 jurisdictional clusters (NY/NJ, PA/DE/
  // MD/DC/WV, New England, CA, TX/OK, Southeast, Deep South, Great Lakes,
  // Western/Pacific, federal courts, federal specialty courts, govt agencies +
  // corporate entity forms, ALWD + Bluebook 21st + reporters-db sweep, and
  // foreign/tribal/territorial) plus a parser-quirks audit. Reports retained
  // in docs/research/2026-05-10-citation-abbrevs-*.md.
  //
  // Universal apostrophe-form + Bluebook BT1.2 party designations:
  "atty", //   Att'y / Att'y Gen. — 32k+ corpus matches; every state + federal AG case
  "attys", //  Att'ys (plural)
  "petr", //   Pet'r — Bluebook 21st BT1.2 (habeas, immigration, PTAB captions)
  "respt", //  Resp't — Bluebook 21st BT1.2 counterpart to Pet'r
  "commrs", // Comm'rs (plural of existing commr) — "Bd. of Cnty. Comm'rs"
  // Plurals of existing singular stems (modern LLC-era captions):
  "hldgs", //  Hldgs. (Holdings) — DE Chancery, NY 1st Dep't, GA LLC
  "hldg", //   Hldg. (singular)
  "props", //  Props. — Lanvale Props. LLC (NC), Ryan Jackson Props.
  "prods", //  Prods. (Products plural) — product-liability captions nationwide
  "ents", //   Ents. (Enterprises plural) — "NC Ents., L.L.C."
  "invests", //Invests. — Ohio "A.A.A. Invests. v. Columbus"
  "scis", //   Scis. (Sciences plural)
  "emps", //   Emps. — "Okla. Pub. Emps. Ret. Sys.", "Pub. Emps. Rel. Comm'n"
  "sols", //   Sols. (Solutions plural) — modern LLC captions "Med-Care Sols., LLC"
  "corrs", //  Corrs. (Corrections plural) — "Ark. Bd. of Corrs."
  "telecomms", //Telecomms. (plural) — "BellSouth Telecomms., Inc."
  "examrs", // Exam'rs (Examiners plural) — "Med. Exam'rs Comm'n", "Bar Exam'rs"
  "cmtys", //  Cmtys. (Communities plural) — "Fla. Cmtys. Tr."
  "colls", //  Colls. (Colleges plural) — "State Bd. of Cmty. Colls."
  "cts", //    Cts. (Courts plural) — "Off. of the St. Cts. Admin'r"
  "amends", // Amends. (Amendments plural)
  // Standard institutional / agency abbreviations:
  "civ", //    Civ. (Civil) — Ala. Civ. App., Civ. Rts. Div., Civ. Liberties Union
  "enf", //    Enf. (Enforcement, distinct from existing enft) — "Drug Enf. Admin."
  "advis", //  Advis. (Advisory) — "Advis. Council/Comm."
  "utils", //  Utils. — "Utils. Comm'n", "Pub. Utils. Comm'n"
  "lic", //    Lic. (License) — "Bd. of License Comm'rs" (Tiverton, 469 U.S. 238)
  "bur", //    Bur. (Bureau) — "Bur. of Driver Lic.", "Bur. of Land Mgmt."
  "insp", //   Insp. (Inspection) — "Bd. of Lic. & Insp. Review"
  "conserv", //Conserv. (Conservation) — Bluebook 21st; 1.5k corpus matches
  "retire", // Retire. (Retirement) — "W. Va. Consol. Pub. Retire. Bd." (distinct from ret)
  "discipl", //Discipl. (Disciplinary) — "Lawyer Disciplinary Bd."
  "supers", // Supers. (Supervisors) — PA "Twp. Bd. of Supers." (hundreds of captions)
  "edn", //    Edn. (Ohio variant of Educ.) — "Bd. of Edn."
  "coun", //   Coun. (Council) — NLRB "Dist. Council 9", distinct from couns (Counsel)
  "stds", //   Stds. (Standards) — "Crim. Just. Stds. & Training Comm'n"
  "procs", //  Procs. (Procedures)
  "quals", //  Quals. (Qualifications) — "Jud. Quals. Comm'n"
  // Regional / state-specific:
  "boro", //   NJ "Boro." — alternative long form to existing "Bor." (Borough)
  "commw", //  Commw. — PA Commonwealth Court ("Pa. Commw. Ct.")
  "adv", //    Adv. (Advance) — NV "Nev., Adv. Op." form
  "comn", //   Com'n — Hawaii single-m variant of Comm'n
  "irrig", //  Irrig. (Irrigation) — ID/WY/WA "Pioneer Irrig. Dist."
  "reclam", // Reclam. (Reclamation) — federal-project captions
  "rptr", //   Rptr. — CA "Cal.Rptr." nested in bracketed parallel cites
  "vet", //    Vet. (Veterans) — "Vet. App.", "Sec'y of Vet. Aff."
  "trib", //   Trib. — Tribune (Bluebook 21st T6) + Tribal Ct.
  "adj", //    Adj. — Adjustment (VT/NH "Zoning Bd. of Adj.") + Adjudicatory (FL)
  "vol", //    Vol. (Volunteer) — PA "Univ. Vol. Fire Dept."; volume cites are pre-digit
  // Corporate entity forms:
  "pty", //    Pty. — Australian "Pty. Ltd."
  // Bluebook 21st ed. (2020) T6 / T13.2 merger additions:
  "poly", //   Pol'y (Policy)
  "stud", //   Stud. (Studies)
  "libr", //   Libr. (Library)
  "refin", //  Refin. (Refining) — distinct from existing ref (Referee/Reference)
  "socio", //  Socio. (Sociology) — distinct from existing soc (Social)
  "laby", //   Lab'y (Laboratory) — distinct from existing lab (Labor)
  "naty", //   Nat'y (Nationality)
  "wkly", //   Wkly. (Weekly)
  "appx", //   App'x (Appendix) — "F. App'x" reporter
  // Plains + Upper Midwest (re-dispatch agent, report retained):
  "comr", //   Comr. — Nebraska apostrophe-dropping single-m variant of Comm'r
  "comrs", //  Comrs. — NE plural variant; "Cherry Cty. Bd. of Comrs."
  "reins", //  Reins. — Bluebook T6; "Grinnell Mut. Reins. Co." (ND insurance)
])

/**
 * Detect whether a period at `dotIndex` in `text` is likely an abbreviation
 * rather than a sentence boundary.
 *
 * Three-tier check:
 *   1. Word stem is in the comprehensive CASE_NAME_ABBREVS set
 *   2. Single uppercase letter (initial: A., B., J., N.)
 *   3. Word contains internal periods (dotted initialism: N.Y., U.S., D.C.)
 */
function isLikelyAbbreviationPeriod(text: string, dotIndex: number): boolean {
  // Walk backward from the period to find the word
  let start = dotIndex
  while (start > 0 && /[-A-Za-z.']/.test(text[start - 1])) {
    start--
  }
  const word = text.substring(start, dotIndex)
  if (!word) return false

  // Strip ALL periods and apostrophes for set lookup. This normalizes
  // apostrophe-form abbreviations ("Ass'n" → "assn", "Dep't" → "dept",
  // "Nat'l" → "natl") so the set can store pure-letter stems.
  const stem = word.replace(/['.]/g, "").toLowerCase()

  // Tier 1: Known legal abbreviation
  if (CASE_NAME_ABBREVS.has(stem)) return true

  // Tier 2: Single uppercase letter (initial)
  if (stem.length === 1 && /[a-z]/i.test(stem)) return true

  // Tier 3: Contains internal periods (dotted initialism like N.Y, U.S, D.C)
  if (/\.[A-Za-z]/.test(word)) return true

  return false
}

/** Hard boundary: Id. citation marker — the scan must not cross this.
 *  Case-sensitive: Bluebook convention is always capitalized "Id." */
const ID_BOUNDARY_REGEX = /\bId\.\s+/g

/** Hard boundary: parenthetical signal words that introduce nested citations.
 *  Matches opening paren + optional space + signal word (+ optional ", e.g.,")
 *  + whitespace.
 *
 *  E.g., "(quoting ", "(citing ", "(cited in ", "(quoted in ", "(accord ",
 *  "(citing, e.g., ". The optional `, e.g.[,]` tail handles the common form
 *  where a citing parenthetical introduces multiple authorities. See #187. */
const PAREN_SIGNAL_BOUNDARY_REGEX =
  /\(\s*(?:quoting|citing|cited\s+in|quoted\s+in|accord|discussing|noting|explaining|describing|recognizing|applying|rejecting|adopting|requiring|overruling|overruled\s+by|abrogated\s+by)(?:,\s*e\.g\.,?)?\s+/gi

/** Sentence boundary: closing paren or period, followed by space + uppercase
 *  letter or open-paren. The `(` lookahead handles parenthesized citations
 *  inside running prose — `... discretion. (Burquet v. Brumbaugh, ...)` —
 *  where the citation envelope opens with `(` immediately after the
 *  sentence-ending period. Without it, the case-name backward walk crosses
 *  the boundary and absorbs the entire preceding sentence into the
 *  plaintiff field. #323 */
const SENTENCE_BOUNDARY_REGEX = /[.)]\s+(?=[A-Z(])/g

/** Prior-citation year-paren boundary: a closing paren preceded by a 4-digit
 *  year, followed by an explicit citation-list connector word (`and`, `or`,
 *  `see`, `but see`, `see also`, `e.g.`) or a semicolon. Catches the gap
 *  left by SENTENCE_BOUNDARY_REGEX when the next caption's first word is
 *  lowercase (e.g., `(Del. 1984), and Rales v. Blasband` — `and` is
 *  lowercase so the sentence regex skips it).
 *
 *  The connector word is required (not optional) so we don't false-positive
 *  on Montana / California year-first captions like `Holton v. Co. (1981),
 *  195 Mont. 1` (the `, 195` is a parallel reporter, not a list connector). */
const PRIOR_YEAR_PAREN_BOUNDARY_REGEX =
  /\b\d{4}\)\s*(?:,\s*(?:and|or|see(?:\s+also)?|but\s+see|e\.g\.)|;)\s+/g

/** Louisiana docket-prefix boundary (#232). Matches the Louisiana citation
 *  shape `NN-NNNN (La. ... M/D/YY)` or `YYYY-K-NNNN (La. ... M/D/YY)` that
 *  precedes the parallel `So. 2d` / `So. 3d` reporter citation. The capture
 *  groups expose the court (group 2) and the date string (group 3) so the
 *  trailing reporter citation can inherit the metadata. Includes an optional
 *  `, p. N` pincite segment commonly present in LA practice.
 *
 *  The trailing `,` + whitespace is consumed so that everything BEFORE this
 *  pattern is the caption. */
const LA_DOCKET_BOUNDARY_REGEX =
  /,?\s*(\d{2,4}-[A-Z\d-]+)(?:,\s*p\.\s*\d+)?\s*\((La\.[^)]*?)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\),\s*/g

/**
 * Find the rightmost `(` in `text` that wraps a caption + (eventually) the
 * citation core — i.e., the open-paren of a `(Name v. Name, vol Reporter
 * page)` envelope (#512). Returns the position immediately AFTER the `(`
 * (so callers can `substring` from it), or `-1` when no such paren exists.
 *
 * Detection heuristic: scan right-to-left for `(`. The first one whose
 * unbalanced suffix contains a `v.`-style anchor or a procedural prefix
 * is the wrapping paren. We don't require the matching `)` to be present
 * (the trailing `)` lives past the citation core).
 *
 * The matching is intentionally narrow:
 * - Only `(` immediately followed (after optional whitespace) by a
 *   capitalized word that participates in a v.-style or procedural
 *   caption qualifies. Plain parens like `(sequestration)` or
 *   `(entry of a money judgment)` are skipped.
 * - The `v.` / procedural prefix must appear within the paren-suffix to
 *   coreStart, ensuring we don't truncate when the paren wraps something
 *   else (a date-paren, court-paren, explanatory paren, ...).
 * - If a complete v.-style caption already exists BEFORE the candidate
 *   `(`, that `(` is an inline admin parenthetical (`Spence v. Hintze
 *   (In re Hintze), ...` — #241) and must NOT be used as a boundary;
 *   stripping past it would destroy the real caption.
 */
function findCaptionWrapperParen(text: string): number {
  // Quick reject: no `(` in text.
  if (text.indexOf("(") === -1) return -1
  // Scan right-to-left for `(`.
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] !== "(") continue
    const after = text.substring(i + 1)
    // The content must START with optional whitespace + a capital letter
    // — a paren around lowercase prose ("(sequestration)") is not a
    // caption wrapper.
    if (!/^\s*[A-Z]/.test(after)) continue
    // Look for a v.-style anchor OR a procedural prefix within the paren
    // body up to where the precedingText ends (which is the citation
    // core position).
    const looksLikeCaption =
      /\s+vs?\.?\s+[A-Z]/.test(after) ||
      /^\s*(?:In\s+re|Ex\s+parte|Matter\s+of|Estate\s+of|State\s+ex\s+rel\.|United\s+States\s+ex\s+rel\.|People\s+ex\s+rel\.)\b/.test(
        after,
      )
    if (!looksLikeCaption) continue
    // Admin-paren guard (#241): if a complete `Name v. Name` caption
    // already lives BEFORE this `(`, the `(` introduces an inline
    // explanatory clause (`Spence v. Hintze (In re Hintze)`) — it is not
    // a wrapping caption boundary. Skip it.
    const before = text.substring(0, i)
    if (/[A-Z][A-Za-z0-9.'&\-/]+(?:\s+[A-Z][A-Za-z0-9.'&\-/]+)*\s+vs?\.?\s+[A-Z]/.test(before)) {
      continue
    }
    return i + 1
  }
  return -1
}

/**
 * Extract case name via backward search from citation core.
 * Looks for "v." pattern or procedural prefixes (In re, Ex parte, Matter of).
 *
 * @param cleanedText - Full cleaned text
 * @param coreStart - Position where citation core begins (volume start)
 * @param maxLookback - Maximum characters to search backward (default 150)
 * @param options - Optional original text + transformationMap to detect
 *   paragraph-break boundaries that the cleaner has collapsed (#221).
 * @returns Case name and start position, or undefined if not found
 *
 * @example
 * ```typescript
 * extractCaseName(text, 20, 150)
 * // Returns: { caseName: "Smith v. Jones", nameStart: 0 }
 * ```
 */
export function extractCaseName(
  cleanedText: string,
  coreStart: number,
  maxLookback = 150,
  options?: { originalText?: string; transformationMap?: TransformationMap },
):
  | {
      caseName: string
      nameStart: number
      /** Year captured from CSM year-first form (`In re K.F. (2009)`). */
      year?: number
      /** Clean-coordinate position of the year digits (excluding parens). */
      yearStart?: number
      /** Clean-coordinate position after the year digits. */
      yearEnd?: number
      /** Metadata recovered from a Louisiana docket-prefix paren that sits
       *  between the caption and the citation core (#232). Applied by the
       *  caller as fallback for `year` / `court` / `date` when the citation's
       *  own trailing paren is absent. */
      precedingDocketMeta?: {
        court: string
        year: number
        date: StructuredDate
      }
    }
  | undefined {
  const searchStart = Math.max(0, coreStart - maxLookback)
  let precedingText = cleanedText.substring(searchStart, coreStart)
  let adjustedSearchStart = searchStart

  // Split at last boundary to avoid crossing citation/sentence boundaries.
  // We check five boundary types:
  //   1. Citation boundary: digit-period-space (e.g., "10. " from a previous cite's page number)
  //   2. Id. boundary: "Id. " short-form citation marker (#182)
  //   3. Parenthetical signal boundary: "(quoting ", "(citing ", "(cited in " (#182)
  //   4. Sentence boundary: period/paren + space + uppercase, skipped when the
  //      word before the period is a legal abbreviation (Bluebook T6/T10/T7)
  //   5. Paragraph boundary: \n\s*\n in the original text, recovered via
  //      transformationMap because the cleaner collapses newlines to spaces (#221)
  let lastBoundaryIndex = -1
  let match: RegExpExecArray | null

  // Check paragraph boundaries via original text (#221).
  // The default cleaner pipeline replaces \n with space, so paragraph breaks
  // are invisible in cleanedText. Recover them from originalText by mapping
  // the search window back to original coordinates.
  if (options?.originalText && options.transformationMap) {
    const { originalText, transformationMap } = options
    const searchOriginalStart =
      transformationMap.cleanToOriginal.get(searchStart) ?? searchStart
    const coreOriginalStart =
      transformationMap.cleanToOriginal.get(coreStart) ?? coreStart
    if (coreOriginalStart > searchOriginalStart) {
      const originalWindow = originalText.substring(searchOriginalStart, coreOriginalStart)
      const paragraphBreakRegex = /\n[ \t\r]*\n/g
      let pMatch: RegExpExecArray | null
      while ((pMatch = paragraphBreakRegex.exec(originalWindow)) !== null) {
        const breakOriginalEnd = searchOriginalStart + pMatch.index + pMatch[0].length
        // Find the clean position immediately at/after the paragraph break.
        // The break itself collapses to a space; the next non-whitespace char
        // is the start of the new paragraph in cleanedText.
        let cleanPos: number | undefined
        for (let off = 0; off < 10; off++) {
          cleanPos = transformationMap.originalToClean.get(breakOriginalEnd + off)
          if (cleanPos !== undefined) break
        }
        if (cleanPos !== undefined && cleanPos >= searchStart && cleanPos <= coreStart) {
          const relIndex = cleanPos - searchStart
          if (relIndex > lastBoundaryIndex) {
            lastBoundaryIndex = relIndex
          }
        }
      }
    }
  }

  // Check citation boundaries (digit-period-space)
  CITATION_BOUNDARY_REGEX.lastIndex = 0
  while ((match = CITATION_BOUNDARY_REGEX.exec(precedingText)) !== null) {
    const boundaryEnd = match.index + match[0].length
    if (boundaryEnd > lastBoundaryIndex) {
      lastBoundaryIndex = boundaryEnd
    }
  }

  // Check Id. boundaries (#182)
  ID_BOUNDARY_REGEX.lastIndex = 0
  while ((match = ID_BOUNDARY_REGEX.exec(precedingText)) !== null) {
    const boundaryEnd = match.index + match[0].length
    if (boundaryEnd > lastBoundaryIndex) {
      lastBoundaryIndex = boundaryEnd
    }
  }

  // Check parenthetical signal boundaries (#182)
  PAREN_SIGNAL_BOUNDARY_REGEX.lastIndex = 0
  while ((match = PAREN_SIGNAL_BOUNDARY_REGEX.exec(precedingText)) !== null) {
    const boundaryEnd = match.index + match[0].length
    if (boundaryEnd > lastBoundaryIndex) {
      lastBoundaryIndex = boundaryEnd
    }
  }

  // Check prior-citation year-paren boundaries: `(YYYY), ` followed by an
  // optional list connector (`and`/`or`/`see`/`;`). Catches the gap left by
  // SENTENCE_BOUNDARY_REGEX when the next caption's first word is lowercase
  // (e.g., `(Del. 1984), and Rales v. Blasband` — `and` is lowercase so the
  // sentence regex skips it).
  PRIOR_YEAR_PAREN_BOUNDARY_REGEX.lastIndex = 0
  while ((match = PRIOR_YEAR_PAREN_BOUNDARY_REGEX.exec(precedingText)) !== null) {
    const boundaryEnd = match.index + match[0].length
    if (boundaryEnd > lastBoundaryIndex) {
      lastBoundaryIndex = boundaryEnd
    }
  }

  // Louisiana docket-prefix segments (#232) sit *between* the caption and
  // the trailing reporter citation: `Smith v. Jones, 07-393, p. 2 (La. App.
  // 3d Cir. 10/3/07), 966 So. 2d 1127`. Unlike sentence / Id. / paren-signal
  // boundaries, the segment is INTERIOR — stripping it from `precedingText`
  // preserves the caption to its left. Capture the docket paren's court +
  // date for metadata transfer onto the trailing reporter citation.
  let precedingDocketMeta:
    | { court: string; year: number; date: StructuredDate }
    | undefined
  LA_DOCKET_BOUNDARY_REGEX.lastIndex = 0
  const laDocketMatch = LA_DOCKET_BOUNDARY_REGEX.exec(precedingText)
  if (laDocketMatch) {
    const dateStr = laDocketMatch[3]
    const date = parseDate(dateStr)
    if (date) {
      precedingDocketMeta = {
        court: laDocketMatch[2].trim(),
        year: date.parsed.year,
        date,
      }
    }
    // Excise the docket segment, leaving just the trailing ", " so the
    // V_CASE_NAME_REGEX still sees a comma-terminated caption to its left.
    precedingText =
      precedingText.substring(0, laDocketMatch.index) +
      ", " +
      precedingText.substring(laDocketMatch.index + laDocketMatch[0].length)
  }

  // Check sentence boundaries: "). " or ". " followed by uppercase letter.
  // Skip when the period belongs to a legal abbreviation (comprehensive T6/T10/T7 check).
  SENTENCE_BOUNDARY_REGEX.lastIndex = 0
  while ((match = SENTENCE_BOUNDARY_REGEX.exec(precedingText)) !== null) {
    // Only check abbreviation for period boundaries, not close-paren boundaries
    if (
      precedingText[match.index] === "." &&
      isLikelyAbbreviationPeriod(precedingText, match.index)
    ) {
      continue
    }
    const boundaryEnd = match.index + match[0].length
    if (boundaryEnd > lastBoundaryIndex) {
      lastBoundaryIndex = boundaryEnd
    }
  }

  if (lastBoundaryIndex !== -1) {
    precedingText = precedingText.substring(lastBoundaryIndex)
    adjustedSearchStart = searchStart + lastBoundaryIndex
  }

  // Issue #509: When the citation core sits inside a sentence-internal
  // parenthetical that does NOT also contain the caption — i.e.,
  // `Name, (vol Reporter page)` — the precedingText ends with `, (` and the
  // V_CASE_NAME_REGEX never matches because it anchors on a trailing comma
  // or year-paren. Strip a trailing `(\s*$` so the caption (which lives
  // outside the paren) is reachable.
  //
  // This is safe relative to #512 (`(Name v. Name, vol Reporter page)`)
  // because the caption is INSIDE the wrapping paren in that case, so
  // precedingText ends with `, ` not `(`.
  precedingText = precedingText.replace(/\(\s*$/, "")

  // Issue #512: When the caption sits INSIDE the wrapping parenthetical
  // (`(Name v. Name, vol Reporter page)`), the backward scan must stop
  // at the wrapping paren's open `(`. Otherwise the V_CASE_NAME_REGEX
  // greedily absorbs the host sentence ahead of the `(` (which is allowed
  // by the regex's `[A-Za-z0-9\s.,'&()/-]` character class for all-caps
  // prose). This is the COMPLEMENT of the trailing-paren strip above.
  //
  // Detect the rightmost `(` whose contents contain a `v.`-style caption
  // shape (or procedural prefix) — that's the wrapping paren. Truncate
  // precedingText to start just after it so the regex sees only the
  // caption.
  const openParenStop = findCaptionWrapperParen(precedingText)
  if (openParenStop !== -1) {
    precedingText = precedingText.substring(openParenStop)
    adjustedSearchStart += openParenStop
  }

  // Priority 1: Standard "v." or "vs." format with comma before citation
  // Match party names with letters, numbers (for "Doe No. 2"), periods, apostrophes, ampersands, hyphens, slashes
  const vMatch = V_CASE_NAME_REGEX.exec(precedingText)
  if (vMatch) {
    // Check for semicolon in matched text (multi-citation separator)
    if (!vMatch[0].includes(";")) {
      let plaintiff = vMatch[1].trim()
      let trimOffset = 0

      // Validate plaintiff: real party names are capitalized words + legal connectors.
      // If the plaintiff contains lowercase non-connector words (e.g., "The court cited Smith"),
      // it captured sentence context. Trim from the left to the first valid party name start.
      //
      // The firstWordIsProperName guard preserves the original plaintiff when the
      // first word is a real party name and the lowercase content is an internal
      // qualifier ("Smith d/b/a Old Bob's Diner"). Without an internal-qualifier
      // marker, a capitalized first word alone is NOT enough to suppress trimming —
      // sentence-initial prepositions like "Under", "Pursuant", "Following" would
      // otherwise be preserved as if they were proper nouns (#223).
      if (!isLikelyPartyName(plaintiff)) {
        const words = plaintiff.split(/\s+/)
        const firstWord = words[0] ?? ""
        const firstWordClean = firstWord.toLowerCase().replace(/[.,']+$/, "")
        const firstWordIsProperName =
          /^[A-Z]/.test(firstWord) &&
          !PARTY_NAME_CONNECTORS.has(firstWordClean) &&
          !SENTENCE_INITIAL_WORDS.has(firstWordClean) &&
          INTERNAL_QUALIFIER_REGEX.test(plaintiff)
        if (!firstWordIsProperName) {
          // Check if the prefix starts with a signal word (See, See also, But see, etc.).
          // If so, keep it — extractPartyNames handles signal stripping downstream.
          const signalMatch = SIGNAL_STRIP_REGEX.exec(plaintiff)
          if (!signalMatch) {
            for (let i = 1; i < words.length; i++) {
              const candidate = words.slice(i).join(" ")
              if (/^[A-Z]/.test(candidate) && isLikelyPartyName(candidate)) {
                // Compute offset from word positions rather than indexOf,
                // which could match the wrong position if a word repeats.
                const prefix = words.slice(0, i).join(" ")
                trimOffset = prefix.length + 1
                plaintiff = candidate
                break
              }
            }
          }
        }
      }

      // Detect consolidated captions: vMatch[0] contains 2+ "v." anchors.
      // The non-greedy regex defendant (group 2) is anchored at the trailing
      // ",$" and so absorbs downstream comma-separated caption segments
      // including their own "v." anchors (#222). Recovery has two stages:
      //   1. Section-heading boundary first: if the defendant contains a
      //      standalone to-be verb (`Is`/`Are`/`Was`/`Were`), the backward
      //      search crossed a section heading. Real party names don't
      //      contain these verbs — truncate there. This must run BEFORE
      //      comma-trim because heading-boundary truncation preserves
      //      entity-suffix commas like `Anthem, Inc.`.
      //   2. Comma-trim: for consolidated captions without a heading verb,
      //      truncate the defendant at its first comma — but only when the
      //      text after the comma does NOT start with a corporate entity
      //      suffix (`Inc.`, `LLC`, `Corp.`, etc.), which are part of the
      //      defendant name itself.
      const vAnchorMatches = vMatch[0].match(/\bv(?:s)?\.\s/g)
      let defendantText = vMatch[2].trim()
      if (vAnchorMatches && vAnchorMatches.length >= 2) {
        // Heading-verb boundary first.
        const headingVerbMatch = /\s(?:Is|Are|Was|Were)\s/.exec(defendantText)
        if (headingVerbMatch) {
          defendantText = defendantText.substring(0, headingVerbMatch.index).trim()
        } else {
          // Fall back to comma-trim, skipping entity-suffix commas.
          let scanFrom = 0
          while (scanFrom < vMatch[2].length) {
            const commaIdx = vMatch[2].indexOf(",", scanFrom)
            if (commaIdx === -1) break
            const after = vMatch[2].substring(commaIdx + 1).trimStart()
            if (
              /^(?:Inc|LLC|Corp|Ltd|Co|LLP|LP|P\.?C|N\.?A|S\.?A|GmbH|S\.?p\.?A)\.?(?:\b|$)/.test(
                after,
              )
            ) {
              // Entity-suffix comma — skip and keep scanning.
              scanFrom = commaIdx + 1
              continue
            }
            defendantText = vMatch[2].substring(0, commaIdx).trim()
            break
          }
        }
      }

      // Preserve the source's `v` punctuation form in `caseName`. New York
      // courts use `v` (no period); federal/most state courts use `v.`. The
      // existing V_CASE_NAME_REGEX accepts both via `v(?:s)?\.?` — extract
      // whichever form actually appears in the matched text so the
      // assembled caseName is faithful to the source. #326
      const sepMatch = /\bvs?\.?(?=\s)/.exec(vMatch[0])
      const sep = sepMatch?.[0] ?? "v."

      const caseName = `${plaintiff} ${sep} ${defendantText}`
      const nameStart = adjustedSearchStart + vMatch.index + trimOffset
      // vMatch[3] = optional court text from the CSM year-first paren
      // (`Smith v. Jones (2d Cir. 2005)` — #293); vMatch[4] = the year
      // (`Smith v. Jones (1990)` — #19). Bluebook form leaves both undefined.
      // vMatch.indices[4] (enabled by `d` flag) gives the year position;
      // translate to cleanedText coordinates.
      const courtFromCsm = vMatch[3]?.trim()
      // Plausibility filter (#523): drop OCR-mangled or page-number years
      // (e.g., `1372`, `3021`) before they propagate through CSM meta.
      const rawYear = vMatch[4] ? Number.parseInt(vMatch[4], 10) : undefined
      const year = rawYear !== undefined && isPlausibleYear(rawYear) ? rawYear : undefined
      let yearStart: number | undefined
      let yearEnd: number | undefined
      if (year !== undefined && vMatch.indices?.[4]) {
        yearStart = adjustedSearchStart + vMatch.indices[4][0]
        yearEnd = adjustedSearchStart + vMatch.indices[4][1]
      }
      // CSM `(court year)` form (#293): synthesize a precedingDocketMeta so
      // the existing consumer at extractCase line ~2502 propagates court,
      // year, and date onto the citation. Skip when only year is present
      // (year-only handled by the dedicated `year`/`yearStart`/`yearEnd`
      // fields above).
      let csmDocketMeta = precedingDocketMeta
      if (!csmDocketMeta && courtFromCsm && year !== undefined && vMatch[4]) {
        csmDocketMeta = {
          court: courtFromCsm,
          year,
          date: { iso: vMatch[4], parsed: { year } },
        }
      }
      return {
        caseName,
        nameStart,
        year,
        yearStart,
        yearEnd,
        precedingDocketMeta: csmDocketMeta,
      }
    }
  }

  // Priority 2: Procedural prefixes (including Estate of, In the Matter of)
  const procMatch = PROCEDURAL_PREFIX_REGEX.exec(precedingText)
  if (procMatch) {
    // Check for semicolon in matched text (multi-citation separator)
    if (!procMatch[0].includes(";")) {
      const caseName = `${procMatch[1]} ${procMatch[2].trim()}`
      const nameStart = adjustedSearchStart + procMatch.index
      // procMatch[3] = optional court text from the CSM year-first paren
      // (`In re Cellphone (9th Cir. 2014)` — #293); procMatch[4] = the year
      // (`In re K.F. (2009)` — #19). Bluebook form leaves both undefined.
      const courtFromCsm = procMatch[3]?.trim()
      // Plausibility filter (#523).
      const rawYear = procMatch[4] ? Number.parseInt(procMatch[4], 10) : undefined
      const year = rawYear !== undefined && isPlausibleYear(rawYear) ? rawYear : undefined
      let yearStart: number | undefined
      let yearEnd: number | undefined
      if (year !== undefined && procMatch.indices?.[4]) {
        yearStart = adjustedSearchStart + procMatch.indices[4][0]
        yearEnd = adjustedSearchStart + procMatch.indices[4][1]
      }
      let csmDocketMeta = precedingDocketMeta
      if (!csmDocketMeta && courtFromCsm && year !== undefined && procMatch[4]) {
        csmDocketMeta = {
          court: courtFromCsm,
          year,
          date: { iso: procMatch[4], parsed: { year } },
        }
      }
      return {
        caseName,
        nameStart,
        year,
        yearStart,
        yearEnd,
        precedingDocketMeta: csmDocketMeta,
      }
    }
  }

  // Priority 3: Generic single-party caption (#193).
  //
  // V. and procedural-prefix scans failed. The precedingText is already
  // bounded by sentence/citation/paren-signal boundaries, so whatever
  // remains — typically a capitalized-words-only caption ending at ", " —
  // is the caption candidate. Strip any leading signal word (See, cf., etc.)
  // and validate via isLikelyPartyName to filter out sentence prose.
  //
  // Handles single-party corporate captions like "Board of Mgrs. of X",
  // "Board of Directors of X", and unrecognized organizational prefixes
  // that don't fit PROCEDURAL_PREFIX_REGEX.
  const commaStrippedBody = precedingText.replace(/,\s*$/, "")
  const leadingWsLen = commaStrippedBody.length - commaStrippedBody.trimStart().length
  let captionBody = commaStrippedBody.substring(leadingWsLen)
  let signalStripLen = 0
  const sigStripMatch = SIGNAL_STRIP_REGEX.exec(captionBody)
  if (sigStripMatch) {
    signalStripLen = sigStripMatch[0].length
    captionBody = captionBody.substring(signalStripLen)
  }
  const caption = captionBody.trim()

  if (caption.length > 0 && isLikelyPartyName(caption)) {
    const firstWord = caption.split(/\s+/)[0] ?? ""
    const firstWordClean = firstWord.toLowerCase().replace(/[.,']+$/, "")
    if (!SENTENCE_INITIAL_WORDS.has(firstWordClean)) {
      // Skip multi-citation strings (joined by semicolons)
      if (!caption.includes(";")) {
        // Reject literal short-form citation markers as captions (#517).
        // When the tokenizer can't match a token like `Id., 584 N.Y.S.2d 744`
        // (older parallel-reporter Id. form not handled by ID_PATTERN), the
        // backward scan picks up the bare `Id.` token as a single-party
        // caption. `Id.` / `Ibid.` are never legitimate party names.
        if (!isShortFormMarker(caption)) {
          const nameStart = adjustedSearchStart + leadingWsLen + signalStripLen
          return { caseName: caption, nameStart, precedingDocketMeta }
        }
      }
    }
  }

  return undefined
}

/**
 * Returns true when `caption` is a literal short-form citation marker
 * (Id., Ibid., supra) rather than a real party name (#517). Comparison
 * is case-insensitive and tolerates a trailing period.
 */
function isShortFormMarker(caption: string): boolean {
  const normalized = caption.trim().toLowerCase().replace(/\.$/, "")
  return normalized === "id" || normalized === "ibid" || normalized === "supra"
}

/** A raw parenthetical block extracted from text */
interface RawParenthetical {
  /** Content between the parentheses (excluding parens themselves) */
  text: string
  /** Position of opening '(' in the text */
  start: number
  /** Position after closing ')' in the text (exclusive) */
  end: number
}

/** A subsequent history signal found between parenthetical groups */
interface RawSignal {
  /** Raw signal text (e.g., "aff'd", "cert. denied") */
  text: string
  /** Normalized signal classification */
  normalized: HistorySignal
  /** Position of signal start in the text */
  start: number
  /** Position after signal end (exclusive) */
  end: number
}

/** Result of collecting parentheticals with signal awareness */
interface CollectedParentheticals {
  /** All parenthetical blocks in order */
  parens: RawParenthetical[]
  /** Signals found between groups, each paired with the index of the next paren */
  signals: Array<{ signal: RawSignal; nextParenIndex: number }>
}

/**
 * Hard safety ceiling on how far the paren depth-tracker scans past
 * `maxLookahead` when chasing a matching close paren that lives beyond the
 * window. 10,000 chars is well past anything legal text produces (the
 * longest explanatory parentheticals in modern caselaw run ~1500 chars).
 * The scanner exits the moment depth returns to 0, so the ceiling is only
 * touched on pathological inputs (unclosed parens). See #528.
 */
const PAREN_CLOSE_HARD_CEILING = 10000

/**
 * Collect all top-level parenthetical blocks starting from a position.
 * Uses depth tracking to handle nested parens. Continues scanning through
 * chained parentheticals and subsequent history signals.
 *
 * @param text - Full text to scan
 * @param startPos - Position to start scanning (typically after citation core)
 * @param maxLookahead - Soft cap on how far the scanner looks for a NEW
 *   parenthetical or signal (default 2000 chars — comfortably larger than
 *   the worst-case modern explanatory paren and any trailing history
 *   clause). The pre-#528 default was 500, which silently dropped any
 *   explanatory paren whose closing `)` fell past the limit AND any history
 *   clause that followed it.
 *
 *   Once an opening `(` is found inside the window, the depth-tracking loop
 *   chases the matching `)` up to `PAREN_CLOSE_HARD_CEILING` chars from the
 *   citation, so a paren whose body overflows `maxLookahead` is still
 *   captured intact. Linear walk + early termination keeps the perf cost
 *   bounded.
 * @returns Collected parentheticals with associated signals
 */
function collectParentheticals(
  text: string,
  startPos: number,
  maxLookahead = 2000,
): CollectedParentheticals {
  const parens: RawParenthetical[] = []
  const signals: CollectedParentheticals["signals"] = []
  let pos = startPos
  const endLimit = Math.min(text.length, startPos + maxLookahead)
  // Hard ceiling for the inner depth-tracking loop. Allows a paren whose
  // closing `)` lives outside `endLimit` to still be captured intact (#528).
  const hardEndLimit = Math.min(text.length, startPos + PAREN_CLOSE_HARD_CEILING)
  let pendingSignal: RawSignal | undefined

  // Skip past any pincite text between core citation and parentheticals.
  // E.g., ", 199 n.2" in "982 N.W.2d 189, 199 n.2 (Minn. 2022)".
  // This must happen before the main loop because pincite text includes
  // commas and digits that would otherwise block the scanner.
  const pinciteText = text.substring(pos, endLimit)
  const pinciteSkip = PINCITE_SKIP_REGEX.exec(pinciteText)
  if (pinciteSkip) {
    pos += pinciteSkip[0].length
  }

  while (pos < endLimit) {
    // Skip whitespace and commas between parentheticals
    while (pos < endLimit && PAREN_SKIP_REGEX.test(text[pos])) {
      pos++
    }

    if (pos >= endLimit || text[pos] !== "(") {
      // Check for subsequent history signal before giving up.
      // Normalize in-place to avoid a second SIGNAL_TABLE scan later.
      const remainingText = text.substring(pos, endLimit)
      const normalized = normalizeSignal(remainingText)
      if (normalized) {
        // Multi-stage chain (e.g., "review granted, opinion vacated"): if a
        // prior signal is still pending with no following paren, flush it
        // before overwriting. Without this, only the last link of a chain
        // survives. (#238)
        if (pendingSignal) {
          signals.push({ signal: pendingSignal, nextParenIndex: -1 })
        }
        pendingSignal = {
          text: remainingText.substring(0, normalized.matchLength).replace(/\s+$/, ""),
          normalized: normalized.signal,
          start: pos,
          end: pos + normalized.matchLength,
        }
        pos += normalized.matchLength
        continue
      }
      break
    }

    // Found opening paren — track depth to find matching close.
    // Allow the inner loop to run up to `hardEndLimit` so a paren whose
    // body overflows the soft `maxLookahead` is still captured intact.
    const parenStart = pos
    let depth = 0
    const contentStart = pos + 1

    while (pos < hardEndLimit) {
      const char = text[pos]
      if (char === "(") {
        depth++
      } else if (char === ")") {
        depth--
        if (depth === 0) {
          pos++ // move past closing paren
          const content = text.substring(contentStart, pos - 1).trim()
          if (content.length > 0) {
            parens.push({ text: content, start: parenStart, end: pos })
            // If there was a pending signal, associate it with this paren
            if (pendingSignal) {
              signals.push({ signal: pendingSignal, nextParenIndex: parens.length - 1 })
              pendingSignal = undefined
            }
          }
          break
        }
      }
      pos++
    }

    // If we never closed the paren, stop
    if (depth > 0) break
  }

  // Handle trailing signal with no following paren
  if (pendingSignal) {
    signals.push({ signal: pendingSignal, nextParenIndex: -1 })
  }

  return { parens, signals }
}

/**
 * Parse parenthetical content to extract court, year, date, and disposition.
 * Unified parser replacing the old year-only logic.
 *
 * @param content - Parenthetical content (without the parens themselves)
 * @returns Structured parenthetical data
 *
 * @example
 * ```typescript
 * parseParenthetical("9th Cir. 2020")
 * // Returns: { court: "9th Cir.", year: 2020, date: { iso: "2020", parsed: { year: 2020 } } }
 *
 * parseParenthetical("2d Cir. Jan. 15, 2020")
 * // Returns: { court: "2d Cir.", year: 2020, date: { iso: "2020-01-15", parsed: { year: 2020, month: 1, day: 15 } } }
 *
 * parseParenthetical("en banc")
 * // Returns: { disposition: "en banc" }
 * ```
 */
export function parseParenthetical(content: string): {
  court?: string
  year?: number
  date?: StructuredDate
  disposition?: string
  /** Surname(s) of justice(s) attributed to a justice-attribution paren (#235) */
  justices?: string[]
  /** Scope qualifier for a justice-attribution paren (#235): in_judgment | in_part | from_denial */
  scope?: string
  /** Texas Greenbook writ/petition history clause inside the parenthetical (#229) */
  internalHistory?: { signal: HistorySignal; rawSignal: string; start: number; end: number }
  courtStart?: number
  courtEnd?: number
  yearStart?: number
  yearEnd?: number
} {
  const result: {
    court?: string
    year?: number
    date?: StructuredDate
    disposition?: string
    justices?: string[]
    scope?: string
    internalHistory?: {
      signal: HistorySignal
      rawSignal: string
      start: number
      end: number
    }
    courtStart?: number
    courtEnd?: number
    yearStart?: number
    yearEnd?: number
  } = {}

  // Parse structured date using dates.ts
  const dateResult = parseDate(content)
  if (dateResult) {
    result.date = dateResult
    result.year = dateResult.parsed.year
  }

  // Texas writ/pet history: detect trailing ",\s*<signal>" clause after year
  // (e.g., "Tex. App.—Dallas 2010, writ ref'd n.r.e."). Strip the clause from
  // the working content so stripDateFromCourt sees the conventional shape.
  let workingContent = content
  if (result.year) {
    const yearStr = String(result.year)
    const yearIdx = content.lastIndexOf(yearStr)
    if (yearIdx !== -1) {
      const afterYearStart = yearIdx + yearStr.length
      const afterYear = content.substring(afterYearStart)
      const trailing = /^\s*,\s*(.+?)\s*$/.exec(afterYear)
      if (trailing) {
        const sigText = trailing[1]
        const normalized = normalizeSignal(sigText)
        if (normalized) {
          const rawSignal = sigText.substring(0, normalized.matchLength)
          // Compute the absolute offset of the signal text within the content.
          const sigOffset = content.indexOf(rawSignal, afterYearStart)
          result.internalHistory = {
            signal: normalized.signal,
            rawSignal,
            start: sigOffset !== -1 ? sigOffset : afterYearStart,
            end:
              (sigOffset !== -1 ? sigOffset : afterYearStart) + rawSignal.length,
          }
          workingContent = content.substring(0, afterYearStart)
        }
      }
    }
  }

  // Extract court (strips date components) — runs on workingContent so the
  // Texas trailing-history clause does not interfere with date-end detection.
  const courtResult = stripDateFromCourt(workingContent)
  if (courtResult) {
    result.court = courtResult
    const courtIdx = content.indexOf(courtResult)
    if (courtIdx !== -1) {
      result.courtStart = courtIdx
      result.courtEnd = courtIdx + courtResult.length
    }
  }

  // Year offset within parenthetical content
  if (result.year) {
    const yearStr = String(result.year)
    const yearIdx = content.lastIndexOf(yearStr)
    if (yearIdx !== -1) {
      result.yearStart = yearIdx
      result.yearEnd = yearIdx + yearStr.length
    }
  }

  // Justice-attribution parenthetical (#235). Detected BEFORE the bare
  // en banc / per curiam check so a parenthetical like
  // `Cabranes, J., dissenting from denial of rehearing en banc` doesn't
  // false-positive on the trailing `en banc` substring.
  //
  // Pattern: <Surname>(, <Surname>)*(?:,? and <Surname>)?,? (C\.J\.|J\.|JJ\.),? <role>
  const justiceMatch = /^(?<surnames>[A-Z][a-z]+(?:(?:,\s+|\s+and\s+)[A-Z][a-z]+)*)\s*,?\s*(?<title>C\.J\.|J\.|JJ\.)\s*,?\s*(?<role>.+)$/.exec(
    content.trim(),
  )
  if (justiceMatch?.groups) {
    const surnameText = justiceMatch.groups.surnames
    const roleText = justiceMatch.groups.role.trim().replace(/[.,]+$/, "")
    const justices = surnameText
      .split(/(?:,\s+and\s+|,\s+|\s+and\s+)/)
      .map((s) => s.trim())
      .filter(Boolean)
    result.justices = justices

    // Classify the role into a disposition + optional scope.
    const lower = roleText.toLowerCase()
    if (/^concurring\s+in\s+part\s+and\s+dissenting\s+in\s+part/.test(lower)) {
      result.disposition = "mixed"
      result.scope = "in_part"
    } else if (/^concurring\s+in\s+the\s+judgment/.test(lower)) {
      result.disposition = "concurrence"
      result.scope = "in_judgment"
    } else if (/^concurring\s+in\s+part/.test(lower)) {
      result.disposition = "concurrence"
      result.scope = "in_part"
    } else if (/^dissenting\s+in\s+part/.test(lower)) {
      result.disposition = "dissent"
      result.scope = "in_part"
    } else if (/^dissenting\s+from\s+denial\s+of/.test(lower)) {
      result.disposition = "dissent"
      result.scope = "from_denial"
    } else if (/^concurring/.test(lower)) {
      result.disposition = "concurrence"
    } else if (/^dissenting/.test(lower)) {
      result.disposition = "dissent"
    } else if (/^joining/.test(lower)) {
      result.disposition = "majority"
    }
    return result
  }

  // Non-justice disposition parens (#235): plurality opinion, mem.,
  // unpublished table decision. Checked before en banc/per curiam.
  if (/^plurality\s+opinion\b/i.test(content.trim())) {
    result.disposition = "plurality opinion"
    clearCourtIfDisposition(result, "plurality opinion")
    return result
  }
  if (/^mem\.\s*$/i.test(content.trim())) {
    result.disposition = "mem."
    clearCourtIfDisposition(result, "mem.")
    return result
  }
  if (/^unpublished\s+table\s+decision\b/i.test(content.trim())) {
    result.disposition = "unpublished table decision"
    clearCourtIfDisposition(result, "unpublished table decision")
    return result
  }

  // Check for disposition (en banc / in bank / per curiam). Anchored at
  // content end (\s*$) so a parenthetical like `Cabranes, J., dissenting from
  // denial of rehearing en banc` — caught above by the justice-attribution
  // branch — does not also trip the en-banc check via substring match (#235).
  // `(in bank)` is the California Supreme Court's equivalent of `(en banc)`
  // — added as a separate disposition value to preserve the CA distinction.
  if (/\ben banc\b\s*$/i.test(content.trim())) {
    result.disposition = "en banc"
    clearCourtIfDisposition(result, "en banc")
  } else if (/\bin bank\b\s*$/i.test(content.trim())) {
    result.disposition = "in bank"
    clearCourtIfDisposition(result, "in bank")
  } else if (/\bper curiam\b\s*$/i.test(content.trim())) {
    result.disposition = "per curiam"
    clearCourtIfDisposition(result, "per curiam")
  }

  return result
}

/**
 * Strip a disposition phrase from `result.court` when the court field is *only*
 * the disposition text (e.g., `(per curiam)` content yields
 * `court="per curiam"` from `stripDateFromCourt`, since it returns any
 * letter-bearing string after stripping date components). Disposition is
 * orthogonal to court — keeping both with the same value lets the disposition
 * leak into the court field downstream, overriding reporter-based inference
 * (e.g., SCOTUS for `455 U.S. 478 (1982) (per curiam)`). See #529.
 *
 * If court contains additional non-disposition text (e.g., `9th Cir. (en banc)`
 * — pathological but theoretically possible), preserve it.
 */
function clearCourtIfDisposition(
  result: { court?: string; courtStart?: number; courtEnd?: number },
  disposition: string,
): void {
  if (!result.court) return
  const normalized = result.court.trim().toLowerCase()
  if (normalized === disposition.toLowerCase()) {
    result.court = undefined
    result.courtStart = undefined
    result.courtEnd = undefined
  }
}

/**
 * Classify a raw parenthetical block as metadata or explanatory.
 *
 * @param raw - Raw parenthetical text (content between parens)
 * @returns Classification result with kind discriminator
 */
function classifyParenthetical(raw: string):
  | {
      kind: "metadata"
      court?: string
      year?: number
      date?: StructuredDate
      disposition?: string
      justices?: string[]
      scope?: string
    }
  | {
      kind: "explanatory"
      text: string
      type: ParentheticalType
    } {
  // Check for signal word first — signal-word parens are always explanatory
  const leadingMatch = LEADING_WORD_REGEX.exec(raw)
  if (leadingMatch) {
    const candidate = leadingMatch[1].toLowerCase()
    if (isSignalWord(candidate)) {
      return { kind: "explanatory", text: raw, type: candidate }
    }
  }

  // Non-metadata shape (nested year paren, unbalanced, etc.) — classify as
  // explanatory `other` so it never feeds `parseParenthetical`. See #522.
  if (isNonMetadataParenContent(raw)) {
    return { kind: "explanatory", text: raw, type: "other" }
  }

  // Try metadata parse: court, year, date, disposition
  // Note: "other"-type parens with embedded years (e.g., "the court, in 2019, held X")
  // will be classified as metadata. This is a known limitation — most explanatory
  // parentheticals start with a signal word and are handled above.
  // Note: meta.court alone is insufficient — stripDateFromCourt returns any
  // text with letters as a "court", so a standalone court-only second paren
  // like "(9th Cir.)" will fall through to "other". This is acceptable since
  // court-only parens without year/date are extremely rare in legal text.
  const meta = parseParenthetical(raw)
  if (meta.year || meta.date || meta.disposition || meta.justices) {
    return { kind: "metadata", ...meta }
  }

  // No signal word and no metadata — classify as "other" explanatory
  return { kind: "explanatory", text: raw, type: "other" }
}

/**
 * Normalize party name for matching by removing legal noise.
 * Normalization pipeline:
 * 1. Strip "et al." (case-insensitive)
 * 2. Strip slash-aliases "d/b/a", "f/k/a", "n/k/a", "a/k/a" and everything after
 * 3. Strip "aka" and everything after (case-insensitive, word boundary)
 * 4. Strip trailing corporate suffixes (Inc., LLC, Corp., Ltd., Co., LLP, LP, P.C.) - iterative
 * 5. Strip leading articles (The, A, An)
 * 6. Normalize whitespace
 * 7. Trim and lowercase
 *
 * @param name - Raw party name
 * @returns Normalized party name
 *
 * @example
 * ```typescript
 * normalizePartyName("The Smith Corp., Inc.") // "smith"
 * normalizePartyName("Doe et al.") // "doe"
 * normalizePartyName("United States") // "united states" (not stripped)
 * ```
 */
function normalizePartyName(name: string): string {
  let normalized = name

  // Strip "et al." (with or without period, case-insensitive)
  normalized = normalized.replace(/\bet\s+al\.?/gi, "")

  // Strip slash-alias variants ("d/b/a", "f/k/a", "n/k/a", "a/k/a") and
  // everything after them. Matches the slash forms produced by Bluebook-style
  // captions; the non-slash "aka" form is handled below (#240).
  normalized = normalized.replace(/\s+(?:d\/b\/a|[fna]\/k\/a)\b.*/gi, "")

  // Strip "aka" and everything after it (case-insensitive, word boundary)
  normalized = normalized.replace(/\s+aka\b.*/gi, "")

  // Strip trailing corporate suffixes (with or without trailing period, handle comma)
  // Repeat to handle multiple suffixes like "Corp., Inc."
  let prev = ""
  while (prev !== normalized) {
    prev = normalized
    normalized = normalized.replace(/,?\s*(Inc|LLC|Corp|Ltd|Co|LLP|LP|P\.C)\.?$/gi, "")
  }

  // Strip leading articles (only at start)
  normalized = normalized.replace(/^(The|A|An)\s+/i, "")

  // Normalize whitespace (collapse multiple spaces)
  normalized = normalized.replace(/\s+/g, " ")

  // Trim and lowercase
  return normalized.trim().toLowerCase()
}

/**
 * Extract plaintiff and defendant party names from case name.
 * Handles adversarial cases (v.) and procedural prefixes (In re, Ex parte, etc.).
 *
 * @param caseName - Case name string
 * @returns Party name data with raw and normalized fields
 *
 * @example
 * ```typescript
 * extractPartyNames("Smith v. Jones")
 * // Returns: { plaintiff: "Smith", plaintiffNormalized: "smith", defendant: "Jones", defendantNormalized: "jones" }
 *
 * extractPartyNames("In re Smith")
 * // Returns: { plaintiff: "In re Smith", plaintiffNormalized: "smith", proceduralPrefix: "In re" }
 *
 * extractPartyNames("People v. Smith")
 * // Returns: { plaintiff: "People", plaintiffNormalized: "people", defendant: "Smith", defendantNormalized: "smith" }
 * ```
 */
export function extractPartyNames(caseName: string): {
  plaintiff?: string
  plaintiffNormalized?: string
  defendant?: string
  defendantNormalized?: string
  proceduralPrefix?: string
  signal?: CitationSignal
  /** Bankruptcy adversary admin parenthetical (#241), e.g., "In re Hintze". */
  adminParenthetical?: string
} {
  let signal: CitationSignal | undefined
  // Procedural prefix patterns (anchored to start, case-insensitive).
  // Longer prefixes first so the for-loop's `prefixRegex.exec(caseName)` finds
  // the most specific match. Six 2026-05-11 cross-domain research dispatches
  // (family, probate, bankruptcy, immigration, criminal/habeas, ex rel./qui tam)
  // identified the additions; corpus-sourced examples live in
  // `docs/research/2026-05-11-procedural-prefixes-*.md`.
  const proceduralPrefixes = [
    // "In the Matter of the X of" cluster — must precede "In the Matter of"
    "In the Matter of the Liquidation of",
    "In the Matter of the Rehabilitation of",
    "In the Matter of the Receivership of",
    "In the Matter of the Extradition of",
    "In the Matter of the Application of",
    "In the Matter of the Welfare of",
    "In the Matter of",
    // "In re X of" cluster — must precede "In re"
    "In re Petition for Naturalization of",
    "In re Termination of Parental Rights as to",
    "In re Termination of Parental Rights to",
    "In re Termination of Parental Rights of",
    "In re Marriage of",
    "In re Liquidation of",
    "In re Rehabilitation of",
    "In re Receivership of",
    "In re Naturalization of",
    "In re Extradition of",
    "In re Application of",
    "In re Welfare of",
    "In re Dependency of",
    "In re Paternity of",
    "In re Parentage of",
    // CA Tier 1 — In re precision upgrades for conservatorship/guardianship/adoption
    "In re Conservatorship of",
    "In re Guardianship of",
    "In re Adoption of",
    "In the Interest of",
    "In re",
    "Ex parte",
    // "Matter of X of" cluster — must precede "Matter of"
    "Matter of Liquidation of",
    "Matter of Rehabilitation of",
    "Matter of",
    // Sovereign ex rel. — long forms precede short forms
    "Commonwealth of Puerto Rico ex rel.",
    "Government of the Virgin Islands ex rel.",
    "Commonwealth ex rel.",
    "State ex rel.",
    "United States ex rel.",
    "People ex rel.",
    "District of Columbia ex rel.",
    // Petition variants — "Petition for Naturalization of" precedes "Petition of"
    "Petition for Naturalization of",
    "Application of",
    "On Petition of",
    "Petition of",
    // Other "X of" forms
    "Adoption of",
    // CA Tier 1 — Conservatorship extended forms must precede bare "Conservatorship of"
    "Conservatorship of the Person and Estate of",
    "Conservatorship of the Person of",
    "Conservatorship of the Estate of",
    "Conservatorship of",
    "Guardianship of",
    "Estate of",
    // Bare forms with no "In re" prefix (no alternation-ordering collisions)
    "Care and Protection of",
    "Succession of",
    // CA Tier 1 — agency / discipline procedural prefixes (2026-05-11)
    "Inquiry Concerning Judge",
    "Appeal of",
  ]

  // Check for procedural prefix first
  for (const prefix of proceduralPrefixes) {
    const prefixRegex = new RegExp(`^(${prefix})\\s+(.+)$`, "i")
    const match = prefixRegex.exec(caseName)
    if (match) {
      const matchedPrefix = match[1]
      const subject = match[2]

      // Check if there's a "v." after the prefix (adversarial case)
      if (/\s+vs?\.?\s+/i.test(subject)) {
        // Adversarial case with procedural-looking plaintiff (e.g., "Estate of X v. Y")
        // Split on "v."
        const vMatch = /^(.+?)\s+vs?\.?\s+(.+)$/i.exec(caseName)
        if (vMatch) {
          const plaintiff = vMatch[1].trim()
          const defendant = vMatch[2].trim()
          return {
            plaintiff,
            plaintiffNormalized: normalizePartyName(plaintiff),
            defendant,
            defendantNormalized: normalizePartyName(defendant),
          }
        }
      } else {
        // Pure procedural (no "v.")
        return {
          plaintiff: caseName,
          plaintiffNormalized: normalizePartyName(subject),
          proceduralPrefix: matchedPrefix,
        }
      }
    }
  }

  // Split on "v." for adversarial cases
  const vRegex = /^(.+?)\s+vs?\.?\s+(.+)$/i
  const vMatch = vRegex.exec(caseName)
  if (vMatch) {
    let plaintiff = vMatch[1].trim()
    let defendant = vMatch[2].trim()

    // Bankruptcy adversary admin parenthetical (#241): trailing
    // `(In re <Debtor>)` immediately after the defendant identifies the
    // underlying bankruptcy debtor. Strip from defendant; expose separately
    // via `adminParenthetical`. The leading "In re" anchor distinguishes the
    // adversary admin form from explanatory parens which appear *after* the
    // citation core, not inside the case name.
    let adminParenthetical: string | undefined
    const adminMatch = /\s*\(\s*(In\s+re\s+[^)]+?)\s*\)\s*$/i.exec(defendant)
    if (adminMatch) {
      adminParenthetical = adminMatch[1]
      defendant = defendant.substring(0, adminMatch.index).trim()
    }

    // Strip signal words from plaintiff (e.g., "See Jones" → "Jones")
    // Uses SIGNAL_STRIP_REGEX derived from VALID_SIGNALS for single source of truth.
    // Also strips "Also" and "In" (not valid signals) that can precede party names.
    const signalMatch =
      plaintiff.match(SIGNAL_STRIP_REGEX) ?? plaintiff.match(/^(Also|In(?!\s+re\b))\s+/i)
    if (signalMatch) {
      // Guard against false-positive signal capture from over-greedy
      // case-name extraction (#304). When the V_CASE_NAME_REGEX captures
      // sentence prose like `Contra plaintiff's argument, Bolling v. Sharpe`,
      // the leading `Contra` looks like a Bluebook signal — but the next
      // token is lowercase prose, not a capitalized party name. Only strip
      // the signal when the remainder after stripping starts with a capital
      // letter (real case-name context) so we don't manufacture phantom
      // signals from sentence-internal English.
      const remainderAfterStrip = plaintiff.substring(signalMatch[0].length).trimStart()
      const firstChar = remainderAfterStrip[0] ?? ""
      const remainderIsCaseNameLike = firstChar >= "A" && firstChar <= "Z"
      if (remainderIsCaseNameLike) {
        const lowered = signalMatch[1].toLowerCase()
        // Combined `, e.g.` signals end with a period that is part of the canonical
        // form (e.g., "see, e.g."); strip the trailing period only if the lowered
        // form isn't itself a valid signal (handles "Cf." → "cf" without breaking
        // "see, e.g." → "see, e.g.").
        if (VALID_SIGNALS.has(lowered)) {
          signal = lowered as CitationSignal
        } else {
          const stripped = lowered.replace(/\.$/, "")
          if (VALID_SIGNALS.has(stripped)) {
            signal = stripped as CitationSignal
          }
        }
        plaintiff = plaintiff.substring(signalMatch[0].length).trim()
      }
    }

    return {
      plaintiff: plaintiff || vMatch[1].trim(), // Fallback to original if strip leaves nothing
      plaintiffNormalized: normalizePartyName(plaintiff || vMatch[1].trim()),
      defendant,
      defendantNormalized: normalizePartyName(defendant),
      signal,
      ...(adminParenthetical ? { adminParenthetical } : {}),
    }
  }

  // No "v." and no procedural prefix - no parties extracted
  return {}
}

/**
 * Extracts case citation metadata from a tokenized citation.
 *
 * Parses token text to extract:
 * - Volume: Leading digits (e.g., "500" from "500 F.2d 123")
 * - Reporter: Alphabetic abbreviation (e.g., "F.2d")
 * - Page: Trailing digits after reporter (e.g., "123")
 * - Pincite: Optional page reference after comma (e.g., ", 125")
 * - Court: Optional court abbreviation in parentheses (e.g., "(9th Cir.)")
 * - Year: Optional year in parentheses (e.g., "(2020)")
 *
 * Confidence scoring:
 * - Base: 0.5
 * - Common reporter pattern (F., U.S., etc.): +0.3
 * - Valid year (not future): +0.2
 * - Capped at 1.0
 *
 * Position translation:
 * - Uses TransformationMap to convert clean positions → original positions
 * - cleanStart/cleanEnd from token span
 * - originalStart/originalEnd via transformationMap.cleanToOriginal
 *
 * Note: This function does NOT validate against reporters-db. That happens
 * in Phase 3 (resolution layer). Phase 2 extraction only parses structure.
 *
 * @param token - Token from tokenizer containing matched text and clean positions
 * @param transformationMap - Position mapping from clean → original text
 * @returns FullCaseCitation with parsed metadata and translated positions
 *
 * @example
 * ```typescript
 * const token = {
 *   text: "500 F.2d 123, 125",
 *   span: { cleanStart: 10, cleanEnd: 27 },
 *   type: "case",
 *   patternId: "federal-reporter"
 * }
 * const citation = extractCase(token, transformationMap)
 * // citation = {
 * //   type: "case",
 * //   text: "500 F.2d 123, 125",
 * //   volume: 500,
 * //   reporter: "F.2d",
 * //   page: 123,
 * //   pincite: 125,
 * //   span: { cleanStart: 10, cleanEnd: 27, originalStart: 10, originalEnd: 27 },
 * //   confidence: 0.8,
 * //   ...
 * // }
 * ```
 */
export function extractCase(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
  originalText?: string,
  /** Clean-coordinate spans of sibling tokens. Used to:
   *  - bound the case-name backward walk so a parallel cite's caption is
   *    not absorbed into this cite's caseName,
   *  - skip past a contiguous parallel-cite chain (`, 198 A. 154, 35 L.Ed.2d 147`)
   *    when searching for the shared trailing year parenthetical so each
   *    cite in the chain gets year/court populated. */
  siblings?: ReadonlyArray<{ cleanStart: number; cleanEnd: number }>,
): FullCaseCitation {
  const { text, span } = token

  // Parse volume-reporter-page using regex.
  // Pattern: volume (digits) + reporter (letters/periods/spaces/numbers) + page (digits or blank placeholder)
  // Use greedy matching for reporter to capture full abbreviation including spaces.
  //
  // Tries the canonical `<vol> <Reporter> <page>` shape first, then falls
  // back to the comma-form `<vol> <Reporter>, <page>` shape (#570). The
  // ordering is load-bearing: running the comma-form regex first would
  // let the greedy reporter capture swallow a trailing pincite when a
  // caller hands `extractCase` a token whose text already contains
  // `<core>, <pincite>` (legacy synthetic-token tests do this).
  const match =
    VOLUME_REPORTER_PAGE_REGEX.exec(text) ??
    VOLUME_REPORTER_PAGE_REGEX_COMMA.exec(text)

  if (!match) {
    // Fallback if pattern doesn't match (shouldn't happen if tokenizer is correct)
    throw new Error(`Failed to parse case citation: ${text}`)
  }

  const volume = parseVolume(match[1])
  const reporter = match[2].trim()

  // Extract nominative reporter if present (e.g., "1 Cranch" from "5 U.S. (1 Cranch) 137")
  const nominativeVolume = match[3] ? Number.parseInt(match[3], 10) : undefined
  const nominativeReporter = match[4] || undefined

  // Check if page is a blank placeholder (group 5 after nominative groups)
  const pageStr = match[5]
  const isBlankPage = BLANK_PAGE_REGEX.test(pageStr)
  const page = isBlankPage ? undefined : Number.parseInt(pageStr, 10)
  const hasBlankPage = isBlankPage ? true : undefined

  // Extract optional pincite (page reference after comma).
  // Pattern: ", digits" (e.g., ", 125") or ", at *N" (star-pagination, #191).
  // Route the numeric part through parsePincite so star-page rawText ("*2")
  // doesn't blow up Number.parseInt.
  const pinciteMatch = PINCITE_REGEX.exec(text)
  let pinciteInfo: PinciteInfo | undefined = pinciteMatch
    ? (parsePincite(pinciteMatch[1]) ?? undefined)
    : undefined
  let pincite = pinciteInfo?.page

  // Initialize component spans for core regex-extracted fields
  const spans: CaseComponentSpans = {}

  if (match.indices) {
    // Group 1 = volume, Group 2 = reporter, Group 5 = page
    // Groups 3, 4 are optional nominative reporter (not tracked here)
    if (match.indices[1]) {
      spans.volume = spanFromGroupIndex(span.cleanStart, match.indices[1], transformationMap)
    }
    if (match.indices[2]) {
      // Trim whitespace from reporter span to match the trimmed reporter value
      const [rStart, rEnd] = match.indices[2]
      const rawReporter = text.substring(rStart, rEnd)
      const leadTrim = rawReporter.length - rawReporter.trimStart().length
      const trailTrim = rawReporter.length - rawReporter.trimEnd().length
      spans.reporter = spanFromGroupIndex(
        span.cleanStart,
        [rStart + leadTrim, rEnd - trailTrim],
        transformationMap,
      )
    }
    if (match.indices[5]) {
      spans.page = spanFromGroupIndex(span.cleanStart, match.indices[5], transformationMap)
    }
  }

  // Pincite span (from the token-level pincite match)
  if (pinciteMatch?.indices?.[1]) {
    spans.pincite = spanFromGroupIndex(span.cleanStart, pinciteMatch.indices[1], transformationMap)
  }

  // Initialize Phase 6 fields
  let year: number | undefined
  let court: string | undefined
  let date: StructuredDate | undefined
  let disposition: string | undefined
  let justices: string[] | undefined
  let scope: string | undefined
  let caseName: string | undefined
  let fullSpan: Span | undefined

  // Extract parenthetical from token text
  let parentheticalContent: string | undefined
  // Shared parenResult for court/year span computation (used by both code paths)
  let metaParenResult: ReturnType<typeof parseParenthetical> | undefined
  // Whether the metadata paren was found in token text (vs lookahead)
  let metaParenFromToken = false
  // Match any parenthetical (with or without letters)
  // When a nominative reporter is present, the first paren in token text is the
  // nominative (e.g., "(2 Black)") — skip it so the year/court look-ahead runs.
  const parenMatch = PAREN_REGEX.exec(text)
  if (parenMatch && !nominativeVolume && !isNonMetadataParenContent(parenMatch[1])) {
    parentheticalContent = parenMatch[1]
    // Parse parenthetical using unified parser
    metaParenResult = parseParenthetical(parentheticalContent)
    metaParenFromToken = true
    year = metaParenResult.year
    court = metaParenResult.court
    date = metaParenResult.date
    disposition = metaParenResult.disposition
    justices = metaParenResult.justices
    scope = metaParenResult.scope
  }

  // NY Slip Op unpublished marker (#231): `(U)` (older) or `[U]` (newer)
  // appears immediately after the page number and must be consumed *before*
  // LOOKAHEAD_PAREN_REGEX runs, otherwise the regex captures `(U)` as the
  // court parenthetical and produces `court = "U"`. Detected once and used
  // both in the in-token paren path and the lookahead path.
  let unpublished = false
  if (cleanedText) {
    const afterTokenForFlag = cleanedText.substring(span.cleanEnd)
    if (/^\s*(?:\(U\)|\[U\])/.test(afterTokenForFlag)) {
      unpublished = true
    }
  }

  // Parallel-cite chain skip: when this cite is followed by another citation
  // separated only by parallel-chain junk (commas, whitespace, digit/dash
  // runs for intervening pincites), the shared trailing parenthetical sits
  // AFTER the last cite in the chain — e.g., `329 Pa. 256, 198 A. 154 (1938)`
  // or `410 U.S. 113, 117, 93 S. Ct. 705 (1973)` where the `, 117,` is the
  // first cite's pincite. Compute the post-chain start position once and
  // share it between the look-ahead paren scan and `collectParentheticals`
  // so the trailing year paren is found AND fullSpan extends through it.
  let postChainStart = span.cleanEnd
  if (cleanedText && siblings && siblings.length > 0) {
    // Semicolons (#551) are accepted as parallel-chain separators alongside
    // commas — Michigan-style citations write `390 Mich 355, 359; 212 NW2d
    // 190 (1973)` where the `; ` separates the two parallel members. Without
    // semicolons in the bridge class, the first cite's post-chain scan would
    // stop at the semicolon and the trailing `(1973)` would not propagate.
    const CHAIN_BRIDGE_REGEX = /^[\s,;\d\-–—]*$/
    while (true) {
      const next = siblings.find(
        (s) =>
          s.cleanStart > postChainStart &&
          CHAIN_BRIDGE_REGEX.test(
            cleanedText.substring(postChainStart, s.cleanStart),
          ),
      )
      if (!next) break
      postChainStart = next.cleanEnd
    }
  }

  // Look ahead in cleaned text for parenthetical after the token
  // Tokenization patterns only capture volume-reporter-page, so parentheticals
  // like "(1989)" or "(9th Cir. 2020)" are not in the token text.
  if (cleanedText && !parentheticalContent) {
    // The pincite scan below must still operate on the original afterToken
    // (starting at span.cleanEnd) so `, 117` is parseable as this cite's
    // pincite; the paren scan uses the post-chain window instead.
    const afterToken = cleanedText.substring(span.cleanEnd)
    let parenAfterToken =
      postChainStart === span.cleanEnd
        ? afterToken
        : cleanedText.substring(postChainStart)
    // Consume any leading (U)/[U] marker so the real court paren is found.
    const unpubMatch = /^\s*(?:\(U\)|\[U\])/.exec(parenAfterToken)
    if (unpubMatch) {
      parenAfterToken = parenAfterToken.substring(unpubMatch[0].length)
    }
    // Georgia-style parenthesized parallel cite (#524): when this cite is the
    // inside of a `( ... )` parallel wrapper, the chars immediately after the
    // page are `) (year)`. Consume the single leading close-paren/bracket so
    // the trailing year paren is reachable by LOOKAHEAD_PAREN_REGEX. Only
    // strip ONE close-bracket — deeper nesting is too ambiguous to attribute
    // safely. Repro: `275 Ga. 486, 488-489 (2) (569 SE2d 502) (2002)`.
    const wrapperCloseMatch = /^\s*[)\]]/.exec(parenAfterToken)
    if (wrapperCloseMatch) {
      parenAfterToken = parenAfterToken.substring(wrapperCloseMatch[0].length)
    }
    const lookAheadMatch = LOOKAHEAD_PAREN_REGEX.exec(parenAfterToken)
    if (lookAheadMatch && !isNonMetadataParenContent(lookAheadMatch[1])) {
      parentheticalContent = lookAheadMatch[1]
      // Parse parenthetical using unified parser
      metaParenResult = parseParenthetical(parentheticalContent)
      metaParenFromToken = false
      year = metaParenResult.year
      court = metaParenResult.court
      date = metaParenResult.date
      disposition = metaParenResult.disposition
      justices = metaParenResult.justices
      scope = metaParenResult.scope
    }

    // Extract pincite from look-ahead independently of the parenthetical match.
    // A citation can carry a pincite without a trailing court/year parenthetical,
    // e.g. "2020 NY Slip Op 00001 at *2." — the second occurrence is classified
    // as a full-case cite (because shortFormCase requires no page between reporter
    // and "at"), but the pincite is still meaningful data. See #191.
    if (pincite === undefined) {
      const laPinciteMatch = LOOKAHEAD_PINCITE_REGEX.exec(afterToken)
      if (laPinciteMatch) {
        if (!pinciteInfo) {
          pinciteInfo = parsePincite(laPinciteMatch[1]) ?? undefined
        }
        pincite = pinciteInfo?.page
        // Pincite span: indices are relative to afterToken (which starts at span.cleanEnd)
        if (laPinciteMatch.indices?.[1]) {
          spans.pincite = spanFromGroupIndex(
            span.cleanEnd,
            laPinciteMatch.indices[1],
            transformationMap,
          )
        }

        // Multiple discrete pincites (#247): continue scanning for additional
        // comma-separated pincites (`, 115, 153, 200`). Each entry is parsed
        // through `parsePincite` so range / footnote / paragraph semantics
        // inside the chain are preserved. The convenience `pincite` field
        // continues to point at the primary; consumers walk `additionalPincites`.
        if (pinciteInfo) {
          const additionalPincites: PinciteInfo[] = []
          let scanStart =
            (laPinciteMatch.index ?? 0) + laPinciteMatch[0].length
          while (scanStart < afterToken.length) {
            const remainder = afterToken.substring(scanStart)
            const addMatch = ADDITIONAL_PINCITE_REGEX.exec(remainder)
            if (!addMatch) break
            const addInfo = parsePincite(addMatch[1])
            if (!addInfo) break
            additionalPincites.push(addInfo)
            scanStart += addMatch[0].length
          }
          if (additionalPincites.length > 0) {
            pinciteInfo = { ...pinciteInfo, additionalPincites }
          }
        }
      }
    }
  }

  // Classify chained parentheticals: extract disposition and explanatory content
  let parentheticals: Parenthetical[] | undefined
  let allParens: RawParenthetical[] | undefined
  let collected: CollectedParentheticals | undefined
  if (cleanedText) {
    // Use postChainStart so fullSpan / chained-paren classification can see
    // the shared trailing paren that sits past a parallel-cite chain.
    collected = collectParentheticals(cleanedText, postChainStart)
    allParens = collected.parens
    // Skip first paren only if it yielded actual metadata (year/court/
    // disposition/justices/scope). When the first paren is an explanatory
    // parenthetical (`holding that...`, `emphasis added`), no metadata is
    // extracted and the paren should fall through to be classified as
    // explanatory and added to `parentheticals`. #431
    const firstParenIsMetadata =
      parentheticalContent &&
      (year !== undefined ||
        court !== undefined ||
        disposition !== undefined ||
        justices !== undefined ||
        scope !== undefined)
    const remaining = firstParenIsMetadata ? allParens.slice(1) : allParens
    for (const raw of remaining) {
      const classified = classifyParenthetical(raw.text)
      if (classified.kind === "metadata") {
        // Accept court from later metadata parens if we don't have a real one.
        // The primary parse can set court to the disposition text (e.g., "en banc")
        // as a side effect of stripDateFromCourt, so treat that as unset.
        if (classified.court && (!court || court === disposition)) {
          court = classified.court
        }
        if (classified.year && !year) {
          year = classified.year
          date = classified.date
        }
        if (classified.disposition && !disposition) {
          disposition = classified.disposition
        }
        if (classified.justices && !justices) {
          justices = classified.justices
        }
        if (classified.scope && !scope) {
          scope = classified.scope
        }
      } else {
        parentheticals ??= []
        const parenOrig = resolveOriginalSpan(
          { cleanStart: raw.start, cleanEnd: raw.end },
          transformationMap,
        )
        parentheticals.push({
          text: classified.text,
          type: classified.type,
          span: {
            cleanStart: raw.start,
            cleanEnd: raw.end,
            originalStart: parenOrig.originalStart,
            originalEnd: parenOrig.originalEnd,
          },
        })
      }
    }
  }

  // Metadata parenthetical span (the first paren that yielded court/year)
  if (allParens && allParens.length > 0 && (court || year)) {
    const metaParen = parentheticalContent ? allParens[0] : undefined
    if (metaParen) {
      const metaOrig = resolveOriginalSpan(
        { cleanStart: metaParen.start, cleanEnd: metaParen.end },
        transformationMap,
      )
      spans.metadataParenthetical = {
        cleanStart: metaParen.start,
        cleanEnd: metaParen.end,
        originalStart: metaOrig.originalStart,
        originalEnd: metaOrig.originalEnd,
      }

      // Court and year spans from parseParenthetical content offsets.
      // The content starts at metaParen.start + 1 (past the opening "(").
      if (metaParenResult) {
        const contentStart = metaParen.start + 1
        if (metaParenResult.courtStart !== undefined) {
          const courtCS = contentStart + metaParenResult.courtStart
          const courtCE = contentStart + metaParenResult.courtEnd!
          const courtOrig = resolveOriginalSpan(
            { cleanStart: courtCS, cleanEnd: courtCE },
            transformationMap,
          )
          spans.court = {
            cleanStart: courtCS,
            cleanEnd: courtCE,
            originalStart: courtOrig.originalStart,
            originalEnd: courtOrig.originalEnd,
          }
        }
        if (metaParenResult.yearStart !== undefined) {
          const yearCS = contentStart + metaParenResult.yearStart
          const yearCE = contentStart + metaParenResult.yearEnd!
          const yearOrig = resolveOriginalSpan(
            { cleanStart: yearCS, cleanEnd: yearCE },
            transformationMap,
          )
          spans.year = {
            cleanStart: yearCS,
            cleanEnd: yearCE,
            originalStart: yearOrig.originalStart,
            originalEnd: yearOrig.originalEnd,
          }
        }
      }
    }
  }

  // Build subsequentHistoryEntries from captured signals (already normalized
  // during collection to avoid a second SIGNAL_TABLE scan).
  // Texas Greenbook writ/petition history (#229) lives *inside* the
  // court-and-year parenthetical, so it's captured by parseParenthetical's
  // `internalHistory` field rather than the between-parens collector. Emit
  // it first so it appears at order=0 in the chain — it semantically precedes
  // any later signals between separate parens.
  let subsequentHistoryEntries: SubsequentHistoryEntry[] | undefined
  if (cleanedText && metaParenResult?.internalHistory && allParens && allParens.length > 0) {
    const metaParen = parentheticalContent ? allParens[0] : undefined
    if (metaParen) {
      const contentStart = metaParen.start + 1
      const ih = metaParenResult.internalHistory
      const sigCleanStart = contentStart + ih.start
      const sigCleanEnd = contentStart + ih.end
      const { originalStart: sigOrigStart, originalEnd: sigOrigEnd } =
        resolveOriginalSpan(
          { cleanStart: sigCleanStart, cleanEnd: sigCleanEnd },
          transformationMap,
        )
      subsequentHistoryEntries ??= []
      subsequentHistoryEntries.push({
        signal: ih.signal,
        rawSignal: ih.rawSignal,
        signalSpan: {
          cleanStart: sigCleanStart,
          cleanEnd: sigCleanEnd,
          originalStart: sigOrigStart,
          originalEnd: sigOrigEnd,
        },
        order: 0,
      })
    }
  }
  if (cleanedText && collected && collected.signals.length > 0) {
    for (let i = 0; i < collected.signals.length; i++) {
      const { signal: rawSig } = collected.signals[i]
      subsequentHistoryEntries ??= []
      const { originalStart: sigOrigStart, originalEnd: sigOrigEnd } = resolveOriginalSpan(
        { cleanStart: rawSig.start, cleanEnd: rawSig.end },
        transformationMap,
      )
      subsequentHistoryEntries.push({
        signal: rawSig.normalized,
        rawSignal: rawSig.text,
        signalSpan: {
          cleanStart: rawSig.start,
          cleanEnd: rawSig.end,
          originalStart: sigOrigStart,
          originalEnd: sigOrigEnd,
        },
        order: subsequentHistoryEntries.length,
      })
    }
  }

  // Infer court level/jurisdiction from reporter series
  const inferredCourt = inferCourtFromReporter(reporter)

  // Backward compat: set court string for SCOTUS when not already extracted
  if (!court && inferredCourt?.level === "supreme" && inferredCourt?.jurisdiction === "federal") {
    court = "scotus"
  }

  // Phase 6: Extract case name via backward search.
  // Bound the lookback by the previous sibling token's end (if any) so the
  // backward walk for a parallel cite (e.g., the `198 A. 154` half of
  // `Nixon v. Nixon, 329 Pa. 256, 198 A. 154`) does not absorb the earlier
  // reporter cite into the case name.
  let caseNameLookback: number | undefined
  if (siblings && siblings.length > 0) {
    const prev = siblings
      .filter((s) => s.cleanEnd <= span.cleanStart)
      .reduce<{ cleanEnd: number } | undefined>(
        (best, s) =>
          !best || s.cleanEnd > best.cleanEnd ? s : best,
        undefined,
      )
    if (prev) {
      caseNameLookback = span.cleanStart - prev.cleanEnd
    }
  }
  let caseNameResult: ReturnType<typeof extractCaseName> | undefined
  if (cleanedText) {
    caseNameResult = extractCaseName(
      cleanedText,
      span.cleanStart,
      caseNameLookback,
      {
        originalText,
        transformationMap,
      },
    )
    if (caseNameResult) {
      caseName = caseNameResult.caseName

      // Strip trailing year / court+year / parallel-cite tokens from
      // caseName — the backward scan sometimes absorbs the CSM year paren
      // or the start of a parallel citation. #436
      //
      // - Trailing `(YYYY)` or `(Court YYYY)` → strip whole paren.
      // - Trailing `, NNNN <reporter token>` → strip the parallel-cite
      //   start, e.g., `State v. Lane, 1998 MT 76` → `State v. Lane`.
      // - Trailing `, COURT, MONTH DAY, YYYY` or bare `, YYYY` — the
      //   old-style "name, date, citation" form (Picard v. United Aircraft,
      //   2 Cir., May 28, 1942, 128 F.2d 632; Seymour v. Osborne, 1870, 11
      //   Wall. 516) — strip and harvest the year (#511).
      let oldStyleYear: number | undefined
      if (caseName) {
        // Trailing parenthetical (year or court+year)
        caseName = caseName.replace(/\s*\((?:[^()]*\s)?\d{4}\)\s*$/, "").trim()
        // Trailing comma + parallel-cite start (volume + reporter + page-like)
        caseName = caseName
          .replace(/,\s+\d+\s+[A-Z][A-Za-z.&'\d\s]*\d+\s*$/, "")
          .trim()
        // Trailing comma + neutral-cite shape (YYYY <state> NN)
        caseName = caseName.replace(/,\s+\d{4}\s+[A-Z]+\s+\d+\s*$/, "").trim()
        // Old-style `, COURT, MONTH DAY, YYYY` prefix (#511). Court is
        // `[0-9]+\s+Cir.|App.|Ct.` or just `[A-Z][a-z]+.` shapes; we keep
        // the match narrow so it doesn't strip legitimate trailing tokens.
        const oldStyleCourtDate =
          /,\s+\d{1,2}(?:st|nd|rd|th)?\s+(?:Cir|App|Ct|Dist|Cir\.\s+App)\.,\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+(\d{4})\s*$/
        const courtDateMatch = oldStyleCourtDate.exec(caseName)
        if (courtDateMatch) {
          oldStyleYear = Number.parseInt(courtDateMatch[1], 10)
          caseName = caseName.replace(oldStyleCourtDate, "").trim()
        } else {
          // Bare `, YYYY` prefix (Seymour v. Osborne, 1870; MacPherson v.
          // Buick Motor Co., 1916). Only when the year stands alone right
          // before the citation core — restrict to 1700-2099 to keep the
          // strip conservative.
          const bareYear = /,\s+((?:17|18|19|20)\d{2})\s*$/
          const bareMatch = bareYear.exec(caseName)
          if (bareMatch) {
            oldStyleYear = Number.parseInt(bareMatch[1], 10)
            caseName = caseName.replace(bareYear, "").trim()
          }
        }
      }
      // Surface the harvested year on the citation when one wasn't already
      // captured from a trailing parenthetical (#511).
      if (oldStyleYear !== undefined && !year) {
        year = oldStyleYear
      }

      // CSM year-first form puts the year *before* volume-reporter-page
      // (`In re K.F. (2009) 173 Cal.App.4th 655` — #19). Pick it up here when
      // there's no trailing court parenthetical to recover it from. Don't
      // overwrite a year already parsed from a trailing paren — the trailing
      // paren may also carry court information that the year-first paren lacks.
      if (caseNameResult.year && !year) {
        year = caseNameResult.year
        if (
          caseNameResult.yearStart !== undefined &&
          caseNameResult.yearEnd !== undefined &&
          !spans.year
        ) {
          const yearOrig = resolveOriginalSpan(
            {
              cleanStart: caseNameResult.yearStart,
              cleanEnd: caseNameResult.yearEnd,
            },
            transformationMap,
          )
          spans.year = {
            cleanStart: caseNameResult.yearStart,
            cleanEnd: caseNameResult.yearEnd,
            originalStart: yearOrig.originalStart,
            originalEnd: yearOrig.originalEnd,
          }
        }
      }

      // Louisiana docket-prefix paren metadata transfer (#232). When a Louisiana
      // citation places `NN-NNNN (La. ... M/D/YY)` between the caption and the
      // reporter, the trailing reporter citation typically carries no court
      // paren of its own — pull court/year/date from the docket paren so the
      // citation surfaces structured metadata instead of dropping it.
      if (caseNameResult.precedingDocketMeta) {
        const meta = caseNameResult.precedingDocketMeta
        if (!year) year = meta.year
        if (!court) court = meta.court
        if (!date) date = meta.date
      }

      // Calculate fullSpan: case name start through parenthetical end
      // Reuse allParens from classify loop to avoid scanning twice
      const parenEnd =
        allParens && allParens.length > 0 ? allParens[allParens.length - 1].end : span.cleanEnd
      const fullCleanStart = caseNameResult.nameStart
      const fullCleanEnd = parenEnd

      // Translate to original positions
      const fullOriginalStart =
        transformationMap.cleanToOriginal.get(fullCleanStart) ?? fullCleanStart
      const fullOriginalEnd = transformationMap.cleanToOriginal.get(fullCleanEnd) ?? fullCleanEnd

      fullSpan = {
        cleanStart: fullCleanStart,
        cleanEnd: fullCleanEnd,
        originalStart: fullOriginalStart,
        originalEnd: fullOriginalEnd,
      }

      // Case name span — computed BEFORE signal stripping rebuilds caseName
      const caseNameCleanStart = caseNameResult.nameStart
      const caseNameCleanEnd = caseNameCleanStart + caseName!.length
      const caseNameOrig = resolveOriginalSpan(
        { cleanStart: caseNameCleanStart, cleanEnd: caseNameCleanEnd },
        transformationMap,
      )
      spans.caseName = {
        cleanStart: caseNameCleanStart,
        cleanEnd: caseNameCleanEnd,
        originalStart: caseNameOrig.originalStart,
        originalEnd: caseNameOrig.originalEnd,
      }
    }
  }

  // Parallel-cite fullSpan fallback: when this cite is a secondary parallel
  // (no case-name extracted because the bounded lookback hits the prior
  // cite's end) AND there is a close preceding sibling indicating a parallel
  // chain, still extend fullSpan through the shared trailing paren so
  // string-citation grouping and downstream span consumers see the full
  // citation extent. The bare cite's own cleanStart anchors the lower bound.
  // Cites without a preceding sibling (e.g., a standalone `500 F.2d 123 (2020)`
  // with no caption) intentionally do not get a fullSpan — that's existing
  // contract: "no case name → no fullSpan".
  const hasCloseParallelPrev =
    caseNameLookback !== undefined && caseNameLookback < 30
  if (
    !fullSpan &&
    hasCloseParallelPrev &&
    allParens &&
    allParens.length > 0
  ) {
    const lastParen = allParens[allParens.length - 1]
    if (lastParen.end > span.cleanEnd) {
      const fullCleanStart = span.cleanStart
      const fullCleanEnd = lastParen.end
      fullSpan = {
        cleanStart: fullCleanStart,
        cleanEnd: fullCleanEnd,
        originalStart:
          transformationMap.cleanToOriginal.get(fullCleanStart) ??
          fullCleanStart,
        originalEnd:
          transformationMap.cleanToOriginal.get(fullCleanEnd) ?? fullCleanEnd,
      }
    }
  }

  // Phase 7: Extract party names from case name
  let plaintiff: string | undefined
  let plaintiffNormalized: string | undefined
  let defendant: string | undefined
  let defendantNormalized: string | undefined
  let proceduralPrefix: string | undefined
  let adminParenthetical: string | undefined

  let signal: CitationSignal | undefined
  if (caseName) {
    const partyResult = extractPartyNames(caseName)
    plaintiff = partyResult.plaintiff
    plaintiffNormalized = partyResult.plaintiffNormalized
    defendant = partyResult.defendant
    defendantNormalized = partyResult.defendantNormalized
    proceduralPrefix = partyResult.proceduralPrefix
    signal = partyResult.signal
    adminParenthetical = partyResult.adminParenthetical

    // Rebuild caseName when extractPartyNames modified the plaintiff (signal stripped,
    // "In"/"Also" prefix removed, etc.). Find the plaintiff's actual position in the
    // cleaned text to update fullSpan and caseName span. Bankruptcy admin
    // parenthetical is preserved as part of the rebuilt caseName so it remains
    // visible to consumers even though it's stripped off the `defendant` field.
    if (plaintiff && defendant) {
      const adminSuffix = adminParenthetical ? ` (${adminParenthetical})` : ""
      // Preserve the source's `v` punctuation form when rebuilding (#326).
      // The existing caseName already carries the right separator (set by
      // extractCaseName / V_CASE_NAME_REGEX); detect it and reuse.
      const existingSepMatch = caseName ? /\s+(vs?\.?)\s+/.exec(caseName) : null
      const rebuildSep = existingSepMatch?.[1] ?? "v."
      const rebuiltName = `${plaintiff} ${rebuildSep} ${defendant}${adminSuffix}`
      if (rebuiltName !== caseName && fullSpan && cleanedText) {
        caseName = rebuiltName

        // Advance fullSpan.cleanStart to where the plaintiff actually starts
        const prefixRegion = cleanedText.substring(fullSpan.cleanStart, span.cleanStart)
        const vSep = /\s+vs?\.?\s+/i.exec(prefixRegion)
        if (vSep) {
          const beforeV = prefixRegion.substring(0, vSep.index)
          const pIdx = beforeV.lastIndexOf(plaintiff)
          if (pIdx !== -1) {
            const newCleanStart = fullSpan.cleanStart + pIdx
            const newOriginalStart =
              transformationMap.cleanToOriginal.get(newCleanStart) ?? newCleanStart
            fullSpan = { ...fullSpan, cleanStart: newCleanStart, originalStart: newOriginalStart }
          }
        }

        // Update caseName span to reflect the cleaned name
        if (caseNameResult) {
          const strippedCleanStart = fullSpan.cleanStart
          const strippedCleanEnd = strippedCleanStart + caseName.length
          const strippedOrig = resolveOriginalSpan(
            { cleanStart: strippedCleanStart, cleanEnd: strippedCleanEnd },
            transformationMap,
          )
          spans.caseName = {
            cleanStart: strippedCleanStart,
            cleanEnd: strippedCleanEnd,
            originalStart: strippedOrig.originalStart,
            originalEnd: strippedOrig.originalEnd,
          }
        }
      }
    }

    // Plaintiff and defendant spans — split the search region at the "v." separator
    // so each name is only matched on the correct side, avoiding indexOf collisions
    // when a name substring appears in both halves (e.g., "Smith v. Smith").
    if (plaintiff && caseNameResult && cleanedText) {
      const nameAnchor = fullSpan?.cleanStart ?? caseNameResult.nameStart
      const searchRegion = cleanedText.substring(nameAnchor, span.cleanStart)
      const vSepMatch = /\s+vs?\.?\s+/i.exec(searchRegion)
      if (vSepMatch) {
        // Plaintiff: search only in the region before "v."
        const plaintiffRegion = searchRegion.substring(0, vSepMatch.index)
        const pIdx = plaintiffRegion.lastIndexOf(plaintiff)
        if (pIdx !== -1) {
          const pCleanStart = nameAnchor + pIdx
          const pCleanEnd = pCleanStart + plaintiff.length
          const pOrig = resolveOriginalSpan(
            { cleanStart: pCleanStart, cleanEnd: pCleanEnd },
            transformationMap,
          )
          spans.plaintiff = {
            cleanStart: pCleanStart,
            cleanEnd: pCleanEnd,
            originalStart: pOrig.originalStart,
            originalEnd: pOrig.originalEnd,
          }
        }
        // Defendant: search only in the region after "v."
        if (defendant) {
          const defRegionStart = vSepMatch.index + vSepMatch[0].length
          const defendantRegion = searchRegion.substring(defRegionStart)
          const dIdx = defendantRegion.indexOf(defendant)
          if (dIdx !== -1) {
            const dCleanStart = nameAnchor + defRegionStart + dIdx
            const dCleanEnd = dCleanStart + defendant.length
            const dOrig = resolveOriginalSpan(
              { cleanStart: dCleanStart, cleanEnd: dCleanEnd },
              transformationMap,
            )
            spans.defendant = {
              cleanStart: dCleanStart,
              cleanEnd: dCleanEnd,
              originalStart: dOrig.originalStart,
              originalEnd: dOrig.originalEnd,
            }
          }
        }
      } else {
        // No "v." separator — procedural prefix case (e.g., "In re X").
        // Plaintiff is the full case name; no defendant to locate.
        const pIdx = searchRegion.indexOf(plaintiff)
        if (pIdx !== -1) {
          const pCleanStart = nameAnchor + pIdx
          const pCleanEnd = pCleanStart + plaintiff.length
          const pOrig = resolveOriginalSpan(
            { cleanStart: pCleanStart, cleanEnd: pCleanEnd },
            transformationMap,
          )
          spans.plaintiff = {
            cleanStart: pCleanStart,
            cleanEnd: pCleanEnd,
            originalStart: pOrig.originalStart,
            originalEnd: pOrig.originalEnd,
          }
        }
      }
    }

    // Signal span — the signal word was part of the original case name, found
    // at caseNameResult.nameStart. After signal stripping, fullSpan.cleanStart
    // was advanced past it, so the signal occupies [nameStart, fullSpan.cleanStart).
    if (signal && fullSpan && cleanedText && caseNameResult) {
      const sigRegion = cleanedText.substring(caseNameResult.nameStart, span.cleanStart)
      const sigMatch = SIGNAL_STRIP_REGEX.exec(sigRegion)
      if (sigMatch) {
        const sigCleanStart = caseNameResult.nameStart
        const sigCleanEnd = sigCleanStart + sigMatch[1].length
        const sigOrig = resolveOriginalSpan(
          { cleanStart: sigCleanStart, cleanEnd: sigCleanEnd },
          transformationMap,
        )
        spans.signal = {
          cleanStart: sigCleanStart,
          cleanEnd: sigCleanEnd,
          originalStart: sigOrig.originalStart,
          originalEnd: sigOrig.originalEnd,
        }
      }
    }
  }

  // Translate positions from clean → original (citation core only - span unchanged)
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Confidence comes from a shared pure helper so post-pass mutations
  // (e.g. inheritParallelCaseName, #556) can re-derive with the same formula.
  const confidence = computeCaseConfidence({
    reporter,
    year,
    caseName,
    court,
    hasBlankPage: hasBlankPage ?? false,
  })

  // Resolve the canonical Bluebook reporter via reporters-db so downstream
  // consumers (`reporterKey`, `bluebook`, parallel-group matching) can link
  // periodless / no-space variants (`F2d`, `Ill2d`, `OhioSt.`) to their
  // canonical editions. Returns `undefined` when reporters-db is not loaded
  // (degraded mode) or no variant/edition matches — see #571.
  //
  // `year` is passed so the resolver can disambiguate shared abbreviations
  // by era — currently `Black.` (SCOTUS 1861-1862) vs `Blackf.` (Indiana,
  // 1817-1847). See #572.
  const normalizedReporter = resolveNormalizedReporter(reporter, year)

  return {
    type: "case",
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence,
    matchedText: text,
    processTimeMs: 0, // Placeholder - timing handled by orchestration layer
    patternsChecked: 1, // Single token processed
    volume,
    reporter,
    ...(normalizedReporter !== undefined ? { normalizedReporter } : {}),
    page,
    nominativeVolume,
    nominativeReporter,
    pincite,
    pinciteInfo,
    court,
    normalizedCourt: normalizeCourt(court),
    year,
    hasBlankPage,
    date,
    fullSpan,
    caseName,
    disposition,
    parentheticals,
    subsequentHistoryEntries,
    ...(unpublished ? { unpublished: true } : {}),
    ...(justices ? { justices } : {}),
    ...(scope ? { scope } : {}),
    ...(adminParenthetical ? { adminParenthetical } : {}),
    plaintiff,
    plaintiffNormalized,
    defendant,
    defendantNormalized,
    proceduralPrefix,
    inferredCourt,
    signal,
    spans,
  }
}
