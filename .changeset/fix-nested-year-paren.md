---
"eyecite-ts": patch
---

fix(extract): nested year parenthetical does not leak into court (#682)

Resolves #682. When a citation's year parenthetical contained a nested
disposition paren (`(1990 (en banc))`, `(9th Cir. 1990 (per curiam))`),
the trailing-year strip couldn't reach the year because `(en banc)`
sat between it and end-of-string. The whole `1990 (en banc)` residue
leaked into the `court` field:

| input | before | after |
|---|---|---|
| `Smith, 100 F.2d 1 (1990 (en banc))` | court=`1990 (en banc)` | undefined ✓ |
| `Smith, 100 F.2d 1 (9th Cir. 1990 (en banc))` | court=`9th Cir. 1990 (en banc)` | court=`9th Cir.` ✓ |

Added a leading-pass that strips a trailing nested `\([^()]*\)` before
the year/date strips run. The year stays in the parent paren and is
extracted normally; the nested disposition is discarded (could be
surfaced as structured disposition in a future enhancement).

4 regression tests in `tests/extract/issueNestedYearParen.test.ts`.
