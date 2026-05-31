/**
 * Treaty Citation Extractor (#309)
 *
 * Parses treaty-series citations into the `treaty` type: "No."-style series
 * (T.I.A.S. / Bevans) and volume-series-page forms (U.N.T.S. / U.S.T.). The
 * series abbreviation is normalized (interior spaces stripped).
 *
 * @module extract/extractTreaty
 */

import { TREATY_SERIES_NO_RE, TREATY_VOL_PAGE_RE } from "@/patterns/treatyPatterns"
import type { Token } from "@/tokenize/tokenizer"
import type { TreatyCitation } from "@/types/citation"
import { resolveOriginalSpan, type TransformationMap } from "@/types/span"

/** Normalize a spaced abbreviation: "T. I. A. S." → "T.I.A.S." */
const normalizeSeries = (raw: string): string => raw.replace(/\s+/g, "")

export function extractTreaty(token: Token, transformationMap: TransformationMap): TreatyCitation {
  const { text, span, patternId } = token

  let series: string
  let seriesNumber: string | undefined
  let volume: number | undefined
  let page: number | undefined

  if (patternId === "treaty-volume-page") {
    const m = TREATY_VOL_PAGE_RE.exec(text)
    if (!m) throw new Error(`Failed to parse treaty citation: ${text}`)
    volume = Number.parseInt(m[1]!, 10)
    series = normalizeSeries(m[2]!)
    page = Number.parseInt(m[3]!, 10)
  } else {
    const m = TREATY_SERIES_NO_RE.exec(text)
    if (!m) throw new Error(`Failed to parse treaty citation: ${text}`)
    series = normalizeSeries(m[1]!)
    seriesNumber = m[2]!
  }

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  return {
    type: "treaty",
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
    series,
    ...(seriesNumber ? { seriesNumber } : {}),
    ...(volume !== undefined ? { volume } : {}),
    ...(page !== undefined ? { page } : {}),
  }
}
