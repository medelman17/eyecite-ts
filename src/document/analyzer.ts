import type { Citation } from "../types/citation"
import type { TransformationMap } from "../types/span"
import { detectQuoteZones } from "../utils/detectQuoteZones"
import { computeParenDepths } from "../utils/parenDepths"
import { buildCitationGraph } from "./citationGraph"
import { extractFootnoteZones } from "./footnoteZones"
import { computeProseOffsets } from "./proseOffsets"
import { attributeQuotes } from "./quoteAttribution"
import type { Document } from "./types"

/**
 * Project an existing extraction result into a Document view with prose
 * offsets, quote attribution, citation graph, and (optionally) footnote
 * zones.
 *
 * Pure projection — reads existing fields, re-shapes; no new tokenization
 * or extraction. Cheap (sub-millisecond per call for typical brief sizes).
 *
 * See `docs/superpowers/specs/2026-05-19-document-understanding-api-design.md`.
 */
export function analyzeDocument(
  text: string,
  citations: Citation[],
  opts?: { transformationMap?: TransformationMap },
): Document {
  const parenDepths = computeParenDepths(text, citations)
  const quoteZones = detectQuoteZones(text)

  const prose = computeProseOffsets(text, citations, opts?.transformationMap)
  const citationGraph = buildCitationGraph(citations, parenDepths, text)
  const quoteAttributions = attributeQuotes(text, quoteZones, citations)
  const footnoteZones = extractFootnoteZones(citations)

  return {
    citations,
    proseSpans: prose.proseSpans,
    precedingProse: prose.precedingProse,
    followingProse: prose.followingProse,
    quoteAttributions,
    citationGraph,
    ...(footnoteZones ? { footnoteZones } : {}),
  }
}
