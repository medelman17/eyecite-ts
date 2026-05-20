import type { Citation, FullCaseCitation } from "../types/citation"

/**
 * Get the end position of a citation's full extent in cleaned text.
 * Uses fullSpan if available on any citation type (currently only case
 * citations carry fullSpan, but this is future-proof for other types).
 */
export function getCitationEnd(c: Citation): number {
  const fullSpan = "fullSpan" in c ? (c as FullCaseCitation).fullSpan : undefined
  return fullSpan ? fullSpan.cleanEnd : c.span.cleanEnd
}

/**
 * Get the start position of a citation's full extent in cleaned text.
 * Uses fullSpan if available on any citation type.
 */
export function getCitationStart(c: Citation): number {
  const fullSpan = "fullSpan" in c ? (c as FullCaseCitation).fullSpan : undefined
  return fullSpan ? fullSpan.cleanStart : c.span.cleanStart
}

/**
 * Get the end position of a citation's full extent in ORIGINAL text.
 * Mirrors `getCitationEnd` but returns original coordinates — used by
 * consumers that need to slice the user-provided original text rather
 * than the cleaned internal text. Prefers `fullSpan` when available.
 */
export function getCitationOriginalEnd(c: Citation): number {
  const fullSpan = "fullSpan" in c ? (c as FullCaseCitation).fullSpan : undefined
  return fullSpan ? fullSpan.originalEnd : c.span.originalEnd
}

/**
 * Get the start position of a citation's full extent in ORIGINAL text.
 * Mirrors `getCitationStart` but returns original coordinates.
 */
export function getCitationOriginalStart(c: Citation): number {
  const fullSpan = "fullSpan" in c ? (c as FullCaseCitation).fullSpan : undefined
  return fullSpan ? fullSpan.originalStart : c.span.originalStart
}
