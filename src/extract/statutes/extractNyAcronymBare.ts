/**
 * New York acronymized code extractor (#640)
 *
 * Parses tokenized NY statute citations in the bare-acronym style used
 * dominantly in NY court opinions and briefs. Each acronym is an
 * unambiguous all-caps abbreviation of a NY code that almost never
 * appears in non-citation prose adjacent to a digit, so the closed
 * alternation + mandatory trailing digit keeps false positives bounded.
 *
 * Supported acronyms (each may also appear with `N.Y.` prefix and/or
 * `§`/`§§` connector):
 *   - RPAPL — Real Property Actions and Proceedings Law
 *   - RPL   — Real Property Law
 *   - BCL   — Business Corporation Law
 *   - EPTL  — Estates Powers and Trusts Law
 *   - SCPA  — Surrogate's Court Procedure Act
 *   - DRL   — Domestic Relations Law
 *   - LLCL  — Limited Liability Company Law
 *   - VTL   — Vehicle and Traffic Law
 *
 * Bracket-subdivision form (`RPAPL 711 [5]`) is supported alongside
 * canonical parens (`RPAPL 711(5)`) and the chained mixed form
 * (`RPAPL 711 [5] (a)`) — `parseBody` already accepts either delimiter
 * inside the subsection chain.
 *
 * @module extract/statutes/extractNyAcronymBare
 */

import type { Token } from "@/tokenize"
import type { StatuteCitation } from "@/types/citation"
import type { StatuteComponentSpans } from "@/types/componentSpans"
import { resolveOriginalSpan, spanFromGroupIndex, type TransformationMap } from "@/types/span"
import { parseBody } from "./parseBody"

/** Match the same shape as the tokenizer's `ny-acronym-bare` pattern, anchored. */
const NY_ACRONYM_BARE_RE =
  /^(?:N\.\s*Y\.\s*)?(RPAPL|RPL|BCL|EPTL|SCPA|DRL|LLCL|VTL)\s*(?:§§?\s*)?(\d+(?:[A-Za-z0-9:/-]|\.(?=[A-Za-z0-9]))*)((?:\s*(?:\([^)]*\)|\[[^\]]*\]))*)$/d

export function extractNyAcronymBare(
  token: Token,
  transformationMap: TransformationMap,
): StatuteCitation {
  const { text, span } = token
  const match = NY_ACRONYM_BARE_RE.exec(text)!
  const acronym = match[1]
  const sectionRaw = match[2]
  const subsectionRaw = match[3] ?? ""

  // Concatenate section + collapsed paren/bracket chain so parseBody splits
  // cleanly: `711` + ` [5]` → `711[5]` → section "711", subsection "[5]".
  const body = `${sectionRaw}${subsectionRaw.replace(/\s+/g, "")}`
  const { section, subsection, hasEtSeq } = parseBody(body)

  const { originalStart, originalEnd } = resolveOriginalSpan(span, transformationMap)

  let spans: StatuteComponentSpans | undefined
  if (match.indices) {
    spans = {}
    const sectionIdx = match.indices[2]
    if (sectionIdx && section) {
      const sectionSpanLen = section.replace(/[.,;:]\s*$/, "").length
      spans.section = spanFromGroupIndex(
        span.cleanStart,
        [sectionIdx[0], sectionIdx[0] + sectionSpanLen],
        transformationMap,
      )
    }
    const subIdx = match.indices[3]
    if (subIdx && subsection && subIdx[0] < subIdx[1]) {
      spans.subsection = spanFromGroupIndex(span.cleanStart, subIdx, transformationMap)
    }
  }

  // Confidence: each acronym is unambiguous and the trailing-digit anchor
  // mirrors `extractNyCplrBare` — same baseline.
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
    code: `N.Y. ${acronym}`,
    section,
    subsection,
    pincite: subsection,
    jurisdiction: "NY",
    hasEtSeq: hasEtSeq || undefined,
    spans,
  }
}
