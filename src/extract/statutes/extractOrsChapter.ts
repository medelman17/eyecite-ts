/**
 * Oregon Revised Statutes chapter-only form — `ORS chapter 34`
 *
 * Oregon (like NH and OH) allows chapter-only references where the
 * chapter number functions as a complete citation. The modern
 * `ORS NNN.NNN` section form is already handled by `abbreviated-code`.
 * #387
 *
 * @module extract/statutes/extractOrsChapter
 */

import type { StatuteFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"

const ORS_CHAPTER_RE = /^ORS\s+chapter\s+(\d+)$/d

export function extractOrsChapter(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = ORS_CHAPTER_RE.exec(text)!
  const section = match[1]

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match.indices) {
    spans = {}
    if (match.indices[1])
      spans.section = spanFromGroupIndex(span.cleanStart, match.indices[1], transformationMap)
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
    code: "ORS",
    section,
    jurisdiction: "OR",
    spans,
  }
}
