---
"eyecite-ts": patch
---

fix: `et seq.` captured by state-postfix patterns (FL, ID, MCA, TN, WI) (#419)

The `et seq.` suffix was systematically dropped from state-postfix
citations — `§§ 77-6-301 et seq., MCA` extracted only `77-6-301`
and lost the legally-significant "and the following sections"
marker. A 50-state baseline corpus showed 59 misses across 17
states (some via abbreviated-code which already worked; the
remainder via the postfix patterns introduced in #356, #360,
#372, #398, #414).

### Fix

The section-body capture group in all five state-postfix
tokenizer patterns + their mirroring extractor regexes now
accepts the optional `(?:\s+et\s+seq\.?)?` trailer:

- `florida-postfix` + `florida-prefix-spelled` (#356)
- `idaho-postfix` (#360)
- `mca-postfix` (#372)
- `tca-postfix` (#398)
- `wi-stats-postfix` (#414)

`parseBody` already strips the trailer and sets `hasEtSeq:
true` — the fix just lets the trailer get captured in the
section group so it reaches parseBody.

The Wisconsin extractor's whitespace-collapse step
(`replace(/\s+/g, "")`) was updated to split off the `et seq.`
trailer first, preserving the marker while still collapsing
spaces inside `(N)` subsection groups.

### Behavior changes

- `§§ 77-6-301 et seq., MCA` → `hasEtSeq=true`, jur=MT (was:
  not extracted as MCA — instead silently mis-routed to NM via
  the bare-section fallback because the postfix container
  failed)
- `§ 812.035 et seq., Florida Statutes` → `hasEtSeq=true`
- `Section 23-908 et seq., Idaho Code` → `hasEtSeq=true`
- `§ 39-904 et seq., T.C.A.` → `hasEtSeq=true`
- `§ 76.09 et seq., Stats.` → `hasEtSeq=true`

### Scope notes

The following pieces of #419 are intentionally deferred:

- **CA Code Regs.** (`Cal. Code Regs., tit. 14, § 15000 et
  seq.`) — admin regs broadly deferred per #320.
- **NJ Admin Code** (`N.J.A.C. 18:46-1.1 et seq.`) — same.
- **Treatises** (`1 Larson, Workmen's Compensation Law § 15.00
  et seq.`) — deferred per #307.
- **Rules** (`RALJ 1.1 et seq.`, `RAP 16.3 et seq.`) — deferred
  per #295.

The dominant statute occurrences (the 50 in the issue's
distribution) are now captured.

### Tests

6 new tests under `et seq. captured by state-postfix patterns
(#419)` in `tests/extract/extractStatute.test.ts`:

- MCA postfix `§§ 77-6-301 et seq., MCA`
- Florida postfix `§ 812.035 et seq., Florida Statutes`
- Idaho postfix `Section 23-908 et seq., Idaho Code`
- TN postfix `§ 39-904 et seq., T.C.A.`
- WI postfix `§ 76.09 et seq., Stats.`
- Regression: `Ark. Code Ann. § 9-27-301 et seq. (Supp. 1989)`

Full 2735-test suite passes; no regressions.

### Related

This fix also incidentally repairs a Montana-→-NM
mis-classification: `§§ 77-6-301 et seq., MCA` was previously
silently mis-routed to NM because the MCA postfix pattern
failed (didn't capture et seq.), letting the NM bare-section
pattern (#382) match the inner `§§ 77-6-301`. With the postfix
container now capturing the full citation, MT wins.
