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
   * Index of this short-form's antecedent.
   *
   * - SUCCESS path (`resolvedTo` defined): mirrors `resolvedTo`, so consumers
   *   have one source of truth for what the short-form points at — even when
   *   an intervening citation of a different authority sits between the
   *   resolved antecedent and the short-form (#508 for `Id.`, #795 for supra
   *   and shortFormCase).
   * - UNRESOLVED/fallback path (`resolvedTo` undefined, e.g. the case name
   *   appears only in prose): points at the immediately preceding cited
   *   authority in document order per Bluebook Rule 4.1 / Indigo Book
   *   R6.2.2, so a subsequent `Id.` (or a consumer walking the chain) can
   *   still cluster with the short-form.
   * - Records the immediate predecessor only; follow transitively via
   *   `resolutions[antecedentIndex].antecedentIndex` for the originator.
   *   Same idiom as `ShortFormCaseCitation.pinciteInheritedFrom`.
   */
  antecedentIndex?: number

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
   * Index of the full citation most recently cited (directly or via resolution).
   * Updated after every successfully resolved citation.
   * Used by Id. resolution -- Id. inherits this value.
   *
   * For full citations: set to the citation's own index.
   * For resolved short-form/supra/Id.: set to resolvedTo (the full antecedent index).
   * For failed resolutions: NOT updated (Id. after a failed citation also fails).
   */
  lastResolvedIndex?: number

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
