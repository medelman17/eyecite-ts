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
 * California (and a handful of other states) write subsections with an
 * explicit `, subd.` / `, subdivision` / `, paragraph` / `, par.` keyword
 * between the section number and the paren chain: `1238, subd. (a)(8)` is
 * equivalent to `1238(a)(8)`. Strip the keyword tail and inline the
 * paren/bracket chain so downstream SUBSECTION_RE splitting sees a
 * single canonical body. Also collapses internal whitespace between
 * consecutive paren groups so `(a) (8)` → `(a)(8)`. #589
 */
const SUBD_KEYWORD_RE =
  /,?\s+(?:subd\.?|subdivision|paragraphs?|pars?\.)\s+((?:\([^)]*\)|\[[^\]]*\])(?:\s*(?:\([^)]*\)|\[[^\]]*\]))*)/i

function normalizeSubdKeyword(body: string): string {
  const m = SUBD_KEYWORD_RE.exec(body)
  if (!m) return body
  // Collapse interior whitespace between consecutive paren/bracket groups.
  const parens = m[1].replace(/\)\s+\(/g, ")(").replace(/\]\s+\[/g, "][")
  return `${body.slice(0, m.index)}${parens}${body.slice(m.index + m[0].length)}`
}

/**
 * Plain numeric range (`591-99`, `1330-1332`) — used to detect federal
 * `§§ N-M` ranges. State-style hyphenated sections (`19.2-81`, `32A-2-7`)
 * are NOT matched: they either contain a dot (`19.2-81`), have a letter
 * (`32A-2-7`), or have more than one hyphen (`41-2-2`). #564
 */
const PLAIN_NUMERIC_RANGE_RE = /^(\d+)-(\d+)$/

/**
 * Subsection range trailer — `(a)-(b)`, `(9)—(16)`, `(1) – (3)`. The
 * subsection chain may end with a hyphen / en-dash / em-dash followed
 * by another paren group denoting the range endpoint. Captured here so
 * `parseBody` can split it off the chain and surface as a structured
 * `subsectionRange` field; the leading paren group remains the
 * `subsection` for backward compatibility. #591
 *
 * Multi-hyphen form `---` arises after `normalizeDashes` rewrites a
 * standalone em-dash (`(9) — (16)`) to `(9) --- (16)`. Accept any run
 * of dashes / unicode dash variants so the cleaned form still matches.
 */
const SUBSECTION_RANGE_TRAILER_RE = /\s*[-–—]+\s*(\([A-Za-z0-9]+\))$/

export interface ParsedBody {
  section: string
  /** Structured range end when section is a plain numeric range. #564 */
  sectionRangeEnd?: string
  subsection?: string
  /** Structured range end when subsection chain ends with `-(N)`. #591 */
  subsectionRangeEnd?: string
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

  // Normalize CA-style keyword subsections (`, subd. (a)(8)`) to canonical
  // paren-chain (`(a)(8)`) before splitting. #589
  let normalized = normalizeSubdKeyword(stripped)

  // Detect a trailing subsection range (`(a)-(b)`, `(9)—(16)`) BEFORE
  // collapsing inter-paren whitespace and BEFORE the SUBSECTION_RE split.
  // The collapsing step would otherwise turn `(9) — (16)` into `(9)—(16)`
  // and leave the dash inside the chain, which SUBSECTION_RE cannot
  // express. #591
  let subsectionRangeEnd: string | undefined
  const rangeTailMatch = SUBSECTION_RANGE_TRAILER_RE.exec(normalized)
  // Only treat as a range when the leading char of the dash trailer is
  // preceded by `)` (i.e. the dash sits between two paren groups, not
  // inside the section body like `19.2-81`). Strip the trailer from
  // the body and remember the end endpoint for the caller.
  if (rangeTailMatch && /\)\s*$/.test(normalized.slice(0, rangeTailMatch.index))) {
    subsectionRangeEnd = rangeTailMatch[1]
    normalized = normalized.slice(0, rangeTailMatch.index)
  }

  // Collapse whitespace between consecutive paren/bracket subsection groups
  // (`(a) (8)` → `(a)(8)`, `[a] [b]` → `[a][b]`) so SUBSECTION_RE's
  // contiguous-paren alternation matches the full chain. Some patterns
  // emit space-separated paren groups (`OCGA § 15-11-2 (8) (A)`) — without
  // this normalization the second `(A)` was sliced off. #590
  normalized = normalized.replace(/\)\s+\(/g, ")(").replace(/\]\s+\[/g, "][")

  // Split section from subsections: "1983(a)(1)" → section="1983", subsection="(a)(1)"
  const trimmed = normalized.trim()
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
      subsectionRangeEnd,
      hasEtSeq,
    }
  }

  return { section: sectionBody, sectionRangeEnd, subsectionRangeEnd, hasEtSeq }
}
