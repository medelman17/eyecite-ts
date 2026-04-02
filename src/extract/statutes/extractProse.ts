/**
 * Prose-form Statute Extraction
 *
 * Parses natural language references like "section 1983 of title 42"
 * into structured StatuteCitation objects.
 *
 * @module extract/statutes/extractProse
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import { resolveOriginalSpan, type TransformationMap } from "@/types/span"

/** Parse "section X(subsections) of title Y" */
const PROSE_RE = /[Ss]ection\s+(\d+[A-Za-z0-9-]*)((?:\([^)]*\))*)\s+of\s+title\s+(\d+)/

/**
 * Extract a prose-form statute citation.
 * Currently handles federal "section X of title Y" form.
 */
export function extractProse(token: Token, transformationMap: TransformationMap): StatuteCitation {
  const { text, span } = token

  const match = PROSE_RE.exec(text)

  let section: string
  let subsection: string | undefined
  let title: number | undefined

  if (match) {
    section = match[1]
    subsection = match[2] || undefined
    title = Number.parseInt(match[3], 10)
  } else {
    section = text
  }

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let confidence = 0.85
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
    code: "U.S.C.",
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "US",
  }
}
