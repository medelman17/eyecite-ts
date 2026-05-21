---
"eyecite-ts": patch
---

fix(extract): approximate-year prefixes (`c.`, `circa`, `about`, `cir.`) no longer pollute court

Extends PR #685 (date-modifier verbs) by catching additional non-court
prefixes that leak after year-stripping:

| input | before | after |
|---|---|---|
| `Smith, 100 F.2d 1 (c. 1990)` | `court="c."` | `court=undefined` |
| `Smith, 100 F.2d 1 (circa 1990)` | `court="circa"` | `court=undefined` |
| `Smith, 100 F.2d 1 (about 1990)` | `court="about"` | `court=undefined` |
| `Smith, 100 F.2d 1 (approx. 1990)` | `court="approx."` | `court=undefined` |
| `Smith, 100 F.2d 1 (cir. 1990)` | `court="cir."` (typo) | `court=undefined` |

These are approximate-year prefixes that historians, academic writing,
and OCR artifacts use when the exact decision date is unknown. The
lowercase `cir.` is a common typo for `Cir.`. Added a leading-word
check for `c.|circa|about|approx.|approximately|cir.` after year/date
stripping.

8 regression tests in `tests/extract/issueMoreNonCourtPrefixes.test.ts`.
