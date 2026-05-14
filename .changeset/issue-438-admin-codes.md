---
"eyecite-ts": patch
---

feat: state admin codes NMAC / OAR / COMAR / IDAPA / ARM (#438)

Five state administrative-code citation families were unrecognized
— **105 misses** across the 50-state baseline. Extends #320
(state admin codes) for these specific code abbreviations.

| Code | State | Volume | Form |
|---|---|---|---|
| NMAC | New Mexico | 55 | postfix: `19.25.13.27 NMAC` |
| OAR | Oregon | 24 | prefix: `OAR 734-050-0050` |
| COMAR | Maryland | 14 | prefix: `COMAR 20.32.01.04F` |
| IDAPA | Idaho | 5 | prefix: `IDAPA 58.01.03.004.03` |
| ARM | Montana | 3 | postfix: `26.3.142(6), ARM` |

### Fix

New `state-admin-code` tokenizer pattern in
`src/patterns/statutePatterns.ts` + `extractStateAdminCode` in
`src/extract/statutes/extractStateAdminCode.ts`. Each form is
anchored on the distinctive abbreviation so the pattern only
fires for real admin-code references.

Emits `code: <abbreviation>`, `jurisdiction: <state>`,
`section: <hierarchical-id>`.

### Tests

5 new tests under `state admin codes (#438)` in
`tests/extract/extractStatute.test.ts`. Full 2770-test suite
passes; no regressions.
