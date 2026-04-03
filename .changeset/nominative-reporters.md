---
"eyecite-ts": minor
---

Support nominative reporter citations in early SCOTUS cases (#49, #16)

- Fix extraction of citations with nominative parentheticals like `5 U.S. (1 Cranch) 137` (previously produced 0 results)
- Capture nominative reporter metadata as `nominativeVolume` and `nominativeReporter` fields on `FullCaseCitation`
- Supports all early SCOTUS nominative reporters: Black, Cranch, How., Wall., Wheat., Pet., Dall.
