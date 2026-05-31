/**
 * Local / Municipal Ordinance Citation Extractor (#778)
 *
 * Parses Clark County Code/Ordinance references (`CCCO § 2.12.010(1)`) into the
 * `localOrdinance` type.
 *
 * @module extract/extractLocalOrdinance
 */

import { CCCO_ORDINANCE_RE } from "@/patterns/localOrdinancePatterns"
import type { Token } from "@/tokenize/tokenizer"
import type { LocalOrdinanceCitation } from "@/types/citation"
import { resolveOriginalSpan, type TransformationMap } from "@/types/span"

export function extractLocalOrdinance(
  token: Token,
  transformationMap: TransformationMap,
): LocalOrdinanceCitation {
  const { text, span } = token
  const m = CCCO_ORDINANCE_RE.exec(text)
  if (!m) throw new Error(`Failed to parse local-ordinance citation: ${text}`)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  return {
    type: "localOrdinance",
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
    code: "CCCO",
    locality: "Clark County, NV",
    section: m[1]!,
  }
}
