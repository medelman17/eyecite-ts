/**
 * Montana Code Annotated postfix form — `§ 77-6-205(2), MCA`
 *
 * Canonical Montana court style places the section first, with the code name
 * `MCA` after a comma — same shape as Florida's `§ N, Florida Statutes` and
 * Idaho's `§ N, Idaho Code`. The trailing edition-year parenthetical (e.g.
 * `MCA (1983)`) is attached by the generic year-paren absorber in
 * `extractCitations.ts`. #372
 *
 * @module extract/statutes/extractMcaPostfix
 */

import type { StatuteFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const MCA_POSTFIX_RE =
  /^(?:[Ss]ections?|§§?)\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s+et\s+seq\.?)?),?\s+MCA$/d

export function extractMcaPostfix(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = MCA_POSTFIX_RE.exec(text)!
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

  const features: StatuteFeatures = {
    type: "statute",
    patternId: token.patternId,
    knownCode: true, // all state-specific extractors operate on known codes
    titlePresent: false,
    subsectionPresent: false,
    parseable: true,
  }
  const confidence = scoreCitation(features)

  return {
    type: "statute",
    text,
    span: { cleanStart: span.cleanStart, cleanEnd: span.cleanEnd, originalStart, originalEnd },
    confidence,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    code: "MCA",
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "MT",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
