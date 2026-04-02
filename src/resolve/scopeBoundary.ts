/**
 * Scope Boundary Detection
 *
 * Detects paragraph/section boundaries in text and validates whether
 * an antecedent citation is within the resolution scope.
 */

import type { Citation } from "../types/citation"
import type { ScopeStrategy } from "./types"

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

    // Find which paragraph this citation belongs to
    let paragraphNum = 0
    for (let j = 0; j < boundaries.length - 1; j++) {
      if (citationStart >= boundaries[j] && citationStart < boundaries[j + 1]) {
        paragraphNum = j
        break
      }
    }

    paragraphMap.set(i, paragraphNum)
  }

  return paragraphMap
}

/**
 * Checks if an antecedent citation is within resolution scope.
 *
 * @param antecedentIndex - Index of the antecedent citation
 * @param currentIndex - Index of current citation being resolved
 * @param paragraphMap - Map of citation index to paragraph number
 * @param strategy - Scope boundary strategy
 * @returns true if antecedent is within scope, false otherwise
 */
export function isWithinBoundary(
  antecedentIndex: number,
  currentIndex: number,
  paragraphMap: Map<number, number>,
  strategy: ScopeStrategy,
): boolean {
  if (strategy === "none") {
    // No boundary restriction - can resolve across entire document
    return true
  }

  // Get paragraph numbers for both citations
  const antecedentParagraph = paragraphMap.get(antecedentIndex)
  const currentParagraph = paragraphMap.get(currentIndex)

  // If either is undefined, default to allowing resolution
  if (antecedentParagraph === undefined || currentParagraph === undefined) {
    return true
  }

  // For paragraph/section/footnote strategies, citations must be in same boundary
  // (In this MVP, section and footnote behave same as paragraph - future enhancement)
  return antecedentParagraph === currentParagraph
}
