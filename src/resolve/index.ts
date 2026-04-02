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
 * @returns Citations with resolution metadata
 */
export function resolveCitations(
  citations: Citation[],
  text: string,
  options?: ResolutionOptions,
): ResolvedCitation[] {
  const resolver = new DocumentResolver(citations, text, options)
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
