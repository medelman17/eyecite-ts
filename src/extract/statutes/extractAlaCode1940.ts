/**
 * Pre-1975 Alabama Code Extraction
 *
 * Parses citations to the Code of Alabama 1940 — the dominant pre-1975
 * Alabama statutory citation form. Modern Alabama opinions still cite this
 * version when referencing the historical text of a statute:
 *
 *   Code 1940, T. 15, § 389
 *   Title 26, Section 214, Code of Alabama 1940, as Recompiled 1958
 *   Tit. 52, § 361
 *
 * Three tokenizer patternIds route here:
 *   - `ala-code-prefix`     → Code-first form (year hardcoded to 1940)
 *   - `ala-title-trailer`   → Title-first with mandatory Code trailer
 *   - `ala-tit-bare`        → abbreviated `Tit.` form (optional Code trailer)
 *
 * @module extract/statutes/extractAlaCode1940
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

// Anchored re-match regexes for each Alabama patternId — mirror the
// tokenizer patterns in `src/patterns/statutePatterns.ts` so the extractor
// re-parses the same span the tokenizer captured. `d` flag enables
// `match.indices` for component spans.

const ALA_CODE_PREFIX_RE =
  /^Code(?:\s+of\s+Alabama)?,?\s+1940,?\s+T(?:itle|it)?\.\s+(\d+),?\s+§\s+(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*)$/d

const ALA_TITLE_TRAILER_RE =
  /^Title\s+(\d+),?\s+(?:§|Sec(?:tion)?s?\.?)\s+(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*),?\s+Code(?:\s+of\s+Alabama)?,?\s+(\d{4})(?:,?\s+(?:as\s+)?[Rr]ecompiled\s+(\d{4}))?$/d

const ALA_TIT_BARE_RE =
  /^Tit\.\s+(\d+),?\s+§\s+(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*)(?:,?\s+Code(?:\s+of\s+Alabama)?,?\s+(\d{4})(?:,?\s+(?:as\s+)?[Rr]ecompiled\s+(\d{4}))?)?$/d

export function extractAlaCode1940(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token

  let titleRaw: string
  let sectionRaw: string
  let year: number | undefined
  let recompiledYear: number | undefined
  let titleGroupIdx: number
  let sectionGroupIdx: number
  let match: RegExpExecArray

  switch (token.patternId) {
    case "ala-code-prefix": {
      match = ALA_CODE_PREFIX_RE.exec(text)!
      titleRaw = match[1]
      sectionRaw = match[2]
      year = 1940 // prefix asserts the 1940 edition
      titleGroupIdx = 1
      sectionGroupIdx = 2
      break
    }
    case "ala-title-trailer": {
      match = ALA_TITLE_TRAILER_RE.exec(text)!
      titleRaw = match[1]
      sectionRaw = match[2]
      year = Number.parseInt(match[3], 10)
      if (match[4]) recompiledYear = Number.parseInt(match[4], 10)
      titleGroupIdx = 1
      sectionGroupIdx = 2
      break
    }
    default: {
      // ala-tit-bare
      match = ALA_TIT_BARE_RE.exec(text)!
      titleRaw = match[1]
      sectionRaw = match[2]
      if (match[3]) year = Number.parseInt(match[3], 10)
      if (match[4]) recompiledYear = Number.parseInt(match[4], 10)
      titleGroupIdx = 1
      sectionGroupIdx = 2
      break
    }
  }

  const title = Number.parseInt(titleRaw, 10)
  const { section, subsection, hasEtSeq } = parseBody(sectionRaw)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match.indices) {
    spans = {}
    const titleIdx = match.indices[titleGroupIdx]
    if (titleIdx) spans.title = spanFromGroupIndex(span.cleanStart, titleIdx, transformationMap)
    const bodyIdx = match.indices[sectionGroupIdx]
    if (bodyIdx && section) {
      const bodyStart = bodyIdx[0]
      const sectionSpanLen = section.replace(/[.,;:]\s*$/, "").length
      spans.section = spanFromGroupIndex(
        span.cleanStart,
        [bodyStart, bodyStart + sectionSpanLen],
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

  // Confidence: 0.95 baseline (closed-shape Alabama Code matches are
  // unambiguous when the Code prefix / trailer or `Tit.` abbreviation is
  // present, which all three patternIds enforce). +0.05 with a subsection.
  let confidence = 0.95
  if (subsection) confidence += 0.05
  confidence = Math.min(confidence, 1.0)

  return {
    type: "statute",
    text,
    span: { cleanStart: span.cleanStart, cleanEnd: span.cleanEnd, originalStart, originalEnd },
    confidence,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    title,
    code: "Code of Alabama 1940",
    section,
    subsection,
    pincite: subsection,
    year,
    recompiledYear,
    jurisdiction: "AL",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
