/**
 * Restatement Citation Extraction (#578)
 *
 * Parses tokenized Restatement citations into the `restatement` citation
 * type. Handles canonical Bluebook form `Restatement (Edition) of Subject
 * § Section`, with both full edition names (`Second`) and ordinal short
 * forms (`2d`).
 *
 * @module extract/extractRestatement
 */

import type { Token } from "@/tokenize"
import type { RestatementCitation } from "@/types/citation"
import type { RestatementComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"

/**
 * Map of edition tokens (lowercased) to their canonical discriminator.
 * Both spelled-out (`Second`) and ordinal (`2d`) forms are accepted.
 */
const EDITION_MAP: ReadonlyMap<string, RestatementCitation["edition"]> = new Map([
  ["first", "First"],
  ["1st", "First"],
  ["second", "Second"],
  ["2d", "Second"],
  ["third", "Third"],
  ["3d", "Third"],
  ["fourth", "Fourth"],
  ["4th", "Fourth"],
])

/**
 * Split a captured section body (e.g. `402A(1)(b)`) into the bare section
 * locator and the trailing subsection chain.
 */
function splitSectionAndSubsection(body: string): [string, string | undefined] {
  const parenIdx = body.indexOf("(")
  if (parenIdx === -1) return [body, undefined]
  return [body.slice(0, parenIdx), body.slice(parenIdx)]
}

export function extractRestatement(
  token: Token,
  transformationMap: TransformationMap,
): RestatementCitation {
  const { text, span } = token

  const restatementRegex =
    /\bRestatement\s+\((First|Second|Third|Fourth|1st|2d|3d|4th)\)\s+(?:of\s+)?([A-Za-z][A-Za-z\s,.&'-]+?)\s+§§?\s*(\d+(?:[A-Za-z0-9-]|\.[A-Za-z0-9])*(?:\([^)]*\))*)/d
  const match = restatementRegex.exec(text)

  if (!match) {
    throw new Error(`Failed to parse Restatement citation: ${text}`)
  }

  const editionRaw = match[1]
  const edition = EDITION_MAP.get(editionRaw.toLowerCase())
  if (!edition) {
    throw new Error(`Unrecognized Restatement edition: "${editionRaw}"`)
  }

  const subject = match[2].trim()
  const [section, subsection] = splitSectionAndSubsection(match[3])

  let spans: RestatementComponentSpans | undefined
  if (match.indices) {
    const editionIdx = match.indices[1]
    const subjectIdx = match.indices[2]
    const sectionBodyIdx = match.indices[3]
    if (editionIdx && subjectIdx && sectionBodyIdx) {
      spans = {
        edition: spanFromGroupIndex(span.cleanStart, editionIdx, transformationMap),
        subject: spanFromGroupIndex(span.cleanStart, subjectIdx, transformationMap),
      }
      const parenIdx = match[3].indexOf("(")
      if (parenIdx === -1) {
        spans.section = spanFromGroupIndex(span.cleanStart, sectionBodyIdx, transformationMap)
      } else {
        const [bodyStart, bodyEnd] = sectionBodyIdx
        spans.section = spanFromGroupIndex(
          span.cleanStart,
          [bodyStart, bodyStart + parenIdx],
          transformationMap,
        )
        spans.subsection = spanFromGroupIndex(
          span.cleanStart,
          [bodyStart + parenIdx, bodyEnd],
          transformationMap,
        )
      }
    }
  }

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  return {
    type: "restatement",
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
    edition,
    subject,
    section,
    subsection,
    spans,
  }
}
