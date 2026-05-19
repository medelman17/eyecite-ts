import type { Citation } from "../types/citation"

/**
 * Compute parenthesis depth at the start position of each citation.
 * Walks the raw text once, counting `(` and `)` and recording the
 * running depth at every citation's `span.cleanStart`. Depth > 0
 * indicates the citation is nested inside an open parenthetical
 * block (typically an explanatory `(quoting X)` / `(citing Y)`
 * following an earlier citation).
 *
 * Citations must be sorted by `span.cleanStart`.
 */
export function computeParenDepths(text: string, citations: Citation[]): number[] {
  const depths: number[] = new Array(citations.length).fill(0)
  if (citations.length === 0) return depths

  let depth = 0
  let pos = 0
  for (let i = 0; i < citations.length; i++) {
    const start = citations[i].span.cleanStart
    while (pos < start && pos < text.length) {
      const ch = text[pos]
      if (ch === "(") depth++
      else if (ch === ")" && depth > 0) depth--
      pos++
    }
    depths[i] = depth
  }
  return depths
}
