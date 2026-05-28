/**
 * False Positive Citation Filtering
 *
 * Flags or removes citations that are likely false positives:
 * - Non-US reporter abbreviations (international, UK, European, historical English)
 * - Citations with years predating US legal reporting (before 1750)
 *
 * Runs as a post-extraction phase (Step 4.9) after string citation grouping.
 * Uses a lightweight static blocklist, enhanced with reporters-db validation
 * when loaded (for single-digit-volume paragraph/footnote marker detection).
 *
 * @module extract/filterFalsePositives
 */

import type {
  Citation,
  FederalRegisterCitation,
  FullCaseCitation,
  JournalCitation,
  ShortFormCaseCitation,
  StatutesAtLargeCitation,
  Warning,
} from "@/types/citation"
import { getReportersSync } from "@/data/reportersCache"

/** Year threshold: US legal reporting starts ~1790 (Dallas Reports). 1750 gives headroom. */
const MIN_PLAUSIBLE_YEAR = 1750

/** Confidence floor for flagged citations in penalize mode. */
const FLAGGED_CONFIDENCE = 0.1

/**
 * Static blocklist of known non-US reporter abbreviations (lowercase, trimmed).
 *
 * International tribunals/treaties:
 *   I.C.J., U.N.T.S., I.L.M., I.L.R., P.C.I.J.
 * UK reporters:
 *   A.C., W.L.R., All E.R., Q.B., K.B., Ch., Co. Rep.
 * European:
 *   E.C.R., E.H.R.R., C.M.L.R.
 * Historical English:
 *   Edw. (standalone — "Edw. Ch." is a valid US reporter)
 */
const BLOCKED_REPORTERS: ReadonlySet<string> = new Set([
  // International
  "i.c.j.",
  "u.n.t.s.",
  "i.l.m.",
  "i.l.r.",
  "p.c.i.j.",
  // UK
  "a.c.",
  "w.l.r.",
  "all e.r.",
  "q.b.",
  "k.b.",
  "ch.",
  "co. rep.",
  // European
  "e.c.r.",
  "e.h.r.r.",
  "c.m.l.r.",
  // Historical English
  "edw.",
  // Federal statute/regulation abbreviations — the broad state-reporter
  // regex matches `42 USC 1983` and `42 CFR 447` (volume + token + page),
  // mis-typing federal statutory citations as `case`. The volume-band
  // check in `isImplausibleReporter` only runs for volumes 1–20, so high-
  // volume federal-code citations slip through. Adding them here ensures
  // they're filtered regardless of volume — the USC/CFR statute patterns
  // will then capture them correctly. #428
  "usc",
  "usca",
  "u.s.c.",
  "u.s.c.a.",
  "cfr",
  "c.f.r.",
])

/**
 * Get the reporter string to check against the blocklist.
 * Returns undefined for citation types that don't have a reporter,
 * or for short-form types (id, supra, shortFormCase) which inherit
 * their reporter from an antecedent — filtering the antecedent is sufficient.
 */
function getReporter(citation: Citation): string | undefined {
  if (citation.type === "case") return (citation as FullCaseCitation).reporter
  if (citation.type === "shortFormCase") return (citation as ShortFormCaseCitation).reporter
  if (citation.type === "journal") return (citation as JournalCitation).abbreviation
  return undefined
}

/**
 * Get the year from a citation, if present.
 * Returns undefined for citation types without a year field.
 */
function getYear(citation: Citation): number | undefined {
  switch (citation.type) {
    case "case":
      return (citation as FullCaseCitation).year
    case "journal":
      return (citation as JournalCitation).year
    case "federalRegister":
      return (citation as FederalRegisterCitation).year
    case "statutesAtLarge":
      return (citation as StatutesAtLargeCitation).year
    default:
      return undefined
  }
}

/**
 * Words that should never appear as standalone tokens in a reporter string.
 * These appear in English prose (e.g., "the District 2 Court dismissed") and get
 * falsely matched by the broad state-reporter regex.
 * Note: English-only — extend if the library is used on non-English legal text.
 */
const REPORTER_BLOCKLIST_WORDS: ReadonlySet<string> = new Set([
  "court",
  "rule",
  "section",
  "chapter",
  "article",
  "part",
  "title",
  "paragraph",
  "clause",
  "amendment",
  "dismissed",
  "granted",
  "denied",
  "filed",
  "argued",
])

