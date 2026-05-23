---
"eyecite-ts": patch
---

fix(clean): soft-wrapped pincite ranges (`5-\n7`) preserve hyphen (#681)

Resolves #681. `rejoinHyphenatedWords` stripped every `<word>-\n<word>`
shape on the assumption it was a wrapped word (`Dil-\nlinger` →
`Dillinger`). A wrapped pincite range — `5-\n7` — got the same
treatment and fused into a fabricated `57` pincite that didn't exist
in the source.

| input | before | after |
|---|---|---|
| `5-\n7` | `57` | `5-7` ✓ |
| `100 F.2d 1, 5-\n7 (1990)` | pincite=`57` | pincite=`5`, range `5-7` ✓ |
| `Dil-\nlinger` (word wrap) | `Dillinger` | unchanged ✓ |
| `F. Sup-\np. 3d` (word wrap) | `F. Supp. 3d` | unchanged ✓ |

Fix: `rejoinHyphenatedWords` now preserves the hyphen when both sides
of the wrap are digits (range form). Letter on either side keeps the
existing word-rejoin behavior.

5 regression tests in `tests/clean/issueSoftWrapPinciteRange.test.ts`.
