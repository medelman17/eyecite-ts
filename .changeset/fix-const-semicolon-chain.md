---
"eyecite-ts": patch
---

fix(extract): constitutional citations chained with `;` now expand (#707)

Resolves #707. String-cited constitutional references separated by `;`
(`U.S. Const. art. III, § 2, cl. 1; amend. XIV, § 1`) only produced
a citation for the head — the trailing `;\s*art./amend. ...` had no
`Const.` anchor for the tokenizer pattern to match. Common in
scholarly footnotes and brief arguments.

| input | before | after |
|---|---|---|
| `U.S. Const. art. III, § 2, cl. 1; amend. XIV, § 1` | 1 cite | 2 cites ✓ |
| `U.S. Const. art. I, § 8; art. II, § 1` | 1 cite | 2 cites ✓ |
| `U.S. Const. art. I, § 1; amend. V; amend. XIV` | 1 cite | 3 cites ✓ |
| `Cal. Const. art. I, § 7; art. II, § 2` | 1 cite | 2 cites (both CA) ✓ |

Added a post-extraction pass `expandChainedConstitutional` that scans
forward from each constitutional cite's cleanEnd across `;` separators
for additional body-tail matches (`art./amend. <numeral> [§ N] [cl. M]`)
and emits a synthetic citation per element inheriting the head's
jurisdiction (US / state code).

6 regression tests in `tests/extract/issueConstSemicolonChain.test.ts`.
