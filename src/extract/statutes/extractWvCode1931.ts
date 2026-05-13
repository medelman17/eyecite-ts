/**
 * West Virginia historical Code 1931 — `Code 1931, 49-6-3, as amended`
 *
 *   Code 1931, 49-6-3, as amended
 *   Code, 1931, 49-6-3
 *   Code, 14-2-13           (no year, comma-separated)
 *
 * West Virginia compiled its statutes in 1931. Modern WV opinions still
 * cite the 1931 code for statutory history. The 3-part hyphenated section
 * format (`N-N-N`) disambiguates from Georgia pre-1983 (2-part) and
 * Virginia bare-Code (always contains period). #406
 *
 * @module extract/statutes/extractWvCode1931
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const WV_CODE_1931_RE =
  /^Code,?(?:\s+(1931))?,\s+(\d+-\d+[A-Z]?-\d+(?:[A-Za-z0-9])?(?:\([A-Za-z0-9]+\))*)$/d

export function extractWvCode1931(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = WV_CODE_1931_RE.exec(text)!
  const year = match[1] ? Number.parseInt(match[1], 10) : undefined
  const rawBody = match[2]
  const { section, subsection, hasEtSeq } = parseBody(rawBody)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match.indices) {
    spans = {}
    const bodyIdx = match.indices[2]
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

  let confidence = 0.9
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
    code: "W. Va. Code",
    section,
    subsection,
    pincite: subsection,
    year,
    jurisdiction: "WV",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
