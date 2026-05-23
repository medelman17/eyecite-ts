/**
 * Treatise Citation Extraction (#579)
 *
 * Parses tokenized treatise citations into the `treatise` citation type.
 * The pattern layer enforces a known-treatise allowlist; this extractor
 * captures the volume, title, optional edition parenthetical, section,
 * and (when parseable) the publication year.
 *
 * @module extract/extractTreatise
 */

import type { Token } from "@/tokenize"
import type { TreatiseCitation } from "@/types/citation"
import type { TreatiseComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { isPlausibleYear } from "./dates"

/**
 * Same canonical-title list as `secondaryAuthorityPatterns.ts`. Kept in
 * sync because the extractor re-runs the matching regex (with the `d`
 * flag) to recover capture group indices.
 */
const KNOWN_TREATISES: ReadonlyArray<string> = [
  "Wright & Miller, Federal Practice and Procedure",
  "Moore's Federal Practice",
  "Moore's Federal Practice 3d",
  "Williston on Contracts",
  "Corbin on Contracts",
  "Nimmer on Copyright",
  "McCarthy on Trademarks and Unfair Competition",
  "Witkin, Cal. Procedure",
  "Witkin, Summary of California Law",
  "Prosser and Keeton on the Law of Torts",
  "Wigmore on Evidence",
  "McCormick on Evidence",
  "LaFave & Israel, Criminal Procedure",
  "LaFave, Criminal Law",
  "Davis & Pierce, Administrative Law Treatise",
]

/** Bare-title alternation for author-prefixed form (#643). Mirrors the
 *  list in src/patterns/secondaryAuthorityPatterns.ts. */
const KNOWN_TREATISE_BARE_TITLES: ReadonlyArray<string> = [
  "Federal Practice and Procedure",
  "Cal. Procedure",
  "Summary of California Law",
  "Criminal Procedure",
  "Criminal Law",
  "Administrative Law Treatise",
]

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const TREATISE_ALTERNATION = KNOWN_TREATISES.map(escapeRegex).join("|")
const TREATISE_BARE_TITLE_ALTERNATION = KNOWN_TREATISE_BARE_TITLES.map(escapeRegex).join("|")

// Mirrors the tokenizer regex in secondaryAuthorityPatterns.ts. Two
// title shapes (group 2 = bare title with prefix-author, group 3 =
// compact title) and an edition paren (group 4), section (group 5).
// Group 2 = compact title, group 3 = bare title (author-prefixed).
// Exactly one is populated per match.
const TREATISE_REGEX = new RegExp(
  `\\b(\\d+[A-Z]?)\\s+(?:` +
    `(${TREATISE_ALTERNATION})` +
    `|(?:[A-Z][A-Za-z.]*(?:\\s+[A-Z][A-Za-z.]*)*(?:\\s*&\\s*[A-Z][A-Za-z.]*(?:\\s+[A-Z][A-Za-z.]*)*)?,\\s+)(${TREATISE_BARE_TITLE_ALTERNATION})` +
    `)(?:\\s+\\(([^)]+)\\))?\\s+§§?\\s*(\\d+(?:[.:][A-Za-z0-9]+)*(?:\\[[A-Za-z0-9]+\\])?(?:\\([^)]*\\))*)`,
  "d",
)

/**
 * Extract publication year from an edition parenthetical like
 * `5th ed. 2008` or `2d ed. 2010`. Returns `undefined` if no year fits
 * the plausible-year window.
 */
function extractYearFromEdition(edition: string | undefined): number | undefined {
  if (!edition) return undefined
  const yearMatch = /(\d{4})/.exec(edition)
  if (!yearMatch) return undefined
  const year = Number.parseInt(yearMatch[1], 10)
  return isPlausibleYear(year) ? year : undefined
}

export function extractTreatise(
  token: Token,
  transformationMap: TransformationMap,
): TreatiseCitation {
  const { text, span } = token

  const match = TREATISE_REGEX.exec(text)
  if (!match) {
    throw new Error(`Failed to parse treatise citation: ${text}`)
  }

  // Volume now admits an optional letter suffix (`5A`). Parse only the
  // numeric prefix for the structured volume field; the letter suffix is
  // preserved in the text span. #643
  const volNumMatch = /^(\d+)/.exec(match[1])
  const volume = volNumMatch ? Number.parseInt(volNumMatch[1], 10) : 0
  // Title shape: group 2 = bare title (with author prefix), group 3 =
  // compact title (no author prefix). Exactly one is populated.
  const title = match[2] ?? match[3]
  const edition = match[4]
  const section = match[5]
  const year = extractYearFromEdition(edition)

  let spans: TreatiseComponentSpans | undefined
  if (match.indices) {
    const volumeIdx = match.indices[1]
    const titleIdx = match.indices[2] ?? match.indices[3]
    const sectionIdx = match.indices[5]
    if (volumeIdx && titleIdx && sectionIdx) {
      spans = {
        volume: spanFromGroupIndex(span.cleanStart, volumeIdx, transformationMap),
        title: spanFromGroupIndex(span.cleanStart, titleIdx, transformationMap),
        section: spanFromGroupIndex(span.cleanStart, sectionIdx, transformationMap),
      }
    }
  }

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  return {
    type: "treatise",
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence: 0.9,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    volume,
    title,
    section,
    edition,
    year,
    spans,
  }
}
