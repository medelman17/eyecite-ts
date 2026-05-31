/**
 * Session-Law Citation Patterns (#350, #779)
 *
 * State session laws — chronological compilations cited by year + chapter:
 *   California: `Stats. 1992, ch. 726, § 2, p. 3523`
 *   Nevada:     `2003 Nev. Stat., ch. 427, §§ 25-26, at 2590-95`
 *
 * Distinct from the federal `statutesAtLarge` form (`<vol> Stat. <page>`).
 * Section/page repeats are anchored by a literal `,` / `-` so there are no
 * nested quantifiers (ReDoS-safe).
 */

import type { Pattern } from "./casePatterns"

// Plausible session year (1800–2099). The `Stats.` / `Nev. Stat.` anchors keep
// false positives low; the bound mirrors the #532 plausible-year practice.
const YEAR = String.raw`(?:18|19|20)\d{2}`

// California Statutes: `Stats. YYYY, ch. NNN[, §[§] N | N, N, N | N-N][, p(p). NNN[-NNN]]`
const CA_SRC = String.raw`\bStats\.\s+(${YEAR}),?\s+ch\.\s+(\d+)(?:,?\s*§{1,2}\s*(\d+(?:\s*,\s*\d+)*|\d+\s*-\s*\d+))?(?:,?\s*pp?\.\s*(\d+(?:\s*-\s*\d+)?))?`

// Nevada session laws: `YYYY Nev. Stat[s][.], ch. NNN[, §[§] N[-N]][, at NNNN[-NN]]`
const NV_SRC = String.raw`\b(${YEAR})\s+Nev\.\s+Stats?\.?,?\s+ch\.\s+(\d+)(?:,?\s*§{1,2}\s*(\d+(?:\s*-\s*\d+)?))?(?:,?\s*at\s+(\d+(?:\s*-\s*\d+)?))?`

/** Non-global regexes for the extractor to re-exec on the matched token text. */
export const CA_SESSION_LAW_RE: RegExp = new RegExp(CA_SRC)
export const NV_SESSION_LAW_RE: RegExp = new RegExp(NV_SRC)

export const sessionLawPatterns: Pattern[] = [
  {
    id: "ca-session-law",
    regex: new RegExp(CA_SRC, "g"),
    description: 'California session laws (e.g. "Stats. 1992, ch. 726, § 2, p. 3523")',
    type: "sessionLaw",
  },
  {
    id: "nv-session-law",
    regex: new RegExp(NV_SRC, "g"),
    description: 'Nevada session laws (e.g. "2003 Nev. Stat., ch. 427, §§ 25-26, at 2590-95")',
    type: "sessionLaw",
  },
]
