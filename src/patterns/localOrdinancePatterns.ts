/**
 * Local / Municipal Ordinance Citation Patterns (#778)
 *
 * Clark County Code/Ordinance (`CCCO § 2.12.010(1)`) — the first member of the
 * jurisdiction-general `localOrdinance` type. Anchored on the `CCCO` code; the
 * section is a multi-segment number with an optional parenthetical subsection
 * (`(?:\.\d+)*` is anchored by a literal `.`, so it is ReDoS-safe).
 */

import type { Pattern } from "./casePatterns"

const CCCO_SRC = String.raw`\bCCCO\s+§\s*(\d+(?:\.\d+)*(?:\([^)]+\))?)`

/** Non-global regex for the extractor to re-exec on the matched token text. */
export const CCCO_ORDINANCE_RE: RegExp = new RegExp(CCCO_SRC)

export const localOrdinancePatterns: Pattern[] = [
  {
    id: "ccco-ordinance",
    regex: new RegExp(CCCO_SRC, "g"),
    description: 'Clark County ordinances (e.g. "CCCO § 2.12.010(1)")',
    type: "localOrdinance",
  },
]
