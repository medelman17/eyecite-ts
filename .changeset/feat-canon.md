---
"eyecite-ts": minor
---

Add `canon` citation type for Code of Judicial Conduct canons (#310)

`Canon 7(B)(1)`, `Canon 2(A) of the Code of Judicial Conduct`, and bare `Canon 1` now extract as `type: "canon"` with `canon`, optional `subsection`, and (when stated) `ruleSet`. Distinct from attorney disciplinary/model rules (#295). Requires a capital `Canon` + number so lowercase "canon of …" prose is not matched.
