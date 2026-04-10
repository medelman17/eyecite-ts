/**
 * Federal Statute Extraction (USC + CFR)
 *
 * Parses tokenized federal citations to extract title, code, section,
 * subsections, jurisdiction, and et seq. indicators.
 *
 * @module extract/statutes/extractFederal
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

/** Regex to parse federal token: title + code + § + body */
const FEDERAL_SECTION_RE = /^(\d+)\s+(\S+(?:\.\S+)*)\s*§§?\s*(.+)$/d
/** Regex to parse federal token: title + code + Part + body */
const FEDERAL_PART_RE = /^(\d+)\s+(\S+(?:\.\S+)*)\s+(?:Part|pt\.)\s+(.+)$/d

/**
 * Extract a federal statute citation (USC or CFR) from a tokenized match.
 */
export function extractFederal(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token

  // Try § form first, then Part form
  const bodyMatch = FEDERAL_SECTION_RE.exec(text) ?? FEDERAL_PART_RE.exec(text)

  let title: number | undefined
  let code: string
  let rawBody: string

  if (bodyMatch) {
    title = Number.parseInt(bodyMatch[1], 10)
    code = bodyMatch[2]
    rawBody = bodyMatch[3]
  } else {
    // Fallback for edge cases
    code = token.patternId === "cfr" ? "C.F.R." : "U.S.C."
    rawBody = text
    title = undefined
  }

  const { section, subsection, hasEtSeq } = parseBody(rawBody)

  // Translate positions
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (bodyMatch?.indices) {
    spans = {}
    if (bodyMatch.indices[1]) spans.title = spanFromGroupIndex(span.cleanStart, bodyMatch.indices[1], transformationMap)
    if (bodyMatch.indices[2]) spans.code = spanFromGroupIndex(span.cleanStart, bodyMatch.indices[2], transformationMap)
    if (bodyMatch.indices[3] && section) {
      const bodyStart = bodyMatch.indices[3][0]
      // Use section without trailing sentence punctuation for span boundary.
      // Note: section comes from parseBody() which strips et seq. and splits
      // subsections — the leading text still matches the raw match position.
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

  // Confidence: known federal code + § = 0.95 base
  let confidence = 0.95
  if (title !== undefined) confidence += 0.05
  if (subsection) confidence += 0.05
  confidence = Math.min(confidence, 1.0)

  return {
    type: "statute",
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    title,
    code,
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "US",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
