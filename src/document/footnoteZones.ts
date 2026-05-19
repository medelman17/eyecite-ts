import type { Citation } from "../types/citation"
import type { AnalyzedFootnoteZone } from "./types"

/**
 * Extract footnote zones from citations that carry footnote tagging.
 * Returns undefined when no citation has `inFootnote: true` — meaning
 * `extractCitations` was not invoked with `detectFootnotes: true` or no
 * footnotes were detected.
 *
 * Each zone aggregates the citation indices that fall within it. The
 * start/end coordinates are derived from the citations' spans (the
 * outermost original-text bounds of the footnote's citations).
 */
export function extractFootnoteZones(citations: Citation[]): AnalyzedFootnoteZone[] | undefined {
  // Bucket by footnoteNumber.
  const buckets = new Map<number, number[]>()
  for (let i = 0; i < citations.length; i++) {
    const c = citations[i]
    if (!c.inFootnote || c.footnoteNumber === undefined) continue
    const members = buckets.get(c.footnoteNumber) ?? []
    members.push(i)
    buckets.set(c.footnoteNumber, members)
  }

  if (buckets.size === 0) return undefined

  const zones: AnalyzedFootnoteZone[] = []
  for (const [footnoteNumber, citationIndices] of buckets) {
    // Span: outermost original-text coords of the footnote's citations.
    let start = Number.POSITIVE_INFINITY
    let end = 0
    for (const idx of citationIndices) {
      start = Math.min(start, citations[idx].span.originalStart)
      end = Math.max(end, citations[idx].span.originalEnd)
    }
    zones.push({ start, end, footnoteNumber, citationIndices })
  }

  // Sort by start position.
  zones.sort((a, b) => a.start - b.start)
  return zones
}
