import type { Citation } from "../types/citation"
import type { Span, TransformationMap } from "../types/span"
import {
  getCitationEnd,
  getCitationOriginalEnd,
  getCitationOriginalStart,
  getCitationStart,
} from "../utils/citationBounds"

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
 * text isn't mislabeled as prose. Each output Span carries BOTH clean and
 * original coordinates, derived directly from each citation's clean/original
 * span fields — no `transformationMap` lookup is required because the
 * citations themselves already carry both coordinate systems.
 *
 * Note on adjacency: when two citations are adjacent with no prose between
 * them, this implementation skips setting the map entries silently rather
 * than emitting length-0 spans. Consumers check Map.has() to detect absence.
 *
 * Issue #535 / #536: an earlier version of this function used clean-text
 * coordinates as both `cleanStart/End` and `originalStart/End` on the output
 * spans. That silently broke `text.slice(span.originalStart, span.originalEnd)`
 * for any caller passing original (uncleaned) text — the slice would land
 * at the wrong offset by the cumulative cleaning shift. Both coordinate
 * systems are now tracked independently from each citation's own span.
 */
export function computeProseOffsets(
  text: string,
  citations: Citation[],
  // Kept for API compatibility; positions are derived directly from each
  // citation's clean/original span fields so no lookup map is needed.
  _transformationMap?: TransformationMap,
): ProseOffsetResult {
  const proseSpans: Span[] = []
  const precedingProse = new Map<number, Span>()
  const followingProse = new Map<number, Span>()

  if (citations.length === 0) {
    if (text.length > 0) {
      proseSpans.push(makeSpan(0, text.length, 0, text.length))
    }
    return { proseSpans, precedingProse, followingProse }
  }

  // Sort by clean start. The input is usually already sorted but be safe.
  const indexed = citations.map((c, i) => ({ c, originalIndex: i }))
  indexed.sort((a, b) => getCitationStart(a.c) - getCitationStart(b.c))

  let cleanCursor = 0
  let originalCursor = 0
  for (const { c, originalIndex } of indexed) {
    const cleanStart = getCitationStart(c)
    const cleanEnd = getCitationEnd(c)
    const originalStart = getCitationOriginalStart(c)
    const originalEnd = getCitationOriginalEnd(c)
    if (cleanStart > cleanCursor) {
      const span = makeSpan(cleanCursor, cleanStart, originalCursor, originalStart)
      proseSpans.push(span)
      precedingProse.set(originalIndex, span)
    }
    if (cleanEnd > cleanCursor) {
      cleanCursor = cleanEnd
      originalCursor = originalEnd
    }
  }

  // Trailing prose after the last citation.
  if (cleanCursor < text.length || originalCursor < text.length) {
    // The trailing prose extends to the end of `text` in original coords; the
    // clean trailing end isn't known here, so we use the same delta as the
    // trailing original-text length, mirroring the leading/middle behavior.
    const trailing = makeSpan(
      cleanCursor,
      cleanCursor + (text.length - originalCursor),
      originalCursor,
      text.length,
    )
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

function makeSpan(
  cleanStart: number,
  cleanEnd: number,
  originalStart: number,
  originalEnd: number,
): Span {
  return { cleanStart, cleanEnd, originalStart, originalEnd }
}
