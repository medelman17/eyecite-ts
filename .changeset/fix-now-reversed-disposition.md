---
"eyecite-ts": patch
---

fix(extract): adverb-prefixed disposition tokens don't pollute court (#719)

Resolves #719. PR #678's disposition-token rejection required the
disposition to start the content (`^(?:rev'd|aff'd|...|reversed|...)`).
When the disposition is prefixed with `now`, `previously`, `formerly`,
or `since`, the regex didn't match and the prefix+disposition leaked
into court:

| input | before | after |
|---|---|---|
| `Smith, 100 F.2d 1 (now reversed, 1990)` | court=`now reversed` | undefined ✓ |
| `Smith, 100 F.2d 1 (previously vacated, 1990)` | leaks | undefined ✓ |
| `Smith, 100 F.2d 1 (formerly aff'd, 1990)` | leaks | undefined ✓ |
| `Smith, 100 F.2d 1 (since overruled, 1990)` | leaks | undefined ✓ |

Added an optional leading adverb (`(?:(?:now|previously|formerly|since)\s+)?`)
before the disposition token. Existing bare-disposition forms continue
to be rejected.

8 regression tests in `tests/extract/issueNowReversedDisposition.test.ts`.
