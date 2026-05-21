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
import type { RegulationCitation, StatuteCitation } from "@/types/citation"
import { resolveOriginalSpan, type TransformationMap } from "@/types/span"
import { extractAbbreviated } from "./statutes/extractAbbreviated"
import { extractAlaCode1940 } from "./statutes/extractAlaCode1940"
import { extractBankruptcyCode } from "./statutes/extractBankruptcyCode"
import { extractCaBareCode } from "./statutes/extractCaBareCode"
import { extractChapterAct } from "./statutes/extractChapterAct"
import { extractColoradoProse } from "./statutes/extractColoradoProse"
import { extractFederal } from "./statutes/extractFederal"
import { extractFloridaStatute } from "./statutes/extractFloridaStatute"
import { extractGaPre1983 } from "./statutes/extractGaPre1983"
import { extractIcYearEdition } from "./statutes/extractIcYearEdition"
import { extractIdahoPostfix } from "./statutes/extractIdahoPostfix"
import { extractIllRevStat } from "./statutes/extractIllRevStat"
import { extractIrc } from "./statutes/extractIrc"
import { extractKsaYearEdition } from "./statutes/extractKsaYearEdition"
import { extractMcaPostfix } from "./statutes/extractMcaPostfix"
import { extractMdArticleLetter } from "./statutes/extractMdArticleLetter"
import { extractMinnStYearEdition } from "./statutes/extractMinnStYearEdition"
import { extractNamedCode } from "./statutes/extractNamedCode"
import { extractNmBareSection } from "./statutes/extractNmBareSection"
import { extractLpra } from "./statutes/extractLpra"
import { extractNyBareLaw } from "./statutes/extractNyBareLaw"
import { extractNyAcronymBare } from "./statutes/extractNyAcronymBare"
import { extractNyCplrBare } from "./statutes/extractNyCplrBare"
import { extractNycAdminCode } from "./statutes/extractNycAdminCode"
import { extractOhChapter } from "./statutes/extractOhChapter"
import { extractOrsChapter } from "./statutes/extractOrsChapter"
import { extractProse } from "./statutes/extractProse"
import { extractRlh } from "./statutes/extractRlh"
import { extractRrs1943 } from "./statutes/extractRrs1943"
import { extractRigl1956 } from "./statutes/extractRigl1956"
import { extractRsaChapter } from "./statutes/extractRsaChapter"
import { extractRcwChapterPostfix } from "./statutes/extractRcwChapterPostfix"
import { extractStateAdminCode } from "./statutes/extractStateAdminCode"
import { extractTcaPostfix } from "./statutes/extractTcaPostfix"
import { extractUssg } from "./statutes/extractUssg"
import { extractVaBareCode } from "./statutes/extractVaBareCode"
import { extractWiStatsPostfix } from "./statutes/extractWiStatsPostfix"
import { extractWvCode1931 } from "./statutes/extractWvCode1931"

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
): StatuteCitation | RegulationCitation {
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
    case "ga-pre-1983":
      return extractGaPre1983(token, transformationMap)
    case "ic-year-edition":
      return extractIcYearEdition(token, transformationMap)
    case "irc":
      return extractIrc(token, transformationMap)
    case "ussg":
      return extractUssg(token, transformationMap)
    case "bankruptcy-code-prefix":
    case "bankruptcy-code-postfix":
      return extractBankruptcyCode(token, transformationMap)
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
    case "nm-bare-section":
      return extractNmBareSection(token, transformationMap)
    case "ny-bare-named-code":
      return extractNyBareLaw(token, transformationMap)
    case "ny-cplr-bare":
      return extractNyCplrBare(token, transformationMap)
    case "ny-acronym-bare":
      return extractNyAcronymBare(token, transformationMap)
    case "lpra":
      return extractLpra(token, transformationMap)
    case "nyc-admin-code":
      return extractNycAdminCode(token, transformationMap)
    case "oh-chapter":
      return extractOhChapter(token, transformationMap)
    case "ors-chapter":
      return extractOrsChapter(token, transformationMap)
    case "rlh":
      return extractRlh(token, transformationMap)
    case "rrs-1943":
      return extractRrs1943(token, transformationMap)
    case "rcw-chapter-postfix":
      return extractRcwChapterPostfix(token, transformationMap)
    case "state-admin-code":
      return extractStateAdminCode(token, transformationMap)
    case "rigl-1956":
      return extractRigl1956(token, transformationMap)
    case "rsa-chapter":
      return extractRsaChapter(token, transformationMap)
    case "tca-postfix":
      return extractTcaPostfix(token, transformationMap)
    case "va-bare-code":
      return extractVaBareCode(token, transformationMap)
    case "wi-stats-postfix":
      return extractWiStatsPostfix(token, transformationMap)
    case "wv-code-1931":
      return extractWvCode1931(token, transformationMap)
    default:
      // unknown patterns use legacy parser
      return extractLegacy(token, transformationMap)
  }
}
