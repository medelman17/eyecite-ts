---
"eyecite-ts": patch
---

test(extract): lock in year-glued-subsection behavior (#588)

Documented examples:
- `42 U.S.C. § 1472(c)(2000)` → `subsection="(c)"`, `year=2000`
- `49 U.S.C. § 10502(a)(2000)` → `subsection="(a)"`, `year=2000`
- `42 U.S.C. § 1472(c)(50)` → `subsection="(c)(50)"`, `year=undefined`
- `42 U.S.C. § 1331(a)(West 2018)` → `publisher="West"`, `year=2018`

Compact `§ NNNN(c)(YYYY)` forms (no whitespace before the year
parenthetical) used to merge the year into the subsection chain
because the year-paren absorber only ran when whitespace separated
the subsection from the year. Sprint F (#590) added a negative
lookahead `(?![^)]*\d{4})` to the USC/CFR subsection body that
rejects any parenthetical containing four consecutive digits — the
fix composes orthogonally with the post-process
`attachStatuteYearParen` binder which accepts zero leading
whitespace (`^\s*\(`), so the compact form now binds year correctly
as a side-effect of Sprint F.

This changeset adds `tests/extract/issue588YearGluedSubsection.test.ts`
to lock in that post-Sprint-F behavior so future changes to the
subsection / year-paren shape cannot silently regress it. No
runtime change.
