/**
 * Legislative-Material Citation Patterns (#308)
 *
 * House/Senate committee reports and Congressional Record citations:
 *   - `H.R. Rep. No. 94-1487, p. 16 (1976)` (spacing-tolerant `H. R.`), with
 *     optional `pt.`, `Nth Cong.`, `Nth Sess.`, page (`p. N` / `at N` / bare),
 *     and trailing `(YYYY)`.
 *   - `112 Cong. Rec. 1234` (chamber-prefixed pages like `H1234` tolerated).
 *
 * The "U.S. Code Cong. & Admin. News" form is a follow-up. Patterns are
 * anchored on `Rep. No.` / `Cong. Rec.`; optional trailing groups are each
 * keyword-anchored (no nested quantifiers).
 */

import type { Pattern } from "./casePatterns"

// Committee report. chamber, reportNumber, [congress], [session], [page], [year].
const REPORT_SRC = String.raw`\b(H\.?\s?R\.?|S\.?)\s*Rep\.?\s+No\.?\s+(\d+(?:-\d+)?)(?:,?\s+pt\.\s+\d+)?(?:,?\s+(\d+)(?:st|d|nd|rd|th)\s+Cong\.)?(?:,?\s+(\d+(?:st|d|nd|rd|th))\s+Sess\.?)?(?:,?\s+(?:p\.\s*|at\s+)?(\d+))?(?:\s*\((\d{4})\))?`

// Congressional Record: volume, page (optional chamber-letter prefix).
const CONG_REC_SRC = String.raw`\b(\d+)\s+Cong\.\s+Rec\.\s+([HSE]?\d+)`

/** Non-global regexes for the extractor to re-exec on the matched token text. */
export const LEGMAT_REPORT_RE: RegExp = new RegExp(REPORT_SRC)
export const LEGMAT_CONG_REC_RE: RegExp = new RegExp(CONG_REC_SRC)

export const legislativeMaterialPatterns: Pattern[] = [
  {
    id: "legmat-report",
    regex: new RegExp(REPORT_SRC, "g"),
    description: 'Committee reports (e.g. "H.R. Rep. No. 94-1487, p. 16 (1976)", "S. Rep. No. 861, at 2")',
    type: "legislativeMaterial",
  },
  {
    id: "legmat-cong-rec",
    regex: new RegExp(CONG_REC_SRC, "g"),
    description: 'Congressional Record citations (e.g. "112 Cong. Rec. 1234")',
    type: "legislativeMaterial",
  },
]
