import type { Citation, CitationId } from "../types/citation"

/**
 * Assign a stable, per-result identity (`c0`, `c1`, …) to each citation, in
 * place, in document order.
 *
 * Call once from `extractCitations()` AFTER all synthesis, filtering, and
 * sorting are complete (so the set is total and dense) and BEFORE resolution
 * (which records references by id). The numeric suffix matches the citation's
 * position in the returned array at extraction time, but callers must treat the
 * id as opaque — it is stable across downstream `filter`/`sort`/`map`, whereas
 * array position is not. See {@link CitationId}.
 */
export function assignCitationIds(citations: Citation[]): void {
  for (let i = 0; i < citations.length; i++) {
    citations[i].id = `c${i}` as CitationId
  }
}

/**
 * Build a lookup from {@link CitationId} to its citation. Citations without an
 * id (e.g. produced by the granular per-type extractors rather than by
 * `extractCitations()`) are skipped. The map keys by stable id, so it keeps
 * working after the caller has `filter`/`sort`/`map`-ed the array.
 */
export function byId(citations: Citation[]): Map<CitationId, Citation> {
  const map = new Map<CitationId, Citation>()
  for (const citation of citations) {
    if (citation.id !== undefined) {
      map.set(citation.id, citation)
    }
  }
  return map
}
