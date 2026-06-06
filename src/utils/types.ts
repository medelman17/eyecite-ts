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

/**
 * A portable, host-agnostic locator for a citation, in the style of the W3C Web
 * Annotation selectors. Stores the citation as a quote plus surrounding context
 * (TextQuoteSelector) and an offset hint (TextPositionSelector), so it survives
 * edits to the document. Produced by `toDurableLocator`; resolution back to a
 * concrete range is a consumer concern.
 */
export interface DurableLocator {
  /** Schema version. */
  v: 1
  /** Which text the offsets + quote were taken from. */
  space: "original" | "clean"
  /** W3C TextQuoteSelector — the anchor of record. */
  quote: {
    exact: string
    prefix?: string
    suffix?: string
  }
  /** W3C TextPositionSelector — offsets in `space`. Hint/audit; may drift. */
  position: { start: number; end: number }
  /**
   * Document-order ordinal among token-bounded hits of `exact`. Omitted when the
   * span is not a token-bounded hit (e.g. glued inside a longer word).
   */
  occurrence?: number
  /** Stable FNV-1a-64 hex of exact+prefix+suffix — locator identity. */
  contentHash: string
}

/** Options for `toDurableLocator` / `toDurableLocators`. */
export interface DurableLocatorOptions {
  /**
   * Coordinate space. Default "original": `source` must be the text passed to
   * extractCitations. "clean": `source` must be eyecite's cleaned text
   * (e.g. cleanText(input).text).
   */
  space?: "original" | "clean"
  /**
   * Use fullSpan (case name through final parenthetical) when present, else the
   * core span. Default false.
   */
  fullSpan?: boolean
  /** Max characters per context side after sentence-bounding. Default 32. */
  contextLength?: number
}
