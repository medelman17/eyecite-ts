/**
 * Kansas Statutes Annotated year-edition form — `K.S.A. 2009 Supp. 44-501(d)(2)`
 *
 * Kansas opinions cite a specific compilation year to indicate which
 * version of the statute was in effect at the time of the events. The
 * `Supp.` marker is optional — bound-volume citations omit it. The
 * abbreviated-code pattern would otherwise capture the year as section,
 * silently substituting the year for the actual section number.
 *
 * Same family as Minnesota `Minn. St. YYYY, § N` (#371), Colorado
 * `C.R.S. YYYY § N` (#352), Indiana `IC YYYY` (#363 deferred).
 *
 * @module extract/statutes/extractKsaYearEdition
 */

import type { StatuteFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const KSA_YEAR_RE =
  /^K\.?\s*S\.?\s*A\.?\s+(\d{4})(?:\s+(Supp\.?))?\s+(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9])|,(?=\d))*(?:\([^)]*\))*)$/d

export function extractKsaYearEdition(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = KSA_YEAR_RE.exec(text)!
  const year = Number.parseInt(match[1], 10)
  const hasSupp = match[2] !== undefined
  const rawBody = match[3]
  const { section, subsection, hasEtSeq } = parseBody(rawBody)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match.indices) {
    spans = {}
    const bodyIdx = match.indices[3]
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
    code: "K.S.A.",
    section,
    subsection,
    pincite: subsection,
    year,
    editionLabel: hasSupp ? "Supp." : undefined,
    jurisdiction: "KS",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
