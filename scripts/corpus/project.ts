import { extractCitations } from "../../src/index"
import type { ResolvedCitation } from "../../src/resolve/types"
import type { Citation } from "../../src/types/citation"

/** One citation reduced to its behavior-defining fields. */
export interface CitationProjection {
  type: string
  /** Normalized locator = the matched citation text (stable, readable, and the
   *  `resolvedTo` reference). Not parsed. */
  key: string
  /** Core span in original coordinates: [start, end). */
  span: [number, number]
  /** The resolved antecedent's `key`, or null (full cites + unresolved short forms). */
  resolvedTo: string | null
}

export interface OpinionProjection {
  id: number
  count: number
  citations: CitationProjection[]
}

const keyOf = (c: Citation): string => c.matchedText

/** Pure, deterministic projection of one opinion's extraction + resolution. */
export function projectOpinion(id: number, text: string): OpinionProjection {
  const cites = extractCitations(text, { resolve: true }) as ResolvedCitation[]
  const keys = cites.map(keyOf)
  return {
    id,
    count: cites.length,
    citations: cites.map((c, i) => {
      const idx = c.resolution?.resolvedTo
      const resolvedTo =
        typeof idx === "number" && idx >= 0 && idx < keys.length ? keys[idx] : null
      return {
        type: c.type,
        key: keys[i],
        span: [c.span.originalStart, c.span.originalEnd],
        resolvedTo,
      }
    }),
  }
}
