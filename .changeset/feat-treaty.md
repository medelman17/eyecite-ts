---
"eyecite-ts": minor
---

Add `treaty` citation type for treaty-series citations (#309)

Treaty-series citations now extract as `type: "treaty"`: "No."-style series (`T.I.A.S. No. 1502`, spacing-tolerant `T. I. A. S.`) and volume-series-page forms (`1155 U.N.T.S. 331`, `123 U.S.T. 456`), carrying `series` + `seriesNumber`, or `series` + `volume` + `page`. Named-treaty metadata (`treatyName` / `article` / `paragraph`) is reserved for a follow-up — the series cite inside a named-treaty string still extracts. Federal `statutesAtLarge` (`Stat.`) is unaffected.
