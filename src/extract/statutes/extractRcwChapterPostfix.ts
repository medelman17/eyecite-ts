/**
 * Washington RCW chapter postfix form — `chapter 49.60 RCW`
 *
 * Canonical Washington court style places the chapter before RCW
 * (the opposite of the prefix `RCW chapter` form used in other states).
 * The chapter is in `NN.NN` format. The chapter identifier goes into the
 * `section` field, matching the convention from `rsa-chapter` (NH),
 * `oh-chapter`, and `ors-chapter`. #408
 *
 * @module extract/statutes/extractRcwChapterPostfix
 */

import type { StatuteFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"

const RCW_CHAPTER_POSTFIX_RE = /^[Cc]hapter\s+(\d+\.\d+)\s+RCW$/d

export function extractRcwChapterPostfix(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = RCW_CHAPTER_POSTFIX_RE.exec(text)!
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
    code: "RCW",
    section,
    jurisdiction: "WA",
    spans,
  }
}
