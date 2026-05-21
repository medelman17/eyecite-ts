---
"eyecite-ts": patch
---

fix(statute): publisher/supplement markers no longer mis-parsed as subsection

The statute body parser's `SUBSECTION_RE` accepted any paren content as
a subsection chain. Bluebook publisher/supplement markers and
parenthetical context phrases were silently captured as `subsection`:

| input | before | after |
|---|---|---|
| `42 U.S.C. § 1983 (Supp. III)` | subsection=`(Supp. III)` | undefined ✓ |
| `42 U.S.C. § 1983 (West)` | subsection=`(West)` | undefined ✓ |
| `42 U.S.C. § 1983 (Cum. Supp. 2020)` | subsection=`(Cum. Supp. 2020)` | undefined ✓ |
| `28 U.S.C. § 1331 (federal question)` | subsection=`(federal question)` | undefined ✓ |

Reject paren content as a subsection when it contains internal whitespace
OR matches a known publisher word (`West`, `Lexis`, `Supp.`, `Cum.`,
`Pamphlet`, `Pocket`). When rejected, also strip the paren content from
the `section` field so section stays clean (`1331`, not `1331 (federal
question)`).

Wisconsin's idiosyncratic `48.415(l)(a)3` format (#414) where the
section legitimately contains parens is unaffected — the reject-and-
strip path only fires when the rejection criteria match.

7 regression tests in `tests/extract/issueStatuteSupplementSubsection.test.ts`.
