---
"eyecite-ts": patch
---

fix(extract): `bare-article` accepts Arabic numerals (`Art. 1, § 10`) (#321 partial)

Resolves the bare-article-Arabic sub-issue of #321. The `bare-article`
pattern previously required Roman numerals only (`Art. I, § 8`),
missing the common-in-modern-state-codes Arabic form (`Art. 1, § 10`).

| input | before | after |
|---|---|---|
| `Art. 1, § 10` | 0 cites | article=1, section=10 ✓ |
| `Art. 42, §3` | 0 cites | article=42, section=3 ✓ |
| `Art. I, § 8` (Roman) | unchanged | unchanged ✓ |
| `Art. 42 of the treaty` (no section) | 0 cites | unchanged ✓ |

Fix: extended the numeral capture from `[IVX]+` to `([IVX]+|\d+)`.
The mandatory `§ N` requirement keeps false-positive risk low —
prose like `Art. 1 of the treaty` (no section) still won't match.

One existing test in `constitutionalPatterns.test.ts` asserted the
old Roman-only behavior — updated to reflect the new acceptance and
added a regression control for the no-section case.

5 regression tests in `tests/extract/issueBareArticleArabic.test.ts`.

Other #321 sub-issues (plural `amends.`, `pmbl.`, full prose form)
remain open.