/**
 * Month names matched as `reporter` on date-shaped sequences like `8 April 1988`
 * (day-first European-style dates) where the state-reporter tokenizer's broad
 * `<volume> <Word> <page>` pattern captures the day, month name, and year as a
 * phantom case citation. #302
 */
const MONTH_NAMES: ReadonlySet<string> = new Set([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
])

/** Earliest plausible year for a citation's reporting date. Anything below this
 *  is almost certainly a false positive (most likely a date misparse). */
const MIN_PLAUSIBLE_REPORT_YEAR = 1700
/** Latest plausible year — current year plus a small buffer for not-yet-reported
 *  cases / advance sheets. */
const MAX_PLAUSIBLE_REPORT_YEAR = new Date().getFullYear() + 5
/** Maximum day-of-month for the date-shape filter. */
const MAX_DAY_OF_MONTH = 31

/**
 * Date misparse: `<day> <Month> <year>` matched as case citation (#302).
 *
 * The state-reporter regex captures `8 April 1988` as
 * `volume=8, reporter="April", page=1988`. Real reporters never use month names,
 * so any cite whose reporter is a month name AND whose volume/page shape look
 * like day+year is a false positive — rejected unconditionally regardless of
 * the caller's `filterFalsePositives` opt-in.
 */
function isMonthNameDateMisparse(citation: Citation): boolean {
  if (citation.type !== "case" && citation.type !== "shortFormCase") return false
  const c = citation as FullCaseCitation | ShortFormCaseCitation
  if (!c.reporter) return false
  if (!MONTH_NAMES.has(c.reporter.toLowerCase().trim())) return false
  const vol = typeof c.volume === "number" ? c.volume : Number.parseInt(String(c.volume), 10)
  if (Number.isNaN(vol) || vol < 1 || vol > MAX_DAY_OF_MONTH) return false
  const page = typeof c.page === "number" ? c.page : Number.parseInt(String(c.page), 10)
  if (Number.isNaN(page)) return false
  return page >= MIN_PLAUSIBLE_REPORT_YEAR && page <= MAX_PLAUSIBLE_REPORT_YEAR
}

/**
 * Issue #673 (bugs 6-8): Implausible volume / page magnitudes. Real
 * reporters always have volume ≥ 1 and page ≥ 1; volumes never reach
 * 10-digit territory. Hard-reject these — they're unambiguously
 * garbage parses (citations like `0 U.S. 1`, `1 U.S. 0`, and
 * `1234567890 U.S. 1` come from misread digit sequences in prose).
 */
const MAX_ABSURD_VOLUME = 999999
function isImplausibleVolumePageMagnitude(citation: Citation): boolean {
  if (citation.type !== "case" && citation.type !== "shortFormCase") return false
  const c = citation as FullCaseCitation | ShortFormCaseCitation
  // Volume = 0 is never valid
  if (typeof c.volume === "number" && c.volume === 0) return true
  // Volume ≥ 1 million is never a real reporter volume
  if (typeof c.volume === "number" && c.volume > MAX_ABSURD_VOLUME) return true
  // Page = 0 is never valid
  if (citation.type === "case") {
    const cc = c as FullCaseCitation
    if (typeof cc.page === "number" && cc.page === 0) return true
  }
  return false
}

/**
 * Issue #669: Multi-word "reporter" containing a month-name token is
 * always prose, never a real citation. Real reporters never contain
 * month names. Catches phantoms like `On July`, `From January` that
 * the existing isMonthNameDateMisparse misses because the reporter
 * isn't EXACTLY a month name. Hard-reject so consumers don't see them
 * even at confidence=0.1.
 */
function isMonthInProseReporter(citation: Citation): boolean {
  if (citation.type !== "case" && citation.type !== "shortFormCase") return false
  const c = citation as FullCaseCitation | ShortFormCaseCitation
  if (!c.reporter) return false
  const words = c.reporter.toLowerCase().split(/\s+/)
  if (words.length < 2) return false
  return words.some((w) => MONTH_NAMES.has(w))
}

/** Maximum length for a reporter string without periods.
 *  Real period-less reporters (e.g., "Cal", "Wis", "Mass") are short.
 *  Prose false positives ("Court dismissed the complaint...") are long.
 *  Threshold of 12 accommodates the longest known period-less reporters
 *  (e.g., "Mass App Ct" at 11 chars). Raise if new reporters exceed this. */
