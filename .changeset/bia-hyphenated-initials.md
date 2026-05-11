---
"eyecite-ts": patch
---

fix: BIA `Matter of A-B-` hyphenated-initials captions parse (root cause: `&` missing from reporter char class) (#244)

Issue #244 reported that BIA caption forms like `Matter of A-B-, 27 I&N Dec. 316 (BIA 2018)` extracted with a truncated case name. Investigation showed the hyphenated-initials caption capture was already correct under the existing `PROCEDURAL_PREFIX_REGEX` (the subject character class accepts hyphens). The actual root cause was upstream: the `state-reporter` tokenization regex and the `VOLUME_REPORTER_PAGE_REGEX` parser both excluded `&` from their reporter character classes, so `I&N Dec.` (and the spaced Bluebook variant `I. & N. Dec.`) never produced a citation token. Without a citation token there was no case-name lookback at all.

Two-character-class fix:

- `casePatterns.ts` `state-reporter` regex — character class extended from `[A-Za-z.\s\d]` to `[A-Za-z.\s\d&']`. Apostrophe was also missing; admitting it here makes the fallback pattern consistent with the federal-reporter alternation (which already handles `F. App'x`).
- `extractCase.ts` `VOLUME_REPORTER_PAGE_REGEX` — same `&` addition.

Once the reporter tokenizes, the existing prefix-and-subject logic handles every hyphenated-initials form correctly: two-letter (`A-B-`), three-letter (`L-E-A-`, `W-G-R-`), four-letter (`A-R-C-G-`, `M-E-V-G-`, `E-F-H-L-`, `M-R-M-S-`), ALL-CAPS surnames (`THAKKER`, `CRUZ-VALDEZ`), real hyphenated surnames (`Jurado-Delgado`, `Rivera-Valencia`), and non-anonymized forms (`Matter of Garcia`). All 24 verbatim BIA-precedent corpus citations from the immigration research doc parse to the expected `caseName`.

Adds 17 regression tests covering: 2 reporter-recognition tests for `I&N Dec.` and `I. & N. Dec.` variants; 6 hyphenated-initials caption tests (2/3/4-letter forms across the highest-corpus precedents); 4 non-anonymized BIA caption tests; 1 `In re` form test; 3 regression controls (`U.S.`, `F.3d`, `N.E.2d`) confirming reporters without `&` are unaffected.
