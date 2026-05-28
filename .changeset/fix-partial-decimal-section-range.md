---
"eyecite-ts": patch
---

fix(extract): partial-decimal section ranges populate sectionRange (#694 pt 3)

Resolves part 3 of #694. Bluebook shorthand for state codes with
decimal-suffixed sections (`Tex. Bus. & Com. Code Ann. §§ 17.50-.55`,
where the trailing endpoint inherits the integer stem) and the full
repeated form (`§§ 17.50-17.55`) weren't expanded into structured
`sectionRange` data.

| input | before | after |
|---|---|---|
| `Tex. Bus. & Com. Code Ann. §§ 17.50-.55` | section=`17.50-.55`, no range | section=`17.50` + range `(17.50, 17.55)` ✓ |
| `Tex. Bus. & Com. Code Ann. §§ 17.50-17.55` | section=`17.50-17.55`, no range | section=`17.50` + range `(17.50, 17.55)` ✓ |
| `Va. Code § 18.2-308.2` (regression: not a range) | unchanged | unchanged ✓ |
| `Tex. Bus. & Com. Code Ann. § 17.50` (single) | unchanged | unchanged ✓ |

`parseBody` recognizes both partial (`.NN`) and full (`X.NN-X.MM`)
decimal-range shorthand. The full-repeated form requires the integer
stem to match on both sides to avoid mis-parsing VA hyphenated
section identifiers (`18.2-308.2`) as ranges.

Wired sectionRangeEnd through `extractAbbreviated` and `extractNamedCode`
so the new sectionRange field is surfaced on the returned
StatuteCitation.

4 regression tests in `tests/extract/issuePartialDecimalSectionRange.test.ts`.

This completes all 3 sub-issues of #694 across PRs #742, #754, and this PR.
