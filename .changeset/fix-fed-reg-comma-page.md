---
"eyecite-ts": patch
---

fix(extract): Federal Register and Statutes at Large pages accept thousands-grouping commas

The Federal Register and Statutes at Large patterns + extractors used
bare `\d+` for the page, so a comma-grouped page (`12,345`,
`1,234,567`) truncated to just the digits before the first comma:

| input | before | after |
|---|---|---|
| `85 Fed. Reg. 12,345` | `matchedText="85 Fed. Reg. 12"`, `page=12` | `matchedText="85 Fed. Reg. 12,345"`, `page=12345` ✓ |
| `134 Stat. 1,234` | `matchedText="134 Stat. 1"`, `page=1` | `matchedText="134 Stat. 1,234"`, `page=1234` ✓ |

Federal Register pages routinely exceed 10,000 so the comma form is
common in practice. Both pattern and extractor regex now accept
`\d{1,3}(?:,\d{3})+|\d+`; the integer `page` field strips commas
before `parseInt`.

4 regression tests in `tests/extract/issueFedRegCommaPage.test.ts`.
