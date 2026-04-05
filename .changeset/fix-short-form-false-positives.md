---
"eyecite-ts": patch
---

Extend false positive filters to cover short-form case citations (#146). The `getReporter()` function only checked `type === "case"`, so `shortFormCase` citations with implausible reporters (prose text captured by the "at" keyword) bypassed all validation. Now all reporter/volume heuristics apply to short-form citations too.
