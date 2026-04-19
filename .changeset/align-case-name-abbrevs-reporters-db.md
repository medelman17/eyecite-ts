---
"eyecite-ts": patch
---

fix: align `CASE_NAME_ABBREVS` with reporters-db Bluebook T6 list + ampersand support

After three consecutive bug reports (#187, #188, #193) exposing missing
abbreviations, this change aligns `CASE_NAME_ABBREVS` with the canonical
Bluebook T6 case-name abbreviation list maintained by Free Law Project
([reporters-db/case_name_abbreviations.json](https://github.com/freelawproject/reporters-db/blob/main/reporters_db/data/case_name_abbreviations.json)).

Three improvements:

- **Strip internal apostrophes in stem lookup.** `isLikelyAbbreviationPeriod`
  previously kept inner apostrophes, so `Nat'l.` computed stem `nat'l` which
  no reasonable pure-letter set could match. Now normalized to `natl`, which
  matches the Bluebook's apostrophe-form abbreviations as pure-letter stems.
- **41 new entries in `CASE_NAME_ABBREVS`.** Period-forms (`co`, `cmty`,
  `envtl`, `gend`, `par`, `prot`, `ref`, `sol`, `cty`, `adver`) and
  apostrophe-forms (`assn`, `dept`, `natl`, `intl`, `govt`, `commn`, `commr`,
  `contl`, `fedn`, `meml`, `pship`, `profl`, `secy`, `sholder`, `socy`,
  `commcn`, `engg`, `engr`, `entmt`, `envt`, `examr`, `invr`, `admr`, `admx`,
  `empr`, `empt`, `exr`, `exx`, `publg`, `publn`, `regl`). `co` was the
  highest-impact gap — "Smith & Co. United States Corp." was silently
  truncated to "United States Corp." because "Co. U" fired the
  sentence-boundary scan.
- **`&` in `isLikelyPartyName`.** Ampersand is ubiquitous in corporate
  captions ("Smith & Jones", "Goldman, Sachs & Co.") and previously caused
  the Priority-3 single-party fallback (#193) to reject such captions. Now
  treated as a valid standalone token.

7 new regression tests covering period-forms, apostrophe-forms with trailing
period, adversarial `Dep't …` caption, and ampersand patterns.
