/**
 * A.L.R. Annotation Extraction (#581)
 *
 * The American Law Reports (A.L.R.) series publishes narrowly-focused
 * legal annotations. Citations look identical to case citations
 * (`100 A.L.R.2d 1234`) but are secondary authority — until this
 * extractor existed, the broad state-reporter regex was harvesting them
 * as `{type: "case", reporter: "A.L.R.2d"}`.
 *
 * @module extract/extractAnnotation
 */

import type { Token } from "@/tokenize"
import type { AnnotationCitation } from "@/types/citation"
import type { AnnotationComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { isPlausibleYear } from "./dates"

/**
 * Extract an `annotation` citation from a tokenized A.L.R. match.
 *
 * Confidence is `0.95` — the A.L.R. series naming convention is
 * unambiguous and the pattern is anchored on the literal `A.L.R.`
 * stem, so spurious matches are unlikely.
 */
export function extractAnnotation(
  token: Token,
  transformationMap: TransformationMap,
): AnnotationCitation {
  const { text, span } = token

  const annotationRegex =
    /\b(\d+)\s+(A\.\s?L\.\s?R\.(?:\s?(?:Fed\.(?:\s?\d(?:d|nd|rd|th))?|\d(?:d|nd|rd|th)))?)\s+(\d+)\b/d
  const match = annotationRegex.exec(text)
  if (!match) {
    throw new Error(`Failed to parse A.L.R. annotation citation: ${text}`)
  }

  const volume = Number.parseInt(match[1], 10)
  // Normalize the series string: collapse internal whitespace so
  // `A. L. R.` and `A.L.R.` produce the same `series` field. We preserve
  // the periods and ordinal suffix exactly as captured.
  const series = match[2].replace(/\s+/g, "")
  const page = Number.parseInt(match[3], 10)

  // Optional year from trailing parenthetical — same plausibility filter
  // used by federalRegister and statutesAtLarge.
  const yearMatch = /\((?:.*?\s)?(\d{4})\)/.exec(text)
  const rawYear = yearMatch ? Number.parseInt(yearMatch[1], 10) : undefined
  const year = rawYear !== undefined && isPlausibleYear(rawYear) ? rawYear : undefined

  let spans: AnnotationComponentSpans | undefined
  if (match.indices) {
    const volumeIdx = match.indices[1]
    const seriesIdx = match.indices[2]
    const pageIdx = match.indices[3]
    if (volumeIdx && seriesIdx && pageIdx) {
      spans = {
        volume: spanFromGroupIndex(span.cleanStart, volumeIdx, transformationMap),
        series: spanFromGroupIndex(span.cleanStart, seriesIdx, transformationMap),
        page: spanFromGroupIndex(span.cleanStart, pageIdx, transformationMap),
      }
    }
  }

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  return {
    type: "annotation",
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
    series,
    volume,
    page,
    year,
    spans,
  }
}
