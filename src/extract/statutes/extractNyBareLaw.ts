/**
 * New York bare named-code form — `Penal Law § 130.52`, `Labor Law § 220 [3-a]`
 *
 * NY opinions omit the `N.Y.` prefix when citing their own state's codes.
 * The word `Law` after the code name is the disambiguator — other states
 * use `Code`. Bracket-subdivision groups (`[3]`, `[a]`, `[iv]`) are
 * accepted alongside the canonical `(N)` form. #386
 *
 * @module extract/statutes/extractNyBareLaw
 */

import type { StatuteFeatures } from "@/score/features"
import { scoreCitation } from "@/score/scorer"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

const NY_BARE_LAW_RE =
  /^(Penal|Labor|Real Property|General Business|General Obligations|General Municipal|Municipal Home Rule|Criminal Procedure|Insurance|Executive|Judiciary|Civil Practice|Civil Rights|Education|Public Health|Banking|Domestic Relations|Environmental Conservation|Election|Social Services|Estates Powers and Trusts|Vehicle and Traffic|Surrogate's Court Procedure|Family Court|Court of Claims|Workers' Compensation|Highway|Tax|Personal Property)\s+Law\s+§§?\s*(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\)|\[[^\]]*\])*(?:\s+(?:\([^)]*\)|\[[^\]]*\]))*)$/d

export function extractNyBareLaw(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = NY_BARE_LAW_RE.exec(text)!
  const codeName = match[1]
  const rawBody = match[2]
  // parseBody splits on first `(` or `[` — strip any whitespace + extra
  // subdivision tail groups so the section captures just the number.
  const cleanBody = rawBody.replace(/\s+/g, "")
  const { section, subsection, hasEtSeq } = parseBody(cleanBody)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match.indices) {
    spans = {}
    if (match.indices[1])
      spans.code = spanFromGroupIndex(span.cleanStart, match.indices[1], transformationMap)
    const bodyIdx = match.indices[2]
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

  const features: StatuteFeatures = {
    type: "statute",
    patternId: token.patternId,
    knownCode: true, // all state-specific extractors operate on known codes
    titlePresent: false,
    subsectionPresent: false,
    parseable: true,
  }
  const confidence = scoreCitation(features)

  return {
    type: "statute",
    text,
    span: { cleanStart: span.cleanStart, cleanEnd: span.cleanEnd, originalStart, originalEnd },
    confidence,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    code: `${codeName} Law`,
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "NY",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
