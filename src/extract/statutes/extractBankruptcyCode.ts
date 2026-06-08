/**
 * Bankruptcy Code Alias Extractor (#585)
 *
 * Normalizes `Bankruptcy Code § N` and `§ N of the Bankruptcy Code`
 * citations to `statute` records with `title=11, code="U.S.C."` so
 * downstream consumers can treat them identically to explicit
 * `11 U.S.C. § N` citations.
 *
 * @module extract/statutes/extractBankruptcyCode
 */

import { CitationParseError } from "../errors"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const PREFIX_REGEX =
  /\bBankruptcy\s+Code\s*§§?\s*(\d+(?:[A-Za-z0-9-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*)/d
const POSTFIX_REGEX =
  /§§?\s*(\d+(?:[A-Za-z0-9-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*)\s+of\s+the\s+Bankruptcy\s+Code/d

export function extractBankruptcyCode(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token

  const isPostfix = token.patternId === "bankruptcy-code-postfix"
  const regex = isPostfix ? POSTFIX_REGEX : PREFIX_REGEX
  const match = regex.exec(text)

  if (!match) {
    throw new CitationParseError(`Failed to parse Bankruptcy Code citation: ${text}`)
  }

  const rawBody = match[1]
  const { section, subsection } = parseBody(rawBody)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match.indices) {
    spans = {}
    const bodyIdx = match.indices[1]
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
    title: 11,
    code: "U.S.C.",
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "US",
    spans,
  }
}
