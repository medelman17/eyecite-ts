/**
 * Statute Citation Extraction — Dispatcher
 *
 * Routes statute tokens to family-specific extractors based on patternId.
 * This is the entry point called by extractCitations.ts (line 234).
 *
 * Family dispatch:
 * - "usc", "cfr" → extractFederal
 * - "prose" → extractProse
 * - "abbreviated-code" → extractAbbreviated
 * - "chapter-act" → extractChapterAct
 * - unknown → legacy inline parser (safety net for unknown patternIds)
 *
 * @module extract/extractStatute
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import { resolveOriginalSpan, type TransformationMap } from "@/types/span"
import { extractAbbreviated } from "./statutes/extractAbbreviated"
import { extractChapterAct } from "./statutes/extractChapterAct"
import { extractFederal } from "./statutes/extractFederal"
import { extractNamedCode } from "./statutes/extractNamedCode"
import { extractProse } from "./statutes/extractProse"

/**
 * Legacy inline parser for unknown patterns.
 * Safety net for any patternId not explicitly handled by the dispatcher.
 */
function extractLegacy(token: Token, transformationMap: TransformationMap): StatuteCitation {
  const { text, span } = token

  const statuteRegex = /^(?:(\d+)\s+)?([A-Za-z.\s]+?)\s*§+\s*(\d+[A-Za-z0-9-]*)/
  const match = statuteRegex.exec(text)

  // Graceful fallback for unparseable tokens — return low-confidence citation
  // rather than throwing (spec: "Unknown codes produce citations with low confidence")
  if (!match) {
    const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

    return {
      type: "statute",
      text,
      span: { cleanStart: span.cleanStart, cleanEnd: span.cleanEnd, originalStart, originalEnd },
      confidence: 0.3,
      matchedText: text,
      processTimeMs: 0,
      patternsChecked: 1,
      code: text,
      section: "",
    }
  }

  const title = match[1] ? Number.parseInt(match[1], 10) : undefined
  const code = match[2].trim()
  const section = match[3]

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let confidence = 0.5
  const knownCodes = [
    "U.S.C.",
    "C.F.R.",
    "Cal. Civ. Code",
    "Cal. Penal Code",
    "N.Y. Civ. Prac. L. & R.",
    "Tex. Civ. Prac. & Rem. Code",
  ]

  if (knownCodes.some((c) => code.includes(c))) {
    confidence += 0.3
  }

  confidence = Math.min(confidence, 1.0)

  return {
    type: "statute",
    text,
    span: {
      cleanStart: span.cleanStart,
      cleanEnd: span.cleanEnd,
      originalStart,
      originalEnd,
    },
    confidence,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    title,
    code,
    section,
  }
}

/**
 * Extracts statute citation metadata from a tokenized citation.
 * Dispatches to family-specific extractors based on patternId.
 */
export function extractStatute(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  switch (token.patternId) {
    case "usc":
    case "cfr":
      return extractFederal(token, transformationMap)
    case "prose":
      return extractProse(token, transformationMap)
    case "abbreviated-code":
      return extractAbbreviated(token, transformationMap)
    case "named-code":
    case "mass-chapter":
      return extractNamedCode(token, transformationMap)
    case "chapter-act":
      return extractChapterAct(token, transformationMap)
    default:
      // unknown patterns use legacy parser
      return extractLegacy(token, transformationMap)
  }
}
