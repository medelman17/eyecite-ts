/**
 * Statutes at Large Citation Extractor
 *
 * Extracts session law citations from the Statutes at Large (e.g., "124 Stat. 119").
 * These are chronological compilations of federal laws, distinct from both
 * codified statutes (U.S.C.) and case reporters.
 *
 * Format: volume Stat. page [(year)]
 *
 * @module extract/extractStatutesAtLarge
 */

import type { Token } from "@/tokenize/tokenizer"
import type { StatutesAtLargeCitation } from "@/types/citation"
import type { StatutesAtLargeComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { isPlausibleYear } from "./dates"

/**
 * Trailing pincite for Statutes at Large citations (#639). The tokenizer
 * pattern only captures `<vol> Stat. <page>`, so a comma-separated pincite
 * (`100 Stat. 3743, 3755`) lives in `cleanedText` immediately after
 * `span.cleanEnd`. Scan that tail for `, NNN[-MM]`.
 *
 * Boundary: the lookahead must reject `\s+[A-Z]` so a following parallel
 * cite (`100 Stat. 3743, 42 U.S.C. § 1983`) is not absorbed as a pincite.
 * Terminator set mirrors LOOKAHEAD_PINCITE_REGEX in extractCase.ts: accept
 * end-of-string, sentence punctuation, brackets/parens, or whitespace not
 * followed by a capital letter.
 */
// Pincite accepts comma-grouped digits (`1,234` and `1,234,567`) on
// both endpoints. Stat. pages routinely exceed 10,000 so commas in the
// pincite are common.
const SAL_PINCITE_REGEX =
  /^,\s*(\d{1,3}(?:,\d{3})+|\d+)(?:[-–—](\d{1,3}(?:,\d{3})+|\d+))?(?=$|[.,:;)([\]»"'“”‘’]|\s(?![A-Z]))/

export function extractStatutesAtLarge(
  token: Token,
  transformationMap: TransformationMap,
  cleanedText?: string,
): StatutesAtLargeCitation {
  const { text, span } = token

  // Parse volume-Stat.-page. Page accepts thousands-grouping commas.
  const statRegex = /^(\d+(?:-\d+)?)\s+Stat\.\s+(\d{1,3}(?:,\d{3})+|\d+)/d
  const match = statRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse Statutes at Large citation: ${text}`)
  }

  const rawVolume = match[1]
  const volume = /^\d+$/.test(rawVolume) ? Number.parseInt(rawVolume, 10) : rawVolume
  // Strip thousands-grouping commas before integer parse.
  const page = Number.parseInt(match[2].replace(/,/g, ""), 10)

  let spans: StatutesAtLargeComponentSpans | undefined
  if (match.indices) {
    spans = {
      volume: spanFromGroupIndex(span.cleanStart, match.indices[1]!, transformationMap),
      page: spanFromGroupIndex(span.cleanStart, match.indices[2]!, transformationMap),
    }
  }

  // Trailing pincite from cleanedText after the token. (#639)
  let pincite: number | undefined
  let pinciteEndPage: number | undefined
  let pinciteIsRange: boolean | undefined
  let pinciteConsumed = 0
  if (cleanedText) {
    const after = cleanedText.substring(span.cleanEnd)
    const pinciteMatch = SAL_PINCITE_REGEX.exec(after)
    if (pinciteMatch) {
      // Strip thousands-grouping commas before integer parse.
      const rawStart = pinciteMatch[1]
      const rawStartDigits = rawStart.replace(/,/g, "")
      pincite = Number.parseInt(rawStartDigits, 10)
      pinciteConsumed = pinciteMatch[0].length
      if (pinciteMatch[2]) {
        const rawEnd = pinciteMatch[2]
        const rawEndDigits = rawEnd.replace(/,/g, "")
        // Abbreviated end pages: "3755-58" means 3758. Use digit-string
        // lengths (post-comma-strip) to detect abbreviation.
        if (rawEndDigits.length < rawStartDigits.length) {
          const prefix = rawStartDigits.slice(0, rawStartDigits.length - rawEndDigits.length)
          pinciteEndPage = Number.parseInt(prefix + rawEndDigits, 10)
        } else {
          pinciteEndPage = Number.parseInt(rawEndDigits, 10)
        }
        pinciteIsRange = true
      }
    }
  }

  // Extract optional year in parentheses.
  // Plausibility filter (#523): drop OCR-mangled or page-number years.
  // Scan window includes any text the pincite consumed so `100 Stat. 3743,
  // 3755 (1986)` still attaches the year.
  const yearScanText = cleanedText
    ? text + cleanedText.substring(span.cleanEnd, span.cleanEnd + pinciteConsumed + 16)
    : text
  const yearRegex = /\((?:.*?\s)?(\d{4})\)/
  const yearMatch = yearRegex.exec(yearScanText)
  const rawYear = yearMatch ? Number.parseInt(yearMatch[1], 10) : undefined
  const year = rawYear !== undefined && isPlausibleYear(rawYear) ? rawYear : undefined

  // Translate positions from clean → original
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Confidence: 0.9 (Statutes at Large format is standardized)
  const confidence = 0.9

  return {
    type: "statutesAtLarge",
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    volume,
    page,
    pincite,
    pinciteEndPage,
    pinciteIsRange,
    year,
    spans,
  }
}
