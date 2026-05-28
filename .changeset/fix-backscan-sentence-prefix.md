---
"eyecite-ts": patch
---

fix(extract): strip sentence-internal connector prefix from caseName (#670 part)

Resolves the connector-prefix sub-issue of #670. The trim block in
`extractCaseName` considered words like `Rather,` as plausible
party-name prefixes (`Rather, State v. Epps` → caseName=`Rather,
State v. Epps`) because they pass the `firstWordIsProperName` check.

Fix: added common sentence-internal connector adverbs (`rather`,
`moreover`, `furthermore`, `however`, `nevertheless`, `accordingly`,
`consequently`, `instead`, `meanwhile`, `indeed`, `thus`, `hence`) to
`SENTENCE_INITIAL_WORDS`. This routes them to the prefix-strip branch.

| input | before | after |
|---|---|---|
| `Rather, State v. Epps, 100 F.2d 1` | `Rather, State v. Epps` | `State v. Epps` ✓ |
| `However, Smith v. Jones, 100 F.2d 1` | `However, Smith v. Jones` | `Smith v. Jones` ✓ |
| `Moreover, Doe v. Roe, 100 F.2d 1` | `Moreover, Doe v. Roe` | `Doe v. Roe` ✓ |
| `Indeed, Brown v. Board, 347 U.S. 483` | `Indeed, Brown v. Board` | `Brown v. Board` ✓ |
| `Smith v. Jones, 100 F.2d 1` (control) | unchanged | unchanged ✓ |

Real party names that start with these adverbs are vanishingly rare;
the false-negative risk is dominated by the false-positive cost of
absorbing prose context.

Known limitations (not in this patch): all-caps preamble absorption
and the additional `Professional Conduct.` sentence-prefix forms
remain open.

6 regression tests in `tests/extract/issueBackscanSentencePrefix.test.ts`.
