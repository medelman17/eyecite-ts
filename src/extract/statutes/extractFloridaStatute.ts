/**
 * Florida statute citations — postfix and spelled-out-prefix forms (#356)
 *
 * Florida courts use a distinctive postfix syntax where the code name
 * appears AFTER the section number. The canonical Bluebook prefix form
 * (`Fla. Stat. § 812.035`) is handled by `extractAbbreviated`; this
 * extractor handles two Florida-specific shapes:
 *
 *   - postfix: `section 812.035(7), Florida Statutes` /
 *              `§83.15, Florida Statutes` (patternId `florida-postfix`)
 *   - spelled-out prefix: `Florida Statute 679.504(3)` /
 *              `Florida Statutes §73.071(3)(b)` (patternId
 *              `florida-prefix-spelled`)
 *
 * Both shapes emit `code: "Fla. Stat."` (normalized) and
 * `jurisdiction: "FL"`.
 *
 * @module extract/statutes/extractFloridaStatute
 */

import type { StatuteFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

// `^` anchor is fine here — the extractor receives only the matched span,
// so the leading position is always the start of the captured token text.
const FLORIDA_POSTFIX_RE =
  /^(?:[Ss]ections?|§§?)\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s+et\s+seq\.?)?),?\s+(?:Florida\s+Statutes|Fla\.\s*Stat\.)$/d

const FLORIDA_PREFIX_SPELLED_RE =
  /^Florida\s+Statutes?\s*§?\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s+et\s+seq\.?)?)$/d

export function extractFloridaStatute(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token

  const re = token.patternId === "florida-postfix" ? FLORIDA_POSTFIX_RE : FLORIDA_PREFIX_SPELLED_RE
  const match = re.exec(text)!

  const rawBody = match[1]
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
    code: "Fla. Stat.",
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "FL",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
