/**
 * Treaty Citation Patterns (#309)
 *
 * Treaty-series citations:
 *   - "No."-style series: `T.I.A.S. No. 1502` (Treaties and Other International
 *     Acts Series), spacing-tolerant (`T. I. A. S.`); `Bevans No. N`.
 *   - volume-series-page: `1155 U.N.T.S. 331`, `123 U.S.T. 456`.
 *
 * Named-treaty prose (`Vienna Convention…, art. 31`) is a follow-up — it is
 * false-positive-prone and intentionally not matched here. Patterns are anchored
 * on the distinctive series abbreviation; `Stat.` is excluded (it is the federal
 * `statutesAtLarge` form).
 */

import type { Pattern } from "./casePatterns"

// "No."-style series. Spacing-tolerant abbreviation (`T. I. A. S.`).
const SERIES_NO_SRC = String.raw`\b(T\.?\s?I\.?\s?A\.?\s?S\.?|Bevans)\s+No\.?\s+(\d+)`
// volume-series-page series.
const VOL_PAGE_SRC = String.raw`\b(\d+)\s+(U\.?\s?N\.?\s?T\.?\s?S\.?|U\.?\s?S\.?\s?T\.?)\s+(\d+)`

/** Non-global regexes for the extractor to re-exec on the matched token text. */
export const TREATY_SERIES_NO_RE: RegExp = new RegExp(SERIES_NO_SRC)
export const TREATY_VOL_PAGE_RE: RegExp = new RegExp(VOL_PAGE_SRC)

export const treatyPatterns: Pattern[] = [
  {
    id: "treaty-series-no",
    regex: new RegExp(SERIES_NO_SRC, "g"),
    description: 'Treaty series citations (e.g. "T.I.A.S. No. 1502")',
    type: "treaty",
  },
  {
    id: "treaty-volume-page",
    regex: new RegExp(VOL_PAGE_SRC, "g"),
    description: 'Treaty volume-series-page citations (e.g. "1155 U.N.T.S. 331", "123 U.S.T. 456")',
    type: "treaty",
  },
]
