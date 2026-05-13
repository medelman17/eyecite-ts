/**
 * Indiana Code year-edition form — `IC 1971, 35-13-4-4`
 *
 * The year between IC and the section is the compilation/edition year of
 * the Indiana Code, not the section. The trailing `, NN-N-N` separator
 * distinguishes this from a bare `IC NN-N-N` modern citation. #363
 *
 * Same family as Colorado `C.R.S. 1963 § N` (#352), Minnesota
 * `Minn. St. 1971, § N` (#371), Kansas `K.S.A. YYYY Supp. NN-NNN` (#367).
 *
 * @module extract/statutes/extractIcYearEdition
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const IC_YEAR_RE =
  /^IC\s+(\d{4}),\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*)$/d

export function extractIcYearEdition(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = IC_YEAR_RE.exec(text)!
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
    code: "IC",
    section,
    subsection,
    pincite: subsection,
    year,
    jurisdiction: "IN",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
