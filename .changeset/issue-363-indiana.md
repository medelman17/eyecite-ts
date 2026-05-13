---
"eyecite-ts": patch
---

feat: Indiana pre-1976 Burns Statutes, `IC YYYY` year-edition mis-parse, uppercase `IND. CODE` (#363)

A 50-opinion Indiana sweep produced 15+ Indiana statute misses
covering three distinct failure modes:

1. **Pre-1976 Burns Indiana Statutes Annotated** — modern
   Indiana opinions still cite this when referencing pre-1976
   statutory text (`Burns Ind. Stat. Ann.`, `Burns' Indiana
   Statutes Annotated`, `Ind. Stat. Ann.`, `Ind. Ann. Stat.`).
   All variants were entirely unrecognized.
2. **`IC YYYY` year-edition mis-parse** — `IC 1971, 35-13-4-4`
   captured the year as section (silently substituting `1971`
   for the actual section `35-13-4-4`), same family as the
   year-edition mis-parses fixed for Colorado #352, Minnesota
   #371, and Kansas #367.
3. **Uppercase `IND. CODE`** — Indiana case captions and some
   treatises use the all-caps form, but the Indiana regex
   fragment only matched the mixed-case `Ind. Code`.

### Fixes

- **Pre-1976 Burns entry**: new separate Indiana entry in
  `src/data/stateStatutes.ts` for the historical Burns Indiana
  Statutes Annotated compilation. Fragment matches
  `Burns(?:'s|')?\s+Ind(?:iana)?\.?\s+Stat(?:utes)?\.?
  (?:\s+Ann(?:otated)?\.?)?` plus the `Ind. Stat. Ann.` and
  `Ind. Ann. Stat.` forms. Sibling to Arkansas's modern/pre-1987
  split (#349).

- **Apostrophe-aware stripped lookup**: `findAbbreviatedCode`
  in `src/data/knownCodes.ts` now strips apostrophes (along
  with dots and whitespace) when computing the canonical
  stripped-form key. This lets `Burns' Indiana Statutes
  Annotated` resolve to the apostrophe-less entry.

- **IC year-edition pattern**: new `ic-year-edition` tokenizer
  pattern + dedicated `extractIcYearEdition` extractor. Captures
  `IC 1971, 35-13-4-4` as `code: "IC"`, `year: 1971`,
  `section: "35-13-4-4"`, `jurisdiction: "IN"`. The trailing
  `, NN-N-N` separator distinguishes year-edition from bare
  `IC NN-N-N` modern cites. Listed BEFORE `abbreviated-code`.

- **`IND. CODE` uppercase**: Indiana regex fragment extended
  with `IND\.?\s+CODE` to accept the all-caps variant.

### Behavior changes

- `IC 1971, 35-13-4-4` → `section="35-13-4-4"`, `year=1971`
  (was: `section="1971"`)
- `Burns Ind. Stat. Ann., § 10-3401 (1956 Repl.)` →
  `jurisdiction="IN"`, `year=1956`, `editionLabel="Repl."`
  (was: not extracted)
- `Burns' Indiana Statutes Annotated § 48-702` →
  `jurisdiction="IN"` (was: jurisdiction undefined; apostrophe
  blocked stripped-form lookup)
- `IND. CODE 6-5-1-7` → `jurisdiction="IN"`, `section="6-5-1-7"`
  (was: not extracted)
- Modern `IC 35-42-1-1` → unchanged

### Scope notes

The following pieces of #363 are intentionally deferred:

- **Indiana Acts session laws** (`Indiana Acts 1905, ch. 129,
  § 243`, `Acts 1929, ch. 172, § 49, p. 536`) — pending
  unified `sessionLaw` citation type alongside session-law
  formats for other states.

### Tests

7 new tests under `Indiana pre-1976 Burns + IC year-edition +
IND. CODE (#363)` in `tests/extract/extractStatute.test.ts`:

- Year-edition `IC 1971, 35-13-4-4`
- Uppercase `IND. CODE 6-5-1-7`
- Pre-1976 `Burns Ind. Stat. Ann., § 10-3401 (1956 Repl.)`
- Pre-1976 `Ind. Stat. Ann. § 28-1710 (Burns 1971)`
- Pre-1976 `Burns' Indiana Statutes Annotated § 48-702`
  (apostrophe form)
- Pre-1976 `Ind. Ann. Stat. § 10-4709`
- Regression: bare modern `IC 35-42-1-1`

Full 2628-test suite passes; no regressions.

### Related

Companion to #330 (pre-1993 Illinois Revised Statutes), #343
(Code of Alabama 1940), #359 (Revised Laws of Hawaii pre-1955),
#349 (Arkansas pre-1987 Statutes Annotated), and #373 (Nebraska
R.R.S. 1943) — historical state-statute compilations that
remain in active citation. The `IC YYYY` mis-parse fix joins
Colorado #352, Minnesota #371, and Kansas #367 in the
year-edition pattern family.
