/**
 * Judicial-Conduct Canon Citation Patterns (#310)
 *
 * Code of Judicial Conduct canons: `Canon 7(B)(1)`, `Canon 2(A)`, optionally
 * followed by `of the Code of Judicial Conduct`. Requires a capital `Canon` +
 * number to avoid matching lowercase "canon of ..." prose. The subsection chain
 * `(?:\([A-Za-z0-9]+\))*` is anchored by literal parens (ReDoS-safe).
 */

import type { Pattern } from "./casePatterns"

const CANON_SRC = String.raw`\bCanon\s+(\d+)((?:\([A-Za-z0-9]+\))*)(\s+of\s+the\s+Code\s+of\s+Judicial\s+Conduct)?`

/** Non-global regex for the extractor to re-exec on the matched token text. */
export const CANON_RE: RegExp = new RegExp(CANON_SRC)

export const canonPatterns: Pattern[] = [
  {
    id: "canon",
    regex: new RegExp(CANON_SRC, "g"),
    description: 'Code of Judicial Conduct canons (e.g. "Canon 7(B)(1)")',
    type: "canon",
  },
]
