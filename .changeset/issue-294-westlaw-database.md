---
"eyecite-ts": patch
---

fix: route WL/LEXIS to `database`, recover real court from trailing paren on neutral cites (#294)

Westlaw and Lexis database cites — `2001 WL 1077846`,
`2014 WL 1924465 (Tex. App. May 8, 2014)`, `2021 U.S. App. LEXIS 12345`
— were storing the database identifier in the `court` field
(`court: "WL"`, `court: "U.S. App. LEXIS"`). Downstream consumers
treating `court` as a court abbreviation got back a static database tag.
For the form `2014 WL 1924465 (Tex. App. May 8, 2014)` the *real*
court (`Tex. App.`) was in the trailing paren and dropped entirely.

### Type changes (additive but field-shape-breaking for WL/LEXIS)

`NeutralCitation` now has two new optional fields:

- `database?: string` — for vendor-database identifiers (`WL`, `LEXIS` /
  `U.S. LEXIS` / `Fed. App. LEXIS`, `BL`).
- `date?: StructuredDate` — for the parsed decision date recovered from
  a trailing `(court date)` parenthetical.

`court` is now `string | undefined` (was `string`). For Westlaw/Lexis
cites this field is now `undefined` instead of `"WL"`/`"LEXIS"` — any
consumer that compared `c.court === "WL"` needs to check `c.database`
instead. Real jurisdictional neutral cites (`2008-Ohio-4571`,
`2013 IL 112116`) still populate `court` and leave `database` undefined.

### Fix

In `src/extract/extractNeutral.ts`:

- New helper `isDatabaseIdentifier(s)` returns true for `WL`, `BL`, or
  any string containing a `LEXIS` word boundary.
- After the existing year/court/documentNumber parse, if the captured
  middle segment is a database identifier, move it to `database` and
  set `court = undefined` (also clears `spans.court` since the database
  tag's position is meaningless as a court span).
- When `database` is set, a new lookahead pattern
  `NEUTRAL_PAREN_LOOKAHEAD` scans the cleaned text after the citation
  core for an optional `(court date)` parenthetical (allowing an
  intervening `, at *N` pincite). The captured paren is passed to
  the existing `parseParenthetical` helper from `extractCase`, which
  produces a `{ court, date }` result wired onto the citation.

### Scope notes (intentionally NOT addressed here)

- The pincite-as-volume bug on neutral/Id. citation paths in string-cite
  chains (`2008-Ohio-4571, 894 N.E.2d ...` → pincite=894 from the next
  cite's volume) is the same architectural shape as #281 and deserves
  its own PR — that fix requires plumbing sibling-span data into
  `extractNeutral` / `extractId`.

### Tests

5 new tests under `database identifier routing + trailing court paren
(#294)` in `tests/extract/extractNeutralHyphenated.test.ts`:

- WL cite with trailing `(N.D. Cal. Sept. 4, 2001)` paren
- U.S. LEXIS cite with trailing `(1st Cir. Aug. 30, 2001)` paren
- Bare WL cite (no paren) — `database: "WL"`, `court: undefined`
- WL cite with full date in trailing paren — `date.iso: "2014-05-08"`
- Real jurisdictional `Ohio`/`IL` neutrals — still populate `court`,
  not `database`

Migrated 17 existing test/fixture assertions from `court: "WL"` /
`court: "U.S. App. LEXIS"` to `database` (covers state LEXIS variants
in `extractLexisStateVariants.test.ts`, `extractOthers.test.ts`,
`componentSpans.others.test.ts`, `fullPipeline.test.ts`, and the
golden/expanded/thorny corpus JSON fixtures).

Full 2389-test suite passes; no regressions.
