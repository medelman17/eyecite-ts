---
"eyecite-ts": minor
---

feat: capture multiple discrete pincites (`113, 115, 153`) (#247)

`Roe v. Wade, 410 U.S. 113, 115, 153 (1973)` previously dropped the `153`
pincite — only the first comma-separated pincite survived. `PinciteInfo` now
carries an optional `additionalPincites: PinciteInfo[]` array; the primary
pincite continues to live in `page` / `endPage` / `paragraph` etc. (no API
break) and subsequent pincites accumulate as nested entries that each preserve
their own range / footnote / star-page semantics.

### Coverage

- `, 115, 153` → primary `page: 115`, additional `[{ page: 153 }]`
- `, 105, 110, 120` → primary + 2 additional
- Mixed range+discrete: `, 105-110, 120` → primary has `endPage: 110`,
  additional `[{ page: 120 }]`
- Discrete+range: `, 115, 105-110` → primary `page: 115`, additional has
  range info preserved

### API

- New: `pinciteInfo.additionalPincites?: PinciteInfo[]`.
- The top-level convenience `citation.pincite: number` continues to mirror
  only the primary pincite — consumers needing all pincites read the
  `additionalPincites` array.

Implementation: after `LOOKAHEAD_PINCITE_REGEX` captures the primary pincite,
a small loop matches a new `ADDITIONAL_PINCITE_REGEX` (comma + page form)
repeatedly from the scan position, parsing each via `parsePincite` and
appending to `additionalPincites`.
