---
"eyecite-ts": patch
---

fix(extract): CFR `Title 12, C.F.R.` form recognized (#630)

Resolves #630. CFR pattern's title→code separator required pure
whitespace (`\s+`), missing the comma-tolerant form that USC got in
Sprint H (#586).

| input | before | after |
|---|---|---|
| `Title 12, C.F.R. § 226` | 0 cites | regulation ✓ |
| `Title 12, C.F.R., § 226` | 0 cites | regulation ✓ |
| `Title 12 C.F.R. § 226` (no comma) | regulation | unchanged ✓ |
| `12 C.F.R. § 226` (no Title prefix) | regulation | unchanged ✓ |

Fix: change CFR title→code separator from `\s+` to `\s*,?\s+` —
mirrors the USC fix for #586. Trailing letter alternation is USC-only,
so no other changes.

5 regression tests in `tests/extract/issueCfrTitleComma.test.ts`.
