/**
 * Resolution Type System
 *
 * Types for document-scoped citation resolution that tracks antecedent history
 * and resolves short-form citations (Id./supra/short-form case) to their full forms.
 */

import type { FootnoteMap } from "../footnotes/types"
import type { Citation, ShortFormCitation } from "../types/citation"

/**
 * Scope boundary strategy for resolution.
 * Determines how far back to search for antecedent citations.
 */
export type ScopeStrategy = "paragraph" | "section" | "footnote" | "none"

/**
 * Options for citation resolution.
 */
export interface ResolutionOptions {
  /**
   * Scope boundary strategy (default: 'none')
   * - none: Resolve across entire document (recommended for HTML-stripped text)
   * - paragraph: Only resolve within same paragraph (too restrictive for most inputs)
   * - section: Only resolve within same section
   * - footnote: Only resolve within same footnote
   */
  scopeStrategy?: ScopeStrategy

  /**
   * Auto-detect paragraph boundaries from text (default: true)
   * Uses paragraphBoundaryPattern to split text
   */
  autoDetectParagraphs?: boolean

  /**
   * Regex pattern to detect paragraph boundaries (default: /\n\n+/)
   * Only used if autoDetectParagraphs is true
   */
  paragraphBoundaryPattern?: RegExp

  /**
   * Enable fuzzy party name matching for supra resolution (default: true)
   * Uses Levenshtein distance to handle typos and variations
   */
  fuzzyPartyMatching?: boolean

  /**
   * Similarity threshold for fuzzy party matching (default: 0.8)
   * Range: 0-1 where 1.0 is exact match
   * Only used if fuzzyPartyMatching is true
   */
  partyMatchThreshold?: number

  /**
   * Allow Id. citations to resolve to other short-form citations (default: false)
   * If true: "Smith v. Jones, 500 F.2d 100" -> "Id." -> "Id. at 105"
   * If false: Second Id. fails to resolve (no full citation between them)
   */
  allowNestedResolution?: boolean

  /**
   * Report unresolved citations with failure reasons (default: true)
   * If false: resolution field will be undefined for unresolved citations
   */
  reportUnresolved?: boolean

  /**
   * Footnote zone map for footnote-aware scoping.
   * When scopeStrategy is "footnote" and this is provided, citations are
   * scoped by footnote zones instead of paragraphs.
   */
  footnoteMap?: FootnoteMap | undefined
}

/**
 * Result of resolving a short-form citation.
 */
export interface ResolutionResult {
  /**
   * Index of the citation this resolves to.
   * undefined if resolution failed
   */
  resolvedTo?: number

  /**
   * Reason for resolution failure (if any)
   */
  failureReason?: string

  /**
   * Warnings about ambiguous or uncertain resolutions
   */
  warnings?: string[]

  /**
   * Confidence in the resolution (0-1)
   * Factors: party name similarity, scope boundary, citation type match
   */
  confidence: number
}

/**
 * Citation with resolution metadata.
 *
 * Uses a distributive conditional type so that `resolution` is only
 * meaningfully present on short-form citations (Id., supra, short-form case).
 * On full citations, `resolution` is typed as `undefined`.
 */
export type ResolvedCitation<C extends Citation = Citation> = C extends ShortFormCitation
  ? C & { resolution: ResolutionResult | undefined }
  : C & { resolution?: undefined }

/**
 * Internal context for resolution process.
 * Tracks state across sequential citation processing.
 */
export interface ResolutionContext {
  /** Current citation index being processed */
  citationIndex: number

  /** All citations in document (for lookback) */
  allCitations: Citation[]

  /**
   * Index of immediately preceding full citation.
   * Updated as citations are processed.
   */
  lastFullCitation?: number

  /**
   * History of all full citations by party name.
   * Maps normalized party name to citation index.
   * Used for supra resolution.
   */
  fullCitationHistory: Map<string, number>

  /**
   * Map of citation index to paragraph number.
   * Used for scope boundary checking.
   */
  paragraphMap: Map<number, number>
}
