/**
 * Puerto Rico LPRA (Leyes de Puerto Rico Anotadas) extractor — #635
 *
 * Parses tokenized Puerto Rico statute citations in the dominant court
 * styles seen across PR opinions and federal opinions applying PR law:
 *   - `23 LPRA § 72`           (bare acronym, § connector)
 *   - `23 LPRA §72`            (bare acronym, glued §)
 *   - `23 LPRA §72(a)`         (with subsection)
 *   - `21 L.P.R.A. § 4615`     (periodized)
 *   - `21 L.P.R.A. § 4615(a)(1)`
 *
 * Emits `code` in canonical Bluebook form (`L.P.R.A.` with periods)
 * and `jurisdiction: "PR"`.
 *
 * @module extract/statutes/extractLpra
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

/** Anchored mirror of the tokenizer's `lpra` pattern. */
const LPRA_RE =
  /^(\d+)\s+(L\.P\.R\.A\.|LPRA)\s*§§?\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*)/d

export function extractLpra(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = LPRA_RE.exec(text)!
  const title = Number.parseInt(match[1], 10)
  const body = match[3]
  const { section, subsection, hasEtSeq } = parseBody(body)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match.indices) {
    spans = {}
    const sectionIdx = match.indices[3]
    if (sectionIdx && section) {
      const sectionSpanLen = section.replace(/[.,;:]\s*$/, "").length
      spans.section = spanFromGroupIndex(
        span.cleanStart,
        [sectionIdx[0], sectionIdx[0] + sectionSpanLen],
        transformationMap,
      )
    }
  }

  // Confidence: closed LPRA alternation + mandatory trailing § + digits.
  let confidence = 0.95
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
    title,
    code: "L.P.R.A.",
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "PR",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
