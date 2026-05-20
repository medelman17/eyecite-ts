---
"eyecite-ts": patch
---

fix(publicLaw): accept spelled-out `Public Law` and `Public Law No.` (#533)

The public-law pattern only matched the abbreviated `Pub. L.` / `Pub. L. No.` forms, so spelled-out variants like `Public Law 116-127` and `Public Law No. 116-127` (common in House/Senate reports and in opinions that introduce the citation without prior abbreviation) were never tokenized. Both forms now extract correctly with `congress` and `lawNumber` populated.
