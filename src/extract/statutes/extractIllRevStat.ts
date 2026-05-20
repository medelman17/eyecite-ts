/**
 * Illinois Revised Statutes Extraction (pre-1993 format)
 *
 * Parses citations to Illinois Revised Statutes, the dominant pre-1993
 * Illinois statutory citation form:
 *
 *   Ill. Rev. Stat. 1985, ch. 40, par. 504(a)
 *   Ill. Rev. Stat. 1987, ch. 85, pars. 8-102, 8-103
 *   Ill.Rev.Stat. 1985, Ch. 127, par. 780.04.
 *
 * Modern Illinois opinions continue to cite ILRS when referencing the
 * historical version of a statute. Companion to `extractChapterAct` (which
 * handles the modern post-1993 ILCS form). #330
 *
 * @module extract/statutes/extractIllRevStat
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

// Accepts both `ch.` and `chap.` (full spelling) — see #595.
const ILL_REV_STAT_RE =
  /^Ill\.?\s*Rev\.?\s*Stat\.?,?\s+(\d{4}),?\s+[Cc]h(?:ap)?\.\s+(\d+[A-Z]?),?\s+pars?\.\s+(\d+(?:[A-Za-z0-9:-]|\.(?=[A-Za-z0-9]))*(?:\([^)]*\))*(?:\s*et\s+seq\.?)?)$/d

export function extractIllRevStat(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  // The tokenizer's regex guarantees a match here — same shape as the
  // extractor's regex. Use non-null assertion to keep the code path tight.
  const match = ILL_REV_STAT_RE.exec(text)!
  const year = Number.parseInt(match[1], 10)
  const chapterRaw = match[2]
  // Chapter can carry a letter suffix (`110A`). Use only the digit-prefix for
  // the numeric `title` field; the full chapter string is preserved in
  // `matchedText`.
  const title = Number.parseInt(chapterRaw, 10)
  const rawBody = match[3]

  const { section, subsection, hasEtSeq } = parseBody(rawBody)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match.indices) {
    spans = {}
    if (match.indices[2])
      spans.title = spanFromGroupIndex(span.cleanStart, match.indices[2], transformationMap)
    if (match.indices[3] && section) {
      const bodyStart = match.indices[3][0]
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

  // Confidence: 0.95 baseline (closed-shape Ill. Rev. Stat. matches are
  // unambiguous); +0.05 when a subsection is captured.
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
    code: "Ill. Rev. Stat.",
    section,
    subsection,
    pincite: subsection,
    year,
    jurisdiction: "IL",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