const MAX_PERIODLESS_REPORTER_LENGTH = 12

/**
 * Check if a reporter string looks implausible (prose text matched as reporter).
 * Real reporters contain periods (F.2d, N.W.2d, So. 2d) or are very short (Cal, Wis).
 */
function isImplausibleReporter(reporter: string): boolean {
  const words = reporter.toLowerCase().split(/\s+/)
  if (words.some((w) => REPORTER_BLOCKLIST_WORDS.has(w))) return true
  if (!reporter.includes(".") && reporter.length > MAX_PERIODLESS_REPORTER_LENGTH) return true
  return false
}

/**
 * Words that appear in prose false positives for single-digit-volume citations
 * but never in legitimate reporter abbreviations (verified against reporters-db).
 * Used as fallback when reporters-db is not loaded.
 */
const SINGLE_DIGIT_PROSE_WORDS: ReadonlySet<string> = new Set([
  // Prepositions / conjunctions / articles
  "the",
  "a",
  "an",
  "in",
  "on",
  "at",
  "but",
  "and",
  "for",
  "by",
  "to",
  "with",
  "from",
  "as",
  "if",
  "so",
  "nor",
  "yet",
  "not",
  "no",
  "then",
  "when",
  "where",
  "who",
  "what",
  "how",
  "that",
  "this",
  "these",
  "those",
  // Pronouns
  "he",
  "she",
  "it",
  "they",
  "we",
  "his",
  "her",
  "its",
  "their",
  "our",
  // Common verbs
  "was",
  "were",
  "is",
  "are",
  "has",
  "had",
  "been",
  "being",
  "did",
  "does",
  "do",
  "may",
  "shall",
  "will",
  "would",
  "could",
  "should",
  "held",
  "said",
  "found",
  "made",
  "took",
  "gave",
  "see",
  "also",
  // Month names (after HTML stripping, "¶2 In July 2016" → "2 In July 2016")
  "january",
  "february",
  "march",
  "april",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
])

/** Maximum plausible volume number for US reporters.
 *  The most prolific reporters (F. Supp. 3d, F.3d) have volumes in the
 *  low-to-mid hundreds. 2000 gives generous headroom while still catching
 *  zip codes (5-digit numbers like 20006) and other non-citation numbers. */
const MAX_PLAUSIBLE_VOLUME = 2000

/** Plausible year range for citations whose "volume" is actually a year.
 *  Vendor-neutral reporters — NY Slip Op, IL App, OK CIV APP, WL, LEXIS,
 *  Ohio neutral, etc. — use the year of decision as the volume number,
 *  routinely exceeding MAX_PLAUSIBLE_VOLUME. Cap at 2099 keeps the
 *  heuristic deterministic and still catches truly garbage numeric
 *  volumes (e.g., parsed zip codes ≥ 10000). */
const MIN_PLAUSIBLE_YEAR_VOLUME = 1900
const MAX_PLAUSIBLE_YEAR_VOLUME = 2099

/** Docket number pattern: 1-2 digit prefix + hyphen + 4+ digit suffix.
 *  E.g., "24-30706", "23-12345". Real hyphenated citation volumes look
 *  like "1984-1" (4-digit year + short index). */
const DOCKET_VOLUME_REGEX = /^\d{1,2}-\d{4,}$/

/**
 * Check if a case citation has an implausibly large volume number.
 * US reporter volumes rarely exceed ~1000. 5-digit volumes are typically
 * zip codes (e.g., "DC 20006 Counsel for Appellants 20004").
 */
function isImplausibleVolume(citation: Citation): boolean {
  if (citation.type !== "case" && citation.type !== "shortFormCase") return false
  const caseCit = citation as FullCaseCitation | ShortFormCaseCitation
  // Only check purely numeric volumes; hyphenated volumes (strings) are
  // handled by isDocketNumberVolume
  if (typeof caseCit.volume !== "number") return false
  if (caseCit.volume <= MAX_PLAUSIBLE_VOLUME) return false
  // Year-as-volume neutral citations (e.g. `2026 NY Slip Op 01627`,
  // `2024 WL 12345`) routinely exceed the reporter-volume cap. Treat
  // values in the plausible-year window as legitimate volumes; truly
  // large numbers (zip codes ≥ 10000, future-year noise) still flag.
  if (caseCit.volume >= MIN_PLAUSIBLE_YEAR_VOLUME && caseCit.volume <= MAX_PLAUSIBLE_YEAR_VOLUME) {
    return false
  }
  return true
}

