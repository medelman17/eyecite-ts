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

/** Match named-code token: jurisdiction prefix + code name + § + body.
 *
 * Body grammar mirrors the tokenizer's `named-code` pattern, including the
 * optional `, subd.` / `, paragraph` / `, par.` keyword tail (#589). The
 * `parseBody` helper normalizes the keyword form to the canonical paren
 * chain so the discriminated subsection field is populated correctly. */
const NAMED_CODE_RE =
  /^(N\.?\s*Y\.?|Cal(?:ifornia)?\.?|Tex(?:as)?\.?|Md\.?|Va\.?|Ala(?:bama)?\.?)\s+(.*?)\s*§§?\s*(.+)$/sd

/** Match mass-chapter token: corpus abbreviation + ch./c. + chapter + optional (§|sec.) + section.
 *  Section connector and section body are optional — `G.L. c. 93A`
 *  chapter-only citations are valid (#364). Spacing before `c.` is optional
 *  so `G.L.c.` matches (also #364). */
const MASS_CHAPTER_RE = /^(.*?)\s*(?:ch\.?|c\.?)\s*(\w+)(?:,?\s*(?:§§?|[Ss]ec\.?|[Ss]ection)\s*(.+))?$/d

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
 * Canonical short-name for the jurisdiction prefix, used to build the
 * `code` field for VA / AL named-code citations (#530). The named-code
 * registry only stores the bare suffix (`"Code"`, `"Code Ann."`); without
 * re-attaching the prefix here the consumer sees `code: "Code"` which is
 * useless for downstream linkers.
 */
const JURISDICTION_PREFIX: Record<string, string> = {
  VA: "Va.",
  AL: "Ala.",
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
  let chapter: string | undefined
  let massMatch: RegExpExecArray | null = null
  let namedMatch: RegExpExecArray | null = null

  if (token.patternId === "mass-chapter") {
    massMatch = MASS_CHAPTER_RE.exec(text)
    if (massMatch) {
      jurisdiction = "MA"
      // #569 — `code` holds the corpus identifier as it appeared
      // (`G.L.`, `Mass. Gen. Laws`, `M.G.L.A.`, `A.L.M.`,
      // `General Laws`). The chapter number moves to the dedicated
      // `chapter` field; section is the trailing `§ N` (when present).
      code = massMatch[1].trim().replace(/\s+/g, " ")
      chapter = massMatch[2]
      // Section body is optional — chapter-only citations like `G.L. c. 93A`
      // are valid. When absent, leave the section empty. (#364)
      rawBody = massMatch[3] ?? ""
    } else {
      code = text
      rawBody = ""
    }
  } else {
    // named-code: "[State prefix] [Code Name] § [body]"
    namedMatch = NAMED_CODE_RE.exec(text)
    if (namedMatch) {
      jurisdiction = resolveJurisdiction(namedMatch[1])
      const rawPrefix = namedMatch[1].trim()
      const rawCodeName = namedMatch[2]
      // #568 — `code` is the FULL identifier (jurisdiction prefix +
      // body + trailing `Code`/`Law`), not just the cleaned body. The
      // previous behavior stored `Civ.` for `Cal. Civ. Code § 51`,
      // losing both jurisdiction and the `Code` suffix.
      // Lookup still uses the cleaned key for registry hits.
      const cleaned = cleanCodeName(rawCodeName)
      // #530 + #568 reconciliation: `code` should carry the FULL identifier
      // (jurisdiction prefix + body, e.g. "Cal. Civ. Code", "N.Y. Penal Law").
      // For VA/AL, the named-code registry only stores bare "Code"/"Code Ann.",
      // so re-attach the canonical jurisdiction prefix from JURISDICTION_PREFIX
      // (`Va.`/`Ala.`) when the registry validates the entry. This normalizes
      // long-form prefixes (e.g. "Alabama Code" → "Ala. Code") consistent with
      // the bare-section guard's canonical output (#530).
      if (jurisdiction) {
        const entry = findNamedCode(jurisdiction, cleaned)
        const canonicalPrefix = JURISDICTION_PREFIX[jurisdiction]
        if (canonicalPrefix && entry) {
          // VA/AL: emit `Va. Code` / `Va. Code Ann.` / `Ala. Code`, preserving
          // the raw suffix shape (Code vs. Code Ann.).
          code = `${canonicalPrefix} ${rawCodeName.trim().replace(/\s+/g, " ")}`
        } else {
          // Other jurisdictions: keep the raw prefix as it appeared, plus the
          // raw code body — `Cal. Civ. Code`, `N.Y. Penal Law`, etc. (#568)
          code = `${rawPrefix} ${rawCodeName.trim()}`
        }
      } else {
        // No jurisdiction resolved — still emit the full token shape.
        code = `${rawPrefix} ${rawCodeName.trim()}`
      }

      rawBody = namedMatch[3]
    } else {
      // Unparseable token — graceful fallback
      code = text
      rawBody = ""
    }
  }

  const { section, subsection, subsectionRangeEnd, hasEtSeq } = parseBody(rawBody)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  // Use section without trailing sentence punctuation for span boundary.
  // Note: section comes from parseBody() which strips et seq. and splits
  // subsections — the leading text still matches the raw match position.
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

  // For Mass-chapter forms, an empty section means a chapter-only citation
  // (`G.L. c. 93A`) — return `undefined` rather than empty string. (#569)
  const sectionOut: string | undefined =
    section === "" && chapter ? undefined : section

  return {
    type: "statute",
    text,
    span: { cleanStart: span.cleanStart, cleanEnd: span.cleanEnd, originalStart, originalEnd },
    confidence,
    matchedText: text,
    processTimeMs: 0,
    patternsChecked: 1,
    code,
    chapter,
    section: sectionOut,
    subsection,
    subsectionRange:
      subsection && subsectionRangeEnd ? { start: subsection, end: subsectionRangeEnd } : undefined,
    pincite: subsection,
    jurisdiction,
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
