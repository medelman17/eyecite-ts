/**
 * California Bare-Code Statute Extraction (#296)
 *
 * Parses tokenized citations to California codes that lack the `Cal.`
 * jurisdiction prefix — `Pen. Code § 148`, `Code Civ. Proc., § 1021.5`,
 * `Bus. & Prof. Code § 17200`. The fully-qualified form (`Cal. Penal
 * Code § 148`) is handled by `extractNamedCode`; this extractor
 * recognizes the bare form via the closed alternation defined in
 * `src/data/caBareCodes.ts`.
 *
 * All matches produce `jurisdiction: "CA"`.
 *
 * @module extract/statutes/extractCaBareCode
 */

import { findCaBareCode } from "@/data/caBareCodes"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

/** Match shape: <bare code name> [,] § <body>. Indices flag enables span computation.
 *
 * Body grammar mirrors the tokenizer's `buildCaBareCodeRegex` so the
 * extractor accepts the same shapes (including the optional `, subd.`
 * keyword tail introduced in #589). The actual normalization of
 * `1238, subd. (a)(8)` → `(a)(8)` happens inside `parseBody`.
 */
// Trailing `(?:\s*[-–—]+\s*\([A-Za-z0-9]+\))?` captures the closing
// paren of a paren-range like `(a)-(c)` so parseBody can surface the
// structured `subsectionRange` field. Mirrors the tokenizer body
// grammar in buildCaBareCodeRegex (#694).
const CA_BARE_CODE_RE =
  /^(.+?)\s*,?\s*§§?\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:,?\s+(?:subd\.|subdivision|paragraphs?|pars?\.)\s+(?:\([^)]*\)|\[[^\]]*\])(?:\s*(?:\([^)]*\)|\[[^\]]*\]))*)?(?:\s*[-–—]+\s*\([A-Za-z0-9]+\))?(?:\s*et\s+seq\.?)?)$/d

export function extractCaBareCode(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  // The tokenizer's closed-alternation regex guarantees a match here; the
  // extractor's regex is structurally equivalent to that tokenizer pattern,
  // so `match` is always non-null for tokens routed to this extractor.
  const match = CA_BARE_CODE_RE.exec(text)!
  const rawCodeText = match[1].trim()
  const rawBody = match[2]

  // Normalize back to canonical bare-code form ("Pen. Code", "Code Civ. Proc.").
  // `findCaBareCode` is guaranteed to hit because the tokenizer only emits
  // tokens whose code text matched one of the canonical alternations.
  const code = findCaBareCode(rawCodeText)!

  const { section, subsection, subsectionRangeEnd, hasEtSeq } = parseBody(rawBody)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match?.indices) {
    spans = {}
    if (match.indices[1])
      spans.code = spanFromGroupIndex(span.cleanStart, match.indices[1], transformationMap)
    if (match.indices[2] && section) {
      const bodyStart = match.indices[2][0]
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

  // Confidence: bare-code matches come from a closed alternation, so the
  // jurisdiction inference is reliable. Match the existing named-code
  // baseline (0.95 when a known code resolves) and bump for subsection.
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
    code,
    section,
    subsection,
    subsectionRange:
      subsection && subsectionRangeEnd ? { start: subsection, end: subsectionRangeEnd } : undefined,
    pincite: subsection,
    jurisdiction: "CA",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
