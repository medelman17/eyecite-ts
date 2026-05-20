/**
 * New Mexico bare-section form — `Section 32A-2-7(A)`, `§ 41-2-2`
 *
 * NM opinions cite NMSA 1978 sections in a distinctive bare form without
 * the code abbreviation. The three-hyphen section format
 * (`\d[A-Z]?-\d[A-Z]?-\d[A-Z]?`) is unique among state codes and serves
 * as the disambiguator. #382
 *
 * @module extract/statutes/extractNmBareSection
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const NM_BARE_SECTION_RE =
  /^(?:§\s*|[Ss]ection\s+)(\d+[A-Z]?-\d+[A-Z]?-\d+[A-Z]?(?:\([A-Za-z0-9.]+\)|\[[A-Za-z0-9.]+\])*)$/d

export function extractNmBareSection(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = NM_BARE_SECTION_RE.exec(text)!
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
    code: "NMSA 1978",
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "NM",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
