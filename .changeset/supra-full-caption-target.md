---
"eyecite-ts": patch
---

fix(resolve): prefer same-case full-caption supra matches

`Plaintiff v. Defendant, supra` resolution now first looks for a single
antecedent whose plaintiff and defendant both match the caption. This prevents
an unrelated case with a stronger one-sided fuzzy match from beating the
intended antecedent.
