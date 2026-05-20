/**
 * Shared body-parsing utilities for statute extractors.
 *
 * Extracts section number, subsection chain, and et seq. indicator
 * from the "body" portion of a tokenized statute citation.
 *
 * @module extract/statutes/parseBody
 */

/** Separate subsection chain from section number.
 * Accepts both `(...)` and `[...]` — MSA uses bracket subscripts
 * (`23.710[252]`) interchangeably with parens (`23.710(252)`). #370 */
const SUBSECTION_RE = /^([^([]+?)\s*((?:\([^)]*\)|\[[^\]]*\])*)$/

/** Et seq. at end of string */
const ET_SEQ_RE = /\s*et\s+seq\.?\s*$/i

/**
 * Plain numeric range (`591-99`, `1330-1332`) — used to detect federal
 * `§§ N-M` ranges. State-style hyphenated sections (`19.2-81`, `32A-2-7`)
 * are NOT matched: they either contain a dot (`19.2-81`), have a letter
 * (`32A-2-7`), or have more than one hyphen (`41-2-2`). #564
 */
const PLAIN_NUMERIC_RANGE_RE = /^(\d+)-(\d+)$/

export interface ParsedBody {
  section: string
  /** Structured range end when section is a plain numeric range. #564 */
  sectionRangeEnd?: string
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

  const sectionBody = subMatch !== null && subGroups ? subMatch[1].trim() : trimmed

  // Detect plain numeric range (e.g. `591-99`, `1330-1332`). Callers may use
  // this to populate `sectionRange` and reset `section` to the start. #564
  const rangeMatch = PLAIN_NUMERIC_RANGE_RE.exec(sectionBody)
  const sectionRangeEnd = rangeMatch ? rangeMatch[2] : undefined

  if (subMatch !== null && subGroups) {
    return {
      section: sectionBody,
      sectionRangeEnd,
      subsection: subGroups,
      hasEtSeq,
    }
  }

  return { section: sectionBody, sectionRangeEnd, hasEtSeq }
}
