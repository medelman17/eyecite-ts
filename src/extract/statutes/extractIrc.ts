/**
 * Internal Revenue Code (IRC) — federal tax code citations
 *
 *   I.R.C. § 1367
 *   I.R.C. § 1366(a)(1)
 *   IRC § 1341
 *
 * The `I.R.C.` form is the canonical Bluebook abbreviation for Title 26 of
 * the U.S. Code (Internal Revenue Code); bare `IRC` is also common in tax
 * opinions. Without this dedicated pattern, Ohio's `R.C.` regex fragment
 * matched the suffix of `I.R.C.` and silently routed every IRC citation
 * to Ohio jurisdiction. #376
 *
 * @module extract/statutes/extractIrc
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const IRC_RE =
  /^(?:I\.R\.C\.|IRC)\s*§§?\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)$/d

export function extractIrc(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = IRC_RE.exec(text)!
  const rawBody = match[1]
  const { section, subsection, hasEtSeq } = parseBody(rawBody)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match.indices) {
    spans = {}
    const bodyIdx = match.indices[1]
    if (bodyIdx && section) {
      const bodyStart = bodyIdx[0]
      const sectionSpanLen = section.replace(/[.,;:]\s*$/, "").length
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

  let confidence = 0.95
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
    code: "I.R.C.",
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "US",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
