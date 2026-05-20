/**
 * New York CPLR bare extractor (#592)
 *
 * Parses tokenized CPLR citations in the dominant NY court styles:
 *   - `CPLR 3025 (b)`         (bare, no §, space-paren subsection)
 *   - `CPLR 3211 (a) (4)`     (multiple space-separated paren groups)
 *   - `CPLR 3108`             (bare section, no subsection)
 *   - `CPLR 4518 [a]`         (bracket subsection)
 *   - `CPLR § 3211`           (with § connector)
 *   - `C.P.L.R. § 3211`       (dotted with §)
 *   - `N.Y. C.P.L.R. § 211`   (fully-qualified)
 *
 * Always emits `code: "N.Y. C.P.L.R."` (canonical Bluebook form) and
 * `jurisdiction: "NY"` regardless of the input shape.
 *
 * @module extract/statutes/extractNyCplrBare
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

/** Match the same shape as the tokenizer's `ny-cplr-bare` pattern, anchored. */
const NY_CPLR_BARE_RE =
  /^(?:N\.\s*Y\.\s*)?C\.?\s*P\.?\s*L\.?\s*R\.?\s*(?:§§?\s*)?(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*)((?:\s*(?:\([^)]*\)|\[[^\]]*\]))*)$/d

export function extractNyCplrBare(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = NY_CPLR_BARE_RE.exec(text)!
  const sectionRaw = match[1]
  const subsectionRaw = match[2] ?? ""

  // Concatenate section + collapsed paren chain so parseBody splits cleanly:
  // `3211` + ` (a) (4)` → `3211(a)(4)` → section "3211", subsection "(a)(4)".
  const body = `${sectionRaw}${subsectionRaw.replace(/\s+/g, "")}`
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

  // Confidence: closed CPLR alternation with mandatory trailing digits is
  // unambiguous; jurisdiction inference is reliable.
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
    code: "N.Y. C.P.L.R.",
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "NY",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
