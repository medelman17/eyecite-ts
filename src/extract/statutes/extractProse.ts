/**
 * Prose-form Statute Extraction
 *
 * Parses natural language references like "section 1983 of title 42"
 * into structured StatuteCitation objects.
 *
 * @module extract/statutes/extractProse
 */

import type { StatuteFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"

/** Parse "section X(subsections) of title Y" */
const PROSE_RE = /[Ss]ection\s+(\d+[A-Za-z0-9-]*)((?:\([^)]*\))*)\s+of\s+title\s+(\d+)/d

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

  let spans: StatuteComponentSpans | undefined
  if (match?.indices) {
    spans = {}
    if (match.indices[1])
      spans.section = spanFromGroupIndex(span.cleanStart, match.indices[1], transformationMap)
    if (match.indices[3])
      spans.title = spanFromGroupIndex(span.cleanStart, match.indices[3], transformationMap)
    if (match.indices[2] && subsection) {
      spans.subsection = spanFromGroupIndex(span.cleanStart, match.indices[2], transformationMap)
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
    spans,
  }
}
