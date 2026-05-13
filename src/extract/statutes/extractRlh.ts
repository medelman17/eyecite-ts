/**
 * Revised Laws of Hawaii (pre-1955) — historical compilation citations
 *
 * Hawaii compiled its statutes as RLH 1935, RLH 1945, and RLH 1955 before
 * adopting the modern Hawaii Revised Statutes (HRS) in 1968. Modern Hawaii
 * opinions still cite RLH when referencing pre-1955 statutory text. #359
 *
 *   RLH 1935 § 2545
 *   RLH 1945 § 7186
 *   RLH 1955 § 7186
 *
 * The `RLH` token is distinctively Hawaii-only, so no jurisdiction
 * disambiguation is needed.
 *
 * @module extract/statutes/extractRlh
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const RLH_RE =
  /^RLH\s+(\d{4})\s+§\s+(\d+(?:[A-Za-z0-9:-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)$/d

export function extractRlh(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = RLH_RE.exec(text)!
  const year = Number.parseInt(match[1], 10)
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

  // Confidence: 0.95 baseline; +0.05 with subsection.
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
    code: "RLH",
    section,
    subsection,
    pincite: subsection,
    year,
    jurisdiction: "HI",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
