/**
 * The authoritative citation pattern grammar (#844).
 *
 * `orderedPatterns` is the single source of truth for both the pattern SET and
 * its PRIORITY ORDER (most-specific → least-specific). It is consumed by the
 * `tokenize` default and by `extractCitations` (which still lets callers
 * override via `options.patterns`).
 *
 * The order is load-bearing but invisible: `extractCitations` derives each
 * pattern's dedup priority from its first-occurrence index here, so on an
 * overlap the earliest-listed (more-specific) pattern wins. Reordering changes
 * extraction output — `tests/patterns/grammarOrder.test.ts` guards against it.
 *
 * Imports come from the individual pattern modules (not the `./index` barrel,
 * which re-exports this file) to avoid a self-referential cycle.
 */

import { canonPatterns } from "./canonPatterns"
import { type Pattern, casePatterns } from "./casePatterns"
import { constitutionalPatterns } from "./constitutionalPatterns"
import { docketPatterns } from "./docketPatterns"
import { federalRulePatterns } from "./federalRulePatterns"
import { journalPatterns } from "./journalPatterns"
import { legislativeMaterialPatterns } from "./legislativeMaterialPatterns"
import { localOrdinancePatterns } from "./localOrdinancePatterns"
import { neutralPatterns } from "./neutralPatterns"
import { secondaryAuthorityPatterns } from "./secondaryAuthorityPatterns"
import { sessionLawPatterns } from "./sessionLawPatterns"
import { shortFormPatterns } from "./shortForm"
import { stateRulePatterns } from "./stateRulePatterns"
import { statutePatterns } from "./statutePatterns"
import { treatyPatterns } from "./treatyPatterns"

// USC/CFR/IRC out-prioritize the broad case-reporter patterns (#428); the other
// (state-code) statutes are less specific and sort after case patterns.
const federalStatutePatterns = statutePatterns.filter(
  (p) => p.id === "usc" || p.id === "cfr" || p.id === "irc",
)
const otherStatutePatterns = statutePatterns.filter(
  (p) => p.id !== "usc" && p.id !== "cfr" && p.id !== "irc",
)

export const orderedPatterns: Pattern[] = [
  ...neutralPatterns, // Most specific (year-based format)
  ...sessionLawPatterns, // State session laws — anchored by "Stats." / "Nev. Stat." (#350, #779)
  ...treatyPatterns, // Treaty series — anchored by "T.I.A.S."/"U.N.T.S."/"U.S.T." (#309)
  ...legislativeMaterialPatterns, // Committee reports + Cong. Rec. — anchored by "Rep. No."/"Cong. Rec." (#308)
  ...localOrdinancePatterns, // Municipal ordinances — anchored by "CCCO §" (#778)
  ...canonPatterns, // Judicial-conduct canons — anchored by "Canon N" (#310)
  ...docketPatterns, // Docket-number citations (anchored by "No. ")
  ...shortFormPatterns, // Short-form (requires " at " keyword)
  ...federalRulePatterns, // Fed. R. Civ. P. etc. — before casePatterns (#576, #582)
  ...stateRulePatterns, // I.R.C.P., N.C. R. App. P., SCACR, RCFC — before casePatterns (#636)
  ...secondaryAuthorityPatterns, // Restatement / treatise / A.L.R. — before casePatterns (#578, #579, #581)
  ...federalStatutePatterns, // USC/CFR/IRC — before casePatterns (#428)
  ...casePatterns, // Case citations (reporter-specific)
  ...constitutionalPatterns, // Constitutional citations (more specific than statutes)
  ...otherStatutePatterns, // State statutes (code-specific)
  ...journalPatterns, // Least specific (broad pattern)
]
