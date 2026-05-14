---
"eyecite-ts": patch
---

fix: `Id.` skips citations inside a shortform's explanatory parenthetical

When a short-form citation is followed by an explanatory
parenthetical containing another full citation
(`Dormitory Auth., 30 N.Y.3d at 710 (quoting Port Chester ...,
40 N.Y.2d 652, 656 (1976))`), the inner citation is a
sub-reference of the parent and must not become the antecedent
for a subsequent `Id.`. Previously, only `case` and `docket`
full citations had a `fullSpan` extending through their trailing
parenthetical, so the resolver correctly detected paren-children
of those types — but `shortFormCase` (and other non-case full
citations) did not carry `fullSpan`, leaving their paren-children
visible as Id. antecedents.

### Fix

`DocumentResolver` now precomputes parenthesis depth at every
citation's start position from the raw text. A citation at
depth > 0 is flagged as a parenthetical child regardless of
which prior citation opened the `(`. The legacy `fullSpan`-based
check is preserved as a fallback. `Id.` no longer resolves to
citations buried inside an earlier explanatory parenthetical.

### Tests

7 new tests in `tests/resolve/idSkipsParenChildOfShortform.test.ts`
covering the user-reported Dormitory Auth./Port Chester case,
shortform-with-`(citing X)` parens, the existing case-with-paren
regression, nested `(See A (citing B))` depth, statute inside a
case paren, and `Id.` itself inside a parenthetical. Full
2892-test suite passes.
