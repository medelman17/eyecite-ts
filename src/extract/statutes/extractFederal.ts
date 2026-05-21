/**
 * Federal Statute Extraction (USC + CFR)
 *
 * Parses tokenized federal citations to extract title, code, section,
 * subsections, jurisdiction, and et seq. indicators.
 *
 * @module extract/statutes/extractFederal
 */

import type { Token } from "@/tokenize"
import type { RegulationCitation, StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

/** Regex to parse federal token: title + code + (optional §/Section) + body.
 *  Code matches the canonical Bluebook forms (`U.S.C.`, `C.F.R.`), West
 *  annotated (`USCA`), LEXIS annotated (`USCS`), no-period (`USC`, `CFR`),
 *  and the spelled-out `United States Code` / `Code of Federal Regulations`.
 *  Connector is optional — bare `N USC NNNN` and `N CFR NNNN` forms omit it.
 *  Trailing `[AS]?` on the U.S.C. variant covers both `U.S.C.A.` (West) and
 *  `U.S.C.S.` (LEXIS); both annotated editions canonicalize to `U.S.C.`
 *  below. Title→code separator admits an optional comma so the comma-
 *  after-title prose form (`Title 18, U.S.C. § 3742`) tokenized by
 *  statutePatterns parses cleanly here. Code→connector separator also
 *  admits an optional comma so `42 U.S.C., § 1983` and `12 C.F.R., § 226`
 *  parse correctly. #428 #584 #586 #587 */
const FEDERAL_SECTION_RE =
  /^(\d+)\s*,?\s+(U\.?S\.?C\.?[AS]?\.?|USC[AS]?|United\s+States\s+Code|C\.?F\.?R\.?|Code\s+of\s+Federal\s+Regulations)\s*,?\s*(?:§§?|[Ss]ections?|[Ss]ec\.?|Part|pt\.)?\s*(.+)$/d
/** Regex to parse federal token: title + code + Part + body */
const FEDERAL_PART_RE =
  /^(\d+)\s*,?\s+(U\.?S\.?C\.?[AS]?\.?|USC[AS]?|United\s+States\s+Code|C\.?F\.?R\.?|Code\s+of\s+Federal\s+Regulations)\s*,?\s+(?:Part|pt\.)\s+(.+)$/d

/**
 * Extract a federal statute citation (USC or CFR) from a tokenized match.
 */
export function extractFederal(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation | RegulationCitation {
  const { text, span } = token

  // Try § form first, then Part form
  const bodyMatch = FEDERAL_SECTION_RE.exec(text) ?? FEDERAL_PART_RE.exec(text)

  let title: number | undefined
  let code: string
  let rawBody: string

  if (bodyMatch) {
    title = Number.parseInt(bodyMatch[1], 10)
    const rawCode = bodyMatch[2]
    rawBody = bodyMatch[3]
    // Canonicalize code to Bluebook form. Variants `USC`, `USCA`, `United
    // States Code` all normalize to `U.S.C.`; `CFR` / `C.F.R.` / `Code of
    // Federal Regulations` normalize to `C.F.R.` Strip dots/spaces before
    // comparing so `C.F.R.` matches `CFR`. #428
    const stripped = rawCode.toUpperCase().replace(/[.\s]/g, "")
    if (stripped.includes("CFR") || stripped.includes("FEDERALREGULATIONS")) {
      code = "C.F.R."
    } else {
      code = "U.S.C."
    }
  } else {
    // Fallback for edge cases
    code = token.patternId === "cfr" ? "C.F.R." : "U.S.C."
    rawBody = text
    title = undefined
  }

  const {
    section: parsedSection,
    sectionRangeEnd,
    subsection,
    subsectionRangeEnd,
    hasEtSeq,
  } = parseBody(rawBody)

  // Federal `§§ N-M` range form (#564): split into structured range with
  // `section` = start so existing consumers keep working. The matchedText
  // §§ marker is the disambiguator — a singular `§ N-M` on a USC citation
  // would be unprecedented and stays as a single section.
  const isRange = sectionRangeEnd !== undefined && /§§/.test(text)
  const section = isRange ? parsedSection.split("-")[0] : parsedSection
  const sectionRange = isRange
    ? { start: section, end: sectionRangeEnd as string }
    : undefined

  // Translate positions
  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (bodyMatch?.indices) {
    spans = {}
    if (bodyMatch.indices[1]) spans.title = spanFromGroupIndex(span.cleanStart, bodyMatch.indices[1], transformationMap)
    if (bodyMatch.indices[2]) spans.code = spanFromGroupIndex(span.cleanStart, bodyMatch.indices[2], transformationMap)
    if (bodyMatch.indices[3] && section) {
      const bodyStart = bodyMatch.indices[3][0]
      // Use section without trailing sentence punctuation for span boundary.
      // Note: section comes from parseBody() which strips et seq. and splits
      // subsections — the leading text still matches the raw match position.
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

  // Confidence: known federal code + § = 0.95 base
  let confidence = 0.95
  if (title !== undefined) confidence += 0.05
  if (subsection) confidence += 0.05
  confidence = Math.min(confidence, 1.0)

  // C.F.R. is a regulation, not a statute — emit the type discriminator
  // that reflects that. Same field shape; downstream consumers filtering
  // by `citation.type === "regulation"` need this without resorting to
  // `code === "C.F.R."` string matching. #637
  const type = code === "C.F.R." ? "regulation" : "statute"

  return {
    type,
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
    sectionRange,
    subsection,
    subsectionRange:
      subsection && subsectionRangeEnd
        ? { start: subsection, end: subsectionRangeEnd }
        : undefined,
    pincite: subsection,
    jurisdiction: "US",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
