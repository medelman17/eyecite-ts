---
"eyecite-ts": minor
---

Add `legislativeMaterial` citation type (#308)

House/Senate committee reports (`H.R. Rep. No. 94-1487, p. 16 (1976)`, spacing-tolerant `H. R.`, with optional `Nth Cong.` / `Nth Sess.` / page / year) and the Congressional Record (`112 Cong. Rec. 1234`) now extract as `type: "legislativeMaterial"` with a `kind: "report" | "congressionalRecord"` discriminator — carrying `chamber`, `reportNumber`, `congress`, `session`, `volume`, `page`, and `year`. The "U.S. Code Cong. & Admin. News" form is a follow-up.
