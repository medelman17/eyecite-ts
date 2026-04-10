/**
 * Abbreviated-Code Statute Extraction (Family 3)
 *
 * Parses tokenized citations from states that use compact abbreviations
 * (e.g., "Fla. Stat.", "R.C.", "MCL"). Looks up the abbreviation in the
 * knownCodes registry to determine jurisdiction.
 *
 * Jurisdictions: FL, OH, MI, UT, CO, WA, NC, GA, PA, IN, NJ, DE
 *
 * @module extract/statutes/extractAbbreviated
 */

import { findAbbreviatedCode } from "@/data/knownCodes"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const ABBREVIATED_RE =
  /^(?:(\d+)\s+)?(.+?)\s*§?\s*(\d+[A-Za-z0-9.:/-]*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)$/d

export function extractAbbreviated(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = ABBREVIATED_RE.exec(text)

  let title: number | undefined
  let abbrevText: string
  let rawBody: string

  if (match) {
    title = match[1] ? Number.parseInt(match[1], 10) : undefined
    abbrevText = match[2].trim()
    rawBody = match[3]
  } else {
    abbrevText = text
    rawBody = ""
  }

  const codeEntry = findAbbreviatedCode(abbrevText)
  const jurisdiction = codeEntry?.jurisdiction
  const code = abbrevText

  const { section, subsection, hasEtSeq } = parseBody(rawBody)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match?.indices) {
    spans = {}
    if (match.indices[1]) spans.title = spanFromGroupIndex(span.cleanStart, match.indices[1], transformationMap)
    if (match.indices[2]) spans.code = spanFromGroupIndex(span.cleanStart, match.indices[2], transformationMap)
    if (match.indices[3] && section) {
      const bodyStart = match.indices[3][0]
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

  const hasSection = text.includes("§")
  let confidence: number
  if (codeEntry && hasSection) {
    confidence = 0.95
  } else if (codeEntry) {
    confidence = 0.85
  } else if (hasSection) {
    confidence = 0.6
  } else {
    confidence = 0.4
  }
  if (title !== undefined) confidence += 0.05
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
    code,
    section,
    subsection,
    pincite: subsection,
    jurisdiction,
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
