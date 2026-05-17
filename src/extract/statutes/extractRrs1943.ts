/**
 * Nebraska Reissue Revised Statutes 1943 (R.R.S. 1943) — historical form
 *
 *   section 38-901, R. R. S. 1943
 *   § 30-2806, R.R.S. 1943, Reissue 1975
 *
 * Nebraska compiled its statutes in 1943 and re-issues individual volumes
 * on a rolling basis. The trailing `Reissue YYYY` clause gives the volume
 * year — when present it goes into `year` (and `editionLabel` is set to
 * `"Reissue"`). When absent, the citation refers to the original 1943
 * compilation. #373
 *
 * @module extract/statutes/extractRrs1943
 */

import type { StatuteFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const RRS_1943_RE =
  /^(?:[Ss]ections?|§§?)\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*),?\s+R\.?\s*R\.?\s*S\.?\s+1943(?:,\s+Reissue\s+(\d{4}))?$/d

export function extractRrs1943(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = RRS_1943_RE.exec(text)!
  const rawBody = match[1]
  const reissueYear = match[2] ? Number.parseInt(match[2], 10) : undefined
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
    code: "R.R.S. 1943",
    section,
    subsection,
    pincite: subsection,
    year: reissueYear,
    editionLabel: reissueYear !== undefined ? "Reissue" : undefined,
    jurisdiction: "NE",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
