/**
 * New York City Administrative Code extractor (#594)
 *
 * Parses citations to the NYC Admin Code in both abbreviated and
 * spelled-out forms:
 *   - `N.Y.C. Admin. Code § 8-107(1)(a)`
 *   - `New York City Administrative Code § 8-107(1)(a)`
 *
 * Without this dedicated path, the bare `Code §` portion previously
 * matched the Georgia pre-1983 fallback, mis-tagging every NYC Admin
 * Code citation as GA and dropping the NYC prefix.
 *
 * Always emits `code: "N.Y.C. Admin. Code"` (canonical) and
 * `jurisdiction: "NY"`.
 *
 * @module extract/statutes/extractNycAdminCode
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

// Mirror of the tokenizer pattern in `nyc-admin-code`. Accepts the
// canonical `N.Y.C. Admin. Code`, the spelled-out form, and the bare
// `NYC Admin. Code` (#594).
const NYC_ADMIN_CODE_RE =
  /^(?:N\.\s*Y\.\s*C\.\s*Admin\.?\s+Code|NYC\s+Admin\.?\s+Code|New\s+York\s+City\s+Administrative\s+Code)\s+§§?\s*(\d+-\d+(?![\d-])(?!\.\d)(?:[A-Za-z0-9])?)((?:\([^)]*\))*)$/d

export function extractNycAdminCode(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = NYC_ADMIN_CODE_RE.exec(text)!
  const sectionRaw = match[1]
  const subsectionRaw = match[2] ?? ""

  const body = `${sectionRaw}${subsectionRaw}`
  const { section, subsection, hasEtSeq } = parseBody(body)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match.indices) {
    spans = {}
    const sectionIdx = match.indices[1]
    if (sectionIdx && section) {
      const sectionSpanLen = section.replace(/[.,;:]\s*$/, "").length
      spans.section = spanFromGroupIndex(
        span.cleanStart,
        [sectionIdx[0], sectionIdx[0] + sectionSpanLen],
        transformationMap,
      )
    }
    const subIdx = match.indices[2]
    if (subIdx && subsection && subIdx[0] < subIdx[1]) {
      spans.subsection = spanFromGroupIndex(span.cleanStart, subIdx, transformationMap)
    }
  }

  // Closed-prefix match — high confidence.
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
    code: "N.Y.C. Admin. Code",
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "NY",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
