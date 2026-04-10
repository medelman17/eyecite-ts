/**
 * Named-Code State Statute Extraction (Family 4)
 *
 * Parses tokenized citations from states that identify their code by name
 * in the citation (e.g., "N.Y. Penal Law § 120.05", "Cal. Civ. Proc. Code § 437c").
 *
 * Handles two patternIds:
 * - "named-code"  — NY, CA, TX, MD, VA, AL citations (prefix + code name + §)
 * - "mass-chapter" — MA citations (corpus + ch. + chapter, § section)
 *
 * Jurisdictions: NY, CA, TX, MD, VA, AL, MA (7 total)
 *
 * @module extract/statutes/extractNamedCode
 */

import { findNamedCode } from "@/data/knownCodes"
import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

/** Match named-code token: jurisdiction prefix + code name + § + body */
const NAMED_CODE_RE =
  /^(N\.?\s*Y\.?|Cal(?:ifornia)?\.?|Tex(?:as)?\.?|Md\.?|Va\.?|Ala(?:bama)?\.?)\s+(.*?)\s*§§?\s*(.+)$/sd

/** Match mass-chapter token: corpus abbreviation + ch./c. + chapter + § + section */
const MASS_CHAPTER_RE = /^(.*?)\s+(?:ch\.?|c\.?)\s*(\w+),?\s*§\s*(.+)$/d

/** Map normalized jurisdiction prefixes to 2-letter state codes */
const PREFIX_MAP: Record<string, string> = {
  "n.y.": "NY",
  "n.y": "NY",
  ny: "NY",
  "cal.": "CA",
  cal: "CA",
  "california.": "CA",
  california: "CA",
  "tex.": "TX",
  tex: "TX",
  "texas.": "TX",
  texas: "TX",
  "md.": "MD",
  md: "MD",
  "va.": "VA",
  va: "VA",
  "ala.": "AL",
  ala: "AL",
  "alabama.": "AL",
  alabama: "AL",
}

/** Normalize a jurisdiction prefix string to a 2-letter state code */
function resolveJurisdiction(prefix: string): string | undefined {
  return PREFIX_MAP[prefix.toLowerCase().replace(/\s+/g, "")]
}

/**
 * Strip common trailing/leading suffixes from code name text to produce a
 * lookup key for the namedCodes registry.
 *
 * Examples:
 *   "Penal Law"          → "Penal"
 *   "Penal Code"         → "Penal"
 *   "Civ. Proc. Code"    → "Civ. Proc."
 *   "Code Ann., Crim. Law" → "Crim. Law"   (MD "Code Ann.," prefix stripped)
 *   "Code, Ins."         → "Ins."          (MD "Code," prefix stripped)
 *   "Code Ann."          → "Code"          (VA/AL trailing Ann. stripped)
 *   "Code"               → "Code"          (VA/AL — matches pattern directly)
 *   "C.P.L.R."           → "C.P.L.R."      (no suffixes — passed through)
 */
function cleanCodeName(raw: string): string {
  return (
    raw
      // MD: "Code Ann., Crim. Law" → "Crim. Law"
      .replace(/^\s*Code\s+Ann\.\s*,\s*/i, "")
      // MD: "Code, Ins." → "Ins."
      .replace(/^\s*Code\s*,\s*/i, "")
      // Trailing " Code" only (e.g., "Penal Code" → "Penal", "Civ. Proc. Code" → "Civ. Proc.")
      // Do NOT strip " Law" — MD article names contain "Law" (e.g., "Crim. Law", "Criminal Law")
      // and NY "Penal Law" → "Penal Law" still matches registry via startsWith("Penal")
      .replace(/\s+Code\s*$/i, "")
      // Trailing " Ann." (e.g., "Code Ann." → "Code" after prior rules skip)
      .replace(/\s+Ann\.?\s*$/i, "")
      // Trailing comma/space artifacts
      .replace(/,\s*$/, "")
      .trim()
  )
}

/**
 * Extract a statute citation from a "named-code" or "mass-chapter" token.
 *
 * Named-code: "Cal. Penal Code § 187(a)" → jurisdiction=CA, code="Penal", section="187", subsection="(a)"
 * Mass-chapter: "Mass. Gen. Laws ch. 93A, § 2" → jurisdiction=MA, code="93A", section="2"
 */
export function extractNamedCode(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token

  let jurisdiction: string | undefined
  let code: string
  let rawBody: string
  let massMatch: RegExpExecArray | null = null
  let namedMatch: RegExpExecArray | null = null

  if (token.patternId === "mass-chapter") {
    massMatch = MASS_CHAPTER_RE.exec(text)
    if (massMatch) {
      jurisdiction = "MA"
      code = massMatch[2] // chapter number (e.g., "93A")
      rawBody = massMatch[3]
    } else {
      code = text
      rawBody = ""
    }
  } else {
    // named-code: "[State prefix] [Code Name] § [body]"
    namedMatch = NAMED_CODE_RE.exec(text)
    if (namedMatch) {
      jurisdiction = resolveJurisdiction(namedMatch[1])
      const rawCodeName = namedMatch[2]
      const cleaned = cleanCodeName(rawCodeName)

      if (jurisdiction) {
        // Look up in registry — use cleaned name as the lookup key
        const entry = findNamedCode(jurisdiction, cleaned)
        // Store the cleaned name (e.g., "Penal" not "Penal Code"); fall back to raw if no registry hit
        code = entry ? cleaned : rawCodeName.trim()
      } else {
        code = rawCodeName.trim()
      }

      rawBody = namedMatch[3]
    } else {
      // Unparseable token — graceful fallback
      code = text
      rawBody = ""
    }
  }

  const { section, subsection, hasEtSeq } = parseBody(rawBody)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Use section without trailing sentence punctuation for span boundary
  const sectionSpanLen = section.replace(/[.,;:]\s*$/, "").length

  let spans: StatuteComponentSpans | undefined
  if (massMatch?.indices) {
    spans = {}
    if (massMatch.indices[2]) spans.code = spanFromGroupIndex(span.cleanStart, massMatch.indices[2], transformationMap)
    if (massMatch.indices[3] && section) {
      const bodyStart = massMatch.indices[3][0]
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
  } else if (namedMatch?.indices) {
    spans = {}
    if (namedMatch.indices[2]) spans.code = spanFromGroupIndex(span.cleanStart, namedMatch.indices[2], transformationMap)
    if (namedMatch.indices[3] && section) {
      const bodyStart = namedMatch.indices[3][0]
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

  // Confidence: named-code patterns always require §, so known jurisdiction → 0.95 base
  let confidence = jurisdiction ? 0.95 : 0.5
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
    code,
    section,
    subsection,
    pincite: subsection,
    jurisdiction,
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
