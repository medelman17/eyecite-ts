/**
 * Statute Citation Extraction — Dispatcher
 *
 * Routes statute tokens to family-specific extractors based on patternId.
 * This is the entry point called by extractCitations.ts (line 234).
 *
 * Family dispatch:
 * - "usc", "cfr" → extractFederal
 * - "prose" → extractProse
 * - "abbreviated-code" → extractAbbreviated
 * - "state-code", unknown → legacy inline parser (backward compat)
 *
 * @module extract/extractStatute
 */

import type { Token } from '@/tokenize'
import type { StatuteCitation } from '@/types/citation'
import type { TransformationMap } from '@/types/span'
import { extractFederal } from './statutes/extractFederal'
import { extractProse } from './statutes/extractProse'
import { extractAbbreviated } from './statutes/extractAbbreviated'

/**
 * Legacy inline parser for state-code and unknown patterns.
 * Preserved for backward compatibility until PR 2-3 add state extractors.
 */
function extractLegacy(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token

  const statuteRegex = /^(?:(\d+)\s+)?([A-Za-z.\s]+?)\s*§+\s*(\d+[A-Za-z0-9-]*)/
  const match = statuteRegex.exec(text)

  // Graceful fallback for unparseable tokens — return low-confidence citation
  // rather than throwing (spec: "Unknown codes produce citations with low confidence")
  if (!match) {
    const originalStart =
      transformationMap.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart
    const originalEnd =
      transformationMap.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd

    return {
      type: 'statute',
      text,
      span: { cleanStart: span.cleanStart, cleanEnd: span.cleanEnd, originalStart, originalEnd },
      confidence: 0.3,
      matchedText: text,
      processTimeMs: 0,
      patternsChecked: 1,
      code: text,
      section: '',
    }
  }

  const title = match[1] ? Number.parseInt(match[1], 10) : undefined
  const code = match[2].trim()
  const section = match[3]

  const originalStart =
    transformationMap.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart
  const originalEnd =
    transformationMap.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd

  let confidence = 0.5
  const knownCodes = [
    'U.S.C.',
    'C.F.R.',
    'Cal. Civ. Code',
    'Cal. Penal Code',
    'N.Y. Civ. Prac. L. & R.',
    'Tex. Civ. Prac. & Rem. Code',
  ]

  if (knownCodes.some((c) => code.includes(c))) {
    confidence += 0.3
  }

  confidence = Math.min(confidence, 1.0)

  return {
    type: 'statute',
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    title,
    code,
    section,
  }
}

/**
 * Extracts statute citation metadata from a tokenized citation.
 * Dispatches to family-specific extractors based on patternId.
 */
export function extractStatute(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  switch (token.patternId) {
    case 'usc':
    case 'cfr':
      return extractFederal(token, transformationMap)
    case 'prose':
      return extractProse(token, transformationMap)
    case 'abbreviated-code':
      return extractAbbreviated(token, transformationMap)
    default:
      // state-code and any unknown patterns use legacy parser
      return extractLegacy(token, transformationMap)
  }
}
