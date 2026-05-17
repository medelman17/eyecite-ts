/**
 * New Hampshire RSA chapter form — `RSA chapter 169-D`, `RSA ch. 458-C`
 *
 * NH uniquely cites the chapter number alone (no section after the chapter)
 * as a complete citation. The colon-section form `RSA 511:2` is already
 * handled by the `abbreviated-code` family. #378
 *
 * The chapter goes into the `section` field — that's the canonical NH
 * shape: `code: "RSA"`, `section: "169-D"`. NH opinions treat the chapter
 * number as the citation identifier when no individual subsection is being
 * pin-cited.
 *
 * @module extract/statutes/extractRsaChapter
 */

import type { StatuteFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"

const RSA_CHAPTER_RE = /^RSA\s+(?:\[chapter\]|chapter|ch\.?)\s+(\d+(?:-[A-Z])?)$/d

export function extractRsaChapter(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = RSA_CHAPTER_RE.exec(text)!
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
    code: "RSA",
    section,
    jurisdiction: "NH",
    spans,
  }
}
