---
"eyecite-ts": patch
---

fix: signal field no longer falsely attached from distant prose (#430)

The `signal` field on a citation was being populated with `see`,
`see also`, `cf.`, etc. when no signal-word actually preceded the
citation — the detector found a signal word somewhere in the gap
between the previous citation and the current one (even
hundreds of characters back) and attached it. 146 occurrences
across all 39 sampled states.

### Fix

`detectLeadingSignals` in `src/extract/detectStringCites.ts` now
rejects signals whose `end` position is more than 80 chars before
the citation start. Real `<signal> <case name>, <citation>`
patterns are typically under 80 chars; longer gaps indicate the
signal-word is stranded prose belonging to an earlier citation
or unrelated sentence.

### Behavior changes

- `the court applied Hawkins v. Mahoney, 1999 MT 82` — no signal
  attached (was: `signal: "see"` if any prior `see` appeared in
  the gap)
- `we see no reason to disturb the holding. The legislature
  enacted NRS 616.110(2)` — no signal (was: false `signal: "see"`)
- `See Smith v. Jones, 100 U.S. 200 (1980)` — `signal: "see"`
  unchanged
- `See also Brown v. Board, 347 U.S. 483` — `signal: "see also"`
  unchanged

### Tests

4 new tests under `signal field not falsely attached from
distant prose (#430)` in `tests/extract/extractCase.test.ts`.
Full 2754-test suite passes; no regressions.
