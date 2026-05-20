---
"eyecite-ts": minor
---

feat(extract): add Federal Rules of Procedure extractor (#576)

Recognizes citations to the four primary federal rule sets — Civil,
Criminal, Evidence, Appellate — plus Bankruptcy. Both the abbreviated
Bluebook form (`Fed. R. Civ. P. 56`) and the spelled-out form
(`Federal Rule of Civil Procedure 56`) parse to a new `federalRule`
citation type with `{ ruleSet, rule, subsection? }`. The compact
no-space form (`Fed.R.Civ.P. 56`) is also accepted.

`ruleSet` is one of `"civil" | "criminal" | "evidence" | "appellate" |
"bankruptcy"`. The `rule` field is a string to preserve any leading
zeros or non-numeric suffixes; the optional `subsection` field captures
the chained `(b)(6)`-style suffix when present.

Pattern priority is inserted above `casePatterns` in the tokenizer so
the federal-rule match wins overlap dedup against the broad
state-reporter regex that previously mis-typed
`Fed. R. Civ. P. 12(b)(6)` as a phantom case citation (~58% of modern
federal opinions affected).

Public API additions:
- `FederalRuleCitation` interface (exported from package root)
- `extractFederalRule` extractor (exported from `@/extract`)
- `federalRulePatterns` array (exported from `@/patterns`)
- `FederalRuleComponentSpans` (exported from `@/types/componentSpans`)
- `"federalRule"` added to `CitationType` and `FullCitationType` unions
- `toBluebook` renders federal rules in canonical Bluebook form
