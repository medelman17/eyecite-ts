---
"eyecite-ts": patch
---

Fix case-name backscan for zero-width-space and `<br>` artifacts (#693)

Two PDF/HTML artifacts that dropped or fragmented case captions are now handled
in the cleaner:

- Zero-width space (U+200B) standing in for a separator (`Smith‹ZWSP›v. Jones`)
  was stripped (joining `Smithv.`) and lost the plaintiff; it now normalizes to
  a space.
- `<br>` line breaks (`Smith<br>v.<br>Jones`) only became a space when word
  chars flanked both sides, so `v.<br>Jones` fused to `v.Jones`; `<br>` now
  always collapses to a space.

Trademark/registered symbols were already handled (#744). Em-dash and ellipsis
separators remain documented limitations — the punctuation marks an
interruption/omission, not a continuous case name.
