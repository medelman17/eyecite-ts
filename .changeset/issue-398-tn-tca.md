---
"eyecite-ts": patch
---

fix: Tennessee `T.C.A.` variants — `sec.` connector, postfix form, dotless `TCA` (#398)

Tennessee opinions interchange every stylistic variant of the
T.C.A. abbreviation. Most worked already, but the `sec.` / `Sec.`
section connector (universal across multiple states) and the
postfix `§ N, T.C.A.` form were unrecognized.

### Fixes

- **Universal `sec.` / `Sec.` section connector**: the section
  connector in `buildAbbreviatedCodeRegex` and `ABBREVIATED_RE`
  now accepts `sec.` / `Sec.` alongside `§`, `§§`, and the
  spelled-out word `section(s)` / `Section(s)`. This is a
  Tennessee-driven change but benefits any state that
  interchanges these forms.
- **T.C.A. postfix pattern**: new `tca-postfix` tokenizer +
  dedicated `extractTcaPostfix` extractor for `§ 39-904, T.C.A.`
  Sibling to florida-postfix, idaho-postfix, mca-postfix.
- **Canonical `T.C.A.`**: Tennessee abbreviations array
  reordered so `T.C.A.` (Bluebook standard with dots) is the
  last element / canonical. The dotless `TCA` and spaced variants
  now normalize to `T.C.A.` via the stripped-form fallback.

### Behavior changes

- `T.C.A. sec. 40-2407` → extracted (was: not extracted)
- `T.C.A. Sec. 40-3809` → extracted
- `TCA sec. 40-2528` → `code="T.C.A."` (canonicalized)
- `§ 39-904, T.C.A.` (postfix) → extracted
- `T.C.A. § 39-2404` → unchanged
- `T.C.A. 40-2020` (no connector) → unchanged

### Scope notes

The following pieces of #398 are intentionally deferred:

- **Multi-section lists** (`T.C.A. Secs. 40-3806, 40-3814, and
  40-3818`) — multi-section deferred across all states.
- **OCR variant `TOA`** (TCA misread) — edge case; OCR
  cleanup belongs upstream of citation extraction.

### Tests

6 new tests under `Tennessee T.C.A. variants + postfix (#398)`
in `tests/extract/extractStatute.test.ts`:

- `T.C.A. sec. 40-2407` (sec. connector)
- `T.C.A. Sec. 40-3809` (capital Sec.)
- `TCA sec. 40-2528` (dotless, canonicalized)
- `§ 39-904, T.C.A.` (postfix)
- Regression: `T.C.A. § 39-2404`
- Regression: `Tenn. Code Ann. § 39-2404`

Full 2671-test suite passes; no regressions.

### Related

Universal `sec.` connector follows the pattern established by
the universal `Section`/`section` word connector (#348). Postfix
form is the fourth state-postfix pattern after Florida (#356),
Idaho (#360), and Montana (#372). The canonicalization
reordering matches the Ohio pattern (#388).
