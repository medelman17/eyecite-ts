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
])

/**
 * Get the reporter string to check against the blocklist.
 * Returns undefined for citation types that don't have a reporter,
 * or for short-form types (id, supra, shortFormCase) which inherit
 * their reporter from an antecedent — filtering the antecedent is sufficient.
 */
function getReporter(citation: Citation): string | undefined {
  if (citation.type === "case") return (citation as FullCaseCitation).reporter
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
  "the", "a", "an", "in", "on", "at", "but", "and", "for", "by", "to",
  "with", "from", "as", "if", "so", "nor", "yet", "not", "no", "then",
  "when", "where", "who", "what", "how", "that", "this", "these", "those",
  // Pronouns
  "he", "she", "it", "they", "we", "his", "her", "its", "their", "our",
  // Common verbs
  "was", "were", "is", "are", "has", "had", "been", "being",
  "did", "does", "do", "may", "shall", "will", "would", "could", "should",
  "held", "said", "found", "made", "took", "gave", "see", "also",
  // Month names (after HTML stripping, "¶2 In July 2016" → "2 In July 2016")
  "january", "february", "march", "april", "june",
  "july", "august", "september", "october", "november", "december",
])

/** Maximum plausible volume number for US reporters.
 *  The most prolific reporters (F. Supp. 3d, F.3d) have volumes in the
 *  low-to-mid hundreds. 2000 gives generous headroom while still catching
 *  zip codes (5-digit numbers like 20006) and other non-citation numbers. */
const MAX_PLAUSIBLE_VOLUME = 2000

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
  if (citation.type !== "case") return false
  const caseCit = citation as FullCaseCitation
  // Only check purely numeric volumes; hyphenated volumes (strings) are
  // handled by isDocketNumberVolume
  if (typeof caseCit.volume !== "number") return false
  return caseCit.volume > MAX_PLAUSIBLE_VOLUME
}

/**
 * Check if a hyphenated volume matches a docket-number pattern.
 * Docket numbers have a short prefix and long suffix (e.g., "24-30706").
 * Real hyphenated citation volumes have the opposite shape (e.g., "1984-1").
 */
function isDocketNumberVolume(citation: Citation): boolean {
  if (citation.type !== "case") return false
  const caseCit = citation as FullCaseCitation
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
  if (citation.type !== "case") return false
  const caseCit = citation as FullCaseCitation
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
  if (reporter && citation.type === "case" && isImplausibleReporter(reporter)) return true
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
    if (citation.type === "case" && isImplausibleReporter(reporter)) {
      reasons.push(`Reporter "${reporter}" contains prose words or is implausibly long`)
    }
  }

  if (isImplausibleVolume(citation)) {
    const caseCit = citation as FullCaseCitation
    reasons.push(
      `Volume ${caseCit.volume} exceeds maximum plausible volume (${MAX_PLAUSIBLE_VOLUME}) — likely a zip code or other number`,
    )
  }

  if (isDocketNumberVolume(citation)) {
    const caseCit = citation as FullCaseCitation
    reasons.push(
      `Hyphenated volume "${caseCit.volume}" matches docket number pattern — likely a case number, not a citation volume`,
    )
  }

  if (isSuspiciousSmallVolume(citation)) {
    const caseCit = citation as FullCaseCitation
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

/**
 * Apply false positive filters to extracted citations.
 *
 * @param citations - Extracted citations (may be mutated in penalize mode)
 * @param remove - If true, remove flagged citations. If false, penalize confidence + add warning.
 * @returns Filtered array (same reference if remove=false, new array if remove=true and items removed)
 */
export function applyFalsePositiveFilters(citations: Citation[], remove: boolean): Citation[] {
  if (remove) {
    return citations.filter((c) => !isFalsePositive(c))
  }

  for (const citation of citations) {
    // Skip if already penalized (idempotency guard)
    if (citation.confidence === FLAGGED_CONFIDENCE && citation.warnings?.length) continue

    const reasons = collectFalsePositiveReasons(citation)
    if (reasons.length > 0) {
      citation.confidence = FLAGGED_CONFIDENCE
      const warnings: Warning[] = reasons.map((message) => ({
        level: "warning" as const,
        message,
        position: { start: citation.span.originalStart, end: citation.span.originalEnd },
      }))
      citation.warnings = [...(citation.warnings || []), ...warnings]
    }
  }

  return citations
}
