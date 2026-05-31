/**
 * Legislative-Material Citation Extractor (#308)
 *
 * Parses House/Senate committee reports and Congressional Record citations into
 * the `legislativeMaterial` type, keyed off the matching pattern id.
 *
 * @module extract/extractLegislativeMaterial
 */

import {
  LEGMAT_CONG_REC_RE,
  LEGMAT_REPORT_RE,
} from "@/patterns/legislativeMaterialPatterns"
import type { Token } from "@/tokenize/tokenizer"
import type { LegislativeMaterialCitation } from "@/types/citation"
import { resolveOriginalSpan, type TransformationMap } from "@/types/span"

export function extractLegislativeMaterial(
  token: Token,
  transformationMap: TransformationMap,
): LegislativeMaterialCitation {
  const { text, span, patternId } = token
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)
  const base = {
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
  } as const

  if (patternId === "legmat-cong-rec") {
    const m = LEGMAT_CONG_REC_RE.exec(text)
    if (!m) throw new Error(`Failed to parse Congressional Record citation: ${text}`)
    return {
      ...base,
      type: "legislativeMaterial",
      kind: "congressionalRecord",
      volume: Number.parseInt(m[1]!, 10),
      page: Number.parseInt(m[2]!.replace(/^[HSE]/, ""), 10),
    }
  }

  const m = LEGMAT_REPORT_RE.exec(text)
  if (!m) throw new Error(`Failed to parse legislative-material citation: ${text}`)
  const chamber: "House" | "Senate" = m[1]!.startsWith("H") ? "House" : "Senate"
  const congress = m[3] ? Number.parseInt(m[3], 10) : undefined
  const page = m[5] ? Number.parseInt(m[5], 10) : undefined
  const year = m[6] ? Number.parseInt(m[6], 10) : undefined

  return {
    ...base,
    type: "legislativeMaterial",
    kind: "report",
    chamber,
    reportNumber: m[2]!,
    ...(congress !== undefined ? { congress } : {}),
    ...(m[4] ? { session: m[4] } : {}),
    ...(page !== undefined ? { page } : {}),
    ...(year !== undefined ? { year } : {}),
  }
}
