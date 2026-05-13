---
"eyecite-ts": patch
---

feat: New York bare named-code form `Penal Law § N`, `Labor Law § N [3]` (#386)

NY opinions omit the `N.Y.` prefix when citing their own state's
codes — `Penal Law § 130.52` rather than `N.Y. Penal Law §
130.52`. The disambiguator is the word `Law` after the code name
(other states use `Code`). NY also uses **bracket-subdivision**
form `[1]`, `[3-a]`, `[a]`, `[iv]` interchangeably with the
canonical paren form `(1)`. Both were unrecognized.

### Fix

New `ny-bare-named-code` tokenizer pattern + dedicated
`extractNyBareLaw` extractor. Listed AFTER `named-code` so the
longer `N.Y. <Law> § N` form wins span dedup when the prefix is
present. The enumerated list of NY law names is closed; matching
is restricted to known NY codes so the false-positive risk is
bounded.

Section body accepts both `(...)` and `[...]` trailing groups,
so `Penal Law § 130.00 [3]` and `Labor Law § 220 [3-a]` parse
with the bracket subdivision in `subsection`.

Emits `code: "<Name> Law"` (e.g., `"Penal Law"`),
`jurisdiction: "NY"`.

Supported NY law names: Penal, Labor, Real Property, General
Business, General Obligations, General Municipal, Municipal
Home Rule, Criminal Procedure, Insurance, Executive, Judiciary,
Civil Practice, Civil Rights, Education, Public Health, Banking,
Domestic Relations, Environmental Conservation, Election, Social
Services, Estates Powers and Trusts, Vehicle and Traffic,
Surrogate's Court Procedure, Family Court, Court of Claims,
Workers' Compensation, Highway, Tax, Personal Property.

### Scope notes

The following pieces of #386 are intentionally deferred:

- **CPLR / SCPA / N-PCL bare forms** (`CPLR 5601 (a)`, `SCPA
  1803`, `N-PCL 1411 [a]`) — these don't follow the `<Name>
  Law` pattern; need their own bare patterns.
- **`CPLR article 78`** — article-based citation, separate
  parse.
- **`L YYYY, ch NNN` session laws** — pending unified
  `sessionLaw` citation type.
- **Town Code / municipal codes** — broadly out of scope.

### Tests

5 new tests under `New York bare named-code + bracket
subdivisions (#386)` in `tests/extract/extractStatute.test.ts`:

- Bare `Penal Law § 130.52`
- `Penal Law § 130.00 [3]` (bracket subdivision)
- `Labor Law § 220 [3-a]` (bracket with hyphen-letter)
- `General Municipal Law § 874`
- Regression: `N.Y. Penal Law § 130.52` (no duplicate)

Full 2665-test suite passes; no regressions.

### Related

Companion to issue #12 (state bare-statute) for the NY laws
that are commonly cited without prefix. The bracket-subdivision
fix builds on the bracket-section work in #370 (MSA
`23.710[252]`) — brackets are now accepted in three contexts:
abbreviated-code section body, parseBody subsection chain, and
NY named-code section body.
