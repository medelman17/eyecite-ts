/**
 * Idaho Code postfix form — `Section 23-908(4), Idaho Code`
 *
 * Canonical Idaho court style places the code name AFTER the section, just
 * like Florida's `section N, Florida Statutes` form. The leading word
 * "section" / "§" is optional in some Idaho variants but typically present.
 * #360
 *
 * @module extract/statutes/extractIdahoPostfix
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const IDAHO_POSTFIX_RE =
  /^(?:[Ss]ections?|§§?)\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*),?\s+Idaho\s+Code(?:\s+Ann\.?)?$/d

export function extractIdahoPostfix(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = IDAHO_POSTFIX_RE.exec(text)!
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
    code: "Idaho Code",
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "ID",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
