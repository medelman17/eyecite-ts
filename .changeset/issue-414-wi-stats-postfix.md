---
"eyecite-ts": patch
---

feat: Wisconsin Statutes postfix form `§ NN.NN, Stats.` + uppercase `STATS.` (#414)

Wisconsin court style places the `Stats.` abbreviation AFTER the
section, separated by a comma — `§ 76.09, Stats.`, `sec. 805.13(3),
Stats.`, `§ 48.415(l)(a)3, STATS.` (uppercase). The dominant
Wisconsin citation form (11 occurrences in a 50-opinion sample
for `§ 76.09, Stats.` alone) was unrecognized.

### Fix

New `wi-stats-postfix` tokenizer pattern + dedicated
`extractWiStatsPostfix` extractor. Sibling to florida-postfix,
idaho-postfix, mca-postfix, tca-postfix — fifth state-postfix
pattern, distinguished from the others by its trailing
alphanumeric sub-subsection marker (`3` in `48.415(l)(a)3`).

- Section connector accepts `§`, `§§`, `sec.`/`Sec.`,
  `section`/`Section`.
- Code abbreviation accepts both lowercase `Stats.` and
  uppercase `STATS.`.
- Section body allows trailing alphanumeric after paren chain
  (`(l)(a)3`) for Wisconsin's sub-subsection notation.

Emits `code: "Wis. Stat."`, `jurisdiction: "WI"`, section body
with full subsection chain.

### Scope notes

The following pieces of #414 are intentionally deferred:

- **`sec. (Rule) NN.NN, Stats.`** — Wisconsin evidence rules
  cited as Stats. sections; needs handling of the inserted
  `(Rule)` annotation.
- **Bare-section follow-ons** (`§ 19.36(3)`, `§ 68.13`) —
  short-form citation problem, not extraction.

### Tests

5 new tests under `Wisconsin Stats. postfix form (#414)` in
`tests/extract/extractStatute.test.ts`:

- `§ 76.09, Stats.` (canonical lowercase)
- `§ 48.415(l)(a)3, STATS.` (uppercase + trailing
  sub-subsection)
- `sec. 805.13(3), Stats.` (word sec.)
- `Section 48.415, Stats.` (capitalized word Section)
- Regression: `Wis. Stat. § 803.04(2)` (modern prefix)

Full 2721-test suite passes; no regressions.

### Related

Fifth state-postfix pattern after FL (#356), ID (#360), MT
(#372), TN (#398). Wisconsin is unique in supporting trailing
alphanumeric sub-subsection markers — other postfix states stop
at the closing paren of the last subsection.
