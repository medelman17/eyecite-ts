/**
 * Scope Boundary Detection
 *
 * Detects paragraph/section boundaries in text and validates whether
 * an antecedent citation is within the resolution scope.
 */

import type { FootnoteMap } from "../footnotes/types"
import type { Citation } from "../types/citation"
import type { ScopeStrategy } from "./types"

/**
 * Binary search returning the insertion point for `value` in sorted `arr`.
 * Returns the smallest index i such that arr[i] > value (or arr.length if none).
 */
function bisectRight(arr: number[], value: number): number {
  let lo = 0
  let hi = arr.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (arr[mid] <= value) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * Detects paragraph boundaries from text and assigns each citation to a paragraph.
 *
 * @param text - Original document text
 * @param citations - Extracted citations with position spans
 * @param boundaryPattern - Regex pattern to detect boundaries (default: /\n\n+/)
 * @returns Map of citation index to paragraph number (0-based)
 */
export function detectParagraphBoundaries(
  text: string,
  citations: Citation[],
  boundaryPattern: RegExp = /\n\n+/g,
): Map<number, number> {
  const paragraphMap = new Map<number, number>()

  // Find all paragraph boundaries (positions in text)
  const boundaries: number[] = [0] // Start of document is first boundary
  let match: RegExpExecArray | null

  while ((match = boundaryPattern.exec(text)) !== null) {
    // Boundary is at end of match (start of next paragraph)
    boundaries.push(match.index + match[0].length)
  }

  boundaries.push(text.length) // End of document

  // Assign each citation to a paragraph
  for (let i = 0; i < citations.length; i++) {
    const citation = citations[i]
    const citationStart = citation.span.originalStart

    paragraphMap.set(i, bisectRight(boundaries, citationStart) - 1)
  }

  return paragraphMap
}

/**
 * Build a scope map from footnote zones.
 * Zone 0 = body text, Zone N = footnote N.
 *
 * The footnoteMap must be in the same coordinate space as the citation spans
 * being looked up. When called from extractCitations, both are in clean-text
 * coordinates (zones mapped through TransformationMap, spans set during extraction).
 */
export function buildFootnoteScopes(
  citations: Citation[],
  footnoteMap: FootnoteMap,
): Map<number, number> {
  const scopeMap = new Map<number, number>()

  for (let i = 0; i < citations.length; i++) {
    const pos = citations[i].span.cleanStart

    let zoneId = 0
    let lo = 0
    let hi = footnoteMap.length - 1

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      const zone = footnoteMap[mid]

      if (pos < zone.start) {
        hi = mid - 1
      } else if (pos >= zone.end) {
        lo = mid + 1
      } else {
        zoneId = zone.footnoteNumber
        break
      }
    }

    scopeMap.set(i, zoneId)
  }

  return scopeMap
}

/**
 * Checks if an antecedent citation is within resolution scope.
 *
 * @param antecedentIndex - Index of the antecedent citation
 * @param currentIndex - Index of current citation being resolved
 * @param paragraphMap - Map of citation index to paragraph/zone number
 * @param strategy - Scope boundary strategy
 * @param allowCrossZone - If true (footnote strategy), allow resolution from footnote to body (zone 0)
 * @returns true if antecedent is within scope, false otherwise
 */
export function isWithinBoundary(
  antecedentIndex: number,
  currentIndex: number,
  paragraphMap: Map<number, number>,
  strategy: ScopeStrategy,
  allowCrossZone = false,
): boolean {
  if (strategy === "none") {
    // No boundary restriction - can resolve across entire document
    return true
  }

  // Get scope numbers for both citations
  const antecedentScope = paragraphMap.get(antecedentIndex)
  const currentScope = paragraphMap.get(currentIndex)

  // If either is undefined, default to allowing resolution
  if (antecedentScope === undefined || currentScope === undefined) {
    return true
  }

  if (antecedentScope === currentScope) {
    return true
  }

  // Cross-zone: footnote strategy allows supra/shortFormCase to reach body
  if (strategy === "footnote" && allowCrossZone && antecedentScope === 0) {
    return true
  }

  // For paragraph/section strategies, citations must be in same boundary.
  // (section currently behaves the same as paragraph — future enhancement.)
  return false
}
