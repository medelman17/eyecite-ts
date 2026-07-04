/**
 * Judicial-Conduct Canon Citation Extractor (#310)
 *
 * Parses Code of Judicial Conduct canon citations (`Canon 7(B)(1)`) into the
 * `canon` type.
 *
 * @module extract/extractCanon
 */

import { CitationParseError } from "./errors"
import { CANON_RE } from "@/patterns/canonPatterns"
import type { Token } from "@/tokenize/tokenizer"
import type { CanonCitation } from "@/types/citation"
import { resolveOriginalSpan, type TransformationMap } from "@/types/span"

export function extractCanon(token: Token, transformationMap: TransformationMap): CanonCitation {
  const { text, span } = token
  const m = CANON_RE.exec(text)
  if (!m) throw new CitationParseError(`Failed to parse canon citation: ${text}`)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  return {
    type: "canon",
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence: 0.9,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    canon: m[1]!,
    ...(m[2] ? { subsection: m[2] } : {}),
    ...(m[3] ? { ruleSet: "Code of Judicial Conduct" } : {}),
  }
}