/**
 * Check if a hyphenated volume matches a docket-number pattern.
 * Docket numbers have a short prefix and long suffix (e.g., "24-30706").
 * Real hyphenated citation volumes have the opposite shape (e.g., "1984-1").
 */
function isDocketNumberVolume(citation: Citation): boolean {
  if (citation.type !== "case" && citation.type !== "shortFormCase") return false
  const caseCit = citation as FullCaseCitation | ShortFormCaseCitation
  const vol = String(caseCit.volume)
  return DOCKET_VOLUME_REGEX.test(vol)
}

/**
 * Check if a case citation with small volume (1–20) is likely a
 * paragraph/footnote marker misidentified as a citation.
 *
 * After HTML stripping, paragraph markers like "¶2" become bare "2", which the
 * broad state-reporter regex matches as volume + prose-as-reporter + next-number-as-page.
 *
 * For reporters WITHOUT periods: validates against reporters-db when loaded
 * (precise, zero false negatives), falls back to prose-word blocklist.
 *
 * For reporters WITH periods: also validates against reporters-db, since
 * non-reporter abbreviations like "R. Civ. P." and "Fed. R. Civ. P." contain
 * periods but are not real reporters.
 */
function isSuspiciousSmallVolume(citation: Citation): boolean {
  if (citation.type !== "case" && citation.type !== "shortFormCase") return false
  const caseCit = citation as FullCaseCitation | ShortFormCaseCitation
  const vol =
    typeof caseCit.volume === "number"
      ? caseCit.volume
      : Number.parseInt(String(caseCit.volume), 10)
  if (Number.isNaN(vol) || vol < 1 || vol > 20) return false

  const reporter = caseCit.reporter
  if (!reporter) return false

  // Primary: check reporters-db if loaded (works for all reporters)
  const db = getReportersSync()
  if (db) {
    const matches = db.byAbbreviation.get(reporter.toLowerCase()) ?? []
    return matches.length === 0
  }

  // Fallback when reporters-db not loaded:
  // Period-containing reporters are more likely real (F.2d, Cal., Ohio St.)
  // but we can't validate without the db, so let them through
  if (reporter.includes(".")) return false

  // For period-less reporters, use expanded prose-word heuristic
  const words = reporter.toLowerCase().split(/\s+/)
  return words.some((w) => SINGLE_DIGIT_PROSE_WORDS.has(w))
}

/**
 * Issue #582: Federal-rule phantom — `1983 Fed.R.Civ.P. 17(b)` and similar
 * shapes get tokenized by the broad state-reporter regex as `{volume: 1983,
 * reporter: "Fed.R.Civ.P.", page: 17}`. The volume is actually a year that
 * happens to sit next to a federal-rule citation.
 *
 * Post-#576 the federal-rule extractor wins overlap dedup so the phantom
 * never gets emitted in the live pipeline. This check is defense in depth:
 * a `case` whose volume sits in the plausible-year window AND whose
 * reporter is the `Fed. R.` / `Fed.R.` prefix family (Civ.P., Crim.P.,
 * Evid., App.P., Bankr.P.) is unconditionally rejected.
 *
 * Real Federal Reporter series (`Fed. Cl.`, `F. App'x`, `F. Supp.`) are
 * unaffected — the prefix is `Fed. R.` / `Fed.R.` specifically, which is
 * unique to the federal rules of procedure.
 */
const FED_RULE_FAMILY_PREFIX = /^Fed\.\s?R\./i

function isFederalRulePhantom(citation: Citation): boolean {
  if (citation.type !== "case" && citation.type !== "shortFormCase") return false
  const c = citation as FullCaseCitation | ShortFormCaseCitation
  if (typeof c.volume !== "number") return false
  if (c.volume < MIN_PLAUSIBLE_YEAR_VOLUME || c.volume > MAX_PLAUSIBLE_YEAR_VOLUME) return false
  if (!c.reporter) return false
  return FED_RULE_FAMILY_PREFIX.test(c.reporter)
}

