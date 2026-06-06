/**
 * Citation Resolution
 *
 * Resolves short-form citations (Id./supra/short-form case) to their full antecedents.
 *
 * @example
 * ```ts
 * import { resolveCitations } from 'eyecite-ts/resolve'
 * import { extractCitations } from 'eyecite-ts'
 *
 * const text = 'See Smith v. Jones, 500 F.2d 100 (1974). Id. at 105.'
 * const citations = extractCitations(text)
 * const resolved = resolveCitations(citations, text)
 *
 * // resolved[1] is Id. citation with resolution.resolvedTo = 0
 * console.log(resolved[1].resolution?.resolvedTo) // 0 (points to Smith v. Jones)
 * ```
 */

import type { Citation } from "../types/citation"
import type { TransformationMap } from "../types/span"
import { DocumentResolver } from "./DocumentResolver"
import type { ResolutionOptions, ResolvedCitation } from "./types"

/**
 * Resolves short-form citations to their full antecedents.
 *
 * Convenience wrapper around DocumentResolver that handles common use cases.
 *
 * @param citations - Extracted citations in order of appearance
 * @param text - Original document text
 * @param options - Resolution options
 * @param cleanContext - Optional cleaned text + transformation map. Pass when a
 *   length-changing cleaner was applied so clean-coordinate reads index the
 *   cleaned text and derived spans map back to original coordinates (#830). When
 *   omitted, `text` is treated as the cleaned text too (clean == original).
 * @returns Citations with resolution metadata
 */
export function resolveCitations(
  citations: Citation[],
  text: string,
  options?: ResolutionOptions,
  cleanContext?: { cleanedText: string; transformationMap: TransformationMap },
): ResolvedCitation[] {
  const resolver = new DocumentResolver(citations, text, options, cleanContext)
  return resolver.resolve()
}

// Re-export core types and classes
export { DocumentResolver } from "./DocumentResolver"
export type {
  ResolutionOptions,
  ResolutionResult,
  ResolvedCitation,
  ScopeStrategy,
} from "./types"
