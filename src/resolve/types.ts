/**
 * Resolution Type System
 *
 * Types for document-scoped citation resolution that tracks antecedent history
 * and resolves short-form citations (Id./supra/short-form case) to their full forms.
 */

import type { Citation } from '../types/citation'

/**
 * Scope boundary strategy for resolution.
 * Determines how far back to search for antecedent citations.
 */
export type ScopeStrategy = 'paragraph' | 'section' | 'footnote' | 'none'

/**
 * Options for citation resolution.
 */
export interface ResolutionOptions {
  /**
   * Scope boundary strategy (default: 'paragraph')
   * - paragraph: Only resolve within same paragraph
   * - section: Only resolve within same section
   * - footnote: Only resolve within same footnote
   * - none: Resolve across entire document
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
 * Citation with optional resolution metadata.
 * Uses intersection type to add resolution field to any Citation type.
 */
export type ResolvedCitation = Citation & {
  /**
   * Resolution result for short-form citations.
   * Only present for Id/supra/shortFormCase types
   */
  resolution?: ResolutionResult
}

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
