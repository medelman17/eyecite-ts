/**
 * Chapter-Act Statute Extraction (Family 4)
 *
 * Parses Illinois Compiled Statutes (ILCS) citations with the unique
 * chapter/act/section format: "735 ILCS 5/2-1001"
 *
 * @module extract/statutes/extractChapterAct
 */

import type { Token } from '@/tokenize'
import type { StatuteCitation } from '@/types/citation'
import type { TransformationMap } from '@/types/span'
import { parseBody } from './parseBody'

/** Parse chapter-act token: chapter + ILCS + act/section */
const CHAPTER_ACT_RE = /^(\d+)\s+(?:ILCS|Ill\.?\s*Comp\.?\s*Stat\.?)\s*(?:Ann\.?\s+)?(\d+)\/(.+)$/

export function extractChapterAct(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = CHAPTER_ACT_RE.exec(text)

  let title: number | undefined  // chapter number
  let code: string               // act number
  let rawBody: string

  if (match) {
    title = Number.parseInt(match[1], 10)  // chapter (e.g., 735)
    code = match[2]                         // act (e.g., 5)
    rawBody = match[3]                      // section (e.g., 2-1001)
  } else {
    code = text
    rawBody = ''
  }

  const { section, subsection, hasEtSeq } = parseBody(rawBody)

  const originalStart = transformationMap.cleanToOriginal.get(span.cleanStart) ?? span.cleanStart
  const originalEnd = transformationMap.cleanToOriginal.get(span.cleanEnd) ?? span.cleanEnd

  // Title (chapter) is always present on a successful ILCS match — no bonus needed.
  // Only subsection presence provides a confidence boost.
  let confidence = match ? 0.95 : 0.3
  if (subsection) confidence += 0.05
  confidence = Math.min(confidence, 1.0)

  return {
    type: 'statute',
    text,
    span: { cleanStart: span.cleanStart, cleanEnd: span.cleanEnd, originalStart, originalEnd },
    confidence,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    title,
    code,
    section,
    subsection,
    pincite: subsection,
    jurisdiction: match ? 'IL' : undefined,
    hasEtSeq: hasEtSeq || undefined,
  }
}
