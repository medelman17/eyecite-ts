---
"eyecite-ts": patch
---

feat: Minnesota `Minn. St.` short form, year-edition (`Minn. St. YYYY, § N`), and spelled-out `Minnesota Statutes` extraction (#371)

A 35-opinion Minnesota sweep produced 30+ Minnesota statute misses.
`Minn. St.` (without the `at`) is the canonical Minnesota court style
— distinct from the federal Bluebook's `Minn. Stat.` Modern Minnesota
opinions and pre-1980 historical opinions use the year-edition form
`Minn. St. 1971, § 176.66` to indicate which compilation was in
effect at the time of the events.

### Fixes

- **Modern `Minn. St. N.NN`**: Minnesota regex fragment in
  `src/data/stateStatutes.ts` extended to accept `Minn. St.` (short
  form) alongside `Minn. Stat.` (Bluebook). The abbreviations array
  adds `Minn. St.` so the canonical `code` field preserves the
  surface form when extracted.

- **Spelled-out `Minnesota Statutes`**: fragment also matches the
  spelled-out short title plus optional `Ann.` / `Annotated`
  trailer. Pairs with the universal optional-comma + word "Section"
  connector (added in #348/#360) to handle prose forms like
  `Minnesota Statutes, Section 120.10`.

- **Year-edition `Minn. St. YYYY, § N`**: new `minn-st-year-edition`
  tokenizer pattern (listed BEFORE `abbreviated-code` so it wins for
  the year-edition shape) routed to dedicated extractor
  `extractMinnStYearEdition`. Captures the edition year (1971 /
  1974 / 1967 / etc.) into the `year` field and the actual section
  into `section`. Emits `code: "Minn. Stat."` (normalized canonical).
  The `, § N` separator is REQUIRED so we don't false-positive on
  bare years that happen to follow `Minn. St.`

### Behavior changes

- `Minn. St. 48.30` → `code="Minn. St."`, `jurisdiction="MN"`,
  `section="48.30"` (was: not extracted)
- `Minn. St. 1971, § 176.66` → `code="Minn. Stat."`, `year=1971`,
  `section="176.66"`, `jurisdiction="MN"` (was: section
  mis-captured as "1971" by abbreviated-code, then not extracted at
  all since `Minn. St.` wasn't in the fragment)
- `Minnesota Statutes, Section 120.10` → `code="Minnesota Statutes"`,
  `section="120.10"`, `jurisdiction="MN"` (was: not extracted)
- `Minn. Stat. § 480A.06` continues to work (Bluebook form
  unchanged)

### Scope notes

The following pieces of #371 are intentionally deferred:

- **Subdivision parsing** (`, subd. 5`, `subds. 1 and 2`,
  `Subdivision 2`): the section extracts correctly but the trailing
  `subd.` text is dropped. Requires either a `subdivision` field on
  `StatuteCitation` or an extension to the subsection chain
  grammar.
- **Laws of Minnesota session laws** (`L. 1969, c. 570`): deferred
  alongside the other session-law formats (`Ga. L.`, `Stats.`,
  `Laws of Florida`, `Ind. Acts`, `PA YYYY`) pending a unified
  `sessionLaw` citation type.

### Tests

6 new tests under `Minnesota \`Minn. St.\` short form and
year-edition (#371)` in `tests/extract/extractStatute.test.ts`:

- Modern `Minn. St. 48.30`
- Criminal `Minn. St. 609.035`
- Year-edition `Minn. St. 1971, § 176.66`
- Year-edition with subsection `Minn. St. 1974, § 80A.14(n)`
- Spelled-out `Minnesota Statutes, Section 120.10`
- Regression: Bluebook `Minn. Stat. § 480A.06`

Full 2596-test suite passes; no regressions.

### Related

Year-edition form is sibling to Colorado `C.R.S. 1963` (#352
landed), Indiana `IC 1971` (#363 deferred), Kansas `K.S.A. Supp.
YYYY` (#367 deferred), and Stat Ann year-edition (#370 deferred).
Each state with a year-edition variant needs its own tokenizer
pattern because the year semantics differ: Colorado names the
compilation year in the abbreviation (`C.R.S. 1963` is the
compilation, not an edition of `C.R.S.`); Minnesota uses the
year-edition to mark which compilation was in force when the events
occurred (more like a parenthetical edition than a code-name
component).
