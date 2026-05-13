/**
 * Maryland article-letter codes — post-2002 Maryland Code
 *
 *   HG § 19-906             (Health-General)
 *   CP § 10-105(e)(4)(ii)   (Criminal Procedure)
 *   R.P. § 8-211            (Real Property — dotted variant)
 *   BR § 1-101              (Business Regulation)
 *
 * Maryland reorganized its code in 2002 into ~30 named articles, each
 * cited by a 2- or 3-letter prefix. This is the dominant Maryland court
 * style for every modern Maryland appellate opinion. #368
 *
 * @module extract/statutes/extractMdArticleLetter
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const MD_ARTICLE_LETTER_RE =
  /^(AB|AG|BO|BR|CJ|CL|CP|CR|CS|EC|ED|EL|EN|ET|FI|FL|GP|HG|HO|HS|HU|IN|LE|LG|LU|NR|PS|PUC|R\.?P\.?|RP|SF|SG|TA|TG|TP|TR)\s*§§?\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)$/d

export function extractMdArticleLetter(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = MD_ARTICLE_LETTER_RE.exec(text)!
  const codePrefix = match[1]
  const rawBody = match[2]
  const { section, subsection, hasEtSeq } = parseBody(rawBody)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match.indices) {
    spans = {}
    if (match.indices[1])
      spans.code = spanFromGroupIndex(span.cleanStart, match.indices[1], transformationMap)
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
    code: codePrefix,
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "MD",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
