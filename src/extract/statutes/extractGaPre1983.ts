/**
 * Georgia pre-1983 Code — `Code § 27-2501`, `Code Ann. § 26-2101`
 *
 * Georgia replaced its old "Code" / "Code of Georgia Annotated" with OCGA
 * in 1983. Modern Georgia opinions still cite the pre-1983 code for
 * statutory history. The bare `Code Ann.` / `Code` (no state prefix) is
 * always Georgia — other states use prefixed forms (`Md. Code Ann.`,
 * `Ind. Code Ann.`) that the `named-code` pattern handles. #358
 *
 * @module extract/statutes/extractGaPre1983
 */

import type { StatuteFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const GA_PRE_1983_RE =
  /^(Code(?:\s+Ann\.?)?)\s+§\s*(\d+-\d+(?:[A-Za-z0-9])?(?:\([A-Za-z0-9]+\))*)$/d

export function extractGaPre1983(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = GA_PRE_1983_RE.exec(text)!
  const codeName = match[1]
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
    code: codeName,
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "GA",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
