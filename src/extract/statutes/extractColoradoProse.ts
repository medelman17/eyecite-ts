/**
 * Colorado Revised Statutes prose form (pre-1973 and modern)
 *
 * Parses citations in the form `Section 148-21-34, Colorado Revised Statutes
 * 1963`, where the section comes BEFORE the code name. Pre-1973 Colorado
 * used a chapter-article-section numbering scheme (`148-21-34` = chapter
 * 148, article 21, section 34); the structured chapter/article fields are
 * not surfaced separately — the full section body goes on `section`.
 *
 * `code` carries the full code name including the year suffix when present
 * (`Colorado Revised Statutes 1963`), so consumers can distinguish editions
 * without looking at `year` (which is reserved for trailing parenthetical
 * edition years). #352
 *
 * @module extract/statutes/extractColoradoProse
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const COLORADO_PROSE_RE =
  /^[Ss]ection\s+(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*),?\s+(Colo(?:rado)?\.?\s+Rev(?:ised)?\.?\s+Stat(?:utes)?\.?(?:\s+Ann(?:otated)?\.?)?)(?:\s+(19\d{2}))?$/d

export function extractColoradoProse(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = COLORADO_PROSE_RE.exec(text)!

  const rawBody = match[1]
  const codeName = match[2].replace(/\s+/g, " ").trim()
  const editionYear = match[3]
  // `code` preserves the year suffix as part of the name: `Colorado Revised
  // Statutes 1963`. The bare modern form remains `Colorado Revised Statutes`.
  const code = editionYear ? `${codeName} ${editionYear}` : codeName

  const { section, subsection, hasEtSeq } = parseBody(rawBody)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match.indices) {
    spans = {}
    const sectionIdx = match.indices[1]
    if (sectionIdx && section) {
      const bodyStart = sectionIdx[0]
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
    if (match.indices[2]) {
      spans.code = spanFromGroupIndex(span.cleanStart, match.indices[2], transformationMap)
    }
  }

  // Confidence: 0.9 baseline (the closed prose shape is unambiguous); +0.05
  // when a subsection is captured.
  let confidence = 0.9
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
    code,
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "CO",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
