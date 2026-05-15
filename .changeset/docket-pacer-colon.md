---
"eyecite-ts": patch
---

fix: docket-number pattern accepts PACER colon prefix (e.g. `2:17-cv-00413`)

Federal district courts use the PACER/CM/ECF format where the
docket number has a court-division colon prefix:
`2:17-cv-00413` (E.D.N.Y. division 2, case year 2017,
civil-type, sequence 00413). The previous pattern did not
include `:` in the docket-number character class, so

```
G. v. United Healthcare, No. 2:17-cv-00413 (D. Utah June 9, 2020)
```

was silently dropped.

### Fix

Extended the docket-number regex to accept an optional
single-colon division prefix: `[A-Za-z\d]+(?::?[A-Za-z\d]+)?`
in front of the existing hyphen/space-separated parts.

### Tests

3 new tests in `tests/extract/extractDocket.test.ts`:
- PACER `No. 2:17-cv-00413 (D. Utah June 9, 2020)` (user-reported)
- PACER with `Civil No.` prefix and colon
- anonymized single-letter plaintiff `G. v. United Healthcare`

Full 2942-test suite passes; existing hyphen-only and
space-separated formats still extract.
