---
"eyecite-ts": patch
---

feat: Montana Code Annotated postfix form (`§ N, MCA`) and edition-year parentheticals (#372)

Montana's canonical court style places the section before the code
name, with the code name `MCA` after a comma — same shape as
Florida's `§ N, Florida Statutes` and Idaho's `§ N, Idaho Code`. A
22-opinion Montana sweep produced 30+ MCA misses; every modern
Montana Supreme Court opinion uses this form.

### Fix

New `mca-postfix` tokenizer pattern in `src/patterns/statutePatterns.ts`
and dedicated `extractMcaPostfix` extractor at
`src/extract/statutes/extractMcaPostfix.ts`. Listed BEFORE
`abbreviated-code` so the container-shape wins span dedup. Emits
`code: "MCA"`, `jurisdiction: "MT"`, `section`, and optional
`subsection`.

The trailing edition-year parenthetical (`MCA (1983)`) is attached
by the generic year-paren absorber in `extractCitations.ts` — no
extractor change needed.

### Scope notes

The following pieces of #372 are intentionally deferred:

- **Abbreviated section continuation** (`§61-4-205 and -206, MCA`)
  — the second section `-206` carries forward title/article from
  the first (`61-4-`); deferred alongside the other multi-section
  patterns.
- **Multi-section lists** in general — same deferral.

### Tests

5 new tests under `Montana Code Annotated postfix form (#372)` in
`tests/extract/extractStatute.test.ts`:

- `§ 77-6-205(2), MCA`
- `Section 40-4-121(7)(a), MCA` (word "section")
- `§ 39-71-703, MCA (1983)` (edition year)
- Regression: `Mont. Code Ann. § 77-6-205`
- Regression: `MCA § 77-6-205`

Full 2597-test suite passes; no regressions.

### Related

Third state-postfix pattern after Florida (#356) and Idaho (#360).
The pattern shape is now reusable: every state with a postfix
citation style follows the same template.
