/**
 * Ohio Revised Code Chapter form — `R.C. Chapter 4509`, `R. C. Chapter 1702`
 *
 * Ohio (like NH) allows chapter-only references where the chapter number
 * functions as a complete citation. Spacing between `R.` and `C.` is
 * optional. The chapter identifier goes into the `section` field, matching
 * the convention established by the NH `rsa-chapter` extractor. #388
 *
 * @module extract/statutes/extractOhChapter
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"

const OH_CHAPTER_RE = /^R\.?\s*C\.?\s+Chapter\s+(\d+)$/d

export function extractOhChapter(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = OH_CHAPTER_RE.exec(text)!
  const section = match[1]

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match.indices) {
    spans = {}
    if (match.indices[1])
      spans.section = spanFromGroupIndex(span.cleanStart, match.indices[1], transformationMap)
  }

  return {
    type: "statute",
    text,
    span: { cleanStart: span.cleanStart, cleanEnd: span.cleanEnd, originalStart, originalEnd },
    confidence: 0.95,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    code: "R.C.",
    section,
    jurisdiction: "OH",
    spans,
  }
}
