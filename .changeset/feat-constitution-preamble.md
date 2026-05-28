---
"eyecite-ts": minor
---

feat(extract): constitutional preamble citations (`U.S. Const. pmbl.`) (#321 partial)

Resolves the preamble sub-issue of #321. `U.S. Const. pmbl.` and
`U.S. Const. preamble` references weren't extracted — the BODY_TAIL
regex required `art.` / `amend.` + numeral.

Added a `PREAMBLE` alternative (`pmbl.` / `preamble`) to BODY_TAIL.
A new `preamble: boolean` field on `ConstitutionalCitation` is set
to `true` when the preamble branch matches. The field is mutually
exclusive with `article` and `amendment` (none of which apply to
the preamble).

| input | before | after |
|---|---|---|
| `U.S. Const. pmbl.` | 0 cites | preamble=true, jurisdiction=US ✓ |
| `U.S. Const, pmbl.` (comma) | 0 cites | preamble=true ✓ |
| `U.S. Const. preamble` (unabbreviated) | 0 cites | preamble=true ✓ |
| `U.S. Const. art. III, § 2` (control) | unchanged | unchanged ✓ |
| `U.S. Const. amend. XIV` (control) | unchanged | unchanged ✓ |

5 regression tests in `tests/extract/issueConstitutionPreamble.test.ts`.

Other #321 sub-issues (plural `amends.`, full prose form
`article XII, section 5 of the California Constitution`) remain
open.
