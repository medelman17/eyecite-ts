import type { FullCaseCitation } from "../types/citation"
import type { ResolvedCitation } from "../resolve/types"

/**
 * Options for surrounding context extraction.
 */
export interface ContextOptions {
  /** Boundary type (default: 'sentence') */
  type?: "sentence" | "paragraph"
  /** Max characters to return (default: 500) */
  maxLength?: number
}

/**
 * Result of surrounding context extraction.
 */
export interface SurroundingContext {
  /** The sentence or paragraph text */
  text: string
  /** Absolute character offsets in the source document */
  span: { start: number; end: number }
}

/**
 * A group of citations all referring to the same underlying case.
 *
 * Produced by `groupByCase()` from resolved extraction results.
 * Groups are ordered by first mention in the document.
 */
export interface CaseGroup {
  /** The first full citation encountered for this case */
  primaryCitation: FullCaseCitation
  /** All mentions (full, short, id, supra) in document order */
  mentions: ResolvedCitation[]
  /** Distinct reporter strings: ["550 U.S. 544", "127 S. Ct. 1955"] */
  parallelCitations: string[]
}
