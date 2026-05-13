---
"eyecite-ts": patch
---

fix: Kansas `K.S.A. YYYY Supp.` year-edition mis-parse + comma-section format (#367)

A 43-opinion Kansas sweep showed the same mis-parse 30+ times:
every `K.S.A. YYYY Supp. NN-NNN` cite had the year mis-captured as
the section number, silently substituting (e.g.) `2009` for the
actual section `44-501(d)(2)`. Separately, Kansas's
comma-section format `NN-N,NNN` (e.g. `K.S.A. 23-9,101`) was being
truncated at the comma, dropping `,101`.

### Fixes

- **Year-edition pattern**: new `ksa-year-edition` tokenizer
  pattern + dedicated `extractKsaYearEdition` extractor. Captures
  `K.S.A. 2009 Supp. 44-501(d)(2)` as `code: "K.S.A."`,
  `year: 2009`, `editionLabel: "Supp."`, `section: "44-501"`,
  `subsection: "(d)(2)"`. The `Supp.` marker is optional —
  bound-volume cites (`K.S.A. YYYY NN-NNN` without `Supp.`) also
  match. Listed BEFORE `abbreviated-code` so this shape wins.

- **Comma-section format**: the universal section-body regex (in
  `buildAbbreviatedCodeRegex` and `ABBREVIATED_RE`) now accepts
  `,(?=\d)` — comma followed by digit — alongside the existing
  alphanumeric/colon/slash/hyphen character class. So `K.S.A.
  23-9,101` parses as `section: "23-9,101"` rather than
  truncating to `"23-9"`. The lookahead guard prevents a sentence
  comma from being absorbed.

### Behavior changes

- `K.S.A. 2009 Supp. 44-501(d)(2)` → `section="44-501"`,
  `year=2009`, `editionLabel="Supp."` (was: `section="2009"`,
  everything else dropped)
- `K.S.A. 23-9,101` → `section="23-9,101"` (was: `"23-9"`)
- `K.S.A. 44-501` → unchanged

### Scope notes

The following pieces of #367 are intentionally deferred:

- **Kansas session laws** (`L. 1985, ch. 176, § 2`) — deferred
  alongside the other session-law formats (`Ga. L.`, `Stats.`,
  `Laws of Florida`, `Ind. Acts`, `PA YYYY`, `Sess. L.`) pending a
  unified `sessionLaw` citation type.

### Tests

5 new tests under `Kansas K.S.A. year-edition + comma-section
(#367)` in `tests/extract/extractStatute.test.ts`:

- `K.S.A. 2009 Supp. 44-501(d)(2)` (year-edition + subsection)
- `K.S.A. 1988 Supp. 44-556` (year-edition without subsection)
- `K.S.A. 23-9,101` (comma-section)
- `K.S.A. 23-9,316`
- Regression: bare `K.S.A. 44-501`

Full 2608-test suite passes; no regressions.

### Related

Year-edition is sibling to Minnesota `Minn. St. YYYY, § N` (#371
landed), Colorado `C.R.S. 1963` (#352 landed), and Nebraska
`R.R.S. 1943, Reissue YYYY` (#373 landed). The comma-section
character-class change is universal but Kansas-driven: no other
state uses the `NN-N,NNN` form so the impact is bounded.
