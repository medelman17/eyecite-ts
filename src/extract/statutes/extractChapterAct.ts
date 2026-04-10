/**
 * Chapter-Act Statute Extraction (Family 4)
 *
 * Parses Illinois Compiled Statutes (ILCS) citations with the unique
 * chapter/act/section format: "735 ILCS 5/2-1001"
 *
 * @module extract/statutes/extractChapterAct
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

/** Parse chapter-act token: chapter + ILCS + act/section */
const CHAPTER_ACT_RE = /^(\d+)\s+(?:ILCS|Ill\.?\s*Comp\.?\s*Stat\.?)\s*(?:Ann\.?\s+)?(\d+)\/(.+)$/d

export function extractChapterAct(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = CHAPTER_ACT_RE.exec(text)

  let title: number | undefined // chapter number
  let code: string // act number
  let rawBody: string

  if (match) {
    title = Number.parseInt(match[1], 10) // chapter (e.g., 735)
    code = match[2] // act (e.g., 5)
    rawBody = match[3] // section (e.g., 2-1001)
  } else {
    code = text
    rawBody = ""
  }

  const { section, subsection, hasEtSeq } = parseBody(rawBody)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Use section without trailing sentence punctuation for span boundary
  const sectionSpanLen = section.replace(/[.,;:]\s*$/, "").length

  let spans: StatuteComponentSpans | undefined
  if (match?.indices) {
    spans = {}
    if (match.indices[1]) spans.title = spanFromGroupIndex(span.cleanStart, match.indices[1], transformationMap)
    if (match.indices[2]) spans.code = spanFromGroupIndex(span.cleanStart, match.indices[2], transformationMap)
    if (match.indices[3] && section) {
      const bodyStart = match.indices[3][0]
      spans.section = spanFromGroupIndex(
        span.cleanStart,
        [bodyStart, bodyStart + sectionSpanLen],
        transformationMap,
      )
      if (subsection) {
        const subStart = bodyStart + section.length
        spans.subsection = spanFromGroupIndex(
          span.cleanStart,
          [subStart, subStart + subsection.length],
          transformationMap,
        )
      }
    }
  }

  // Title (chapter) is always present on a successful ILCS match — no bonus needed.
  // Only subsection presence provides a confidence boost.
  let confidence = match ? 0.95 : 0.3
  if (subsection) confidence += 0.05
  confidence = Math.min(confidence, 1.0)

  return {
    type: "statute",
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
    jurisdiction: match ? "IL" : undefined,
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
