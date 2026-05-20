---
"eyecite-ts": minor
---

feat(extract): recognize Bankruptcy Code alias and normalize to 11 U.S.C. (#585)

`Bankruptcy Code § 548(a)(1)(B)(i)` and the postfix form
`§ 547 of the Bankruptcy Code` are now extracted as `statute`
citations with `title: 11, code: "U.S.C.", jurisdiction: "US"`. The
alias is normalized to the equivalent explicit citation
(`11 U.S.C. § …`) so downstream consumers — resolver, annotator,
bluebook formatter — treat them identically.

Two new pattern IDs: `bankruptcy-code-prefix` for the conventional
form and `bankruptcy-code-postfix` for the `§ N of the Bankruptcy
Code` form. Both route to `extractBankruptcyCode` which sets the
constant `title=11, code="U.S.C."` and parses the section/subsection
via the shared `parseBody` helper.

Real `11 U.S.C. § N` citations continue to win on overlap dedup so
this change does not shadow the existing extraction path.

~3% of bankruptcy reporter opinions affected; normalize-to-USC is the
simplest fold per the design recommendation.
