---
"eyecite-ts": patch
---

fix(extract): plausibility-filter extracted years to drop OCR artifacts and
page-number leaks (#523)

Without a sanity range check, any 4-digit number harvested into the year
slot was accepted. OCR-mangled values like `1372` (intended `1972`) and
`1076` (intended `1976`) slipped through silently; #522's page-number leak
(`3021` mistaken for a year) was a related symptom that a trivial range
check would have caught upfront.

Adds `isPlausibleYear(year)` exported from `src/extract/dates.ts`, with the
range `[1700, currentYear + 1]` (inclusive). The lower bound matches the
practical floor of U.S. citation corpora; the `currentYear + 1` cap
tolerates opinions filed right around the new year.

Applied at every site that publishes a `year` field from a raw `\d{4}`
match — defense-in-depth across the parser:

- `parseDate` (one check per pattern branch, plus the year-only fallback).
  Implausible years cause the matcher to return `undefined` rather than
  reporting a bad year with month/day.
- `extractCase` case-name backsearch: both the `v.` (`V_CASE_NAME_REGEX`)
  and the procedural-prefix (`PROCEDURAL_PREFIX_REGEX`) CSM `(court year)`
  paths.
- `extractJournal` lookahead `(YYYY)` paren.
- `extractFederalRegister` paren year.
- `extractStatutesAtLarge` paren year.

Neutral citations (`2020 IL 12345`) are intentionally not filtered: the
year is a structural component of the citation pattern itself, not an
optional metadata field, so an implausible year there indicates the entire
match is suspect — handled upstream by the tokenizer's strict year-prefix
patterns.

One pre-existing two-digit-year test (`1/1/50` → 2050) is updated to use
`1/1/27` → 2027 so the pivot-boundary assertion does not collide with the
new plausibility cap; the two-digit pivot itself (`<=50` → 21st century,
`>50` → 20th) is unchanged.
