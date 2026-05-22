---
"eyecite-ts": patch
---

fix(extract): volume/page reference parentheticals not parsed as court (#700)

Resolves #700. Parentheticals starting with volume/page reference
tokens (`Vol. 100`, `p. 5`, `at 7`, `note 7`) leaked into the `court`
field. Worse, the trailing-day-strip regex chewed 1-2 digits off
`Vol. 100` producing the malformed `court="Vol. 1"`.

| input | before | after |
|---|---|---|
| `Smith, 100 F.2d 1 (Vol. 100)` | court=`Vol. 1` | undefined ✓ |
| `Smith, 100 F.2d 1 (p. 5)` | court=`p.` | undefined ✓ |
| `Smith, 100 F.2d 1 (at 7)` | court=`at` | undefined ✓ |
| `Smith, 100 F.2d 1 (note 7)` | court=`note` | undefined ✓ |

Added an early-exit check at the top of `stripDateFromCourt` that
rejects parentheticals starting with `Vol.|vol.|p.|pp.|at|n.|note`
followed by a digit. This runs BEFORE the date-strip pipeline so the
digits don't get chewed away.

9 regression tests in `tests/extract/issueVolParenNotCourt.test.ts`.
