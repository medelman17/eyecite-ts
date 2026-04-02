/**
 * Citation Validation and Confidence Scoring
 *
 * Validates citations against the reporter database and adjusts confidence
 * scores based on validation results. Supports degraded mode when database
 * is not loaded.
 *
 * Confidence adjustments:
 * - Reporter match: +0.2 boost
 * - Reporter miss: -0.3 penalty
 * - Ambiguous reporter: -0.1 per extra match
 *
 * @module extract/validation
 */

import type { ReporterEntry, ReportersDatabase } from "@/data/reporters"
import { getReportersSync } from "@/data/reporters"
import type { Citation, Warning } from "@/types/citation"
import type { ExtractOptions } from "./extractCitations"
import { extractCitations } from "./extractCitations"

/**
 * Options for configuring confidence score adjustments
 */
export interface ConfidenceScoringOptions {
  /** Boost applied when reporter matches database (default: +0.2) */
  reporterMatchBoost: number
  /** Penalty applied when reporter not found in database (default: -0.3) */
  reporterMissPenalty: number
  /** Penalty per extra match for ambiguous reporters (default: -0.1) */
  ambiguityPenalty: number
}

/**
 * Citation with reporter validation metadata
 *
 * This type intersects Citation with validation fields, allowing citations
 * to carry optional reporter match information.
 */
export type ValidatedCitation = Citation & {
  /** Matched reporter entry from database (null if no match) */
  reporterMatch?: ReporterEntry | null
  /** Multiple matches for ambiguous reporter abbreviations */
  reporterMatches?: ReporterEntry[]
}

/**
 * Validates a citation against the reporter database and adjusts confidence.
 *
 * Only case citations are validated (they have reporter fields). Other citation
 * types are returned unchanged. If database is not loaded, returns citation
 * as-is (degraded mode).
 *
 * Confidence adjustments:
 * - Exact match (1 reporter): confidence + reporterMatchBoost
 * - No match (0 reporters): confidence + reporterMissPenalty, warning added
 * - Ambiguous (2+ reporters): confidence + (ambiguityPenalty × extra matches)
 *
 * @param citation - Citation to validate
 * @param reportersDb - Reporter database (null for degraded mode)
 * @param options - Optional confidence scoring configuration
 * @returns Validated citation with adjusted confidence
 *
 * @example
 * ```typescript
 * const db = await loadReporters()
 * const validated = await validateAndScore(citation, db)
 * // validated.confidence adjusted based on reporter match
 * // validated.reporterMatch set if found
 * ```
 *
 * @example
 * ```typescript
 * // Degraded mode (no database)
 * const validated = await validateAndScore(citation, null)
 * // Returns citation unchanged
 * ```
 */
export async function validateAndScore(
  citation: Citation,
  reportersDb: ReportersDatabase | null,
  options: Partial<ConfidenceScoringOptions> = {},
): Promise<ValidatedCitation> {
  const opts: ConfidenceScoringOptions = {
    reporterMatchBoost: 0.2,
    reporterMissPenalty: -0.3,
    ambiguityPenalty: -0.1,
    ...options,
  }

  // Only validate case citations (others don't have reporters)
  if (!reportersDb || citation.type !== "case") {
    return citation
  }

  let adjustedConfidence = citation.confidence

  // Case citations have 'reporter' field (discriminated union)
  if ("reporter" in citation && citation.reporter) {
    const matches = reportersDb.byAbbreviation.get(citation.reporter.toLowerCase()) ?? []

    if (matches.length === 0) {
      // No match - penalize confidence and add warning
      adjustedConfidence = Math.max(0, adjustedConfidence + opts.reporterMissPenalty)

      const warning: Warning = {
        level: "warning",
        message: `Reporter "${citation.reporter}" not found in database`,
        position: {
          start: citation.span.originalStart,
          end: citation.span.originalEnd,
        },
      }

      return {
        ...citation,
        confidence: adjustedConfidence,
        reporterMatch: null,
        warnings: [...(citation.warnings ?? []), warning],
      }
    }

    if (matches.length === 1) {
      // Exact match - boost confidence
      adjustedConfidence = Math.min(1.0, adjustedConfidence + opts.reporterMatchBoost)

      return {
        ...citation,
        confidence: adjustedConfidence,
        reporterMatch: matches[0],
      }
    }

    // Ambiguous match (2+ reporters) - fractional penalty
    const penalty = opts.ambiguityPenalty * (matches.length - 1)
    adjustedConfidence = Math.max(0, adjustedConfidence + penalty)

    const warning: Warning = {
      level: "warning",
      message: `Ambiguous reporter: ${matches.map((m) => m.name).join(", ")}`,
      position: {
        start: citation.span.originalStart,
        end: citation.span.originalEnd,
      },
    }

    return {
      ...citation,
      confidence: adjustedConfidence,
      reporterMatches: matches,
      warnings: [...(citation.warnings ?? []), warning],
    }
  }

  return citation
}

/**
 * Extracts citations with optional reporter validation.
 *
 * Convenience function combining extraction and validation. When validation
 * is enabled but database is not loaded, adds info-level warnings but does
 * not fail.
 *
 * @param text - Text to extract citations from
 * @param options - Extraction options
 * @param options.validate - Enable reporter validation (default: false)
 * @param options.cleaners - Custom text cleaners
 * @param options.patterns - Custom regex patterns
 * @returns Array of validated citations
 *
 * @example
 * ```typescript
 * // Extract with validation
 * const citations = await extractWithValidation(text, { validate: true })
 * // Reporter matches boost/penalize confidence
 * ```
 *
 * @example
 * ```typescript
 * // Extract without validation (degraded mode)
 * const citations = await extractWithValidation(text, { validate: false })
 * // Same as extractCitations(text)
 * ```
 *
 * @example
 * ```typescript
 * // Validate true but DB not loaded
 * const citations = await extractWithValidation(text, { validate: true })
 * // Returns citations with info warning about DB not loaded
 * ```
 */
export async function extractWithValidation(
  text: string,
  options: ExtractOptions & { validate?: boolean } = {},
): Promise<ValidatedCitation[]> {
  // Extract citations using standard pipeline
  const citations = extractCitations(text, options)

  // If validation not requested, return as-is
  if (!options.validate) {
    return citations
  }

  // Get database (null if not loaded)
  const reportersDb = getReportersSync()

  // Degraded mode: database not loaded
  if (!reportersDb) {
    return citations.map((c) => {
      const warning: Warning = {
        level: "info",
        message: "Reporter database not loaded; validation skipped",
        position: { start: c.span.originalStart, end: c.span.originalEnd },
      }

      return {
        ...c,
        reporterMatch: null,
        warnings: [...(c.warnings ?? []), warning],
      }
    })
  }

  // Validate and score each citation
  return Promise.all(citations.map((c) => validateAndScore(c, reportersDb)))
}
