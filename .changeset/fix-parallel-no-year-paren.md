---
"eyecite-ts": patch
---

fix(extract): parallel cites without year-paren propagate caseName (#653)

Resolves #653. Parallel-cite caseName propagation required a shared
closing parenthetical. When the chain ended at sentence-end (`.` or
`;`) without a year-paren — common in older opinions citing parallel
reporters — `caseName` did not propagate to the secondary.

| input | before | after |
|---|---|---|
| `Kauffman v. Griesemer, 26 Pa. 407, 67 Am. Dec. 437.` | secondary caseName=undefined | both = `Kauffman v. Griesemer` ✓ |
| `Smith v. Jones, 100 F.2d 1, 200 F. Supp. 5;` | secondary caseName=undefined | both = `Smith v. Jones` ✓ |
| `Smith v. Jones, 100 F.2d 1, 200 F.2d 5 (1990).` | unchanged | unchanged ✓ |
| `Smith v. Jones, 100 F.2d 1, 200 F. Supp. 456` (no terminator) | unchanged (strict) | unchanged ✓ |

`isParallelChainTerminator` accepts `.` or `;` (followed by space/EOF)
as an alternate chain terminator alongside the existing
`hasSharedParenthetical` check. EOF alone is still rejected — that's
the pre-existing test asserting strict behavior to prevent
unrelated-cite grouping in truncated text.

4 regression tests in `tests/extract/issueParallelNoYearParen.test.ts`.
