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
import { extractAlaCode1940 } from "./statutes/extractAlaCode1940"
import { extractCaBareCode } from "./statutes/extractCaBareCode"
import { extractChapterAct } from "./statutes/extractChapterAct"
import { extractColoradoProse } from "./statutes/extractColoradoProse"
import { extractFederal } from "./statutes/extractFederal"
import { extractFloridaStatute } from "./statutes/extractFloridaStatute"
import { extractIdahoPostfix } from "./statutes/extractIdahoPostfix"
import { extractIllRevStat } from "./statutes/extractIllRevStat"
import { extractKsaYearEdition } from "./statutes/extractKsaYearEdition"
import { extractMcaPostfix } from "./statutes/extractMcaPostfix"
import { extractMdArticleLetter } from "./statutes/extractMdArticleLetter"
import { extractMinnStYearEdition } from "./statutes/extractMinnStYearEdition"
import { extractNamedCode } from "./statutes/extractNamedCode"
import { extractProse } from "./statutes/extractProse"
import { extractRlh } from "./statutes/extractRlh"
import { extractRrs1943 } from "./statutes/extractRrs1943"

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
    case "ca-bare-code":
      return extractCaBareCode(token, transformationMap)
    case "named-code":
    case "mass-chapter":
      return extractNamedCode(token, transformationMap)
    case "chapter-act":
      return extractChapterAct(token, transformationMap)
    case "ill-rev-stat":
      return extractIllRevStat(token, transformationMap)
    case "ala-code-prefix":
    case "ala-title-trailer":
    case "ala-tit-bare":
      return extractAlaCode1940(token, transformationMap)
    case "colorado-prose":
      return extractColoradoProse(token, transformationMap)
    case "florida-postfix":
    case "florida-prefix-spelled":
      return extractFloridaStatute(token, transformationMap)
    case "idaho-postfix":
      return extractIdahoPostfix(token, transformationMap)
    case "ksa-year-edition":
      return extractKsaYearEdition(token, transformationMap)
    case "mca-postfix":
      return extractMcaPostfix(token, transformationMap)
    case "md-article-letter":
      return extractMdArticleLetter(token, transformationMap)
    case "minn-st-year-edition":
      return extractMinnStYearEdition(token, transformationMap)
    case "rlh":
      return extractRlh(token, transformationMap)
    case "rrs-1943":
      return extractRrs1943(token, transformationMap)
    default:
      // unknown patterns use legacy parser
      return extractLegacy(token, transformationMap)
  }
}
