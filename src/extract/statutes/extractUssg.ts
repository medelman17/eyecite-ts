/**
 * U.S. Sentencing Guidelines Extractor (#577)
 *
 * Folds USSG citations under the `statute` type with `code="U.S.S.G."` —
 * no title (the Guidelines are organized by chapter/section without a
 * U.S. Code title).
 *
 * @module extract/statutes/extractUssg
 */

import { CitationParseError } from "../errors"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const USSG_REGEX =
  /\b(U\.S\.S\.G\.|USSG)\s*§§?\s*(\d+(?:[A-Za-z0-9-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*)/d

export function extractUssg(token: Token, transformationMap: TransformationMap): StatuteCitation {
  const { text, span } = token

  const match = USSG_REGEX.exec(text)
  if (!match) {
    throw new CitationParseError(`Failed to parse USSG citation: ${text}`)
  }

  const rawBody = match[2]
  const { section, subsection } = parseBody(rawBody)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match.indices) {
    spans = {}
    const codeIdx = match.indices[1]
    const bodyIdx = match.indices[2]
    if (codeIdx) {
      spans.code = spanFromGroupIndex(span.cleanStart, codeIdx, transformationMap)
    }
    if (bodyIdx && section) {
      const [bodyStart] = bodyIdx
      spans.section = spanFromGroupIndex(
        span.cleanStart,
        [bodyStart, bodyStart + section.length],
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

  return {
    type: "statute",
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence: 0.95,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    code: "U.S.S.G.",
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "US",
    spans,
  }
}
