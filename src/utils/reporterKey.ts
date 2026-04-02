import type { FullCaseCitation } from "../types/citation"

/**
 * Format a volume-reporter-page key from citation fields.
 */
function formatKey(
  volume: number | string,
  reporter: string,
  page: number | undefined,
): string {
  if (page === undefined) {
    return `${volume} ${reporter}`
  }
  return `${volume} ${reporter} ${page}`
}

/**
 * Extract the volume-reporter-page lookup key from a case citation.
 *
 * Strips case name, pincite, year, and parenthetical.
 * Uses `normalizedReporter` when available, falls back to `reporter`.
 * Omits the page for blank-page citations.
 *
 * @example
 * ```typescript
 * toReporterKey(citation) // "550 U.S. 544"
 * ```
 */
export function toReporterKey(citation: FullCaseCitation): string {
  const reporter = citation.normalizedReporter ?? citation.reporter
  const page = citation.hasBlankPage ? undefined : citation.page
  return formatKey(citation.volume, reporter, page)
}

/**
 * Extract all volume-reporter-page lookup keys from a case citation,
 * including parallel citations.
 *
 * Returns the primary key first, followed by any parallel citation keys.
 *
 * @example
 * ```typescript
 * toReporterKeys(citation) // ["410 U.S. 113", "93 S. Ct. 705"]
 * ```
 */
export function toReporterKeys(citation: FullCaseCitation): string[] {
  const keys = [toReporterKey(citation)]

  if (citation.parallelCitations?.length) {
    for (const p of citation.parallelCitations) {
      keys.push(formatKey(p.volume, p.reporter, p.page))
    }
  }

  return keys
}