/**
 * Issue #547: A `case` (or `shortFormCase`) citation whose original-text span
 * contains a `\n` is a structural false positive.
 *
 * Real reporter abbreviations are atomic — they never wrap a hard line break,
 * and a single citation's volume-reporter-page core is short enough to fit on
 * one line in any reasonable formatting. (Truly OCR-wrapped citations like
 * `F. Sup-\np. 3d` are stitched by `rejoinHyphenatedWords` before whitespace
 * normalization, leaving no `\n` inside the span.) When the cleaner collapses
 * `\n` → space, the broad state-reporter tokenizer can match across the
 * (now-invisible) line break — pulling section headings, form-label lines,
 * or address blocks into a phantom citation. Across 758 case citations in a
 * 100-opinion CAP sample, every cite crossing a newline was a confirmed
 * false positive.
 *
 * Requires the original `text` to inspect the pre-cleaning slice. Returns
 * false when `originalText` is not provided (preserves backward compatibility
 * for callers that hold only the parsed citation).
 */
function isLineCrossingCitation(citation: Citation, originalText?: string): boolean {
  if (!originalText) return false
  if (citation.type !== "case" && citation.type !== "shortFormCase") return false
  const { originalStart, originalEnd } = citation.span
  if (originalStart < 0 || originalEnd > originalText.length || originalEnd <= originalStart) {
    return false
  }
  const nlIdx = originalText.indexOf("\n", originalStart)
  return nlIdx !== -1 && nlIdx < originalEnd
}

/**
 * Check if a citation is a likely false positive (short-circuit, no allocations).
 */
function isFalsePositive(citation: Citation, originalText?: string): boolean {
  const reporter = getReporter(citation)
  if (reporter && BLOCKED_REPORTERS.has(reporter.toLowerCase().trim())) return true
  if (
    reporter &&
    (citation.type === "case" || citation.type === "shortFormCase") &&
    isImplausibleReporter(reporter)
  )
    return true
  if (isImplausibleVolume(citation)) return true
  if (isDocketNumberVolume(citation)) return true
  if (isSuspiciousSmallVolume(citation)) return true
  if (isFederalRulePhantom(citation)) return true
  if (isLineCrossingCitation(citation, originalText)) return true

  const year = getYear(citation)
  if (year !== undefined && year < MIN_PLAUSIBLE_YEAR) return true

  return false
}

/**
 * Collect all false positive reasons for a citation.
 * Returns an empty array if the citation is clean.
 * Only called in penalize mode where we need the reason strings for warnings.
 */
function collectFalsePositiveReasons(citation: Citation, originalText?: string): string[] {
  const reasons: string[] = []

  const reporter = getReporter(citation)
  if (reporter) {
    const normalized = reporter.toLowerCase().trim()
    if (BLOCKED_REPORTERS.has(normalized)) {
      reasons.push(`Reporter "${reporter}" is a known non-US source`)
    }
    if (
      (citation.type === "case" || citation.type === "shortFormCase") &&
      isImplausibleReporter(reporter)
    ) {
      reasons.push(`Reporter "${reporter}" contains prose words or is implausibly long`)
    }
  }

  if (isImplausibleVolume(citation)) {
    const caseCit = citation as FullCaseCitation | ShortFormCaseCitation
    reasons.push(
      `Volume ${caseCit.volume} exceeds maximum plausible volume (${MAX_PLAUSIBLE_VOLUME}) — likely a zip code or other number`,
    )
  }

  if (isDocketNumberVolume(citation)) {
    const caseCit = citation as FullCaseCitation | ShortFormCaseCitation
    reasons.push(
      `Hyphenated volume "${caseCit.volume}" matches docket number pattern — likely a case number, not a citation volume`,
    )
  }

  if (isSuspiciousSmallVolume(citation)) {
    const caseCit = citation as FullCaseCitation | ShortFormCaseCitation
    reasons.push(
      `Small volume (${caseCit.volume}) with unrecognized reporter "${caseCit.reporter}" — likely a paragraph or footnote marker`,
    )
  }

  if (isFederalRulePhantom(citation)) {
    const caseCit = citation as FullCaseCitation | ShortFormCaseCitation
    reasons.push(
      `Year-shaped volume (${caseCit.volume}) with Fed. R. family reporter "${caseCit.reporter}" — likely a federal-rule citation mis-tokenized as case (issue #582)`,
    )
  }

  if (isLineCrossingCitation(citation, originalText)) {
    reasons.push(
      "Citation span crosses a hard line break in the source — likely a section heading, form field, or address mis-tokenized as volume + reporter + page (issue #547)",
    )
  }

  const year = getYear(citation)
  if (year !== undefined && year < MIN_PLAUSIBLE_YEAR) {
    reasons.push(`Year ${year} predates US legal reporting (threshold: ${MIN_PLAUSIBLE_YEAR})`)
  }

  return reasons
}

