---
"eyecite-ts": patch
---

fix(extract): full-case extractor accepts `at page N` / `at pages N-M` (#510)

`LOOKAHEAD_PINCITE_REGEX` only allowed the abbreviated `p.` / `pp.` prefix
for spelled-out page references, while the short-form extractor already
accepts `page` / `pages` (#344). The full-case path now matches, so
citations like `90 A.2d 653, at page 655` and `90 A.2d 660, at page 664
(Del. Sup. Ct. 1952)` extract the pincite correctly. `PINCITE_SKIP_REGEX`
is updated in lockstep so later metadata parens still parse after a
spelled-out pincite.
