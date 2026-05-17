/**
 * Minnesota Statutes year-edition form — `Minn. St. 1971, § 176.66`
 *
 * The year (1971 / 1974 / 1967 / etc.) is the EDITION of Minnesota Statutes
 * that was in effect when the underlying events occurred, not the section
 * number. The default abbreviated-code pattern would capture the year as
 * the section; this dedicated pattern preserves the year-as-edition
 * semantics. #371
 *
 * Same family as Colorado `C.R.S. 1963` (#352), Indiana `IC 1971` (#363
 * deferred), Kansas `K.S.A. Supp. YYYY` (#367 deferred).
 *
 * @module extract/statutes/extractMinnStYearEdition
 */

import type { StatuteFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const MINN_ST_YEAR_RE =
  /^Minn\.?\s+(?:Stat|St)\.?\s+(19\d{2}),\s*§\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\)|\[[^\]]*\])*)$/d

export function extractMinnStYearEdition(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = MINN_ST_YEAR_RE.exec(text)!
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
    code: "Minn. Stat.",
    section,
    subsection,
    pincite: subsection,
    year,
    jurisdiction: "MN",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
