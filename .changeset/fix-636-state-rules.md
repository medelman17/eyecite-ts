---
"eyecite-ts": minor
---

feat(extract): state court rule citations — #636

Add a new `StateRuleCitation` type alongside `FederalRuleCitation` and a
family of `state-rule` patterns / `extractStateRule` extractor. The
Sprint I federal-rule extractor (#576) covered only Fed. R. Civ. P. /
Crim. P. / Evid. / App. / Bankr.; state rules were silently dropped.

**New `StateRuleCitation` interface** in the discriminated `Citation`
union with `type: "stateRule"`, `jurisdiction` (2-letter state code or
`CFC`), `ruleSet` (civil/criminal/evidence/appellate/bankruptcy/other),
`rule`, and optional `subsection`.

**Supported state rule abbreviations:**
- Idaho — `I.R.C.P. 60(b)(6)`, `Idaho Rule of Civil Procedure 60(b)`
- North Carolina — `N.C. R. App. P. 10(b)(1)`, `N.C.R.App. P. 37`,
  `N.C. R. Civ. P. 12(b)`
- South Carolina — `Rule 268(d)(2), SCACR` (postfix style)
- Court of Federal Claims — `RCFC 56(c)`

Each pattern is a closed alternation with mandatory trailing rule
digits, so bare-`Rule N` mentions in prose (`The court applied Rule
60.`) do not match, and standalone abbreviation mentions
(`The SCACR governs appellate practice.`) do not match either.

Pattern ordering: `state-rule` patterns are inserted between
`federalRulePatterns` and `secondaryAuthorityPatterns` in the dispatcher,
both ahead of `casePatterns` so the broad state-reporter regex does not
phantom-match these citations as cases.

`toBluebook(stateRule)` renders `<jurisdiction> R. <ruleSet>. <rule><sub>`
matching the abbreviation conventions.
