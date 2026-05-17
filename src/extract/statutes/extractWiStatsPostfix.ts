/**
 * Wisconsin Statutes postfix form — `§ 76.09, Stats.`
 *
 *   § 76.09, Stats.
 *   sec. 805.13(3), Stats.
 *   § 48.415(l)(a)3, STATS.   (uppercase, with trailing sub-subsection 3)
 *
 * Wisconsin court style places the `Stats.` abbreviation AFTER the
 * section, separated by a comma. Both lowercase `Stats.` and uppercase
 * `STATS.` are common. #414
 *
 * @module extract/statutes/extractWiStatsPostfix
 */

import type { StatuteFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const WI_STATS_POSTFIX_RE =
  /^(?:§§?|[Ss]ections?|[Ss]ec\.?)\s*(\d+\.\d+(?:[A-Za-z0-9])?(?:\s*\([^)]*\))*[A-Za-z0-9]*(?:\s+et\s+seq\.?)?),?\s+(?:Stats\.|STATS\.)$/d

export function extractWiStatsPostfix(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = WI_STATS_POSTFIX_RE.exec(text)!
  // Split off the optional ` et seq.` trailer before collapsing whitespace,
  // so the section body's spaces inside `(N)` groups can still be removed
  // while preserving the et seq. marker for parseBody (#419).
  const etSeqMatch = match[1].match(/\s+et\s+seq\.?$/)
  const sectionPart = etSeqMatch ? match[1].slice(0, -etSeqMatch[0].length) : match[1]
  const cleanSection = sectionPart.replace(/\s+/g, "")
  const rawBody = etSeqMatch ? `${cleanSection} et seq.` : cleanSection
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
    code: "Wis. Stat.",
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "WI",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
