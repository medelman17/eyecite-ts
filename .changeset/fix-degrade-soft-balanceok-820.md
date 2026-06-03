---
"eyecite-ts": patch
---

fix(resolve): degrade `Id.` parenthetical-child exclusion to soft on bracket-balance failure (#820)

`resolveId` hard-dropped a candidate antecedent whenever its bracket depth said
"nested", even when that depth came from a clause whose brackets did not balance
(`balanceOk=false` — e.g. a dropped/garbled paren from OCR/PDF) — silently
resolving to a farther cite at confidence 1.0. The #809 `balanceOk` signal is now
consumed: a depth-only paren-child exclusion in a balance-failed clause is
degraded to **soft** — the candidate is kept, confidence is capped, and a warning
is emitted, so `idConfidenceFloor` (#800) can abstain. Trigger-anchored asides and
`fullSpan`-contained cites stay hard exclusions (they don't depend on the fragile
depth count), and balanced clauses are unchanged.
