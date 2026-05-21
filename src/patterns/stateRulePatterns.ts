/**
 * State Court Rule Citation Patterns (#636)
 *
 * Mirrors `federalRulePatterns` for state court rules of procedure.
 * Each supported state has a closed, distinctive abbreviation so the
 * closed alternation + mandatory trailing rule number keeps false
 * positives bounded.
 *
 * Supported state rules:
 *   - Idaho — `I.R.C.P.` (civil) and the spelled-out
 *     `Idaho Rule of Civil Procedure N`.
 *   - North Carolina — `N.C. R. App. P.` / `N.C.R.App. P.` (appellate);
 *     `N.C. R. Civ. P.` (civil).
 *   - South Carolina — postfix style `Rule N, SCACR` (appellate court rules).
 *   - Court of Federal Claims — `RCFC N` (civil).
 *
 * Pattern ordering rationale: state rule patterns must precede
 * `casePatterns` so the broad state-reporter regex does not phantom-match
 * `I.R.C.P. 60(b)(6)` etc.
 *
 * Captures: (1) rule number, (2) subsection chain (optional)
 *   — extractStateRule reads jurisdiction + ruleSet from the patternId.
 */

import type { Pattern } from "./casePatterns"

export const stateRulePatterns: Pattern[] = [
  {
    // Idaho Rule of Civil Procedure — abbreviated I.R.C.P.
    id: "id-rcp",
    regex: /\bI\.R\.C\.P\.\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)/g,
    description: 'Idaho Rule of Civil Procedure: "I.R.C.P. 60(b)(6)" — #636',
    type: "stateRule",
  },
  {
    // Idaho Rule of Civil Procedure — spelled-out form.
    id: "id-rcp-spelled",
    regex: /\bIdaho\s+Rules?\s+of\s+Civil\s+Procedure\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)/gi,
    description: 'Idaho Rule of Civil Procedure (spelled): "Idaho Rule of Civil Procedure 60(b)" — #636',
    type: "stateRule",
  },
  {
    // North Carolina Rules of Appellate Procedure — N.C. R. App. P. /
    // N.C.R.App. P. (interior spaces are flexible). Both forms appear in
    // NC opinions.
    id: "nc-rap",
    regex: /\bN\.\s?C\.\s?R\.\s?App\.\s?P\.\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)/g,
    description: 'NC Rules of Appellate Procedure: "N.C. R. App. P. 10(b)(1)", "N.C.R.App. P. 37" — #636',
    type: "stateRule",
  },
  {
    // North Carolina Rules of Civil Procedure — N.C. R. Civ. P.
    id: "nc-rcp",
    regex: /\bN\.\s?C\.\s?R\.\s?Civ\.\s?P\.\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)/g,
    description: 'NC Rules of Civil Procedure: "N.C. R. Civ. P. 12(b)" — #636',
    type: "stateRule",
  },
  {
    // South Carolina Appellate Court Rules — POSTFIX style:
    // `Rule N(<subsection>), SCACR`. The trailing `, SCACR` is the
    // jurisdiction/rule-set anchor.
    //
    // Captures: (1) rule number + subsection chain (the postfix `SCACR`
    // is outside the capture group; extractor uses patternId to assign
    // jurisdiction + ruleSet).
    id: "sc-scacr-postfix",
    regex: /\bRule\s+(\d+(?:\.\d+)?(?:\([^)]*\))*),\s*SCACR\b/g,
    description: 'SC Appellate Court Rule (postfix): "Rule 268(d)(2), SCACR" — #636',
    type: "stateRule",
  },
  {
    // U.S. Court of Federal Claims — RCFC.
    id: "rcfc",
    regex: /\bRCFC\s+(\d+(?:\.\d+)?(?:\([^)]*\))*)/g,
    description: 'Court of Federal Claims rule: "RCFC 56(c)" — #636',
    type: "stateRule",
  },
]
