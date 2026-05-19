import type { Citation } from "../types/citation"
import type { Span, TransformationMap } from "../types/span"
import { getCitationEnd, getCitationStart } from "../utils/citationBounds"

interface ProseOffsetResult {
  proseSpans: Span[]
  precedingProse: Map<number, Span>
  followingProse: Map<number, Span>
}

/**
 * Compute the inverse complement of citation spans within text.
 *
 * Returns:
 *   - proseSpans: prose between citations + before-first + after-last
 *   - precedingProse: Map<citationIndex, Span> — the prose ending at this cite
 *   - followingProse: Map<citationIndex, Span> — the prose starting after this cite
 *
 * Uses `fullSpan` when available (case-family citations) so the case-name
 * text isn't mislabeled as prose. When no transformationMap is provided,
 * cleanStart === originalStart on the output spans (best effort).
 *
 * Note on adjacency: when two citations are adjacent with no prose between
 * them, this implementation skips setting the map entries silently rather
 * than emitting length-0 spans. Consumers check Map.has() to detect absence.
 */
export function computeProseOffsets(
  text: string,
  citations: Citation[],
  _transformationMap?: TransformationMap,
): ProseOffsetResult {
  const proseSpans: Span[] = []
  const precedingProse = new Map<number, Span>()
  const followingProse = new Map<number, Span>()

  if (citations.length === 0) {
    if (text.length > 0) {
      proseSpans.push(makeSpan(0, text.length))
    }
    return { proseSpans, precedingProse, followingProse }
  }

  // Sort by citation start. The input is usually already sorted but be safe.
  const indexed = citations.map((c, i) => ({ c, originalIndex: i }))
  indexed.sort((a, b) => getCitationStart(a.c) - getCitationStart(b.c))

  let cursor = 0
  for (const { c, originalIndex } of indexed) {
    const start = getCitationStart(c)
    const end = getCitationEnd(c)
    if (start > cursor) {
      const span = makeSpan(cursor, start)
      proseSpans.push(span)
      precedingProse.set(originalIndex, span)
    }
    cursor = Math.max(cursor, end)
  }

  // Trailing prose after the last citation.
  if (cursor < text.length) {
    const trailing = makeSpan(cursor, text.length)
    proseSpans.push(trailing)
    const lastIdx = indexed[indexed.length - 1].originalIndex
    followingProse.set(lastIdx, trailing)
  }

  // Build followingProse for intermediate citations: it's the precedingProse
  // of the next citation in document order.
  for (let i = 0; i < indexed.length - 1; i++) {
    const nextOriginalIdx = indexed[i + 1].originalIndex
    const nextPreceding = precedingProse.get(nextOriginalIdx)
    if (nextPreceding) {
      followingProse.set(indexed[i].originalIndex, nextPreceding)
    }
  }

  return { proseSpans, precedingProse, followingProse }
}

function makeSpan(start: number, end: number): Span {
  return {
    cleanStart: start,
    cleanEnd: end,
    originalStart: start,
    originalEnd: end,
  }
}
