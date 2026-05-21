---
"eyecite-ts": minor
---

feat(extract): prose-form state-constitutional citations — #656

State opinions frequently cite their own constitution in natural prose
instead of the canonical Bluebook `<State>. Const. art. <N>` form:

- `art. 14 of the Massachusetts Declaration of Rights`
- `Section 5(B), Article IV of the Ohio Constitution`
- `Section 2, Article I of the Pennsylvania Constitution`

Two new tokenizer patterns + extractor handling:

1. `state-const-prose-declaration` — matches the MA/PA/VT/NH/MD/NC/DE/NJ
   "Declaration of Rights" / "Constitution" prose form with closed
   state-name alternation.

2. `state-const-prose-section-article` — matches the more general
   `Section <N>, Article <N> of the <State> Constitution` form across all
   50 states.

Both patterns map full state names ("Massachusetts", "New Jersey") to
2-letter jurisdiction codes via a new FULL_STATE_NAME_TO_CODE table.
Closed alternations keep false positives bounded: `art. 14 of the
document` does not match because `document` is not in the state list.

10 new tests in `tests/extract/issue656StateConstProse.test.ts` cover
both shapes across MA, OH, PA, NJ; mid-sentence prose; regression
guards for `U.S. Const.` and `Cal. Const.` canonical forms; and
false-positive guards for non-state contexts.
