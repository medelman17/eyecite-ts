---
"eyecite-ts": patch
---

Extract long-form federal rule citations (#295)

`Fed. Rule Bankr. P. 3001` and `Fed. Rule Crim. Proc. 46(b)` — the older
long-form spellings that use `Rule` for `R.` and `Proc.` for `P.` — now extract
as `federalRule` alongside the canonical abbreviations (`Fed. R. Crim. Proc. 46`
also works). Bare `Rule N`, state procedural rules, and disciplinary rules
remain other slices of #295.
