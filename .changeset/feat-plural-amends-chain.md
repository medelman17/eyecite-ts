---
"eyecite-ts": minor
---

feat(extract): plural `amends.` / `arts.` with chained continuations (#321 partial)

Resolves the plural-amendments sub-issue of #321.
`U.S. Const. amends. V, XIV` (plural `amends.` form) wasn't
tokenized at all; even after enabling the plural form, only the
first amendment was extracted.

| input | before | after |
|---|---|---|
| `U.S. Const. amends. V, XIV` | 0 cites | 2 cites (amendment=5, 14) ✓ |
| `U.S. Const. amends. V and XIV` | 0 cites | 2 cites ✓ |
| `U.S. Const. arts. I, II, III` | 0 cites | 3 cites (article=1, 2, 3) ✓ |
| `U.S. Const. amend. V` (singular) | unchanged | unchanged ✓ |

Two coordinated changes:
1. `ARTICLE_OR_AMENDMENT` regex now accepts `arts?` / `amends?` /
   `amdts?` plural forms.
2. `expandChainedConstitutional` accepts a bare-numeral continuation
   (`, XIV` / ` and XIV`) inheriting the article-or-amendment type
   from the head cite — alongside the existing `; art./amend. <numeral>`
   continuation shape from #707.

4 regression tests in `tests/extract/issuePluralAmendsChain.test.ts`.

Other #321 sub-issues (full prose form `article XII, section 5 of
the California Constitution`) remain open.
