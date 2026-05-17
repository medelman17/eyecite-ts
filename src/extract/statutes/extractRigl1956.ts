/**
 * Rhode Island General Laws 1956 — `G.L. 1956 (1969 Reenactment) §11-23-1`
 *
 * The `1956` literal year is the disambiguator vs. Massachusetts `G.L. c.
 * NNN` (chapter form). The optional `(YYYY Reenactment)` parenthetical
 * indicates which reenactment volume was in effect. #393
 *
 * @module extract/statutes/extractRigl1956
 */

import type { StatuteFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const RIGL_1956_RE =
  /^G\.?\s*L\.?\s+1956\s*(?:\((\d{4})\s+Reenactment\))?\s*,?\s*§§?\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*)$/d

export function extractRigl1956(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = RIGL_1956_RE.exec(text)!
  const reenactmentYear = match[1] ? Number.parseInt(match[1], 10) : undefined
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
    code: "G.L. 1956",
    section,
    subsection,
    pincite: subsection,
    year: reenactmentYear,
    editionLabel: reenactmentYear !== undefined ? "Reenactment" : undefined,
    jurisdiction: "RI",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
