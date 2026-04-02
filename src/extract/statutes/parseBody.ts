/**
 * Shared body-parsing utilities for statute extractors.
 *
 * Extracts section number, subsection chain, and et seq. indicator
 * from the "body" portion of a tokenized statute citation.
 *
 * @module extract/statutes/parseBody
 */

/** Separate subsection chain from section number */
const SUBSECTION_RE = /^([^(]+?)\s*((?:\([^)]*\))*)$/

/** Et seq. at end of string */
const ET_SEQ_RE = /\s*et\s+seq\.?\s*$/i

export interface ParsedBody {
  section: string
  subsection?: string
  hasEtSeq: boolean
}

/**
 * Parse a raw body string into section, subsection, and et seq.
 *
 * @example
 * parseBody("1983(a)(1) et seq.") → { section: "1983", subsection: "(a)(1)", hasEtSeq: true }
 * parseBody("122.26(b)(14)")      → { section: "122.26", subsection: "(b)(14)", hasEtSeq: false }
 * parseBody("1983")               → { section: "1983", hasEtSeq: false }
 */
export function parseBody(rawBody: string): ParsedBody {
  // Strip et seq. — single replace + compare (avoids double regex execution)
  const stripped = rawBody.replace(ET_SEQ_RE, "")
  const hasEtSeq = stripped !== rawBody

  // Split section from subsections: "1983(a)(1)" → section="1983", subsection="(a)(1)"
  const trimmed = stripped.trim()
  const subMatch = SUBSECTION_RE.exec(trimmed)
  const subGroups = subMatch?.[2]

  if (subMatch !== null && subGroups) {
    return {
      section: subMatch[1].trim(),
      subsection: subGroups,
      hasEtSeq,
    }
  }

  return { section: trimmed, hasEtSeq }
}
