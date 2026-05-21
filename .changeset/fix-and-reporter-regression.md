---
"eyecite-ts": patch
---

fix(extract): reject `AND` / `OR` as phantom reporter abbreviations

The broad `state-reporter` lazy regex was capturing fully-capitalized
conjunction words in prose (`Plaintiff cited 100 AND 200`) as case
citations with `reporter: "AND"`, `volume: 100`, `page: 200`.

Added negative-lookahead `(?!(?:AND|OR)\s+\d)` to the state-reporter
pattern, matching the existing `Ibid` / `Id.` guard from #549.

The bare-conjunction shape is rare in real legal writing but appears
in user-formatted text and structured documents where conjunctions
get capitalized for emphasis. Legitimate reporters like `Or.`
(Oregon) and `Ore.` are unaffected because they contain a period.

10 new tests in `tests/extract/issueAndReporterRejection.test.ts`
cover bare `47 AND 100`, prose `Plaintiff cited 100 AND 200`, the
parallel `OR` case, and regression guards for `U.S.`, `F.2d`,
`A.L.R.2d`, `Or.`, `Ore.` reporters.
