---
"eyecite-ts": minor
---

Add granular component spans for all citation types. Each citation now carries a `spans` record with per-component position data (volume, reporter, page, court, year, caseName, plaintiff, defendant, signal, etc.). Explanatory parentheticals gain a `span` field. New `spanFromGroupIndex` utility exported for power users. Closes #172, closes #171.