/** Tracks whether the missing-originalText warning has already fired
 *  to avoid spamming the console on repeated calls. Reset by tests. */
let warnedMissingOriginalText = false

/** @internal — exported for test reset only. */
export function _resetMissingOriginalTextWarning(): void {
  warnedMissingOriginalText = false
}

/**
 * Apply false positive filters to extracted citations.
 *
 * @param citations - Extracted citations (may be mutated in penalize mode)
 * @param remove - If true, remove flagged citations. If false, penalize confidence + add warning.
 * @param originalText - Original (pre-cleaning) source text. **Strongly
 *   recommended** — required for the line-crossing check (#547) which
 *   inspects the raw bytes of the cite span. Passing `undefined`
 *   silently skips the line-crossing FP check, allowing line-crossing
 *   false positives to slip through with default confidence (#606).
 *
 *   When this function is invoked WITHOUT `originalText` AND the input
 *   contains at least one case/shortFormCase citation, a one-time
 *   `console.warn` fires (per process, idempotent across repeated
 *   calls) to alert callers to the silently-skipped check. Pass
 *   `originalText` explicitly to silence the warning, or call
 *   `_resetMissingOriginalTextWarning()` in tests.
 * @returns Filtered array (same reference if remove=false, new array if remove=true and items removed)
 */
export function applyFalsePositiveFilters(
  citations: Citation[],
  remove: boolean,
  originalText?: string,
): Citation[] {
  // Issue #606: warn (once per process) when originalText is omitted
  // AND the input could plausibly contain line-crossing false positives.
  // Line-crossing only applies to case/shortFormCase, so a pure
  // statute/journal/neutral input has nothing to skip.
  if (originalText === undefined && !warnedMissingOriginalText) {
    const hasCaseCite = citations.some(
      (c) => c.type === "case" || c.type === "shortFormCase",
    )
    if (hasCaseCite) {
      warnedMissingOriginalText = true
      // eslint-disable-next-line no-console
      console.warn(
        "[eyecite-ts] applyFalsePositiveFilters: called without `originalText` — line-crossing false-positive check (#547) is silently skipped. Pass the original source text as the 3rd argument to enable it. This warning fires only once per process; see issue #606.",
      )
    }
  }
  // Hard-reject pass: unconditionally drop unambiguous garbage like
  // `<day> <Month> <year>` date misparses (#302). These are never legitimate
  // citations under any policy, so they should not survive even when the
  // caller asked for soft-flag mode.
  const hardFiltered = citations.filter(
    (c) =>
      !isMonthNameDateMisparse(c) &&
      !isMonthInProseReporter(c) &&
      !isImplausibleVolumePageMagnitude(c),
  )

  if (remove) {
    return hardFiltered.filter((c) => !isFalsePositive(c, originalText))
  }

  for (const citation of hardFiltered) {
    // Skip if already penalized (idempotency guard)
    if (citation.confidence === FLAGGED_CONFIDENCE && citation.warnings?.length) continue

    const reasons = collectFalsePositiveReasons(citation, originalText)
    if (reasons.length > 0) {
      citation.confidence = FLAGGED_CONFIDENCE
      const warnings: Warning[] = reasons.map((message) => ({
        level: "warning" as const,
        message,
        position: { start: citation.span.originalStart, end: citation.span.originalEnd },
      }))
      citation.warnings = [...(citation.warnings || []), ...warnings]
      // Strip `fullSpan` on flagged `case` citations (#547). The case-name
      // backward scan that produced fullSpan ran against the same false-
      // positive shape, so the span almost always overshoots into surrounding
      // prose (section headings, form labels, addresses). Removing it lets
      // downstream consumers (annotate, citationBounds, document/proseOffsets)
      // fall back to the cite-core span, which remains internally consistent.
      if (citation.type === "case") {
        const caseCit = citation as FullCaseCitation
        if (caseCit.fullSpan !== undefined) {
          caseCit.fullSpan = undefined
        }
      }
    }
  }

  return hardFiltered
}
