import type { Citation } from "@/types/citation"
import type { FootnoteMap } from "./types"

/**
 * Tag citations with footnote metadata by looking up each citation's
 * clean-text span position in the footnote zone map.
 *
 * Uses binary search on the sorted FootnoteMap for O(log n) lookup per citation.
 * Mutates citations in place.
 *
 * @param citations - Citations to tag (mutated in place)
 * @param footnoteMap - Footnote zones in clean-text coordinates, sorted by start
 */
export function tagCitationsWithFootnotes(
  citations: Citation[],
  footnoteMap: FootnoteMap,
): void {
  if (footnoteMap.length === 0) return

  for (const citation of citations) {
    const pos = citation.span.cleanStart

    let lo = 0
    let hi = footnoteMap.length - 1

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      const zone = footnoteMap[mid]

      if (pos < zone.start) {
        hi = mid - 1
      } else if (pos >= zone.end) {
        lo = mid + 1
      } else {
        citation.inFootnote = true
        citation.footnoteNumber = zone.footnoteNumber
        break
      }
    }
  }
}
