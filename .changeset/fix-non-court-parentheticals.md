---
"eyecite-ts": patch
---

fix(extract): editorial and judge-attribution parentheticals no longer pollute `court` field

Following the disposition-token fix, several other non-court tokens
still leaked into the `court` field when they appeared in the
year/court parenthetical position:

- **Editorial status**: `(n.d.)`, `(no date)`, `(year omitted)`,
  `(unpub.)`, `(unpublished)`, `(slip op.)`, `(table)`, `(mem.)`
- **Judge attribution with role**: `(Smith, J., dissenting)`,
  `(Jones, J., concurring)`, `(Doe, JJ., joining)` — the existing
  trailing-only `, J.` guard missed these because the role word
  (`dissenting`/`concurring`/`joining`) followed the `J.` marker.

Added two new guards inside `stripDateFromCourt`:
1. A mid-string `, J.,` / `, JJ.,` followed by a role keyword
2. A whole-content regex for editorial status tokens

Real court abbreviations (`9th Cir.`, `D. Mass.`, `S.D.N.Y.`) continue
to pass through unchanged.

11 regression tests in `tests/extract/issueNonCourtParentheticals.test.ts`.
