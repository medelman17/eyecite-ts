/**
 * Virginia bare-Code form — `Code § 18.2-308.2`, `Virginia Code § 8.01-581.17`
 *
 * Virginia's canonical court style omits the `Va.` prefix. The
 * disambiguator from Georgia pre-1983 (also bare `Code §`) is the PERIOD
 * in the title or section — Virginia sections always include at least one
 * period (`18.2-308.2`, `20-107.3`), while Georgia pre-1983 sections never
 * do (`26-2101`, `27-2501`). #405
 *
 * @module extract/statutes/extractVaBareCode
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const VA_BARE_CODE_RE =
  /^(Virginia\s+Code|Code)\s+§\s*((?:\d+\.\d+-\d+(?:\.\d+)?|\d+-\d+\.\d+)(?:\([A-Za-z0-9]+\))*)$/d

export function extractVaBareCode(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = VA_BARE_CODE_RE.exec(text)!
  // #530: regardless of the surface form (`Code §` or `Virginia Code §`),
  // surface the canonical jurisdictional prefix `"Va. Code"` in the
  // `code` field. The raw match still drives the component span so the
  // user-facing range covers the original text exactly.
  const codeName = "Va. Code"
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
    code: codeName,
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "VA",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
