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

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const TREATISE_ALTERNATION = KNOWN_TREATISES.map(escapeRegex).join("|")

const TREATISE_REGEX = new RegExp(
  `\\b(\\d+)\\s+(${TREATISE_ALTERNATION})(?:\\s+\\(([^)]+)\\))?\\s+§§?\\s*(\\d+(?:[.:][A-Za-z0-9]+)*(?:\\[[A-Za-z0-9]+\\])?(?:\\([^)]*\\))*)`,
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

  const volume = Number.parseInt(match[1], 10)
  const title = match[2]
  const edition = match[3]
  const section = match[4]
  const year = extractYearFromEdition(edition)

  let spans: TreatiseComponentSpans | undefined
  if (match.indices) {
    const volumeIdx = match.indices[1]
    const titleIdx = match.indices[2]
    const sectionIdx = match.indices[4]
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
