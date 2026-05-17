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
import type { ReasonCode } from "@/score/types"

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
 * Check if a citation is a likely false positive (short-circuit, no allocations).
 */
function isFalsePositive(citation: Citation): boolean {
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

  const year = getYear(citation)
  if (year !== undefined && year < MIN_PLAUSIBLE_YEAR) return true

  return false
}

/**
 * Collect all false positive reasons for a citation.
 * Returns an empty array if the citation is clean.
 * Only called in penalize mode where we need the reason strings for warnings.
 */
function collectFalsePositiveReasons(citation: Citation): string[] {
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

  const year = getYear(citation)
  if (year !== undefined && year < MIN_PLAUSIBLE_YEAR) {
    reasons.push(`Year ${year} predates US legal reporting (threshold: ${MIN_PLAUSIBLE_YEAR})`)
  }

  return reasons
}

function mapFilterReasonToCode(message: string): ReasonCode[] {
  if (message.includes("hyphenated volume")) return ["suspicious_volume"]
  if (message.includes("Small volume")) return ["small_volume"]
  if (message.startsWith("Year ") && message.includes("predates")) return ["year_implausible"]
  if (message.includes("non-US")) return ["blocked_reporter"]
  return []
}

/**
 * Apply false positive filters to extracted citations.
 *
 * @param citations - Extracted citations (may be mutated in penalize mode)
 * @param remove - If true, remove flagged citations. If false, penalize confidence + add warning.
 * @returns Filtered array (same reference if remove=false, new array if remove=true and items removed)
 */
export function applyFalsePositiveFilters(citations: Citation[], remove: boolean): Citation[] {
  // Hard-reject pass: unconditionally drop unambiguous garbage like
  // `<day> <Month> <year>` date misparses (#302). These are never legitimate
  // citations under any policy, so they should not survive even when the
  // caller asked for soft-flag mode.
  const hardFiltered = citations.filter((c) => !isMonthNameDateMisparse(c))

  if (remove) {
    return hardFiltered.filter((c) => !isFalsePositive(c))
  }

  for (const citation of hardFiltered) {
    // Skip if already penalized (idempotency guard)
    if (citation.confidence.score === FLAGGED_CONFIDENCE && citation.warnings?.length) continue

    const reasons = collectFalsePositiveReasons(citation)
    if (reasons.length > 0) {
      // Penalize by clamping the score floor AND appending reason codes
      // so downstream consumers can filter on `reasons` instead of magic 0.1.
      citation.confidence = {
        ...citation.confidence,
        score: Math.min(citation.confidence.score, FLAGGED_CONFIDENCE),
        level: "low",
        reasons: [
          ...citation.confidence.reasons,
          ...reasons.flatMap((r) => mapFilterReasonToCode(r)),
        ],
      }
      const warnings: Warning[] = reasons.map((message) => ({
        level: "warning" as const,
        message,
        position: { start: citation.span.originalStart, end: citation.span.originalEnd },
      }))
      citation.warnings = [...(citation.warnings || []), ...warnings]
    }
  }

  return hardFiltered
}
