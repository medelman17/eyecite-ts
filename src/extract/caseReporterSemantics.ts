import { getReportersSync } from "@/data/reportersCache"
import type { CourtInference } from "@/types/citation"
import { inferCourtFromReporter } from "./courtInference"
import { normalizeCourt } from "./courtNormalization"

/** Cached current year to avoid Date allocation per extraction call. */
const CURRENT_YEAR = new Date().getFullYear()

/** Common US reporters for confidence boost. Exact match avoids substring false positives. */
export const COMMON_REPORTERS: ReadonlySet<string> = new Set([
  "F.",
  "F.2d",
  "F.3d",
  "F.4th",
  "F.5th",
  "F.6th",
  "F.7th",
  "U.S.",
  "S.Ct.",
  "S. Ct.",
  "L.Ed.",
  "L. Ed.",
  "L.Ed.2d",
  "L. Ed. 2d",
  "L.Ed.3d",
  "L. Ed. 3d",
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
  "So.",
  "So.2d",
  "So. 2d",
  "So.3d",
  "So. 3d",
  "So.4th",
  "So. 4th",
  "Mass.",
  "Va.",
  "Pa.",
  "Idaho",
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

/** SCOTUS `Black` reporter active years. Used to disambiguate `Black.`. */
const SCOTUS_BLACK_REPORTER_START_YEAR = 1861
const SCOTUS_BLACK_REPORTER_END_YEAR = 1862

const OCR_TYPO_ORDINAL_REGEX = /(2|3)(nd|ds|cl|rd)$/i

function applyOcrTypoFix(reporter: string): string | undefined {
  const m = OCR_TYPO_ORDINAL_REGEX.exec(reporter)
  if (!m) return undefined
  const digit = m[1]
  return `${reporter.slice(0, m.index)}${digit}d`
}

/**
 * Resolve a raw reporter literal to its canonical Bluebook form using reporters-db.
 *
 * Returns undefined when reporters-db is not loaded or no edition/variation matches.
 */
export function resolveNormalizedReporter(reporter: string, year?: number): string | undefined {
  const reportersDb = getReportersSync()
  if (!reportersDb) return undefined

  let matches = reportersDb.byAbbreviation.get(reporter.toLowerCase())
  let effectiveReporter = reporter
  if (!matches || matches.length === 0) {
    const fixed = applyOcrTypoFix(reporter)
    if (fixed) {
      const fixedMatches = reportersDb.byAbbreviation.get(fixed.toLowerCase())
      if (fixedMatches && fixedMatches.length > 0) {
        matches = fixedMatches
        effectiveReporter = fixed
      }
    }
    if (!matches || matches.length === 0) return undefined
  }

  const lower = effectiveReporter.toLowerCase()

  if (
    lower === "black." &&
    year !== undefined &&
    year >= SCOTUS_BLACK_REPORTER_START_YEAR &&
    year <= SCOTUS_BLACK_REPORTER_END_YEAR
  ) {
    return "Black"
  }

  for (const entry of matches) {
    for (const editionAbbr of Object.keys(entry.editions)) {
      if (editionAbbr.toLowerCase() === lower) {
        return editionAbbr
      }
    }
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
 * Formula:
 * - base 0.2
 * - +0.3 if reporter is known
 * - +0.2 if year is present and not future
 * - +0.15 if caseName is present
 * - +0.1 if court is present
 * - cap 1.0, rounded to 0.01
 * - blank-page placeholders floor at 0.5
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

export interface CaseReporterCourtSemantics {
  court: string | undefined
  inferredCourt: CourtInference | undefined
}

export function interpretCaseReporterCourtSemantics(
  reporter: string,
  court: string | undefined,
): CaseReporterCourtSemantics {
  const inferredCourt = inferCourtFromReporter(reporter)

  if (!court && inferredCourt?.level === "supreme" && inferredCourt.jurisdiction === "federal") {
    return {
      court: "scotus",
      inferredCourt,
    }
  }

  return {
    court,
    inferredCourt,
  }
}

export interface InterpretCaseReporterSemanticsInput {
  reporter: string
  year: number | undefined
  caseName: string | undefined
  court: string | undefined
  hasBlankPage: boolean
}

export interface CaseReporterSemantics extends CaseReporterCourtSemantics {
  normalizedCourt: string | undefined
  normalizedReporter: string | undefined
  confidence: number
}

export function interpretCaseReporterSemantics(
  input: InterpretCaseReporterSemanticsInput,
): CaseReporterSemantics {
  const { reporter, year, caseName, hasBlankPage } = input
  const { court, inferredCourt } = interpretCaseReporterCourtSemantics(reporter, input.court)
  const normalizedReporter = resolveNormalizedReporter(reporter, year)
  const confidence = computeCaseConfidence({
    reporter,
    year,
    caseName,
    court,
    hasBlankPage,
  })

  return {
    court,
    normalizedCourt: normalizeCourt(court),
    normalizedReporter,
    inferredCourt,
    confidence,
  }
}
