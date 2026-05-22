---
"eyecite-ts": patch
---

fix(extract): federal rule acronym forms recognized (`FRCP`, `F.R.C.P.`, `FRE`, etc.) (#696)

Resolves #696. The federal-rule extractor recognized only the canonical
`Fed. R. Civ. P. 12` and spelled-out `Federal Rule of Civil Procedure 12`
forms. Common acronym shorthand used in casual writing, court orders,
and briefs was silently dropped:

| input | before | after |
|---|---|---|
| `FRCP 12(b)(6)` | 0 cites | ruleSet=civil ✓ |
| `FRE 401` | 0 cites | ruleSet=evidence ✓ |
| `FRAP 4(a)` | 0 cites | ruleSet=appellate ✓ |
| `FRCrP 11` | 0 cites | ruleSet=criminal ✓ |
| `FRBP 7001` | 0 cites | ruleSet=bankruptcy ✓ |
| `F.R.C.P. 12` | 0 cites | ruleSet=civil ✓ |
| `F.R.E. 401` | 0 cites | ruleSet=evidence ✓ |
| `F.R.A.P. 4(a)` | 0 cites | ruleSet=appellate ✓ |

Added a third pattern (`fed-rule-acronym`) for bare acronyms and dotted
forms, plus matching entries in `RULE_SET_MAP`. The dotted forms
(`F.R.C.P.`) normalize via the period-and-space strip to the same key
as the bare form (`FRCP`).

10 regression tests in `tests/extract/issueFedRuleAcronym.test.ts`.
